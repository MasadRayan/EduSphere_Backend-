import httpStatus from "http-status";
import type { Prisma } from "../../../generated/prisma/client";
import {
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
	ICreateRegistrationPayload,
	IRegistrationQuery,
} from "./courseRegistration.interface";

const registrationInclude = {
	payment: true,
	courseSection: {
		include: {
			course: true,
			semester: true,
		},
	},
} satisfies Prisma.CourseRegistrationInclude;

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

const ensureCourseSectionExists = async (courseSectionId: string) => {
	const courseSection = await prisma.courseSection.findFirst({
		where: { id: courseSectionId, isDeleted: false },
		include: {
			course: true,
			semester: true,
		},
	});

	if (!courseSection) {
		throw new AppError(httpStatus.NOT_FOUND, "Course section not found");
	}

	return courseSection;
};

const ensureNotAlreadyRegistered = async (
	studentId: string,
	courseSectionId: string,
) => {
	const existing = await prisma.courseRegistration.findFirst({
		where: {
			studentId,
			courseSectionId,
			status: { in: [RegistrationStatus.PENDING, RegistrationStatus.ENROLLED] },
		},
	});

	if (existing) {
		throw new AppError(
			httpStatus.CONFLICT,
			"You are already registered in this course section",
		);
	}
};

const ensureSeatAvailable = async (
	courseSectionId: string,
	capacity: number,
) => {
	const enrolledCount = await prisma.courseRegistration.count({
		where: {
			courseSectionId,
			status: { in: [RegistrationStatus.PENDING, RegistrationStatus.ENROLLED] },
		},
	});

	if (enrolledCount >= capacity) {
		throw new AppError(
			httpStatus.CONFLICT,
			"Course section is already full",
		);
	}
};

const enrollCourse = async (
	userId: string,
	payload: ICreateRegistrationPayload,
) => {
	const student = await getStudentProfileByUserId(userId);
	const courseSection = await ensureCourseSectionExists(
		payload.courseSectionId,
	);

	if (courseSection.courseFee <= 0) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"No registration fee is configured for this course section",
		);
	}

	await ensureNotAlreadyRegistered(student.id, payload.courseSectionId);
	await ensureSeatAvailable(payload.courseSectionId, courseSection.capacity);

	// The section must belong to a not-started semester for new enrollment
	if (courseSection.semester.startDate.getTime() < Date.now()) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Enrollment for this semester has already closed",
		);
	}

	const registration = await prisma.courseRegistration.create({
		data: {
			studentId: student.id,
			courseSectionId: payload.courseSectionId,
			status: RegistrationStatus.PENDING,
			payment: {
				create: {
					userId,
					amount: courseSection.courseFee,
					currency: "BDT",
					purpose: PaymentPurpose.REGISTRATION_FEE,
					status: PaymentStatus.PENDING,
				},
			},
		},
		include: registrationInclude,
	});

	const merchantInvoiceNumber = `REG-${registration.id.slice(0, 8).toUpperCase()}`;

	const createResponse = await bkashCreatePayment({
		amount: courseSection.courseFee.toFixed(2),
		merchantInvoiceNumber,
		callbackURL: config.bkash_callback_url,
		payerReference: student.studentId,
	});

	await prisma.payment.update({
		where: { courseRegistrationId: registration.id },
		data: {
			bkashPaymentId: createResponse.paymentID,
			merchantInvoiceNumber,
		},
	});

	return {
		paymentUrl: createResponse.bkashURL,
		paymentID: createResponse.paymentID,
		merchantInvoiceNumber,
		registrationId: registration.id,
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
			courseRegistration: {
				include: {
					student: { include: { user: true } },
					courseSection: {
						include: { course: true, semester: true },
					},
				},
			},
		},
	});

	if (!payment) {
		throw new AppError(httpStatus.NOT_FOUND, "Payment not found");
	}

	const registration = payment.courseRegistration;

	if (!registration) {
		throw new AppError(
			httpStatus.NOT_FOUND,
			"Course registration not found for this payment",
		);
	}

	if (status !== "success") {
		await prisma.$transaction([
			prisma.payment.update({
				where: { id: payment.id },
				data: { status: PaymentStatus.FAILED, bkashStatus: status },
			}),
			prisma.courseRegistration.update({
				where: { id: registration.id },
				data: { status: RegistrationStatus.CANCELLED },
			}),
		]);

		return {
			redirectUrl: `${config.frontend_url}?payment=failed&status=${status}`,
			registrationId: registration.id,
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
				bkashGatewayResponse: executeResponse as unknown as Prisma.InputJsonValue,
			},
		}),
		prisma.courseRegistration.update({
			where: { id: registration.id },
			data: { status: RegistrationStatus.ENROLLED },
		}),
	]);

	// Fire-and-forget invoice email (never block the bKash redirect)
	try {
		await sendEnrollmentInvoice({
			to: registration.student.user.email,
			studentName: registration.student.fullName,
			courseTitle: registration.courseSection.course.title,
			courseCode: registration.courseSection.course.code,
			sectionCode: registration.courseSection.sectionCode,
			semesterName: registration.courseSection.semester.name,
			year: registration.courseSection.semester.year,
			amount: payment.amount,
			invoiceNumber: payment.merchantInvoiceNumber ?? payment.id,
			trxId: executeResponse.trxID ?? null,
			paidAt: new Date(),
		});
	} catch (error) {
		console.error("Failed to send enrollment invoice email:", error);
	}

	return {
		redirectUrl: `${config.frontend_url}?payment=success&trxId=${executeResponse.trxID}&registrationId=${registration.id}`,
		registrationId: registration.id,
	};
};

const getMyRegistrations = async (
	userId: string,
	query: IRegistrationQuery,
) => {
	const student = await getStudentProfileByUserId(userId);

	const page = Math.max(1, Number(query.page) || 1);
	const limit = Math.max(1, Math.min(100, Number(query.limit) || 10));
	const skip = (page - 1) * limit;

	const where: Prisma.CourseRegistrationWhereInput = {
		studentId: student.id,
		isDeleted: false,
	};

	if (query.status) {
		where.status = query.status as RegistrationStatus;
	}

	const [data, total] = await prisma.$transaction([
		prisma.courseRegistration.findMany({
			where,
			skip,
			take: limit,
			orderBy: { registeredAt: "desc" },
			include: registrationInclude,
		}),
		prisma.courseRegistration.count({ where }),
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

const getAllRegistrations = async (query: IRegistrationQuery) => {
	const page = Math.max(1, Number(query.page) || 1);
	const limit = Math.max(1, Math.min(100, Number(query.limit) || 10));
	const skip = (page - 1) * limit;

	const where: Prisma.CourseRegistrationWhereInput = { isDeleted: false };

	if (query.status) {
		where.status = query.status as RegistrationStatus;
	}

	if (query.courseSectionId) {
		where.courseSectionId = query.courseSectionId;
	}

	const [data, total] = await prisma.$transaction([
		prisma.courseRegistration.findMany({
			where,
			skip,
			take: limit,
			orderBy: { registeredAt: "desc" },
			include: registrationInclude,
		}),
		prisma.courseRegistration.count({ where }),
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

const getRegistrationById = async (
	userId: string,
	role: Role,
	registrationId: string,
) => {
	const registration = await prisma.courseRegistration.findFirst({
		where: { id: registrationId, isDeleted: false },
		include: {
			...registrationInclude,
			student: { include: { user: true } },
		},
	});

	if (!registration) {
		throw new AppError(httpStatus.NOT_FOUND, "Registration not found");
	}

	// Students can only view their own registrations
	if (role === Role.STUDENT) {
		const student = await prisma.studentProfile.findUnique({
			where: { userId },
		});

		if (!student || student.id !== registration.studentId) {
			throw new AppError(
				httpStatus.FORBIDDEN,
				"You are not allowed to view this registration",
			);
		}
	}

	return registration;
};

const cancelRegistration = async (
	userId: string,
	role: Role,
	registrationId: string,
) => {
	const registration = await prisma.courseRegistration.findFirst({
		where: { id: registrationId, isDeleted: false },
		include: {
			...registrationInclude,
			student: true,
		},
	});

	if (!registration) {
		throw new AppError(httpStatus.NOT_FOUND, "Registration not found");
	}

	// Students can only cancel their own registrations
	if (role === Role.STUDENT) {
		const student = await prisma.studentProfile.findUnique({
			where: { userId },
		});

		if (!student || student.id !== registration.studentId) {
			throw new AppError(
				httpStatus.FORBIDDEN,
				"You are not allowed to cancel this registration",
			);
		}
	}

	if (registration.status !== RegistrationStatus.ENROLLED) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Only confirmed (enrolled) registrations can be cancelled",
		);
	}

	// Refund only allowed before the section's semester starts
	const semesterStart = registration.courseSection.semester.startDate;
	if (semesterStart.getTime() <= Date.now()) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Refund is only allowed before the section starts",
		);
	}

	const payment = registration.payment;

	if (payment && payment.status === PaymentStatus.SUCCEEDED && payment.bkashTrxId) {
		const refundResponse = await bkashRefundPayment({
			paymentID: payment.bkashPaymentId!,
			trxID: payment.bkashTrxId,
			amount: payment.amount.toFixed(2),
			sku: payment.merchantInvoiceNumber ?? "course-registration",
			reason: "Course registration cancelled by student",
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

	return prisma.courseRegistration.update({
		where: { id: registrationId },
		data: { status: RegistrationStatus.CANCELLED },
	});
};

export const CourseRegistrationService = {
	enrollCourse,
	handlePaymentCallback,
	getMyRegistrations,
	getAllRegistrations,
	getRegistrationById,
	cancelRegistration,
};