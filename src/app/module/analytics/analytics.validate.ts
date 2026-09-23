import httpStatus from "http-status";
import z from "zod";
import { AppError } from "../../utils/AppError";

export const AnalyticsQueryZodSchema = z.object({
	semesterId: z.string().min(1).optional(),
	startDate: z.string().min(1).optional(),
	endDate: z.string().min(1).optional(),
});

export type IAnalyticsQueryResult = {
	semesterId?: string;
	startDate?: Date;
	endDate?: Date;
};

export const parseAnalyticsQuery = (
	query: Record<string, unknown>,
): IAnalyticsQueryResult => {
	const result = AnalyticsQueryZodSchema.safeParse(query);

	if (!result.success) {
		throw new AppError(httpStatus.BAD_REQUEST, result.error.issues[0].message);
	}

	const { semesterId, startDate, endDate } = result.data;

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
		semesterId,
		startDate: parsedStart,
		endDate: parsedEnd,
	};
};
