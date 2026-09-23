import z from "zod";

const EnterResultsZodSchema = z.object({
	examId: z.string().min(1, "Exam is required"),
	records: z
		.array(
			z.object({
				studentId: z.string().min(1, "Student is required"),
				marksObtained: z.number().min(0, "Marks cannot be negative"),
			}),
		)
		.min(1, "At least one result is required"),
});

const UpdateResultZodSchema = z.object({
	marksObtained: z.number().min(0, "Marks cannot be negative"),
});

export const ResultValidation = {
	EnterResultsZodSchema,
	UpdateResultZodSchema,
};
