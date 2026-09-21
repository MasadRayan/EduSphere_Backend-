import type { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import type { IProgramQuery } from "./program.interface";
import { ProgramService } from "./program.service";

const createProgram = catchAsync(async (req: Request, res: Response) => {
	const result = await ProgramService.createProgram(req.body);

	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: "Program created successfully",
		data: result,
	});
});

const getAllPrograms = catchAsync(async (req: Request, res: Response) => {
	const result = await ProgramService.getAllPrograms(
		req.query as unknown as IProgramQuery,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Programs fetched successfully",
		data: result.data,
		meta: result.meta,
	});
});

const getProgramById = catchAsync(async (req: Request, res: Response) => {
	const id = req.params.id as string;
	const result = await ProgramService.getProgramById(id);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Program fetched successfully",
		data: result,
	});
});

const updateProgram = catchAsync(async (req: Request, res: Response) => {
	const id = req.params.id as string;
	const result = await ProgramService.updateProgram(id, req.body);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Program updated successfully",
		data: result,
	});
});

const deleteProgram = catchAsync(async (req: Request, res: Response) => {
	const id = req.params.id as string;
	const result = await ProgramService.deleteProgram(id);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Program deleted successfully",
		data: result,
	});
});

export const ProgramController = {
	createProgram,
	getAllPrograms,
	getProgramById,
	updateProgram,
	deleteProgram,
};
