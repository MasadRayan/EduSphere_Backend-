import type { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import type { IRequestUser } from "../auth/auth.interface";
import type { IGetExamsQuery } from "./exam.interface";
import { ExamService } from "./exam.service";

const createExam = catchAsync(async (req: Request, res: Response) => {
	const user = req.user as IRequestUser;
	const result = await ExamService.createExam(req.body, user);

	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: "Exam created successfully",
		data: result,
	});
});

const getAllExams = catchAsync(async (req: Request, res: Response) => {
	const user = req.user as IRequestUser;
	const result = await ExamService.getAllExams(
		req.query as unknown as IGetExamsQuery,
		user,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Exams fetched successfully",
		data: result.data,
		meta: result.meta,
	});
});

const getExam = catchAsync(async (req: Request, res: Response) => {
	const user = req.user as IRequestUser;
	const id = req.params.id as string;
	const result = await ExamService.getExam(id, user);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Exam fetched successfully",
		data: result,
	});
});

const updateExam = catchAsync(async (req: Request, res: Response) => {
	const user = req.user as IRequestUser;
	const id = req.params.id as string;
	const result = await ExamService.updateExam(id, req.body, user);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Exam updated successfully",
		data: result,
	});
});

const deleteExam = catchAsync(async (req: Request, res: Response) => {
	const user = req.user as IRequestUser;
	const id = req.params.id as string;
	const result = await ExamService.deleteExam(id, user);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Exam deleted successfully",
		data: result,
	});
});

const getExamResults = catchAsync(async (req: Request, res: Response) => {
	const user = req.user as IRequestUser;
	const examId = req.params.id as string;
	const result = await ExamService.getExamResults(examId, user);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Exam results fetched successfully",
		data: result,
	});
});

export const ExamController = {
	createExam,
	getAllExams,
	getExam,
	updateExam,
	deleteExam,
	getExamResults,
};
