import z from "zod";

const CreateSemesterZodSchema = z
	.object({
		name: z
			.string()
			.min(2, "Semester name must be at least 2 characters long")
			.max(50),
		year: z
			.number()
			.int("Year must be an integer")
			.min(2000, "Year must be 2000 or later")
			.max(2100, "Year must be 2100 or earlier"),
		startDate: z.coerce.date(),
		endDate: z.coerce.date(),
		isActive: z.boolean().optional(),
	})
	.refine((data) => data.startDate < data.endDate, {
		message: "startDate must be before endDate",
		path: ["endDate"],
	});

const UpdateSemesterZodSchema = z
	.object({
		name: z
			.string()
			.min(2, "Semester name must be at least 2 characters long")
			.max(50)
			.optional(),
		year: z
			.number()
			.int("Year must be an integer")
			.min(2000, "Year must be 2000 or later")
			.max(2100, "Year must be 2100 or earlier")
			.optional(),
		startDate: z.coerce.date().optional(),
		endDate: z.coerce.date().optional(),
		isActive: z.boolean().optional(),
	})
	.refine(
		(data) => !data.startDate || !data.endDate || data.startDate < data.endDate,
		{
			message: "startDate must be before endDate",
			path: ["endDate"],
		},
	);

export const SemesterValidation = {
	CreateSemesterZodSchema,
	UpdateSemesterZodSchema,
};
