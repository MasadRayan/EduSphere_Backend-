import type { ApplicationStatus } from "../../../generated/prisma/enums";

export interface IStudentApplyPayload {
	phone?: string;
	departmentName: string;
	programName: string;
	enrollmentYear: number;
}

export interface IUpdateMyProfilePayload {
	fullName?: string;
	phone?: string;
}

export interface IApproveApplicationPayload {
	studentId: string;
	reviewNote?: string;
}

export interface IRejectApplicationPayload {
	reviewNote?: string;
}

export interface IGetApplicationsQuery {
	status?: ApplicationStatus;
}
