import httpStatus from "http-status";
import type { Prisma } from "../../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import type {
	IAssignInstructorPayload,
	ICreateSectionPayload,
	ISectionQuery,
	IUpdateSectionPayload,
} from "./section.interface";

const sectionInclude = {
	course: true,
	semester: true,
	instructor: {
		include: {
			user: {
				select: {
					name: true,
					email: true,
				},
			},
		},
	},
} satisfies Prisma.SectionInclude;

const ensureCourseExists = async (courseId: string) => {
	const course = await prisma.course.findFirst({
		where: { id: courseId, isDeleted: false },
	});

	if (!course) {
		throw new AppError(httpStatus.NOT_FOUND, "Course not found");
	}

	return course;
};

const ensureSemesterExists = async (semesterId: string) => {
	const semester = await prisma.semester.findUnique({
		where: { id: semesterId },
	});

	if (!semester) {
		throw new AppError(httpStatus.NOT_FOUND, "Semester not found");
	}

	return semester;
};

const ensureInstructorExists = async (instructorId: string) => {
	const instructor = await prisma.instructorProfile.findFirst({
		where: { id: instructorId, isDeleted: false },
	});

	if (!instructor) {
		throw new AppError(httpStatus.NOT_FOUND, "Instructor not found");
	}

	return instructor;
};

const ensureUniqueSection = async (
	sectionCode: string,
	courseId: string,
	semesterId: string,
	ignoreId?: string,
) => {
	const existingSection = await prisma.section.findFirst({
		where: {
			sectionCode,
			courseId,
			semesterId,
			id: ignoreId ? { not: ignoreId } : undefined,
		},
	});

	if (existingSection) {
		throw new AppError(
			httpStatus.CONFLICT,
			"Section with this code already exists for this course and semester",
		);
	}
};

const createSection = async (payload: ICreateSectionPayload) => {
	await ensureCourseExists(payload.courseId);
	await ensureSemesterExists(payload.semesterId);

	if (payload.instructorId) {
		await ensureInstructorExists(payload.instructorId);
	}

	await ensureUniqueSection(
		payload.sectionCode,
		payload.courseId,
		payload.semesterId,
	);

	return prisma.section.create({
		data: {
			courseId: payload.courseId,
			semesterId: payload.semesterId,
			sectionCode: payload.sectionCode,
			instructorId: payload.instructorId ?? null,
			capacity: payload.capacity,
			schedule: payload.schedule,
		},
		include: sectionInclude,
	});
};

const getAllSections = async (query: ISectionQuery) => {
	const page = Math.max(1, Number(query.page) || 1);
	const limit = Math.max(1, Math.min(100, Number(query.limit) || 10));
	const skip = (page - 1) * limit;

	const where: Prisma.SectionWhereInput = { isDeleted: false };

	if (query.courseId) {
		where.courseId = query.courseId;
	}

	if (query.semesterId) {
		where.semesterId = query.semesterId;
	}

	if (query.instructorId) {
		where.instructorId = query.instructorId;
	}

	const [data, total] = await prisma.$transaction([
		prisma.section.findMany({
			where,
			skip,
			take: limit,
			orderBy: { createdAt: "desc" },
			include: sectionInclude,
		}),
		prisma.section.count({ where }),
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

const getSectionById = async (id: string) => {
	const section = await prisma.section.findFirst({
		where: { id, isDeleted: false },
		include: sectionInclude,
	});

	if (!section) {
		throw new AppError(httpStatus.NOT_FOUND, "Section not found");
	}

	return section;
};

const updateSection = async (id: string, payload: IUpdateSectionPayload) => {
	const existing = await getSectionById(id);

	if (payload.instructorId) {
		await ensureInstructorExists(payload.instructorId);
	}

	if (payload.sectionCode && payload.sectionCode !== existing.sectionCode) {
		await ensureUniqueSection(
			payload.sectionCode,
			existing.courseId,
			existing.semesterId,
			id,
		);
	}

	return prisma.section.update({
		where: { id },
		data: {
			sectionCode: payload.sectionCode,
			instructorId: payload.instructorId,
			capacity: payload.capacity,
			schedule: payload.schedule,
		},
		include: sectionInclude,
	});
};

const assignInstructor = async (
	id: string,
	payload: IAssignInstructorPayload,
) => {
	await getSectionById(id);
	await ensureInstructorExists(payload.instructorId);

	return prisma.section.update({
		where: { id },
		data: { instructorId: payload.instructorId },
		include: sectionInclude,
	});
};

const deleteSection = async (id: string) => {
	const section = await prisma.section.findUnique({ where: { id } });

	if (!section) {
		throw new AppError(httpStatus.NOT_FOUND, "Section not found");
	}

	return prisma.section.delete({ where: { id } });
};

export const SectionService = {
	createSection,
	getAllSections,
	getSectionById,
	updateSection,
	assignInstructor,
	deleteSection,
};
