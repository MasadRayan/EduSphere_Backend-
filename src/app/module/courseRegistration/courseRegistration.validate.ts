import z from "zod";

const CreateEnrollmentZodSchema = z.object({
	courseIds: z
		.array(z.string().min(1, "Course is required"))
		.min(1, "Select at least one course")
		.max(20, "Too many courses"),
});

export const CourseRegistrationValidation = {
	CreateEnrollmentZodSchema,
};