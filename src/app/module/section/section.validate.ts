import z from "zod";

const CreateSectionZodSchema = z.object({
	courseId: z.string().min(1, "Course is required"),
	semesterId: z.string().min(1, "Semester is required"),
	sectionCode: z
		.string()
		.min(1, "Section code is required")
		.max(10, "Section code must be at most 10 characters long"),
	instructorId: z.string().min(1).nullable().optional(),
	capacity: z
		.number()
		.int("Capacity must be an integer")
		.positive("Capacity must be a positive number"),
	schedule: z
		.string()
		.max(100, "Schedule must be at most 100 characters long")
		.optional(),
});

const UpdateSectionZodSchema = z.object({
	sectionCode: z
		.string()
		.min(1, "Section code is required")
		.max(10, "Section code must be at most 10 characters long")
		.optional(),
	instructorId: z.string().min(1).nullable().optional(),
	capacity: z
		.number()
		.int("Capacity must be an integer")
		.positive("Capacity must be a positive number")
		.optional(),
	schedule: z
		.string()
		.max(100, "Schedule must be at most 100 characters long")
		.optional(),
});

const AssignInstructorZodSchema = z.object({
	instructorId: z.string().min(1, "Instructor is required"),
});

export const SectionValidation = {
	CreateSectionZodSchema,
	UpdateSectionZodSchema,
	AssignInstructorZodSchema,
};
