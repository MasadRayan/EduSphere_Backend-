import type { IQuery } from "../../interfaces";

export interface ICreateSemesterPayload {
	name: string;
	year: number;
	startDate: Date;
	endDate: Date;
	isActive?: boolean;
}

export interface IUpdateSemesterPayload {
	name?: string;
	year?: number;
	startDate?: Date;
	endDate?: Date;
	isActive?: boolean;
}

export interface ISemesterQuery extends IQuery {
	year?: string;
	isActive?: string;
}
