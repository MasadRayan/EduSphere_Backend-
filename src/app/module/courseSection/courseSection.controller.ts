import type { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import type { ISectionQuery } from "./section.interface";
import { SectionService } from "./section.service";

const createSection = catchAsync(async (req: Request, res: Response) => {
	const result = await SectionService.createSection(req.body);

	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: "Section created successfully",
		data: result,
	});
});

const getAllSections = catchAsync(async (req: Request, res: Response) => {
	const result = await SectionService.getAllSections(
		req.query as unknown as ISectionQuery,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Sections fetched successfully",
		data: result.data,
		meta: result.meta,
	});
});

const getSectionById = catchAsync(async (req: Request, res: Response) => {
	const id = req.params.id as string;
	const result = await SectionService.getSectionById(id);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Section fetched successfully",
		data: result,
	});
});

const updateSection = catchAsync(async (req: Request, res: Response) => {
	const id = req.params.id as string;
	const result = await SectionService.updateSection(id, req.body);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Section updated successfully",
		data: result,
	});
});

const assignInstructor = catchAsync(async (req: Request, res: Response) => {
	const id = req.params.id as string;
	const result = await SectionService.assignInstructor(id, req.body);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Instructor assigned successfully",
		data: result,
	});
});

const deleteSection = catchAsync(async (req: Request, res: Response) => {
	const id = req.params.id as string;
	const result = await SectionService.deleteSection(id);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Section deleted successfully",
		data: result,
	});
});

export const SectionController = {
	createSection,
	getAllSections,
	getSectionById,
	updateSection,
	assignInstructor,
	deleteSection,
};
