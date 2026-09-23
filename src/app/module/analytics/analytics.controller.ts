import type { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import type { IRequestUser } from "../auth/auth.interface";
import { AnalyticsService } from "./analytics.service";
import { parseAnalyticsQuery } from "./analytics.validate";

const getAdminAnalytics = catchAsync(async (req: Request, res: Response) => {
	const query = parseAnalyticsQuery(req.query);
	const result = await AnalyticsService.getAdminAnalytics(query);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Admin analytics fetched successfully",
		data: result,
	});
});

const getStudentAnalytics = catchAsync(async (req: Request, res: Response) => {
	const user = req.user as IRequestUser;
	const query = parseAnalyticsQuery(req.query);
	const result = await AnalyticsService.getStudentAnalytics(query, user);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Student analytics fetched successfully",
		data: result,
	});
});

const getInstructorAnalytics = catchAsync(
	async (req: Request, res: Response) => {
		const user = req.user as IRequestUser;
		const query = parseAnalyticsQuery(req.query);
		const result = await AnalyticsService.getInstructorAnalytics(query, user);

		sendResponse(res, {
			statusCode: httpStatus.OK,
			success: true,
			message: "Instructor analytics fetched successfully",
			data: result,
		});
	},
);

export const AnalyticsController = {
	getAdminAnalytics,
	getStudentAnalytics,
	getInstructorAnalytics,
};
