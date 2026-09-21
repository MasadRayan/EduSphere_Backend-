import type { IQuery } from "../../interfaces";

export interface ICreateProgramPayload {
	name: string;
	degreeType: string;
	totalCredits: number;
	departmentId: string;
}

export interface IUpdateProgramPayload {
	name?: string;
	degreeType?: string;
	totalCredits?: number;
	departmentId?: string;
}

export interface IProgramQuery extends IQuery {
	departmentId?: string;
}
