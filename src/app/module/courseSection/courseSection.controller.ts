import type { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import type { ICourseSectionQuery } from "./courseSection.interface";
import { CourseSectionService } from "./courseSection.service";

const createCourseSection = catchAsync(async (req: Request, res: Response) => {
	const result = await CourseSectionService.createCourseSection(req.body);

	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: "Course section created successfully",
		data: result,
	});
});

const getAllCourseSections = catchAsync(async (req: Request, res: Response) => {
	const result = await CourseSectionService.getAllCourseSections(
		req.query as unknown as ICourseSectionQuery,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Course sections fetched successfully",
		data: result.data,
		meta: result.meta,
	});
});

const getCourseSectionById = catchAsync(async (req: Request, res: Response) => {
	const id = req.params.id as string;
	const result = await CourseSectionService.getCourseSectionById(id);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Course section fetched successfully",
		data: result,
	});
});

const updateCourseSection = catchAsync(async (req: Request, res: Response) => {
	const id = req.params.id as string;
	const result = await CourseSectionService.updateCourseSection(id, req.body);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Course section updated successfully",
		data: result,
	});
});

const assignInstructor = catchAsync(async (req: Request, res: Response) => {
	const id = req.params.id as string;
	const result = await CourseSectionService.assignInstructor(id, req.body);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Instructor assigned successfully",
		data: result,
	});
});

const deleteCourseSection = catchAsync(async (req: Request, res: Response) => {
	const id = req.params.id as string;
	const result = await CourseSectionService.deleteCourseSection(id);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Course section deleted successfully",
		data: result,
	});
});

export const CourseSectionController = {
	createCourseSection,
	getAllCourseSections,
	getCourseSectionById,
	updateCourseSection,
	assignInstructor,
	deleteCourseSection,
};
