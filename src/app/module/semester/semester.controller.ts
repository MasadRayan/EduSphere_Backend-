import type { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import type { ISemesterQuery } from "./semester.interface";
import { SemesterService } from "./semester.service";

const createSemester = catchAsync(async (req: Request, res: Response) => {
	const result = await SemesterService.createSemester(req.body);

	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: "Semester created successfully",
		data: result,
	});
});

const getAllSemesters = catchAsync(async (req: Request, res: Response) => {
	const result = await SemesterService.getAllSemesters(
		req.query as unknown as ISemesterQuery,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Semesters fetched successfully",
		data: result.data,
		meta: result.meta,
	});
});

const getSemesterById = catchAsync(async (req: Request, res: Response) => {
	const id = req.params.id as string;
	const result = await SemesterService.getSemesterById(id);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Semester fetched successfully",
		data: result,
	});
});

const updateSemester = catchAsync(async (req: Request, res: Response) => {
	const id = req.params.id as string;
	const result = await SemesterService.updateSemester(id, req.body);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Semester updated successfully",
		data: result,
	});
});

const deleteSemester = catchAsync(async (req: Request, res: Response) => {
	const id = req.params.id as string;
	const result = await SemesterService.deleteSemester(id);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Semester deleted successfully",
		data: result,
	});
});

export const SemesterController = {
	createSemester,
	getAllSemesters,
	getSemesterById,
	updateSemester,
	deleteSemester,
};
