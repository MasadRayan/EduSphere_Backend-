import type { ApplicationStatus } from "../../../generated/prisma/enums";
import type { IQuery } from "../../interfaces";

export interface IInstructorApplyPayload {
	departmentName: string;
	phone?: string;
	designation?: string;
	coverNote?: string;
}

export interface IApproveInstructorPayload {
	reviewNote?: string;
	designation?: string;
	departmentId?: string;
}

export interface IRejectInstructorPayload {
	reviewNote?: string;
}

export interface IUpdateMyProfilePayload {
	fullName?: string;
	phone?: string;
}

export interface IUpdateInstructorPayload {
	fullName?: string;
	phone?: string;
	designation?: string;
	departmentId?: string;
}

export interface IGetApplicationsQuery {
	status?: ApplicationStatus;
}

export interface IInstructorQuery extends IQuery {
	departmentId?: string;
}
