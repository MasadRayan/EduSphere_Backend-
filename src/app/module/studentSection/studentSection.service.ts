import httpStatus from "http-status";
import type { Prisma } from "../../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import type {
	ICreateStudentSectionPayload,
	IStudentSectionQuery,
	IUpdateStudentSectionPayload,
} from "./studentSection.interface";

const studentSectionInclude = {
	program: true,
} satisfies Prisma.StudentSectionInclude;

const ensureProgramExists = async (programId: string) => {
	const program = await prisma.program.findFirst({
		where: { id: programId, isDeleted: false },
	});

	if (!program) {
		throw new AppError(httpStatus.NOT_FOUND, "Program not found");
	}

	return program;
};

const ensureUniqueSection = async (
	sectionCode: string,
	programId: string,
	enrollmentYear: number,
	ignoreId?: string,
) => {
	const existingSection = await prisma.studentSection.findFirst({
		where: {
			sectionCode,
			programId,
			enrollmentYear,
			id: ignoreId ? { not: ignoreId } : undefined,
		},
	});

	if (existingSection) {
		throw new AppError(
			httpStatus.CONFLICT,
			"Section with this code already exists for this program and year",
		);
	}
};

const getEnrolledCount = async (sectionId: string) =>
	prisma.studentProfile.count({
		where: { sectionId, isDeleted: false },
	});

const attachSeatInfo = async <T extends { id: string; capacity: number }>(
	sections: T[],
) => {
	const ids = sections.map((section) => section.id);

	if (ids.length === 0) {
		return [];
	}

	const enrolledRows = await prisma.studentProfile.groupBy({
		by: ["sectionId"],
		where: { sectionId: { in: ids }, isDeleted: false },
		_count: { _all: true },
	});

	const enrolledById = new Map(
		enrolledRows.map((row) => [row.sectionId as string, row._count._all]),
	);

	return sections.map((section) => {
		const enrolledCount = enrolledById.get(section.id) ?? 0;

		return {
			...section,
			enrolledCount,
			seatsAvailable: Math.max(0, section.capacity - enrolledCount),
		};
	});
};

const createStudentSection = async (payload: ICreateStudentSectionPayload) => {
	await ensureProgramExists(payload.programId);

	await ensureUniqueSection(
		payload.sectionCode,
		payload.programId,
		payload.enrollmentYear,
	);

	const section = await prisma.studentSection.create({
		data: {
			sectionCode: payload.sectionCode,
			programId: payload.programId,
			enrollmentYear: payload.enrollmentYear,
			capacity: payload.capacity,
		},
		include: studentSectionInclude,
	});

	const [enriched] = await attachSeatInfo([section]);

	return enriched;
};

const getAllStudentSections = async (query: IStudentSectionQuery) => {
	const page = Math.max(1, Number(query.page) || 1);
	const limit = Math.max(1, Math.min(100, Number(query.limit) || 10));
	const skip = (page - 1) * limit;

	const where: Prisma.StudentSectionWhereInput = { isDeleted: false };

	if (query.programId) {
		where.programId = query.programId;
	}

	if (query.enrollmentYear) {
		where.enrollmentYear = Number(query.enrollmentYear);
	}

	const [data, total] = await prisma.$transaction([
		prisma.studentSection.findMany({
			where,
			skip,
			take: limit,
			orderBy: { createdAt: "desc" },
			include: studentSectionInclude,
		}),
		prisma.studentSection.count({ where }),
	]);

	return {
		data: await attachSeatInfo(data),
		meta: {
			page,
			limit,
			total,
			totalPages: Math.ceil(total / limit),
		},
	};
};

const getStudentSectionById = async (id: string) => {
	const section = await prisma.studentSection.findFirst({
		where: { id, isDeleted: false },
		include: studentSectionInclude,
	});

	if (!section) {
		throw new AppError(httpStatus.NOT_FOUND, "Student section not found");
	}

	const [enriched] = await attachSeatInfo([section]);

	return enriched;
};

const updateStudentSection = async (
	id: string,
	payload: IUpdateStudentSectionPayload,
) => {
	const existing = await getStudentSectionById(id);

	if (payload.sectionCode && payload.sectionCode !== existing.sectionCode) {
		await ensureUniqueSection(
			payload.sectionCode,
			existing.programId,
			existing.enrollmentYear,
			id,
		);
	}

	if (
		payload.capacity !== undefined &&
		payload.capacity < existing.enrolledCount
	) {
		throw new AppError(
			httpStatus.CONFLICT,
			"Capacity cannot be lower than the current number of enrolled students",
		);
	}

	const section = await prisma.studentSection.update({
		where: { id },
		data: {
			sectionCode: payload.sectionCode,
			capacity: payload.capacity,
		},
		include: studentSectionInclude,
	});

	const [enriched] = await attachSeatInfo([section]);

	return enriched;
};

const deleteStudentSection = async (id: string) => {
	const section = await prisma.studentSection.findUnique({ where: { id } });

	if (!section) {
		throw new AppError(httpStatus.NOT_FOUND, "Student section not found");
	}

	const enrolledCount = await getEnrolledCount(id);

	if (enrolledCount > 0) {
		throw new AppError(
			httpStatus.CONFLICT,
			"Student section has enrolled students; reassign them first",
		);
	}

	return prisma.studentSection.delete({ where: { id } });
};

export const StudentSectionService = {
	createStudentSection,
	getAllStudentSections,
	getStudentSectionById,
	updateStudentSection,
	deleteStudentSection,
};
