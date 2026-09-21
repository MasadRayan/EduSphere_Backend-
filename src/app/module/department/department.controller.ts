import type { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import type { IDepartmentQuery } from "./department.interface";
import { DepartmentService } from "./department.service";

const createDepartment = catchAsync(async (req: Request, res: Response) => {
	const result = await DepartmentService.createDepartment(req.body);

	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: "Department created successfully",
		data: result,
	});
});

const getAllDepartments = catchAsync(async (req: Request, res: Response) => {
	const result = await DepartmentService.getAllDepartments(
		req.query as unknown as IDepartmentQuery,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Departments fetched successfully",
		data: result.data,
		meta: result.meta,
	});
});

const getDepartmentById = catchAsync(async (req: Request, res: Response) => {
	const id = req.params.id as string;
	const result = await DepartmentService.getDepartmentById(id);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Department fetched successfully",
		data: result,
	});
});

const updateDepartment = catchAsync(async (req: Request, res: Response) => {
	const id = req.params.id as string;
	const result = await DepartmentService.updateDepartment(id, req.body);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Department updated successfully",
		data: result,
	});
});

const deleteDepartment = catchAsync(async (req: Request, res: Response) => {
	const id = req.params.id as string;
	const result = await DepartmentService.deleteDepartment(id);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Department deleted successfully",
		data: result,
	});
});

export const DepartmentController = {
	createDepartment,
	getAllDepartments,
	getDepartmentById,
	updateDepartment,
	deleteDepartment,
};
