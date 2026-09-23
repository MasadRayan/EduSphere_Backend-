import type { AttendanceStatus } from "../../../generated/prisma/enums";

export interface IAttendanceRecord {
	studentId: string;
	status: AttendanceStatus;
}

export interface IMarkAttendancePayload {
	courseSectionId: string;
	date: Date;
	records: IAttendanceRecord[];
}

export interface IGetAttendanceQuery {
	courseSectionId: string;
	date?: string;
}
