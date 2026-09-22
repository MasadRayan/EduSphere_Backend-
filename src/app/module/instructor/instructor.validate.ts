import z from "zod";
import { ApplicationStatus } from "../../../generated/prisma/enums";

const InstructorApplyZodSchema = z.object({
	departmentName: z.string().min(1, "Department is required"),
	phone: z.string().optional(),
	designation: z.string().min(1).max(80).optional(),
	coverNote: z.string().min(1).max(5000).optional(),
});

const ApproveInstructorZodSchema = z.object({
	reviewNote: z.string().max(5000).optional(),
	designation: z.string().min(1).max(80).optional(),
	departmentId: z.string().min(1).optional(),
});

const RejectInstructorZodSchema = z.object({
	reviewNote: z.string().max(5000).optional(),
});

const UpdateMyProfileZodSchema = z.object({
	fullName: z.string().min(3).max(60).optional(),
	phone: z.string().optional(),
});

const UpdateInstructorZodSchema = z.object({
	fullName: z.string().min(3).max(60).optional(),
	phone: z.string().optional(),
	designation: z.string().min(1).max(80).optional(),
	departmentId: z.string().min(1).optional(),
});

const ApplicationsQueryZodSchema = z.object({
	status: z.nativeEnum(ApplicationStatus).optional(),
});

export const InstructorValidation = {
	InstructorApplyZodSchema,
	ApproveInstructorZodSchema,
	RejectInstructorZodSchema,
	UpdateMyProfileZodSchema,
	UpdateInstructorZodSchema,
	ApplicationsQueryZodSchema,
};
