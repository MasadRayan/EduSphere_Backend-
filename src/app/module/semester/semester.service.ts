import httpStatus from "http-status";
import type { Prisma } from "../../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import type {
	ICreateSemesterPayload,
	ISemesterQuery,
	IUpdateSemesterPayload,
} from "./semester.interface";

const semesterInclude = {
	_count: {
		select: {
			courseSections: true,
			students: true,
		},
	},
} satisfies Prisma.SemesterInclude;

const ensureUniqueSemester = async (
	name: string,
	year: number,
	ignoreId?: string,
) => {
	const existingSemester = await prisma.semester.findFirst({
		where: {
			name,
			year,
			id: ignoreId ? { not: ignoreId } : undefined,
		},
	});

	if (existingSemester) {
		throw new AppError(
			httpStatus.CONFLICT,
			"Semester with this name and year already exists",
		);
	}
};

const createSemester = async (payload: ICreateSemesterPayload) => {
	await ensureUniqueSemester(payload.name, payload.year);

	const data = {
		name: payload.name,
		year: payload.year,
		startDate: payload.startDate,
		endDate: payload.endDate,
		registrationDeadline: payload.registrationDeadline,
		isActive: payload.isActive ?? false,
	};

	if (data.isActive) {
		return prisma.$transaction(async (tx) => {
			await tx.semester.updateMany({
				where: { isActive: true },
				data: { isActive: false },
			});

			return tx.semester.create({ data, include: semesterInclude });
		});
	}

	return prisma.semester.create({ data, include: semesterInclude });
};

const getAllSemesters = async (query: ISemesterQuery) => {
	const page = Math.max(1, Number(query.page) || 1);
	const limit = Math.max(1, Math.min(100, Number(query.limit) || 10));
	const skip = (page - 1) * limit;

	const where: Prisma.SemesterWhereInput = {};

	if (query.year) {
		const year = Number(query.year);
		if (!Number.isNaN(year)) {
			where.year = year;
		}
	}

	if (query.isActive !== undefined) {
		where.isActive = query.isActive === "true";
	}

	if (query.searchTerm) {
		where.name = { contains: query.searchTerm, mode: "insensitive" };
	}

	const [data, total] = await prisma.$transaction([
		prisma.semester.findMany({
			where,
			skip,
			take: limit,
			orderBy: [{ year: "desc" }, { startDate: "desc" }],
			include: semesterInclude,
		}),
		prisma.semester.count({ where }),
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

const getSemesterById = async (id: string) => {
	const semester = await prisma.semester.findUnique({
		where: { id },
		include: semesterInclude,
	});

	if (!semester) {
		throw new AppError(httpStatus.NOT_FOUND, "Semester not found");
	}

	return semester;
};

const updateSemester = async (id: string, payload: IUpdateSemesterPayload) => {
	const existing = await getSemesterById(id);

	const nextName = payload.name ?? existing.name;
	const nextYear = payload.year ?? existing.year;

	if (payload.name !== undefined || payload.year !== undefined) {
		await ensureUniqueSemester(nextName, nextYear, id);
	}

	const nextStartDate = payload.startDate ?? existing.startDate;
	const nextEndDate = payload.endDate ?? existing.endDate;

	if (nextStartDate >= nextEndDate) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"startDate must be before endDate",
		);
	}

	const nextDeadline =
		payload.registrationDeadline ?? existing.registrationDeadline;

	if (nextDeadline && nextDeadline > nextEndDate) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"registrationDeadline must be on or before endDate",
		);
	}

	const data = {
		name: payload.name,
		year: payload.year,
		startDate: payload.startDate,
		endDate: payload.endDate,
		registrationDeadline: payload.registrationDeadline,
		isActive: payload.isActive,
	};

	if (payload.isActive) {
		return prisma.$transaction(async (tx) => {
			await tx.semester.updateMany({
				where: { isActive: true, id: { not: id } },
				data: { isActive: false },
			});

			return tx.semester.update({
				where: { id },
				data,
				include: semesterInclude,
			});
		});
	}

	return prisma.semester.update({
		where: { id },
		data,
		include: semesterInclude,
	});
};

const deleteSemester = async (id: string) => {
	const semester = await prisma.semester.findUnique({ where: { id } });

	if (!semester) {
		throw new AppError(httpStatus.NOT_FOUND, "Semester not found");
	}

	const courseSectionCount = await prisma.courseSection.count({
		where: { semesterId: id },
	});

	if (courseSectionCount > 0) {
		throw new AppError(
			httpStatus.CONFLICT,
			"Semester has course sections; delete or move them first",
		);
	}

	return prisma.semester.delete({ where: { id } });
};

export const SemesterService = {
	createSemester,
	getAllSemesters,
	getSemesterById,
	updateSemester,
	deleteSemester,
};
