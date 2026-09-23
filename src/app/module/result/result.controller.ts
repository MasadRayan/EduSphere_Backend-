import type { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import type { IRequestUser } from "../auth/auth.interface";
import type { IGetResultsQuery } from "./result.interface";
import { ResultService } from "./result.service";

const createResults = catchAsync(async (req: Request, res: Response) => {
	const user = req.user as IRequestUser;
	const result = await ResultService.createResults(req.body, user);

	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: "Results entered successfully",
		data: result,
	});
});

const updateResult = catchAsync(async (req: Request, res: Response) => {
	const user = req.user as IRequestUser;
	const resultId = req.params.resultId as string;
	const result = await ResultService.updateResult(resultId, req.body, user);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Result updated successfully",
		data: result,
	});
});

const getResults = catchAsync(async (req: Request, res: Response) => {
	const user = req.user as IRequestUser;
	const result = await ResultService.getResults(
		req.query as unknown as IGetResultsQuery,
		user,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Results fetched successfully",
		data: result.data,
		meta: result.meta,
	});
});

export const ResultController = {
	createResults,
	updateResult,
	getResults,
};
