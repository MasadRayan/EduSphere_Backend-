import httpStatus from "http-status";
import z from "zod";
import { ExamType } from "../../../generated/prisma/enums";
import { AppError } from "../../utils/AppError";

const CreateExamZodSchema = z.object({
	courseSectionId: z.string().min(1, "Course section is required"),
	type: z.nativeEnum(ExamType),
	date: z.coerce.date(),
	totalMarks: z
		.number()
		.int("Total marks must be an integer")
		.positive("Total marks must be a positive number"),
});

const UpdateExamZodSchema = z.object({
	type: z.nativeEnum(ExamType).optional(),
	date: z.coerce.date().optional(),
	totalMarks: z
		.number()
		.int("Total marks must be an integer")
		.positive("Total marks must be a positive number")
		.optional(),
});

const ExamsQueryZodSchema = z.object({
	courseSectionId: z.string().min(1).optional(),
	page: z.string().optional(),
	limit: z.string().optional(),
});

const parseExamsQuery = (query: Record<string, unknown>) => {
	const result = ExamsQueryZodSchema.safeParse(query);

	if (!result.success) {
		throw new AppError(httpStatus.BAD_REQUEST, result.error.issues[0].message);
	}

	return result.data;
};

export const ExamValidation = {
	CreateExamZodSchema,
	UpdateExamZodSchema,
	ExamsQueryZodSchema,
	parseExamsQuery,
};
