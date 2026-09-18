import z from "zod";

const StudentApplyZodSchema = z.object({
	fullName: z
		.string()
		.min(3, "Full name must at least 3 characters long")
		.max(60),
	phone: z.string().optional(),
	departmentName: z.string().min(1, "Department is required"),
	programName: z.string().min(1, "Program is required"),
	enrollmentYear: z
		.number()
		.int()
		.min(2000, "Enrollment year is invalid")
		.max(new Date().getFullYear() + 1, "Enrollment year is invalid"),
});

const UpdateMyProfileZodSchema = z.object({
	fullName: z.string().min(3).max(60).optional(),
	phone: z.string().optional(),
});

const ApproveApplicationZodSchema = z.object({
	studentId: z.string().min(1, "Student ID is required"),
	reviewNote: z.string().optional(),
});

const RejectApplicationZodSchema = z.object({
	reviewNote: z.string().optional(),
});

export const StudentValidation = {
	StudentApplyZodSchema,
	UpdateMyProfileZodSchema,
	ApproveApplicationZodSchema,
	RejectApplicationZodSchema,
};
