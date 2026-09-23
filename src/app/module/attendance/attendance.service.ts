import httpStatus from "http-status";
import { RegistrationStatus } from "../../../generated/prisma/enums";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { ensureSectionAccess } from "../../utils/sectionAccess";
import type { IRequestUser } from "../auth/auth.interface";
import type {
	IGetAttendanceQuery,
	IMarkAttendancePayload,
} from "./attendance.interface";

const attendanceInclude = {
	student: {
		include: {
			user: {
				select: {
					name: true,
					email: true,
					imageURL: true,
				},
			},
		},
	},
};

const getEnrolledStudentIds = async (courseSectionId: string) => {
	const registrations = await prisma.courseRegistration.findMany({
		where: {
			courseSectionId,
			isDeleted: false,
			status: {
				in: [RegistrationStatus.ENROLLED, RegistrationStatus.COMPLETED],
			},
		},
		select: { studentId: true },
	});

	return registrations.map((registration) => registration.studentId);
};

const markAttendance = async (
	payload: IMarkAttendancePayload,
	user: IRequestUser,
) => {
	await ensureSectionAccess(payload.courseSectionId, user);

	const enrolledStudentIds = await getEnrolledStudentIds(
		payload.courseSectionId,
	);
	const invalidStudentIds = payload.records
		.map((record) => record.studentId)
		.filter((studentId) => !enrolledStudentIds.includes(studentId));

	if (invalidStudentIds.length) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			`Attendance can only be marked for students enrolled in this section. Invalid: ${invalidStudentIds.join(", ")}`,
		);
	}

	const results = await prisma.$transaction(
		payload.records.map((record) =>
			prisma.attendance.upsert({
				where: {
					studentId_courseSectionId_date: {
						studentId: record.studentId,
						courseSectionId: payload.courseSectionId,
						date: payload.date,
					},
				},
				create: {
					studentId: record.studentId,
					courseSectionId: payload.courseSectionId,
					date: payload.date,
					status: record.status,
				},
				update: {
					status: record.status,
				},
			}),
		),
	);

	return { count: results.length, date: payload.date };
};

const getAttendance = async (
	query: IGetAttendanceQuery,
	user: IRequestUser,
) => {
	await ensureSectionAccess(query.courseSectionId, user);

	const records = await prisma.attendance.findMany({
		where: {
			courseSectionId: query.courseSectionId,
			date: query.date ? new Date(query.date) : undefined,
		},
		include: {
			...attendanceInclude,
			courseSection: {
				include: {
					course: true,
					semester: true,
				},
			},
		},
		orderBy: {
			date: "asc",
		},
	});

	return records;
};

export const AttendanceService = {
	markAttendance,
	getAttendance,
};
