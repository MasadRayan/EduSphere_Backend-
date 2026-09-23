import httpStatus from "http-status";
import { Role } from "../../generated/prisma/enums";
import { prisma } from "../lib/prisma";
import type { IRequestUser } from "../module/auth/auth.interface";
import { AppError } from "./AppError";

export const getInstructorProfileId = async (userId: string) => {
	const profile = await prisma.instructorProfile.findUnique({
		where: { userId },
	});

	if (!profile) {
		throw new AppError(
			httpStatus.FORBIDDEN,
			"Instructor profile not found. Please submit your instructor application first.",
		);
	}

	if (profile.isDeleted) {
		throw new AppError(
			httpStatus.FORBIDDEN,
			"Your instructor profile is deleted. Please contact the administration for assistance.",
		);
	}

	return profile.id;
};

export const ensureSectionAccess = async (
	courseSectionId: string,
	user: IRequestUser,
) => {
	const courseSection = await prisma.courseSection.findFirst({
		where: { id: courseSectionId, isDeleted: false },
	});

	if (!courseSection) {
		throw new AppError(httpStatus.NOT_FOUND, "Course section not found");
	}

	if (user.role === Role.ADMIN || user.role === Role.SUPER_ADMIN) {
		return courseSection;
	}

	const instructorId = await getInstructorProfileId(user.userId);

	if (courseSection.instructorId !== instructorId) {
		throw new AppError(
			httpStatus.FORBIDDEN,
			"You are not assigned to this course section",
		);
	}

	return courseSection;
};
