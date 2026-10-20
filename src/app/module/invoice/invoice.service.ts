import httpStatus from "http-status";
import { PaymentStatus, type Role } from "../../../generated/prisma/enums";
import { AppError } from "../../utils/AppError";
import { buildEnrollmentInvoicePdf } from "../courseRegistration/courseRegistration.email";
import { CourseRegistrationService } from "../courseRegistration/courseRegistration.service";
import { buildInvoicePayload } from "./invoice.helper";

const getEnrollmentInvoice = async (
	userId: string,
	role: Role,
	enrollmentId: string,
) => {
	// Reuse the enrollment lookup so ownership and soft-delete rules stay in
	// one place instead of being duplicated by this module.
	const enrollment = await CourseRegistrationService.getEnrollmentById(
		userId,
		role,
		enrollmentId,
	);

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

export const InvoiceService = {
	getEnrollmentInvoice,
};
