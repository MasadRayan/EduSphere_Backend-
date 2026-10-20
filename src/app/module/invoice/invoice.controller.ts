import type { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { InvoiceService } from "./invoice.service";

const downloadEnrollmentInvoice = catchAsync(
	async (req: Request, res: Response) => {
		const { buffer, filename } = await InvoiceService.getEnrollmentInvoice(
			req.user!.userId,
			req.user!.role,
			req.params.enrollmentId as string,
		);

		res.setHeader("Content-Type", "application/pdf");
		res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
		res.setHeader("Content-Length", String(buffer.length));
		res.send(buffer);
	},
);

export const InvoiceController = {
	downloadEnrollmentInvoice,
};
