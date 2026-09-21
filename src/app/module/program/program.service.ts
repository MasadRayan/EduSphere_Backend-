import httpStatus from "http-status";
import type { Prisma } from "../../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import type {
	ICreateProgramPayload,
	IProgramQuery,
	IUpdateProgramPayload,
} from "./program.interface";

const ensureDepartmentExists = async (departmentId: string) => {
	const department = await prisma.department.findFirst({
		where: { id: departmentId, isDeleted: false },
	});

	if (!department) {
		throw new AppError(httpStatus.NOT_FOUND, "Department not found");
	}

	return department;
};

const ensureUniqueProgram = async (
	name: string,
	departmentId: string,
	ignoreId?: string,
) => {
	const existingProgram = await prisma.program.findFirst({
		where: {
			name,
			departmentId,
			id: ignoreId ? { not: ignoreId } : undefined,
		},
	});

	if (existingProgram) {
		throw new AppError(
			httpStatus.CONFLICT,
			"Program with this name already exists in this department",
		);
	}
};

const getProgramById = async (id: string) => {
	const program = await prisma.program.findFirst({
		where: { id, isDeleted: false },
		include: { department: true },
	});

	if (!program) {
		throw new AppError(httpStatus.NOT_FOUND, "Program not found");
	}

	return program;
};

const createProgram = async (payload: ICreateProgramPayload) => {
	await ensureDepartmentExists(payload.departmentId);
	await ensureUniqueProgram(payload.name, payload.departmentId);

	return prisma.program.create({
		data: {
			name: payload.name,
			degreeType: payload.degreeType,
			totalCredits: payload.totalCredits,
			departmentId: payload.departmentId,
		},
		include: { department: true },
	});
};

const getAllPrograms = async (query: IProgramQuery) => {
	const page = Math.max(1, Number(query.page) || 1);
	const limit = Math.max(1, Math.min(100, Number(query.limit) || 10));
	const skip = (page - 1) * limit;

	const where: Prisma.ProgramWhereInput = { isDeleted: false };

	if (query.departmentId) {
		where.departmentId = query.departmentId;
	}

	if (query.searchTerm) {
		where.OR = [
			{ name: { contains: query.searchTerm, mode: "insensitive" } },
			{ degreeType: { contains: query.searchTerm, mode: "insensitive" } },
		];
	}

	const [data, total] = await prisma.$transaction([
		prisma.program.findMany({
			where,
			skip,
			take: limit,
			orderBy: { createdAt: "desc" },
			include: { department: true },
		}),
		prisma.program.count({ where }),
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

const updateProgram = async (id: string, payload: IUpdateProgramPayload) => {
	const existingProgram = await getProgramById(id);

	if (payload.departmentId) {
		await ensureDepartmentExists(payload.departmentId);
	}

	const nextName = payload.name ?? existingProgram.name;
	const nextDepartmentId = payload.departmentId ?? existingProgram.departmentId;

	if (payload.name || payload.departmentId) {
		await ensureUniqueProgram(nextName, nextDepartmentId, id);
	}

	return prisma.program.update({
		where: { id },
		data: {
			name: payload.name,
			degreeType: payload.degreeType,
			totalCredits: payload.totalCredits,
			departmentId: payload.departmentId,
		},
		include: { department: true },
	});
};

const deleteProgram = async (id: string) => {
	const program = await prisma.program.findUnique({
		where: { id },
		include: { department: true },
	});

	if (!program) {
		throw new AppError(httpStatus.NOT_FOUND, "Program not found");
	}

	return prisma.program.delete({
		where: { id },
		include: { department: true },
	});
};

export const ProgramService = {
	createProgram,
	getAllPrograms,
	getProgramById,
	updateProgram,
	deleteProgram,
};
