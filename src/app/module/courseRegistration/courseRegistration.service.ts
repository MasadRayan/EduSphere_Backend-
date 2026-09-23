import httpStatus from "http-status";
import type { Prisma } from "../../../generated/prisma/client";
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
	bkashRefundPayment,
} from "../../lib/bkash";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { sendEnrollmentInvoice } from "./courseRegistration.email";
import type {
	ICreateEnrollmentPayload,
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

const ensureNoActiveEnrollmentForSemester = async (
	studentId: string,
	semesterId: string,
) => {
	const existing = await prisma.semesterEnrollment.findFirst({
		where: {
			studentId,
			semesterId,
			status: { in: [EnrollmentStatus.PENDING, EnrollmentStatus.ENROLLED] },
			isDeleted: false,
		},
	});

	if (existing) {
		throw new AppError(
			httpStatus.CONFLICT,
			"You already have an enrollment for this semester",
		);
	}
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

	await ensureNoActiveEnrollmentForSemester(student.id, semester.id);

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

	const enrollment = await prisma.semesterEnrollment.create({
		data: {
			studentId: student.id,
			semesterId: semester.id,
			totalCredits,
			totalFee,
			status: EnrollmentStatus.PENDING,
			registrations: {
				create: sections.map((section) => ({
					studentId: student.id,
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
		include: {
			registrations: true,
			payment: true,
		},
	});

	const merchantInvoiceNumber = `ENR-${enrollment.id
		.slice(0, 8)
		.toUpperCase()}`;

	const createResponse = await bkashCreatePayment({
		amount: totalFee.toFixed(2),
		merchantInvoiceNumber,
		callbackURL: config.bkash_callback_url,
		payerReference: student.studentId,
	});

	await prisma.payment.update({
		where: { semesterEnrollmentId: enrollment.id },
		data: {
			bkashPaymentId: createResponse.paymentID,
			merchantInvoiceNumber,
		},
	});

	return {
		paymentUrl: createResponse.bkashURL,
		paymentID: createResponse.paymentID,
		merchantInvoiceNumber,
		enrollmentId: enrollment.id,
		totalCredits,
		totalFee,
		sections,
	};
};

const handlePaymentCallback = async (query: Record<string, string>) => {
	const { paymentID, status } = query;

	if (!paymentID) {
		throw new AppError(httpStatus.BAD_REQUEST, "paymentID is required");
	}

	const payment = await prisma.payment.findUnique({
		where: { bkashPaymentId: paymentID },
		include: {
			semesterEnrollment: {
				include: {
					student: { include: { user: true } },
					semester: true,
					registrations: {
						include: {
							courseSection: {
								include: { course: true, semester: true },
							},
						},
					},
				},
			},
		},
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

	const registrationIds = enrollment.registrations.map((r) => r.id);

	if (status !== "success") {
		await prisma.$transaction([
			prisma.payment.update({
				where: { id: payment.id },
				data: { status: PaymentStatus.FAILED, bkashStatus: status },
			}),
			prisma.semesterEnrollment.update({
				where: { id: enrollment.id },
				data: { status: EnrollmentStatus.CANCELLED },
			}),
			prisma.courseRegistration.updateMany({
				where: { id: { in: registrationIds } },
				data: { status: RegistrationStatus.CANCELLED },
			}),
		]);

		return {
			redirectUrl: `${config.frontend_url}?payment=failed&status=${status}`,
			enrollmentId: enrollment.id,
		};
	}

	const executeResponse = await bkashExecutePayment(paymentID);

	await prisma.$transaction([
		prisma.payment.update({
			where: { id: payment.id },
			data: {
				status: PaymentStatus.SUCCEEDED,
				bkashStatus: executeResponse.transactionStatus,
				bkashTrxId: executeResponse.trxID,
				bkashGatewayResponse:
					executeResponse as unknown as Prisma.InputJsonValue,
			},
		}),
		prisma.semesterEnrollment.update({
			where: { id: enrollment.id },
			data: { status: EnrollmentStatus.ENROLLED },
		}),
		prisma.courseRegistration.updateMany({
			where: { id: { in: registrationIds } },
			data: { status: RegistrationStatus.ENROLLED },
		}),
	]);

	try {
		await sendEnrollmentInvoice({
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
					registration.courseSection.course.creditHours *
					config.credit_fee_rate,
			})),
			amount: payment.amount,
			invoiceNumber: payment.merchantInvoiceNumber ?? payment.id,
			trxId: executeResponse.trxID ?? null,
			paidAt: new Date(),
		});
	} catch (error) {
		console.error("Failed to send enrollment invoice email:", error);
	}

	return {
		redirectUrl: `${config.frontend_url}?payment=success&trxId=${executeResponse.trxID}&enrollmentId=${enrollment.id}`,
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
		payment.bkashTrxId
	) {
		const refundResponse = await bkashRefundPayment({
			paymentID: payment.bkashPaymentId!,
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
	cancelEnrollment,
	updateRegistrationStatus,
};
