import type {
	PaymentPurpose,
	PaymentStatus,
} from "../../../generated/prisma/enums";

export interface IPaymentListQuery {
	status?: PaymentStatus;
	purpose?: PaymentPurpose;
	semesterId?: string;
	studentId?: string;
	startDate?: Date;
	endDate?: Date;
	page?: string;
	limit?: string;
}
