import z from "zod";

const CreateRegistrationZodSchema = z.object({
	courseSectionId: z.string().min(1, "Course section is required"),
});

export const CourseRegistrationValidation = {
	CreateRegistrationZodSchema,
};