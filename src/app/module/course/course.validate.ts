import z from "zod";

const CreateCourseZodSchema = z.object({
	code: z
		.string()
		.min(2, "Course code must be at least 2 characters long")
		.max(20),
	title: z
		.string()
		.min(2, "Course title must be at least 2 characters long")
		.max(200),
	creditHours: z
		.number()
		.int("Credit hours must be an integer")
		.positive("Credit hours must be a positive number"),
	departmentId: z.string().min(1, "Department is required"),
	prerequisiteIds: z
		.array(z.string().min(1, "Prerequisite id cannot be empty"))
		.optional(),
});

const UpdateCourseZodSchema = z.object({
	code: z
		.string()
		.min(2, "Course code must be at least 2 characters long")
		.max(20)
		.optional(),
	title: z
		.string()
		.min(2, "Course title must be at least 2 characters long")
		.max(200)
		.optional(),
	creditHours: z
		.number()
		.int("Credit hours must be an integer")
		.positive("Credit hours must be a positive number")
		.optional(),
	departmentId: z.string().min(1, "Department is required").optional(),
	prerequisiteIds: z
		.array(z.string().min(1, "Prerequisite id cannot be empty"))
		.optional(),
});

export const CourseValidation = {
	CreateCourseZodSchema,
	UpdateCourseZodSchema,
};
