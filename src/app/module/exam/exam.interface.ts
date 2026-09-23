import type { ExamType } from "../../../generated/prisma/enums";

export interface ICreateExamPayload {
	courseSectionId: string;
	type: ExamType;
	date: Date;
	totalMarks: number;
}

export interface IUpdateExamPayload {
	type?: ExamType;
	date?: Date;
	totalMarks?: number;
}

export interface IGetExamsQuery {
	courseSectionId?: string;
	page?: string;
	limit?: string;
}
