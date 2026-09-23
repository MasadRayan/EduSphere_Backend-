import z from "zod";
import { AttendanceStatus } from "../../../generated/prisma/enums";

const MarkAttendanceZodSchema = z.object({
	courseSectionId: z.string().min(1, "Course section is required"),
	date: z.coerce.date(),
	records: z
		.array(
			z.object({
				studentId: z.string().min(1, "Student is required"),
				status: z.nativeEnum(AttendanceStatus),
			}),
		)
		.min(1, "At least one attendance record is required"),
});

const AttendanceQueryZodSchema = z.object({
	courseSectionId: z.string().min(1, "Course section is required"),
	date: z.string().optional(),
});

export const AttendanceValidation = {
	MarkAttendanceZodSchema,
	AttendanceQueryZodSchema,
};
