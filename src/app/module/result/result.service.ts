import httpStatus from "http-status";
import type { Prisma } from "../../../generated/prisma/client";
import {
	NotificationChannel,
	RegistrationStatus,
	Role,
} from "../../../generated/prisma/enums";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { gradeFromPercentage } from "../../utils/grade";
import { ensureSectionAccess } from "../../utils/sectionAccess";
import type { IRequestUser } from "../auth/auth.interface";
import type {
	IEnterResultsPayload,
	IGetResultsQuery,
	IUpdateResultPayload,
} from "./result.interface";

const resultStudentInclude = {
	student: {
		include: {
			user: {
				select: {
					name: true,
					email: true,
					imageURL: true,
				},
			},
		},
	},
} satisfies Prisma.ResultInclude;

const resultInclude = {
	...resultStudentInclude,
	exam: {
		include: {
			courseSection: {
				include: {
					course: true,
					semester: true,
				},
			},
		},
	},
} satisfies Prisma.ResultInclude;

const getExamById = async (examId: string) => {
	const exam = await prisma.exam.findUnique({
		where: { id: examId },
		select: {
			id: true,
			courseSectionId: true,
			type: true,
			totalMarks: true,
		},
	});

	if (!exam) {
		throw new AppError(httpStatus.NOT_FOUND, "Exam not found");
	}

	return exam;
};

const getEnrolledStudentIds = async (courseSectionId: string) => {
	const registrations = await prisma.courseRegistration.findMany({
		where: {
			courseSectionId,
			isDeleted: false,
			status: {
				in: [RegistrationStatus.ENROLLED, RegistrationStatus.COMPLETED],
			},
		},
		select: { studentId: true },
	});

	return registrations.map((registration) => registration.studentId);
};

const autoCompleteRegistrations = async (
	courseSectionId: string,
	studentIds: string[],
) => {
	const examCount = await prisma.exam.count({
		where: { courseSectionId },
	});

	if (!examCount) {
		return;
	}

	const gradedCounts = await prisma.result.groupBy({
		by: ["studentId"],
		where: {
			studentId: { in: studentIds },
			exam: { courseSectionId },
		},
		_count: { _all: true },
	});

	const completedStudentIds = gradedCounts
		.filter((group) => group._count._all >= examCount)
		.map((group) => group.studentId);

	if (!completedStudentIds.length) {
		return;
	}

	await prisma.courseRegistration.updateMany({
		where: {
			studentId: { in: completedStudentIds },
			courseSectionId,
			isDeleted: false,
			status: RegistrationStatus.ENROLLED,
		},
		data: { status: RegistrationStatus.COMPLETED },
	});
};

const createResults = async (
	payload: IEnterResultsPayload,
	user: IRequestUser,
) => {
	const exam = await getExamById(payload.examId);
	await ensureSectionAccess(exam.courseSectionId, user);

	if (
		payload.records.some((record) => record.marksObtained > exam.totalMarks)
	) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			`Marks cannot exceed the exam total of ${exam.totalMarks}`,
		);
	}

	const enrolledStudentIds = await getEnrolledStudentIds(exam.courseSectionId);
	const invalidStudentIds = payload.records
		.map((record) => record.studentId)
		.filter((studentId) => !enrolledStudentIds.includes(studentId));

	if (invalidStudentIds.length) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			`Results can only be entered for students enrolled in this section. Invalid: ${invalidStudentIds.join(", ")}`,
		);
	}

	const records = payload.records.map((record) => {
		const percentage = (record.marksObtained / exam.totalMarks) * 100;
		const { grade, gradePoint } = gradeFromPercentage(percentage);

		return { ...record, grade, gradePoint };
	});

	const results = await prisma.$transaction(
		records.map((record) =>
			prisma.result.upsert({
				where: {
					examId_studentId: {
						examId: exam.id,
						studentId: record.studentId,
					},
				},
				create: {
					examId: exam.id,
					studentId: record.studentId,
					marksObtained: record.marksObtained,
					grade: record.grade,
					gradePoint: record.gradePoint,
				},
				update: {
					marksObtained: record.marksObtained,
					grade: record.grade,
					gradePoint: record.gradePoint,
				},
				include: resultStudentInclude,
			}),
		),
	);

	const studentIds = records.map((record) => record.studentId);

	await autoCompleteRegistrations(exam.courseSectionId, studentIds);

	const studentProfiles = await prisma.studentProfile.findMany({
		where: { id: { in: studentIds } },
		select: { id: true, userId: true },
	});

	if (studentProfiles.length) {
		await prisma.notification.createMany({
			data: studentProfiles.map((profile) => ({
				userId: profile.userId,
				title: "Exam Marks Published",
				message: `Your ${exam.type} marks have been published. Check your grades in the portal.`,
				channel: NotificationChannel.SYSTEM,
				sentAt: new Date(),
			})),
		});
	}

	return results;
};

const updateResult = async (
	resultId: string,
	payload: IUpdateResultPayload,
	user: IRequestUser,
) => {
	const result = await prisma.result.findUnique({
		where: { id: resultId },
		include: {
			exam: {
				select: {
					courseSectionId: true,
					totalMarks: true,
				},
			},
		},
	});

	if (!result) {
		throw new AppError(httpStatus.NOT_FOUND, "Result not found");
	}

	await ensureSectionAccess(result.exam.courseSectionId, user);

	if (payload.marksObtained > result.exam.totalMarks) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			`Marks cannot exceed the exam total of ${result.exam.totalMarks}`,
		);
	}

	const percentage = (payload.marksObtained / result.exam.totalMarks) * 100;
	const { grade, gradePoint } = gradeFromPercentage(percentage);

	return prisma.result.update({
		where: { id: resultId },
		data: {
			marksObtained: payload.marksObtained,
			grade,
			gradePoint,
		},
		include: resultStudentInclude,
	});
};

const getResults = async (query: IGetResultsQuery, user: IRequestUser) => {
	const page = Math.max(1, Number(query.page) || 1);
	const limit = Math.max(1, Math.min(100, Number(query.limit) || 10));
	const skip = (page - 1) * limit;

	const { examId, courseSectionId, studentId } = query;

	if (!examId && !courseSectionId && !studentId) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Provide examId, courseSectionId, or studentId to filter results",
		);
	}

	const where: Prisma.ResultWhereInput = {};

	if (examId) {
		const exam = await getExamById(examId);
		await ensureSectionAccess(exam.courseSectionId, user);
		where.examId = examId;
	} else if (courseSectionId) {
		await ensureSectionAccess(courseSectionId, user);
		where.exam = { courseSectionId };
	}

	if (studentId) {
		if (
			user.role !== Role.ADMIN &&
			user.role !== Role.SUPER_ADMIN &&
			!examId &&
			!courseSectionId
		) {
			throw new AppError(
				httpStatus.FORBIDDEN,
				"Instructors must scope student results by examId or courseSectionId",
			);
		}
		where.studentId = studentId;
	}

	const [data, total] = await prisma.$transaction([
		prisma.result.findMany({
			where,
			skip,
			take: limit,
			orderBy: { marksObtained: "desc" },
			include: resultInclude,
		}),
		prisma.result.count({ where }),
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

export const ResultService = {
	createResults,
	updateResult,
	getResults,
};
