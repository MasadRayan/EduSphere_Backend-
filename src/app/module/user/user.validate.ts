import httpStatus from "http-status";
import z from "zod";
import { Role, UserStatus } from "../../../generated/prisma/enums";
import { AppError } from "../../utils/AppError";
import type { IUsersQuery } from "./user.interface";

const UsersQueryZodSchema = z.object({
	role: z.nativeEnum(Role).optional(),
	status: z.nativeEnum(UserStatus).optional(),
	searchTerm: z.string().min(1).optional(),
	page: z.string().optional(),
	limit: z.string().optional(),
});

const UpdateUserRoleZodSchema = z.object({
	role: z.nativeEnum(Role),
});

const UpdateUserStatusZodSchema = z.object({
	status: z.nativeEnum(UserStatus),
});

const parseUsersQuery = (query: Record<string, unknown>): IUsersQuery => {
	const parsed = UsersQueryZodSchema.safeParse(query);

	if (!parsed.success) {
		throw new AppError(httpStatus.BAD_REQUEST, parsed.error.issues[0].message);
	}

	return parsed.data;
};

export const UserValidation = {
	UsersQueryZodSchema,
	UpdateUserRoleZodSchema,
	UpdateUserStatusZodSchema,
	parseUsersQuery,
};
