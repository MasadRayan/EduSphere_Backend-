import type { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import type { IStudentSectionQuery } from "./studentSection.interface";
import { StudentSectionService } from "./studentSection.service";

const createStudentSection = catchAsync(async (req: Request, res: Response) => {
	const result = await StudentSectionService.createStudentSection(req.body);

	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: "Student section created successfully",
		data: result,
	});
});

const getAllStudentSections = catchAsync(
	async (req: Request, res: Response) => {
		const result = await StudentSectionService.getAllStudentSections(
			req.query as unknown as IStudentSectionQuery,
		);

		sendResponse(res, {
			statusCode: httpStatus.OK,
			success: true,
			message: "Student sections fetched successfully",
			data: result.data,
			meta: result.meta,
		});
	},
);

const getStudentSectionById = catchAsync(
	async (req: Request, res: Response) => {
		const id = req.params.id as string;
		const result = await StudentSectionService.getStudentSectionById(id);

		sendResponse(res, {
			statusCode: httpStatus.OK,
			success: true,
			message: "Student section fetched successfully",
			data: result,
		});
	},
);

const updateStudentSection = catchAsync(async (req: Request, res: Response) => {
	const id = req.params.id as string;
	const result = await StudentSectionService.updateStudentSection(id, req.body);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Student section updated successfully",
		data: result,
	});
});

const deleteStudentSection = catchAsync(async (req: Request, res: Response) => {
	const id = req.params.id as string;
	const result = await StudentSectionService.deleteStudentSection(id);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Student section deleted successfully",
		data: result,
	});
});

export const StudentSectionController = {
	createStudentSection,
	getAllStudentSections,
	getStudentSectionById,
	updateStudentSection,
	deleteStudentSection,
};
