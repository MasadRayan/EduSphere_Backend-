import type { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import type { ICourseQuery } from "./course.interface";
import { CourseService } from "./course.service";

const createCourse = catchAsync(async (req: Request, res: Response) => {
	const result = await CourseService.createCourse(req.body);

	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: "Course created successfully",
		data: result,
	});
});

const getAllCourses = catchAsync(async (req: Request, res: Response) => {
	const result = await CourseService.getAllCourses(
		req.query as unknown as ICourseQuery,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Courses fetched successfully",
		data: result.data,
		meta: result.meta,
	});
});

const getCourseById = catchAsync(async (req: Request, res: Response) => {
	const id = req.params.id as string;
	const result = await CourseService.getCourseById(id);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Course fetched successfully",
		data: result,
	});
});

const updateCourse = catchAsync(async (req: Request, res: Response) => {
	const id = req.params.id as string;
	const result = await CourseService.updateCourse(id, req.body);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Course updated successfully",
		data: result,
	});
});

const deleteCourse = catchAsync(async (req: Request, res: Response) => {
	const id = req.params.id as string;
	const result = await CourseService.deleteCourse(id);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Course deleted successfully",
		data: result,
	});
});

export const CourseController = {
	createCourse,
	getAllCourses,
	getCourseById,
	updateCourse,
	deleteCourse,
};
