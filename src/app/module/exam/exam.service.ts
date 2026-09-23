import httpStatus from "http-status";
import type { Prisma } from "../../../generated/prisma/client";
import { Role } from "../../../generated/prisma/enums";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import {
	ensureSectionAccess,
	getInstructorProfileId,
} from "../../utils/sectionAccess";
import type { IRequestUser } from "../auth/auth.interface";
import type {
	ICreateExamPayload,
	IGetExamsQuery,
	IUpdateExamPayload,
} from "./exam.interface";

const examInclude = {
	courseSection: {
		include: {
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
		},
	},
} satisfies Prisma.ExamInclude;

const examResultsInclude = {
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

const getExamById = async (examId: string) => {
	const exam = await prisma.exam.findUnique({
		where: { id: examId },
		include: examInclude,
	});

	if (!exam) {
		throw new AppError(httpStatus.NOT_FOUND, "Exam not found");
	}

	return exam;
};

const createExam = async (payload: ICreateExamPayload, user: IRequestUser) => {
	await ensureSectionAccess(payload.courseSectionId, user);

	return prisma.exam.create({
		data: {
			courseSectionId: payload.courseSectionId,
			type: payload.type,
			date: payload.date,
			totalMarks: payload.totalMarks,
		},
		include: examInclude,
	});
};

const getAllExams = async (query: IGetExamsQuery, user: IRequestUser) => {
	const page = Math.max(1, Number(query.page) || 1);
	const limit = Math.max(1, Math.min(100, Number(query.limit) || 10));
	const skip = (page - 1) * limit;

	const where: Prisma.ExamWhereInput = {};

	if (query.courseSectionId) {
		await ensureSectionAccess(query.courseSectionId, user);
		where.courseSectionId = query.courseSectionId;
	} else if (user.role !== Role.ADMIN && user.role !== Role.SUPER_ADMIN) {
		const instructorProfileId = await getInstructorProfileId(user.userId);

		where.courseSection = { instructorId: instructorProfileId };
	}

	const [data, total] = await prisma.$transaction([
		prisma.exam.findMany({
			where,
			skip,
			take: limit,
			orderBy: { date: "desc" },
			include: examInclude,
		}),
		prisma.exam.count({ where }),
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

const getExam = async (examId: string, user: IRequestUser) => {
	const exam = await getExamById(examId);
	await ensureSectionAccess(exam.courseSectionId, user);

	return exam;
};

const updateExam = async (
	examId: string,
	payload: IUpdateExamPayload,
	user: IRequestUser,
) => {
	const exam = await getExamById(examId);
	await ensureSectionAccess(exam.courseSectionId, user);

	return prisma.exam.update({
		where: { id: examId },
		data: {
			type: payload.type,
			date: payload.date,
			totalMarks: payload.totalMarks,
		},
		include: examInclude,
	});
};

const deleteExam = async (examId: string, user: IRequestUser) => {
	const exam = await getExamById(examId);
	await ensureSectionAccess(exam.courseSectionId, user);

	return prisma.exam.delete({ where: { id: examId } });
};

const getExamResults = async (examId: string, user: IRequestUser) => {
	const exam = await getExamById(examId);
	await ensureSectionAccess(exam.courseSectionId, user);

	const results = await prisma.result.findMany({
		where: { examId },
		include: examResultsInclude,
		orderBy: { marksObtained: "desc" },
	});

	return results;
};

export const ExamService = {
	createExam,
	getAllExams,
	getExam,
	updateExam,
	deleteExam,
	getExamResults,
};
