import type { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import type { IRequestUser } from "../auth/auth.interface";
import type {
	IUpdateUserRolePayload,
	IUpdateUserStatusPayload,
	IUsersQuery,
} from "./user.interface";
import { UserService } from "./user.service";
import { UserValidation } from "./user.validate";

const getAllUsers = catchAsync(async (req: Request, res: Response) => {
	const query = UserValidation.parseUsersQuery(
		req.query as Record<string, unknown>,
	) as IUsersQuery;
	const result = await UserService.getAllUsers(query);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Users retrieved successfully",
		data: result.data,
		meta: result.meta,
	});
});

const getUserById = catchAsync(async (req: Request, res: Response) => {
	const id = req.params.id as string;
	const user = await UserService.getUserById(id);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "User retrieved successfully",
		data: user,
	});
});

const updateUserRole = catchAsync(async (req: Request, res: Response) => {
	const user = req.user as IRequestUser;
	const id = req.params.id as string;
	const result = await UserService.updateUserRole(
		id,
		req.body as IUpdateUserRolePayload,
		user.userId,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "User role updated successfully",
		data: result,
	});
});

const updateUserStatus = catchAsync(async (req: Request, res: Response) => {
	const user = req.user as IRequestUser;
	const id = req.params.id as string;
	const result = await UserService.updateUserStatus(
		id,
		req.body as IUpdateUserStatusPayload,
		user.userId,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "User status updated successfully",
		data: result,
	});
});

const deleteUser = catchAsync(async (req: Request, res: Response) => {
	const user = req.user as IRequestUser;
	const id = req.params.id as string;
	const result = await UserService.deleteUser(id, user.userId);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "User deleted successfully",
		data: result,
	});
});

export const UserController = {
	getAllUsers,
	getUserById,
	updateUserRole,
	updateUserStatus,
	deleteUser,
};
