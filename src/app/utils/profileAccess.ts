import httpStatus from "http-status";
import { prisma } from "../lib/prisma";
import { AppError } from "./AppError";

export const getStudentProfileId = async (userId: string) => {
	const profile = await prisma.studentProfile.findUnique({
		where: { userId },
	});

	if (!profile) {
		throw new AppError(
			httpStatus.FORBIDDEN,
			"Student profile not found. Please complete your enrollment application first.",
		);
	}

	if (profile.studentStatus === "INACTIVE") {
		throw new AppError(
			httpStatus.FORBIDDEN,
			"Your student profile is inactive. Please contact the administration for assistance.",
		);
	}

	if (profile.isDeleted) {
		throw new AppError(
			httpStatus.FORBIDDEN,
			"Your student profile is deleted. Please contact the administration for assistance.",
		);
	}

	return profile.id;
};

export const getStudentProfile = async (userId: string) => {
	const profile = await prisma.studentProfile.findUnique({
		where: { userId },
	});

	if (!profile || profile.isDeleted) {
		throw new AppError(httpStatus.NOT_FOUND, "Student Profile Not Found");
	}

	return profile;
};

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

export const getInstructorProfile = async (userId: string) => {
	const profile = await prisma.instructorProfile.findUnique({
		where: { userId },
	});

	if (!profile || profile.isDeleted) {
		throw new AppError(httpStatus.NOT_FOUND, "Instructor Profile Not Found");
	}

	return profile;
};
