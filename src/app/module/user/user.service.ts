import httpStatus from "http-status";
import type { Prisma } from "../../../generated/prisma/client";
import { Role, UserStatus } from "../../../generated/prisma/enums";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import type {
	IUpdateUserRolePayload,
	IUpdateUserStatusPayload,
	IUsersQuery,
} from "./user.interface";

const userOmit = {
	password: true,
	resetPasswordToken: true,
	resetPasswordExpiresAt: true,
	passwordChangedAt: true,
} satisfies Prisma.UserOmit;

const userInclude = {
	studentProfile: {
		select: {
			id: true,
			studentId: true,
			cgpa: true,
			currentSemester: { select: { id: true, name: true, year: true } },
		},
	},
	instructorProfile: {
		select: { id: true, designation: true },
	},
	studentApplication: { select: { id: true, status: true } },
	instructorApplication: { select: { id: true, status: true } },
} satisfies Prisma.UserInclude;

const getUserByIdOrThrow = async (id: string) => {
	const user = await prisma.user.findFirst({
		where: { id, isDeleted: false },
	});

	if (!user) {
		throw new AppError(httpStatus.NOT_FOUND, "User not found");
	}

	return user;
};

const getAllUsers = async (query: IUsersQuery) => {
	const page = Math.max(1, Number(query.page) || 1);
	const limit = Math.max(1, Math.min(100, Number(query.limit) || 10));
	const skip = (page - 1) * limit;

	const where: Prisma.UserWhereInput = { isDeleted: false };

	if (query.role) {
		where.role = query.role;
	}

	if (query.status) {
		where.status = query.status;
	}

	if (query.searchTerm) {
		where.OR = [
			{ name: { contains: query.searchTerm, mode: "insensitive" } },
			{ email: { contains: query.searchTerm, mode: "insensitive" } },
		];
	}

	const [data, total] = await prisma.$transaction([
		prisma.user.findMany({
			where,
			skip,
			take: limit,
			orderBy: { createdAt: "desc" },
			omit: userOmit,
			include: userInclude,
		}),
		prisma.user.count({ where }),
	]);

	return {
		data,
		meta: {
			page,
			limit,
			total,
			totalPages: Math.ceil(total / limit),
		},
	};
};

const getUserById = async (id: string) => {
	await getUserByIdOrThrow(id);

	return prisma.user.findUniqueOrThrow({
		where: { id },
		omit: userOmit,
		include: userInclude,
	});
};

const updateUserRole = async (
	id: string,
	payload: IUpdateUserRolePayload,
	actingUserId: string,
) => {
	const user = await getUserByIdOrThrow(id);

	if (user.id === actingUserId && user.role !== payload.role) {
		throw new AppError(httpStatus.FORBIDDEN, "You cannot change your own role");
	}

	if (
		user.role === Role.SUPER_ADMIN &&
		payload.role !== Role.SUPER_ADMIN &&
		actingUserId !== user.id
	) {
		const remainingSuperAdmins = await prisma.user.count({
			where: {
				role: Role.SUPER_ADMIN,
				status: UserStatus.ACTIVE,
				isDeleted: false,
				id: { not: user.id },
			},
		});

		if (remainingSuperAdmins === 0) {
			throw new AppError(
				httpStatus.CONFLICT,
				"Cannot demote the last SUPER_ADMIN",
			);
		}
	}

	return prisma.user.update({
		where: { id: user.id },
		data: { role: payload.role },
		omit: userOmit,
	});
};

const updateUserStatus = async (
	id: string,
	payload: IUpdateUserStatusPayload,
	actingUserId: string,
) => {
	const user = await getUserByIdOrThrow(id);

	if (user.id === actingUserId && user.status !== payload.status) {
		throw new AppError(
			httpStatus.FORBIDDEN,
			"You cannot block or unblock yourself",
		);
	}

	return prisma.user.update({
		where: { id: user.id },
		data: { status: payload.status },
		omit: userOmit,
	});
};

const deleteUser = async (id: string, actingUserId: string) => {
	const user = await getUserByIdOrThrow(id);

	if (user.id === actingUserId) {
		throw new AppError(httpStatus.FORBIDDEN, "You cannot delete yourself");
	}

	if (user.role === Role.SUPER_ADMIN) {
		const actingUser = await prisma.user.findUnique({
			where: { id: actingUserId },
		});

		if (actingUser?.role !== Role.SUPER_ADMIN) {
			throw new AppError(
				httpStatus.FORBIDDEN,
				"Only a SUPER_ADMIN can delete another SUPER_ADMIN",
			);
		}
	}

	return prisma.user.update({
		where: { id: user.id },
		data: { isDeleted: true, status: UserStatus.DELETED },
		omit: userOmit,
	});
};

export const UserService = {
	getAllUsers,
	getUserById,
	updateUserRole,
	updateUserStatus,
	deleteUser,
};
