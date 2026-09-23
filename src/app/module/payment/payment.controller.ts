import type { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import type { IRequestUser } from "../auth/auth.interface";
import { PaymentService } from "./payment.service";
import { parsePaymentListQuery } from "./payment.validate";

const getAllPayments = catchAsync(async (req: Request, res: Response) => {
	const query = parsePaymentListQuery(req.query);
	const result = await PaymentService.getAllPayments(query);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Payments retrieved successfully",
		data: result.data,
		meta: result.meta,
	});
});

const getMyPayments = catchAsync(async (req: Request, res: Response) => {
	const user = req.user as IRequestUser;
	const query = parsePaymentListQuery(req.query);
	const result = await PaymentService.getMyPayments(user, query);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "My payments retrieved successfully",
		data: result.data,
		meta: result.meta,
	});
});

const getPaymentById = catchAsync(async (req: Request, res: Response) => {
	const user = req.user as IRequestUser;
	const id = req.params.id as string;
	const payment = await PaymentService.getPaymentById(id, user);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Payment retrieved successfully",
		data: payment,
	});
});

export const PaymentController = {
	getAllPayments,
	getMyPayments,
	getPaymentById,
};
