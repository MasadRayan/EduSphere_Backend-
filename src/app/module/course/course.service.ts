import httpStatus from "http-status";
import type { Prisma } from "../../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import type {
	ICourseQuery,
	ICreateCoursePayload,
	IUpdateCoursePayload,
} from "./course.interface";

const courseInclude = {
	department: true,
	prerequisites: {
		include: {
			prerequisite: true,
		},
	},
} satisfies Prisma.CourseInclude;

const ensureDepartmentExists = async (departmentId: string) => {
	const department = await prisma.department.findFirst({
		where: { id: departmentId, isDeleted: false },
	});

	if (!department) {
		throw new AppError(httpStatus.NOT_FOUND, "Department not found");
	}

	return department;
};

const ensureUniqueCourse = async (code: string, ignoreId?: string) => {
	const existingCourse = await prisma.course.findFirst({
		where: {
			code,
			id: ignoreId ? { not: ignoreId } : undefined,
		},
	});

	if (existingCourse) {
		throw new AppError(
			httpStatus.CONFLICT,
			"Course with this code already exists",
		);
	}
};

const resolvePrerequisiteIds = async (
	courseId: string | undefined,
	prerequisiteIds?: string[],
) => {
	if (prerequisiteIds === undefined) {
		return undefined;
	}

	const uniqueIds = Array.from(new Set(prerequisiteIds));

	if (uniqueIds.length !== prerequisiteIds.length) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Duplicate prerequisite course ids are not allowed",
		);
	}

	if (courseId && uniqueIds.includes(courseId)) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"A course cannot be a prerequisite of itself",
		);
	}

	if (uniqueIds.length === 0) {
		return uniqueIds;
	}

	const foundCount = await prisma.course.count({
		where: {
			id: { in: uniqueIds },
			isDeleted: false,
		},
	});

	if (foundCount !== uniqueIds.length) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"One or more prerequisite courses were not found",
		);
	}

	return uniqueIds;
};

const createCourse = async (payload: ICreateCoursePayload) => {
	await ensureDepartmentExists(payload.departmentId);
	await ensureUniqueCourse(payload.code);

	const prerequisiteIds = await resolvePrerequisiteIds(
		undefined,
		payload.prerequisiteIds,
	);

	return prisma.course.create({
		data: {
			code: payload.code,
			title: payload.title,
			creditHours: payload.creditHours,
			departmentId: payload.departmentId,
			prerequisites: prerequisiteIds?.length
				? {
						create: prerequisiteIds.map((prerequisiteId) => ({
							prerequisiteId,
						})),
					}
				: undefined,
		},
		include: courseInclude,
	});
};

const getAllCourses = async (query: ICourseQuery) => {
	const page = Math.max(1, Number(query.page) || 1);
	const limit = Math.max(1, Math.min(100, Number(query.limit) || 10));
	const skip = (page - 1) * limit;

	const where: Prisma.CourseWhereInput = { isDeleted: false };

	if (query.departmentId) {
		where.departmentId = query.departmentId;
	}

	if (query.searchTerm) {
		where.OR = [
			{ code: { contains: query.searchTerm, mode: "insensitive" } },
			{ title: { contains: query.searchTerm, mode: "insensitive" } },
		];
	}

	const [data, total] = await prisma.$transaction([
		prisma.course.findMany({
			where,
			skip,
			take: limit,
			orderBy: { createdAt: "desc" },
			include: courseInclude,
		}),
		prisma.course.count({ where }),
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

const getCourseById = async (id: string) => {
	const course = await prisma.course.findFirst({
		where: { id, isDeleted: false },
		include: courseInclude,
	});

	if (!course) {
		throw new AppError(httpStatus.NOT_FOUND, "Course not found");
	}

	return course;
};

const updateCourse = async (id: string, payload: IUpdateCoursePayload) => {
	await getCourseById(id);

	if (payload.departmentId) {
		await ensureDepartmentExists(payload.departmentId);
	}

	if (payload.code) {
		await ensureUniqueCourse(payload.code, id);
	}

	const prerequisiteIds = await resolvePrerequisiteIds(
		id,
		payload.prerequisiteIds,
	);

	return prisma.$transaction(async (tx) => {
		if (prerequisiteIds !== undefined) {
			await tx.coursePrerequisite.deleteMany({ where: { courseId: id } });

			if (prerequisiteIds.length) {
				await tx.coursePrerequisite.createMany({
					data: prerequisiteIds.map((prerequisiteId) => ({
						courseId: id,
						prerequisiteId,
					})),
				});
			}
		}

		return tx.course.update({
			where: { id },
			data: {
				code: payload.code,
				title: payload.title,
				creditHours: payload.creditHours,
				departmentId: payload.departmentId,
			},
			include: courseInclude,
		});
	});
};

const deleteCourse = async (id: string) => {
	const course = await prisma.course.findUnique({ where: { id } });

	if (!course) {
		throw new AppError(httpStatus.NOT_FOUND, "Course not found");
	}

	return prisma.course.delete({ where: { id } });
};

export const CourseService = {
	createCourse,
	getAllCourses,
	getCourseById,
	updateCourse,
	deleteCourse,
};
