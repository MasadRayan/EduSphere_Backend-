import type { IQuery } from "../../interfaces";

export interface ICreateEnrollmentPayload {
	courseIds: string[];
}

export interface IRegistrationQuery extends IQuery {
	status?: string;
	semesterId?: string;
}

export interface IInvoiceCourseItem {
	courseTitle: string;
	courseCode: string;
	sectionCode: string;
	creditHours: number;
	fee: number;
}

export interface IInvoiceMailPayload {
	to: string;
	studentName: string;
	semesterName: string;
	year: number;
	totalCredits: number;
	courses: IInvoiceCourseItem[];
	amount: number;
	invoiceNumber: string;
	trxId: string | null;
	paidAt: Date;
}