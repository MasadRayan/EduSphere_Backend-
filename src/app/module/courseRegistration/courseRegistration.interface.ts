import type { IQuery } from "../../interfaces";

export interface ICreateRegistrationPayload {
	courseSectionId: string;
}

export interface IRegistrationQuery extends IQuery {
	status?: string;
	courseSectionId?: string;
}

export interface IInvoiceMailPayload {
	to: string;
	studentName: string;
	courseTitle: string;
	courseCode: string;
	sectionCode: string;
	semesterName: string;
	year: number;
	amount: number;
	invoiceNumber: string;
	trxId: string | null;
	paidAt: Date;
}