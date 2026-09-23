export interface IResultRecord {
	studentId: string;
	marksObtained: number;
}

export interface IEnterResultsPayload {
	examId: string;
	records: IResultRecord[];
}

export interface IUpdateResultPayload {
	marksObtained: number;
}

export interface IGetResultsQuery {
	examId?: string;
	courseSectionId?: string;
	studentId?: string;
	page?: string;
	limit?: string;
}
