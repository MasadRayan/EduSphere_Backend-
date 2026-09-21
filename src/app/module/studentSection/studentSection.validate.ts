import z from "zod";

const CreateStudentSectionZodSchema = z.object({
	sectionCode: z
		.string()
		.min(1, "Section code is required")
		.max(10, "Section code must be at most 10 characters long"),
	programId: z.string().min(1, "Program is required"),
	enrollmentYear: z
		.number()
		.int("Enrollment year must be an integer")
		.min(2000, "Enrollment year is invalid")
		.max(new Date().getFullYear() + 1, "Enrollment year is invalid"),
	capacity: z
		.number()
		.int("Capacity must be an integer")
		.positive("Capacity must be a positive number"),
});

const UpdateStudentSectionZodSchema = z.object({
	sectionCode: z
		.string()
		.min(1, "Section code is required")
		.max(10, "Section code must be at most 10 characters long")
		.optional(),
	capacity: z
		.number()
		.int("Capacity must be an integer")
		.positive("Capacity must be a positive number")
		.optional(),
});

export const StudentSectionValidation = {
	CreateStudentSectionZodSchema,
	UpdateStudentSectionZodSchema,
};
