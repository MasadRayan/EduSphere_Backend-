import type { Request, Response } from "express";
import httpStatus from "http-status";
import type { ApplicationStatus } from "../../../generated/prisma/enums";
import { AppError } from "../../utils/AppError";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import type { IRequestUser } from "../auth/auth.interface";
import type { IInstructorQuery } from "./instructor.interface";
import { InstructorService } from "./instructor.service";

const applyForInstructor = catchAsync(async (req: Request, res: Response) => {
	const user = req.user as unknown as IRequestUser;
	const result = await InstructorService.applyForInstructor(req.body, user);

	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message:
			"Instructor application submitted successfully. Pending admin approval.",
		data: result,
	});
});

const updateApplication = catchAsync(async (req: Request, res: Response) => {
	const user = req.user as unknown as IRequestUser;
	const result = await InstructorService.updateApplication(req.body, user);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Instructor application updated and resubmitted successfully",
		data: result,
	});
});

const getMyApplication = catchAsync(async (req: Request, res: Response) => {
	const user = req.user as unknown as IRequestUser;
	const result = await InstructorService.getMyApplication(user.userId);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Application fetched successfully",
		data: result,
	});
});

const uploadResume = catchAsync(async (req: Request, res: Response) => {
	const user = req.user as unknown as IRequestUser;

	if (!req.file) {
		throw new AppError(httpStatus.BAD_REQUEST, "No file uploaded");
	}

	const result = await InstructorService.uploadResume(
		req.file.buffer,
		user.userId,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Resume uploaded successfully",
		data: result,
	});
});

const updateMyProfile = catchAsync(async (req: Request, res: Response) => {
	const user = req.user as unknown as IRequestUser;
	const result = await InstructorService.updateMyProfile(req.body, user.userId);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Profile updated successfully",
		data: result,
	});
});

const updateMyProfileImage = catchAsync(async (req: Request, res: Response) => {
	const user = req.user as unknown as IRequestUser;

	if (!req.file) {
		throw new AppError(httpStatus.BAD_REQUEST, "No image uploaded");
	}

	const result = await InstructorService.updateMyProfileImage(
		req.file.buffer,
		user.userId,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Profile image updated successfully",
		data: result,
	});
});

const getMyInfo = catchAsync(async (req: Request, res: Response) => {
	const user = req.user as unknown as IRequestUser;
	const result = await InstructorService.getMyInfo(user.userId);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "User profile fetched successfully",
		data: result,
	});
});

const getAllApplications = catchAsync(async (req: Request, res: Response) => {
	const result = await InstructorService.getAllApplications({
		status: req.query.status as ApplicationStatus | undefined,
	});

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Applications fetched successfully",
		data: result,
	});
});

const approveApplication = catchAsync(async (req: Request, res: Response) => {
	const user = req.user as unknown as IRequestUser;
	const id = req.params.id as string;
	const result = await InstructorService.approveApplication(
		id,
		req.body,
		user.userId,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Application approved and instructor assigned successfully",
		data: result,
	});
});

const rejectApplication = catchAsync(async (req: Request, res: Response) => {
	const user = req.user as unknown as IRequestUser;
	const id = req.params.id as string;
	const result = await InstructorService.rejectApplication(
		id,
		req.body,
		user.userId,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Application rejected successfully",
		data: result,
	});
});

const getAllInstructors = catchAsync(async (req: Request, res: Response) => {
	const result = await InstructorService.getAllInstructors(
		req.query as unknown as IInstructorQuery,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Instructors fetched successfully",
		data: result.data,
		meta: result.meta,
	});
});

const getInstructorById = catchAsync(async (req: Request, res: Response) => {
	const id = req.params.id as string;
	const result = await InstructorService.getInstructorById(id);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Instructor fetched successfully",
		data: result,
	});
});

const updateInstructor = catchAsync(async (req: Request, res: Response) => {
	const id = req.params.id as string;
	const result = await InstructorService.updateInstructor(id, req.body);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Instructor updated successfully",
		data: result,
	});
});

const deleteInstructor = catchAsync(async (req: Request, res: Response) => {
	const id = req.params.id as string;
	const result = await InstructorService.deleteInstructor(id);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Instructor removed successfully",
		data: result,
	});
});

export const InstructorController = {
	applyForInstructor,
	updateApplication,
	getMyApplication,
	uploadResume,
	updateMyProfile,
	updateMyProfileImage,
	getMyInfo,
	getAllApplications,
	approveApplication,
	rejectApplication,
	getAllInstructors,
	getInstructorById,
	updateInstructor,
	deleteInstructor,
};
