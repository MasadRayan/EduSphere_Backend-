import type { IQuery } from "../../interfaces";

export interface ICreateDepartmentPayload {
	name: string;
	code: string;
}

export interface IUpdateDepartmentPayload {
	name?: string;
	code?: string;
}

export interface IDepartmentQuery extends IQuery {
	searchTerm?: string;
}
