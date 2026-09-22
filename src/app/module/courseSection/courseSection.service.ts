import httpStatus from "http-status";
import type { Prisma } from "../../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import type {
	IAssignInstructorPayload,
	ICourseSectionQuery,
	ICreateCourseSectionPayload,
	IUpdateCourseSectionPayload,
} from "./courseSection.interface";

const courseSectionInclude = {
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
} satisfies Prisma.CourseSectionInclude;

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

const ensureUniqueCourseSection = async (
	sectionCode: string,
	courseId: string,
	semesterId: string,
	ignoreId?: string,
) => {
	const existingCourseSection = await prisma.courseSection.findFirst({
		where: {
			sectionCode,
			courseId,
			semesterId,
			id: ignoreId ? { not: ignoreId } : undefined,
		},
	});

	if (existingCourseSection) {
		throw new AppError(
			httpStatus.CONFLICT,
			"Course section with this code already exists for this course and semester",
		);
	}
};

const createCourseSection = async (payload: ICreateCourseSectionPayload) => {
	await ensureCourseExists(payload.courseId);
	await ensureSemesterExists(payload.semesterId);

	if (payload.instructorId) {
		await ensureInstructorExists(payload.instructorId);
	}

	await ensureUniqueCourseSection(
		payload.sectionCode,
		payload.courseId,
		payload.semesterId,
	);

	return prisma.courseSection.create({
		data: {
			courseId: payload.courseId,
			semesterId: payload.semesterId,
			sectionCode: payload.sectionCode,
			instructorId: payload.instructorId ?? null,
			capacity: payload.capacity,
			schedule: payload.schedule,
		},
		include: courseSectionInclude,
	});
};

const getAllCourseSections = async (query: ICourseSectionQuery) => {
	const page = Math.max(1, Number(query.page) || 1);
	const limit = Math.max(1, Math.min(100, Number(query.limit) || 10));
	const skip = (page - 1) * limit;

	const where: Prisma.CourseSectionWhereInput = { isDeleted: false };

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
		prisma.courseSection.findMany({
			where,
			skip,
			take: limit,
			orderBy: { createdAt: "desc" },
			include: courseSectionInclude,
		}),
		prisma.courseSection.count({ where }),
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

const getCourseSectionById = async (id: string) => {
	const courseSection = await prisma.courseSection.findFirst({
		where: { id, isDeleted: false },
		include: courseSectionInclude,
	});

	if (!courseSection) {
		throw new AppError(httpStatus.NOT_FOUND, "Course section not found");
	}

	return courseSection;
};

const updateCourseSection = async (
	id: string,
	payload: IUpdateCourseSectionPayload,
) => {
	const existing = await getCourseSectionById(id);

	if (payload.instructorId) {
		await ensureInstructorExists(payload.instructorId);
	}

	if (payload.sectionCode && payload.sectionCode !== existing.sectionCode) {
		await ensureUniqueCourseSection(
			payload.sectionCode,
			existing.courseId,
			existing.semesterId,
			id,
		);
	}

	return prisma.courseSection.update({
		where: { id },
		data: {
			sectionCode: payload.sectionCode,
			instructorId: payload.instructorId,
			capacity: payload.capacity,
			schedule: payload.schedule,
		},
		include: courseSectionInclude,
	});
};

const assignInstructor = async (
	id: string,
	payload: IAssignInstructorPayload,
) => {
	await getCourseSectionById(id);
	await ensureInstructorExists(payload.instructorId);

	return prisma.courseSection.update({
		where: { id },
		data: { instructorId: payload.instructorId },
		include: courseSectionInclude,
	});
};

const deleteCourseSection = async (id: string) => {
	const courseSection = await prisma.courseSection.findUnique({
		where: { id },
	});

	if (!courseSection) {
		throw new AppError(httpStatus.NOT_FOUND, "Course section not found");
	}

	return prisma.courseSection.delete({ where: { id } });
};

export const CourseSectionService = {
	createCourseSection,
	getAllCourseSections,
	getCourseSectionById,
	updateCourseSection,
	assignInstructor,
	deleteCourseSection,
};
