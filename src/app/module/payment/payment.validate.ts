import httpStatus from "http-status";
import z from "zod";
import { PaymentPurpose, PaymentStatus } from "../../../generated/prisma/enums";
import { AppError } from "../../utils/AppError";
import type { IPaymentListQuery } from "./payment.interface";

const PaymentListQueryZodSchema = z.object({
	status: z.nativeEnum(PaymentStatus).optional(),
	purpose: z.nativeEnum(PaymentPurpose).optional(),
	semesterId: z.string().min(1).optional(),
	studentId: z.string().min(1).optional(),
	page: z.string().min(1).optional(),
	limit: z.string().min(1).optional(),
	startDate: z.string().min(1).optional(),
	endDate: z.string().min(1).optional(),
});

export const parsePaymentListQuery = (
	query: Record<string, unknown>,
): IPaymentListQuery => {
	const result = PaymentListQueryZodSchema.safeParse(query);

	if (!result.success) {
		throw new AppError(httpStatus.BAD_REQUEST, result.error.issues[0].message);
	}

	const { startDate, endDate, ...rest } = result.data;

	let parsedStart: Date | undefined;
	let parsedEnd: Date | undefined;

	if (startDate) {
		parsedStart = new Date(startDate);
		if (Number.isNaN(parsedStart.getTime())) {
			throw new AppError(
				httpStatus.BAD_REQUEST,
				"startDate must be a valid date",
			);
		}
	}

	if (endDate) {
		parsedEnd = new Date(endDate);
		if (Number.isNaN(parsedEnd.getTime())) {
			throw new AppError(
				httpStatus.BAD_REQUEST,
				"endDate must be a valid date",
			);
		}
	}

	if (parsedStart && parsedEnd && parsedStart > parsedEnd) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"startDate cannot be after endDate",
		);
	}

	return {
		...rest,
		startDate: parsedStart,
		endDate: parsedEnd,
	};
};
