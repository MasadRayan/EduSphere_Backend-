import config from "../../config";
import type { IInvoiceMailPayload } from "../courseRegistration/courseRegistration.interface";

/**
 * Shape shared by the payment callback query and the enrollment lookup. Only
 * the fields printed on the invoice are required, so both can feed the same
 * payload builder.
 */
export type InvoiceEnrollment = {
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

export const buildInvoicePayload = (
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
