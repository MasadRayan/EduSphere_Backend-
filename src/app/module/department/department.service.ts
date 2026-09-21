import httpStatus from "http-status";
import type { Prisma } from "../../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import type {
	ICreateDepartmentPayload,
	IDepartmentQuery,
	IUpdateDepartmentPayload,
} from "./department.interface";

const ensureUniqueDepartment = async (
	name?: string,
	code?: string,
	ignoreId?: string,
) => {
	if (name) {
		const existingByName = await prisma.department.findFirst({
			where: {
				name,
				id: ignoreId ? { not: ignoreId } : undefined,
			},
		});

		if (existingByName) {
			throw new AppError(
				httpStatus.CONFLICT,
				"Department with this name already exists",
			);
		}
	}

	if (code) {
		const existingByCode = await prisma.department.findFirst({
			where: {
				code,
				id: ignoreId ? { not: ignoreId } : undefined,
			},
		});

		if (existingByCode) {
			throw new AppError(
				httpStatus.CONFLICT,
				"Department with this code already exists",
			);
		}
	}
};

const createDepartment = async (payload: ICreateDepartmentPayload) => {
	await ensureUniqueDepartment(payload.name, payload.code);

	return prisma.department.create({
		data: {
			name: payload.name,
			code: payload.code,
		},
	});
};

const getAllDepartments = async (query: IDepartmentQuery) => {
	const page = Math.max(1, Number(query.page) || 1);
	const limit = Math.max(1, Math.min(100, Number(query.limit) || 10));
	const skip = (page - 1) * limit;

	const where: Prisma.DepartmentWhereInput = { isDeleted: false };

	if (query.searchTerm) {
		where.OR = [
			{ name: { contains: query.searchTerm, mode: "insensitive" } },
			{ code: { contains: query.searchTerm, mode: "insensitive" } },
		];
	}

	const [data, total] = await prisma.$transaction([
		prisma.department.findMany({
			where,
			skip,
			take: limit,
			orderBy: { createdAt: "desc" },
		}),
		prisma.department.count({ where }),
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

const getDepartmentById = async (id: string) => {
	const department = await prisma.department.findFirst({
		where: { id, isDeleted: false },
	});

	if (!department) {
		throw new AppError(httpStatus.NOT_FOUND, "Department not found");
	}

	return department;
};

const updateDepartment = async (
	id: string,
	payload: IUpdateDepartmentPayload,
) => {
	await getDepartmentById(id);
	await ensureUniqueDepartment(payload.name, payload.code, id);

	return prisma.department.update({
		where: { id },
		data: {
			name: payload.name,
			code: payload.code,
		},
	});
};

const deleteDepartment = async (id: string) => {
	const department = await prisma.department.findUnique({ where: { id } });

	if (!department) {
		throw new AppError(httpStatus.NOT_FOUND, "Department not found");
	}

	return prisma.department.delete({ where: { id } });
};

export const DepartmentService = {
	createDepartment,
	getAllDepartments,
	getDepartmentById,
	updateDepartment,
	deleteDepartment,
};
