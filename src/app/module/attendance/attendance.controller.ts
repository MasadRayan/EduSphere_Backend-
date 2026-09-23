import type { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import type { IRequestUser } from "../auth/auth.interface";
import type { IGetAttendanceQuery } from "./attendance.interface";
import { AttendanceService } from "./attendance.service";

const markAttendance = catchAsync(async (req: Request, res: Response) => {
	const user = req.user as IRequestUser;
	const result = await AttendanceService.markAttendance(req.body, user);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Attendance marked successfully",
		data: result,
	});
});

const getAttendance = catchAsync(async (req: Request, res: Response) => {
	const user = req.user as IRequestUser;
	const result = await AttendanceService.getAttendance(
		req.query as unknown as IGetAttendanceQuery,
		user,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Attendance fetched successfully",
		data: result,
	});
});

export const AttendanceController = {
	markAttendance,
	getAttendance,
};
