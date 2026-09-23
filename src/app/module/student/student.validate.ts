import z from "zod";
import { StudentStatus } from "../../../generated/prisma/enums";

const StudentApplyZodSchema = z.object({
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
	currentSemesterId: z.string().min(1).optional(),
	sectionId: z.string().min(1).optional(),
});

const UpdateCurrentSemesterZodSchema = z.object({
	currentSemesterId: z
		.string()
		.min(1, "Semester id cannot be empty")
		.nullable(),
});

const UpdateStudentSectionZodSchema = z.object({
	sectionId: z.string().min(1, "Section id cannot be empty").nullable(),
});

const UpdateStudentStatusZodSchema = z.object({
	status: z.nativeEnum(StudentStatus),
});

const RejectApplicationZodSchema = z.object({
	reviewNote: z.string().optional(),
});

const TranscriptQueryZodSchema = z.object({
	semesterId: z.string().min(1).optional(),
});

export const StudentValidation = {
	StudentApplyZodSchema,
	UpdateMyProfileZodSchema,
	ApproveApplicationZodSchema,
	RejectApplicationZodSchema,
	UpdateCurrentSemesterZodSchema,
	UpdateStudentSectionZodSchema,
	UpdateStudentStatusZodSchema,
	TranscriptQueryZodSchema,
};
