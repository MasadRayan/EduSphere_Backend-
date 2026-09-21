import z from "zod";

const CreateDepartmentZodSchema = z.object({
	name: z
		.string()
		.min(2, "Department name must be at least 2 characters long")
		.max(100),
	code: z
		.string()
		.min(2, "Department code must be at least 2 characters long")
		.max(20),
});

const UpdateDepartmentZodSchema = z.object({
	name: z
		.string()
		.min(2, "Department name must be at least 2 characters long")
		.max(100)
		.optional(),
	code: z
		.string()
		.min(2, "Department code must be at least 2 characters long")
		.max(20)
		.optional(),
});

export const DepartmentValidation = {
	CreateDepartmentZodSchema,
	UpdateDepartmentZodSchema,
};
