import z from "zod";
import { RegistrationStatus } from "../../../generated/prisma/enums";

const CreateEnrollmentZodSchema = z.object({
	courseIds: z
		.array(z.string().min(1, "Course is required"))
		.min(1, "Select at least one course")
		.max(20, "Too many courses"),
});

const UpdateRegistrationStatusZodSchema = z.object({
	status: z.enum([
		RegistrationStatus.ENROLLED,
		RegistrationStatus.COMPLETED,
		RegistrationStatus.CANCELLED,
	]),
});

export const CourseRegistrationValidation = {
	CreateEnrollmentZodSchema,
	UpdateRegistrationStatusZodSchema,
};
