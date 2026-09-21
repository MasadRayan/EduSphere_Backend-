import z from "zod";

const CreateProgramZodSchema = z.object({
	name: z
		.string()
		.min(2, "Program name must be at least 2 characters long")
		.max(100),
	degreeType: z
		.string()
		.min(2, "Degree type must be at least 2 characters long")
		.max(50),
	totalCredits: z
		.number()
		.int("Total credits must be an integer")
		.positive("Total credits must be a positive number"),
	departmentId: z.string().min(1, "Department is required"),
});

const UpdateProgramZodSchema = z.object({
	name: z
		.string()
		.min(2, "Program name must be at least 2 characters long")
		.max(100)
		.optional(),
	degreeType: z
		.string()
		.min(2, "Degree type must be at least 2 characters long")
		.max(50)
		.optional(),
	totalCredits: z
		.number()
		.int("Total credits must be an integer")
		.positive("Total credits must be a positive number")
		.optional(),
	departmentId: z.string().min(1, "Department is required").optional(),
});

export const ProgramValidation = {
	CreateProgramZodSchema,
	UpdateProgramZodSchema,
};
