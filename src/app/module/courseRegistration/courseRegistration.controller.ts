import type { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import type { IRegistrationQuery } from "./courseRegistration.interface";
import { CourseRegistrationService } from "./courseRegistration.service";

const enrollCourse = catchAsync(async (req: Request, res: Response) => {
	const userId = req.user!.userId;
	const result = await CourseRegistrationService.enrollCourse(
		userId,
		req.body,
	);

	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: "Enrollment initiated. Please complete payment via bKash.",
		data: result,
	});
});

const handlePaymentCallback = catchAsync(async (req: Request, res: Response) => {
	const result = await CourseRegistrationService.handlePaymentCallback(
		req.query as Record<string, string>,
	);

	res.redirect(result.redirectUrl);
});

const getMyRegistrations = catchAsync(async (req: Request, res: Response) => {
	const result = await CourseRegistrationService.getMyRegistrations(
		req.user!.userId,
		req.query as unknown as IRegistrationQuery,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Registrations fetched successfully",
		data: result.data,
		meta: result.meta,
	});
});

const getAllRegistrations = catchAsync(async (req: Request, res: Response) => {
	const result = await CourseRegistrationService.getAllRegistrations(
		req.query as unknown as IRegistrationQuery,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Registrations fetched successfully",
		data: result.data,
		meta: result.meta,
	});
});

const getRegistrationById = catchAsync(async (req: Request, res: Response) => {
	const result = await CourseRegistrationService.getRegistrationById(
		req.user!.userId,
		req.user!.role,
		req.params.id as string,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Registration fetched successfully",
		data: result,
	});
});

const cancelRegistration = catchAsync(async (req: Request, res: Response) => {
	const result = await CourseRegistrationService.cancelRegistration(
		req.user!.userId,
		req.user!.role,
		req.params.id as string,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Registration cancelled. Refund processed.",
		data: result,
	});
});

export const CourseRegistrationController = {
	enrollCourse,
	handlePaymentCallback,
	getMyRegistrations,
	getAllRegistrations,
	getRegistrationById,
	cancelRegistration,
};