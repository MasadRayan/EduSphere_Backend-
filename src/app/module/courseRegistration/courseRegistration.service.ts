import httpStatus from "http-status";
import { Prisma } from "../../../generated/prisma/client";
import {
	EnrollmentStatus,
	PaymentPurpose,
	PaymentStatus,
	RegistrationStatus,
	Role,
} from "../../../generated/prisma/enums";
import config from "../../config";
import {
	bkashCreatePayment,
	bkashExecutePayment,
	bkashQueryPayment,
	bkashRefundPayment,
	type IBkashCreatePaymentResponse,
	type IBkashExecutePaymentResponse,
	type IBkashQueryPaymentResponse,
} from "../../lib/bkash";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { getPaymentResultUrl } from "../../utils/paymentResultUrl";
import {
	buildEnrollmentInvoicePdf,
	sendEnrollmentInvoice,
} from "./courseRegistration.email";
import type {
	ICreateEnrollmentPayload,
	IInvoiceMailPayload,
	IRegistrationQuery,
} from "./courseRegistration.interface";

const enrollmentInclude = {
	payment: true,
	semester: true,
	registrations: {
		where: { isDeleted: false },
		include: {
			courseSection: {
				include: {
					course: true,
					semester: true,
				},
			},
		},
	},
} satisfies Prisma.SemesterEnrollmentInclude;

const invoiceInclude = {
	payment: true,
	student: { include: { user: true } },
	semester: true,
	registrations: {
		where: { isDeleted: false },
		include: {
			courseSection: {
				include: { course: true, semester: true },
			},
		},
	},
} satisfies Prisma.SemesterEnrollmentInclude;

/**
 * Shape shared by the callback include and the get-by-id include. Only the
 * fields printed on the invoice are required, so both queries can feed the
 * same payload builder.
 */
type InvoiceEnrollment = {
	id: string;
	student: { fullName: string; user: { email: string } };
	semester: { name: string; year: number };
	totalCredits: number;
	totalFee: number;
	payment: {
		id: string;
		amount: number;
		merchantInvoiceNumber: string | null;
		bkashTrxId: string | null;
		updatedAt: Date;
	} | null;
	registrations: Array<{
		courseSection: {
			sectionCode: string;
			course: { code: string; title: string; creditHours: number };
		};
	}>;
};

const buildInvoicePayload = (
	enrollment: InvoiceEnrollment,
	paidAt: Date,
): IInvoiceMailPayload => {
	const payment = enrollment.payment;

	return {
		to: enrollment.student.user.email,
		studentName: enrollment.student.fullName,
		semesterName: enrollment.semester.name,
		year: enrollment.semester.year,
		totalCredits: enrollment.totalCredits,
		courses: enrollment.registrations.map((registration) => ({
			courseTitle: registration.courseSection.course.title,
			courseCode: registration.courseSection.course.code,
			sectionCode: registration.courseSection.sectionCode,
			creditHours: registration.courseSection.course.creditHours,
			fee:
				registration.courseSection.course.creditHours * config.credit_fee_rate,
		})),
		amount: payment?.amount ?? enrollment.totalFee,
		invoiceNumber:
			payment?.merchantInvoiceNumber ?? payment?.id ?? enrollment.id,
		trxId: payment?.bkashTrxId ?? null,
		paidAt,
	};
};

const getStudentProfileByUserId = async (userId: string) => {
	const student = await prisma.studentProfile.findUnique({
		where: { userId },
	});

	if (!student) {
		throw new AppError(
			httpStatus.NOT_FOUND,
			"Student profile not found. Please complete your student profile first.",
		);
	}

	return student;
};

/**
 * A bKash checkout session stays valid for about an hour. Until then a pending
 * attempt may still be completed by the student, so a retry must not cancel it.
 */
const BKASH_SESSION_WINDOW_MS = 60 * 60 * 1000;

type EnrollmentWithPayment = Prisma.SemesterEnrollmentGetPayload<{
	include: { payment: true };
}>;

const loadEnrollmentWithPayment = (id: string) =>
	prisma.semesterEnrollment.findUnique({
		where: { id },
		include: { payment: true },
	});

/**
 * Marks an unfinished attempt as failed so the next attempt can reuse it.
 * The rows are kept (not deleted) because the student may want to see the
 * cancelled attempt in their enrollment history.
 */
const failEnrollmentAttempt = async (
	enrollmentId: string,
	paymentId: string | null,
	bkashStatus: string | null,
) => {
	await prisma.$transaction(async (tx) => {
		if (paymentId) {
			await tx.payment.update({
				where: { id: paymentId },
				data: { status: PaymentStatus.FAILED, bkashStatus },
			});
		}

		await tx.semesterEnrollment.update({
			where: { id: enrollmentId },
			data: { status: EnrollmentStatus.CANCELLED },
		});

		await tx.courseRegistration.updateMany({
			where: { semesterEnrollmentId: enrollmentId, isDeleted: false },
			data: { status: RegistrationStatus.CANCELLED },
		});
	});
};

/**
 * Resolves the enrollment row for a student and semester before starting a new
 * attempt. The schema keeps one enrollment per student and semester, so a
 * cancelled attempt has to be reused instead of inserted again.
 *
 * Returns null when there is nothing to reuse. Throws when a new attempt must
 * not start yet (already enrolled, payment still in flight, unknown gateway
 * state) or when the previous attempt turned out to be paid after all.
 */
const resolveEnrollmentForRetry = async (
	studentId: string,
	semesterId: string,
): Promise<EnrollmentWithPayment | null> => {
	const existing = await prisma.semesterEnrollment.findFirst({
		where: { studentId, semesterId, isDeleted: false },
		include: { payment: true },
	});

	if (!existing) {
		return null;
	}

	if (existing.status === EnrollmentStatus.ENROLLED) {
		throw new AppError(
			httpStatus.CONFLICT,
			"You are already enrolled for this semester",
		);
	}

	if (existing.status === EnrollmentStatus.CANCELLED) {
		// A paid attempt may have been refunded. Reusing that payment row would
		// erase the refund record, so leave it to the registrar.
		const paidAttempt =
			existing.payment &&
			(existing.payment.status === PaymentStatus.SUCCEEDED ||
				existing.payment.status === PaymentStatus.REFUNDED ||
				Boolean(existing.payment.refundedAt));

		if (paidAttempt) {
			throw new AppError(
				httpStatus.CONFLICT,
				"Your previous enrollment was paid and then cancelled. Contact the registrar office to enroll again for this semester.",
			);
		}

		return existing;
	}

	const payment = existing.payment;

	if (!payment?.bkashPaymentId) {
		await failEnrollmentAttempt(
			existing.id,
			payment?.id ?? null,
			"CHECKOUT_ABANDONED",
		);
		return loadEnrollmentWithPayment(existing.id);
	}

	let queryResult: IBkashQueryPaymentResponse;

	try {
		queryResult = await bkashQueryPayment(payment.bkashPaymentId);
	} catch {
		throw new AppError(
			httpStatus.CONFLICT,
			"We could not confirm your previous bKash payment. Please wait a few minutes and try again.",
		);
	}

	// Money may have been captured even when the callback never reached us.
	// Finalize the enrollment instead of starting a second, double-charging
	// payment.
	if (queryResult.transactionStatus === "Completed" && queryResult.trxID) {
		await finalizeEnrollmentPayment(
			payment.id,
			existing.id,
			queryResult as unknown as IBkashExecutePaymentResponse,
		);

		throw new AppError(
			httpStatus.CONFLICT,
			"Your previous bKash payment already completed. Your enrollment is confirmed, open My enrollments to see it.",
		);
	}

	const stillInFlight =
		["Initiated", "Pending", "Authorized"].includes(
			queryResult.transactionStatus,
		) && Date.now() - existing.updatedAt.getTime() < BKASH_SESSION_WINDOW_MS;

	if (stillInFlight) {
		throw new AppError(
			httpStatus.CONFLICT,
			"Your previous bKash payment is still in progress. Finish it in the bKash window, or wait an hour and try again.",
		);
	}

	await failEnrollmentAttempt(
		existing.id,
		payment.id,
		queryResult.transactionStatus ?? null,
	);

	return loadEnrollmentWithPayment(existing.id);
};

const loadCourses = async (courseIds: string[]) => {
	const uniqueIds = [...new Set(courseIds)];

	const courses = await prisma.course.findMany({
		where: { id: { in: uniqueIds }, isDeleted: false },
	});

	if (courses.length !== uniqueIds.length) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"One or more courses were not found",
		);
	}

	return courses;
};

const ensureCourseOpenSection = async (
	studentId: string,
	courseId: string,
	courseCode: string,
	semesterId: string,
) => {
	const completedRegistration = await prisma.courseRegistration.findFirst({
		where: {
			studentId,
			isDeleted: false,
			status: RegistrationStatus.COMPLETED,
			courseSection: { is: { course: { id: courseId } } },
		},
	});

	if (completedRegistration) {
		throw new AppError(
			httpStatus.CONFLICT,
			`You have already completed ${courseCode}. Retaking a completed course is not allowed.`,
		);
	}

	const sections = await prisma.courseSection.findMany({
		where: {
			courseId,
			semesterId,

			isDeleted: false,
		},
		orderBy: { createdAt: "asc" },
	});

	if (!sections.length) {
		throw new AppError(
			httpStatus.NOT_FOUND,
			`No course section exists for ${courseCode} in the current semester. Contact the registrar office.`,
		);
	}

	const sectionIds = sections.map((s) => s.id);

	const counts = await prisma.courseRegistration.groupBy({
		by: ["courseSectionId"],
		where: {
			courseSectionId: { in: sectionIds },
			status: {
				in: [RegistrationStatus.PENDING, RegistrationStatus.ENROLLED],
			},
		},
		_count: { _all: true },
	});

	const enrolledMap = new Map(
		counts.map((c) => [c.courseSectionId, c._count._all]),
	);

	const existingRegistrations = await prisma.courseRegistration.findMany({
		where: {
			studentId,
			courseSectionId: { in: sectionIds },
			status: {
				in: [RegistrationStatus.PENDING, RegistrationStatus.ENROLLED],
			},
		},
		select: { courseSectionId: true },
	});
	const registeredSectionIds = new Set(
		existingRegistrations.map((r) => r.courseSectionId),
	);

	const openSection = sections.find(
		(section) =>
			!registeredSectionIds.has(section.id) &&
			(enrolledMap.get(section.id) ?? 0) < section.capacity,
	);

	if (!openSection) {
		throw new AppError(
			httpStatus.CONFLICT,
			`No open seat is available in any section of ${courseCode} in the current semester`,
		);
	}

	return openSection;
};

const ensurePrerequisitesSatisfied = async (
	studentId: string,
	courseIds: string[],
) => {
	const prereqRows = await prisma.coursePrerequisite.findMany({
		where: { courseId: { in: courseIds } },
		include: {
			prerequisite: {
				select: { id: true, code: true },
			},
		},
	});

	if (!prereqRows.length) {
		return;
	}

	const completedRegistrations = await prisma.courseRegistration.findMany({
		where: {
			studentId,
			isDeleted: false,
			status: RegistrationStatus.COMPLETED,
		},
		select: { courseSection: { select: { courseId: true } } },
	});

	const completedCourseIds = new Set(
		completedRegistrations.map((r) => r.courseSection.courseId),
	);

	const missingByCourse = new Map<string, string[]>();

	for (const row of prereqRows) {
		if (!completedCourseIds.has(row.prerequisiteId)) {
			const missing = missingByCourse.get(row.courseId) ?? ([] as string[]);
			missing.push(row.prerequisite.code);
			missingByCourse.set(row.courseId, missing);
		}
	}

	if (missingByCourse.size) {
		const details = [...missingByCourse.entries()]
			.map(([courseId, prereqs]) => `${courseId}: ${prereqs.join(", ")}`)
			.join(" | ");

		throw new AppError(
			httpStatus.BAD_REQUEST,
			`Prerequisites not completed for the selected courses. Missing prerequisites - ${details}. Please complete them before enrolling.`,
		);
	}
};

/**
 * Creates the enrollment, registrations and payment for a new attempt. When a
 * cancelled attempt already exists it is reused, because the schema allows a
 * single enrollment per student and semester. The payment row is reused too
 * (it is one-to-one with the enrollment), so stale bKash fields are cleared
 * before the new gateway call.
 */
const saveEnrollmentAttempt = async ({
	existing,
	studentId,
	semesterId,
	userId,
	totalCredits,
	totalFee,
	sections,
}: {
	existing: EnrollmentWithPayment | null;
	studentId: string;
	semesterId: string;
	userId: string;
	totalCredits: number;
	totalFee: number;
	sections: Array<{ sectionId: string }>;
}) => {
	let enrollmentId: string;

	if (!existing) {
		try {
			const created = await prisma.semesterEnrollment.create({
				data: {
					studentId,
					semesterId,
					totalCredits,
					totalFee,
					status: EnrollmentStatus.PENDING,
					registrations: {
						create: sections.map((section) => ({
							studentId,
							courseSectionId: section.sectionId,
							status: RegistrationStatus.PENDING,
						})),
					},
					payment: {
						create: {
							userId,
							amount: totalFee,
							currency: "BDT",
							purpose: PaymentPurpose.REGISTRATION_FEE,
							status: PaymentStatus.PENDING,
						},
					},
				},
			});

			enrollmentId = created.id;
		} catch (error) {
			if (
				error instanceof Prisma.PrismaClientKnownRequestError &&
				error.code === "P2002"
			) {
				throw new AppError(
					httpStatus.CONFLICT,
					"Another enrollment attempt is already in progress for this semester. Refresh the page and try again.",
				);
			}

			throw error;
		}
	} else {
		enrollmentId = existing.id;

		await prisma.$transaction(async (tx) => {
			// Cancelled drafts from the failed attempt would violate the
			// (student, courseSection) unique constraint, so clear them before
			// creating the new selection.
			await tx.courseRegistration.deleteMany({
				where: {
					semesterEnrollmentId: existing.id,
					status: {
						in: [RegistrationStatus.PENDING, RegistrationStatus.CANCELLED],
					},
				},
			});

			await tx.semesterEnrollment.update({
				where: { id: existing.id },
				data: { totalCredits, totalFee, status: EnrollmentStatus.PENDING },
			});

			if (existing.payment) {
				await tx.payment.update({
					where: { id: existing.payment.id },
					data: {
						amount: totalFee,
						status: PaymentStatus.PENDING,
						bkashPaymentId: null,
						bkashTrxId: null,
						bkashStatus: null,
						bkashGatewayResponse: Prisma.DbNull,
						merchantInvoiceNumber: null,
						refundTrxId: null,
						refundedAt: null,
					},
				});
			} else {
				await tx.payment.create({
					data: {
						userId,
						semesterEnrollmentId: existing.id,
						amount: totalFee,
						currency: "BDT",
						purpose: PaymentPurpose.REGISTRATION_FEE,
						status: PaymentStatus.PENDING,
					},
				});
			}

			await tx.courseRegistration.createMany({
				data: sections.map((section) => ({
					studentId,
					semesterEnrollmentId: existing.id,
					courseSectionId: section.sectionId,
					status: RegistrationStatus.PENDING,
				})),
			});
		});
	}

	const payment = await prisma.payment.findUniqueOrThrow({
		where: { semesterEnrollmentId: enrollmentId },
	});

	return { enrollmentId, paymentId: payment.id };
};

const enrollSemester = async (
	userId: string,
	payload: ICreateEnrollmentPayload,
) => {
	const student = await getStudentProfileByUserId(userId);

	let semesterId = student.currentSemesterId;

	if (!semesterId) {
		const activeSemester = await prisma.semester.findFirst({
			where: { isActive: true },
		});
		semesterId = activeSemester?.id ?? null;
	}

	if (!semesterId) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"No current semester is set for your profile. Please contact the registrar office.",
		);
	}

	const semester = await prisma.semester.findUnique({
		where: { id: semesterId },
	});

	if (!semester) {
		throw new AppError(httpStatus.NOT_FOUND, "Current semester not found");
	}

	const deadline = semester.registrationDeadline ?? semester.startDate;

	if (deadline.getTime() <= Date.now()) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Enrollment for this semester has already closed",
		);
	}

	const courses = await loadCourses(payload.courseIds);
	const totalCredits = courses.reduce(
		(sum, course) => sum + course.creditHours,
		0,
	);

	if (totalCredits > config.max_credits_per_semester) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			`Total credits (${totalCredits}) exceed the maximum of ${config.max_credits_per_semester} per semester`,
		);
	}

	const existingEnrollment = await resolveEnrollmentForRetry(
		student.id,
		semester.id,
	);

	await ensurePrerequisitesSatisfied(
		student.id,
		courses.map((c) => c.id),
	);

	const sections: Array<{
		courseId: string;
		courseCode: string;
		sectionId: string;
		sectionCode: string;
	}> = [];

	for (const course of courses) {
		const section = await ensureCourseOpenSection(
			student.id,
			course.id,
			course.code,
			semester.id,
		);
		sections.push({
			courseId: course.id,
			courseCode: course.code,
			sectionId: section.id,
			sectionCode: section.sectionCode,
		});
	}

	const totalFee = totalCredits * config.credit_fee_rate;

	const { enrollmentId, paymentId } = await saveEnrollmentAttempt({
		existing: existingEnrollment,
		studentId: student.id,
		semesterId: semester.id,
		userId,
		totalCredits,
		totalFee,
		sections,
	});

	// bKash rejects a repeated merchant invoice number, and the reused payment
	// row already carries the previous attempt's invoice. Suffix each attempt
	// with a timestamp so every checkout is unique.
	const merchantInvoiceNumber = `ENR-${enrollmentId
		.slice(0, 8)
		.toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;

	let createResponse: IBkashCreatePaymentResponse;

	try {
		createResponse = await bkashCreatePayment({
			amount: totalFee.toFixed(2),
			merchantInvoiceNumber,
			callbackURL: config.bkash_callback_url,
			payerReference: student.studentId,
		});
	} catch (error) {
		// Never leave a pending attempt behind when the gateway call fails,
		// otherwise it would block every later retry.
		await failEnrollmentAttempt(enrollmentId, paymentId, "CREATE_FAILED");
		throw error;
	}

	await prisma.payment.update({
		where: { id: paymentId },
		data: {
			bkashPaymentId: createResponse.paymentID,
			merchantInvoiceNumber,
		},
	});

	return {
		paymentUrl: createResponse.bkashURL,
		paymentID: createResponse.paymentID,
		merchantInvoiceNumber,
		enrollmentId,
		totalCredits,
		totalFee,
		sections,
	};
};

const reconcileBkashPayment = async (
	paymentID: string,
): Promise<IBkashExecutePaymentResponse> => {
	try {
		return await bkashExecutePayment(paymentID);
	} catch (executeError) {
		// The execute API can be called only once per paymentID. If a previous
		// attempt already executed the payment (e.g. the earlier callback timed
		// out after money was captured), bKash rejects the call. Reconcile the
		// real state via the query API before giving up.
		try {
			const queryResult = await bkashQueryPayment(paymentID);

			if (queryResult.transactionStatus === "Completed" && queryResult.trxID) {
				return queryResult as IBkashExecutePaymentResponse;
			}
		} catch {
			// Ignore query errors; surface the original execute error below.
		}

		throw executeError;
	}
};

/**
 * Marks a bKash payment as captured and confirms the enrollment it belongs to.
 * Shared by the browser callback and the retry reconciliation path so a payment
 * that completed without a callback is never charged twice.
 */
const finalizeEnrollmentPayment = async (
	paymentId: string,
	enrollmentId: string,
	executeResponse: IBkashExecutePaymentResponse,
) => {
	const trxId = executeResponse.trxID;

	await prisma.$transaction([
		prisma.payment.update({
			where: { id: paymentId },
			data: {
				status: PaymentStatus.SUCCEEDED,
				bkashStatus: executeResponse.transactionStatus,
				bkashTrxId: executeResponse.trxID,
				bkashGatewayResponse:
					executeResponse as unknown as Prisma.InputJsonValue,
			},
		}),
		prisma.semesterEnrollment.update({
			where: { id: enrollmentId },
			data: { status: EnrollmentStatus.ENROLLED },
		}),
		prisma.courseRegistration.updateMany({
			where: { semesterEnrollmentId: enrollmentId, isDeleted: false },
			data: { status: RegistrationStatus.ENROLLED },
		}),
	]);

	const enrollment = await prisma.semesterEnrollment.findUnique({
		where: { id: enrollmentId },
		include: invoiceInclude,
	});

	if (!enrollment) {
		return trxId;
	}

	// Send the invoice email without blocking the browser redirect. SMTP can be
	// slow and keeping it on the critical path risks hitting the serverless
	// function timeout after the money transfer already succeeded.
	void sendEnrollmentInvoice(buildInvoicePayload(enrollment, new Date())).catch(
		(error) => {
			console.error("Failed to send enrollment invoice email:", error);
		},
	);

	return trxId;
};

const handlePaymentCallback = async (query: Record<string, string>) => {
	const { paymentID, status } = query;

	if (!paymentID) {
		throw new AppError(httpStatus.BAD_REQUEST, "paymentID is required");
	}

	const payment = await prisma.payment.findUnique({
		where: { bkashPaymentId: paymentID },
		include: { semesterEnrollment: true },
	});

	if (!payment) {
		throw new AppError(httpStatus.NOT_FOUND, "Payment not found");
	}

	const enrollment = payment.semesterEnrollment;

	if (!enrollment) {
		throw new AppError(
			httpStatus.NOT_FOUND,
			"Semester enrollment not found for this payment",
		);
	}

	// Idempotency guard: a finalized payment must stay successful no matter how
	// many times bKash replays the callback, even if the replay says cancelled.
	if (payment.status === PaymentStatus.SUCCEEDED && payment.bkashTrxId) {
		return {
			redirectUrl: `${getPaymentResultUrl()}?payment=success&trxId=${payment.bkashTrxId}&enrollmentId=${enrollment.id}`,
			enrollmentId: enrollment.id,
		};
	}

	if (status !== "success") {
		await failEnrollmentAttempt(enrollment.id, payment.id, status);

		return {
			redirectUrl: `${getPaymentResultUrl()}?payment=failed&status=${status}`,
			enrollmentId: enrollment.id,
		};
	}

	const executeResponse = await reconcileBkashPayment(paymentID);
	const trxId = await finalizeEnrollmentPayment(
		payment.id,
		enrollment.id,
		executeResponse,
	);

	return {
		redirectUrl: `${getPaymentResultUrl()}?payment=success&trxId=${trxId}&enrollmentId=${enrollment.id}`,
		enrollmentId: enrollment.id,
	};
};

const getMyEnrollments = async (userId: string, query: IRegistrationQuery) => {
	const student = await getStudentProfileByUserId(userId);

	const page = Math.max(1, Number(query.page) || 1);
	const limit = Math.max(1, Math.min(100, Number(query.limit) || 10));
	const skip = (page - 1) * limit;

	const where: Prisma.SemesterEnrollmentWhereInput = {
		studentId: student.id,
		isDeleted: false,
	};

	if (query.status) {
		where.status = query.status as EnrollmentStatus;
	}

	if (query.semesterId) {
		where.semesterId = query.semesterId;
	}

	const [data, total] = await prisma.$transaction([
		prisma.semesterEnrollment.findMany({
			where,
			skip,
			take: limit,
			orderBy: { createdAt: "desc" },
			include: enrollmentInclude,
		}),
		prisma.semesterEnrollment.count({ where }),
	]);

	return {
		data,
		meta: {
			page,
			limit,
			total,
			totalPages: Math.ceil(total / limit),
		},
	};
};

const getAllEnrollments = async (query: IRegistrationQuery) => {
	const page = Math.max(1, Number(query.page) || 1);
	const limit = Math.max(1, Math.min(100, Number(query.limit) || 10));
	const skip = (page - 1) * limit;

	const where: Prisma.SemesterEnrollmentWhereInput = { isDeleted: false };

	if (query.status) {
		where.status = query.status as EnrollmentStatus;
	}

	if (query.semesterId) {
		where.semesterId = query.semesterId;
	}

	const [data, total] = await prisma.$transaction([
		prisma.semesterEnrollment.findMany({
			where,
			skip,
			take: limit,
			orderBy: { createdAt: "desc" },
			include: {
				...enrollmentInclude,
				student: { include: { user: true } },
			},
		}),
		prisma.semesterEnrollment.count({ where }),
	]);

	return {
		data,
		meta: {
			page,
			limit,
			total,
			totalPages: Math.ceil(total / limit),
		},
	};
};

const getEnrollmentById = async (
	userId: string,
	role: Role,
	enrollmentId: string,
) => {
	const enrollment = await prisma.semesterEnrollment.findFirst({
		where: { id: enrollmentId, isDeleted: false },
		include: {
			...enrollmentInclude,
			student: { include: { user: true } },
		},
	});

	if (!enrollment) {
		throw new AppError(httpStatus.NOT_FOUND, "Enrollment not found");
	}

	if (role === Role.STUDENT) {
		const student = await prisma.studentProfile.findUnique({
			where: { userId },
		});

		if (!student || student.id !== enrollment.studentId) {
			throw new AppError(
				httpStatus.FORBIDDEN,
				"You are not allowed to view this enrollment",
			);
		}
	}

	return enrollment;
};

const getEnrollmentInvoice = async (
	userId: string,
	role: Role,
	enrollmentId: string,
) => {
	const enrollment = await getEnrollmentById(userId, role, enrollmentId);

	const payment = enrollment.payment;

	if (
		!payment ||
		(payment.status !== PaymentStatus.SUCCEEDED &&
			payment.status !== PaymentStatus.REFUNDED)
	) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Invoice is only available after a successful payment",
		);
	}

	const payload = buildInvoicePayload(enrollment, payment.updatedAt);
	const invoiceBuffer = await buildEnrollmentInvoicePdf(payload);
	const safeInvoiceNumber = payload.invoiceNumber.replace(
		/[^A-Za-z0-9._-]/g,
		"",
	);

	return {
		buffer: invoiceBuffer,
		filename: `invoice-${safeInvoiceNumber || enrollment.id}.pdf`,
	};
};

const cancelEnrollment = async (
	userId: string,
	role: Role,
	enrollmentId: string,
) => {
	const enrollment = await prisma.semesterEnrollment.findFirst({
		where: { id: enrollmentId, isDeleted: false },
		include: {
			...enrollmentInclude,
			student: true,
		},
	});

	if (!enrollment) {
		throw new AppError(httpStatus.NOT_FOUND, "Enrollment not found");
	}

	if (role === Role.STUDENT) {
		const student = await prisma.studentProfile.findUnique({
			where: { userId },
		});

		if (!student || student.id !== enrollment.studentId) {
			throw new AppError(
				httpStatus.FORBIDDEN,
				"You are not allowed to cancel this enrollment",
			);
		}
	}

	if (enrollment.status !== EnrollmentStatus.ENROLLED) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Only confirmed (enrolled) enrollments can be cancelled",
		);
	}

	// Refund only allowed before the semester starts (registration window closed)
	if (enrollment.semester.startDate.getTime() <= Date.now()) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Refund is only allowed before the semester starts",
		);
	}

	const payment = enrollment.payment;

	if (
		payment &&
		payment.status === PaymentStatus.SUCCEEDED &&
		payment.bkashTrxId &&
		payment.bkashPaymentId
	) {
		const refundResponse = await bkashRefundPayment({
			paymentID: payment.bkashPaymentId,
			trxID: payment.bkashTrxId,
			amount: payment.amount.toFixed(2),
			sku: payment.merchantInvoiceNumber ?? "semester-enrollment",
			reason: "Semester enrollment cancelled by student",
		});

		await prisma.payment.update({
			where: { id: payment.id },
			data: {
				status: PaymentStatus.REFUNDED,
				refundTrxId: refundResponse.refundTrxID ?? null,
				refundedAt: new Date(),
				bkashStatus: refundResponse.transactionStatus,
			},
		});
	}

	const registrationIds = enrollment.registrations.map((r) => r.id);

	await prisma.$transaction([
		prisma.semesterEnrollment.update({
			where: { id: enrollmentId },
			data: { status: EnrollmentStatus.CANCELLED },
		}),
		prisma.courseRegistration.updateMany({
			where: { id: { in: registrationIds } },
			data: { status: RegistrationStatus.CANCELLED },
		}),
	]);

	return prisma.semesterEnrollment.findFirst({
		where: { id: enrollmentId, isDeleted: false },
	});
};

const updateRegistrationStatus = async (
	registrationId: string,
	status: RegistrationStatus,
) => {
	const registration = await prisma.courseRegistration.findFirst({
		where: { id: registrationId, isDeleted: false },
	});

	if (!registration) {
		throw new AppError(httpStatus.NOT_FOUND, "Course registration not found");
	}

	return prisma.courseRegistration.update({
		where: { id: registrationId },
		data: { status },
		include: {
			courseSection: {
				include: {
					course: true,
					semester: true,
				},
			},
		},
	});
};

export const CourseRegistrationService = {
	enrollSemester,
	handlePaymentCallback,
	getMyEnrollments,
	getAllEnrollments,
	getEnrollmentById,
	getEnrollmentInvoice,
	cancelEnrollment,
	updateRegistrationStatus,
};
