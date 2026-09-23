import type { NextFunction, Request, Response } from "express";
import { Prisma } from "../../generated/prisma/client";
import config from "../config";
import { AppError } from "../utils/AppError";

export const globalErrorHandler = async (
	err: any,
	_req: Request,
	res: Response,
	_next: NextFunction,
) => {
	// Always log so the real cause shows up in Vercel logs
	console.error("Error from Global Error Handler:", err);

	let statusCode = 500;
	let errorMessage = err?.message || "Internal Server Error";
	const errorName = err?.name || "Internal Server Error";

	if (err instanceof Prisma.PrismaClientValidationError) {
		statusCode = 400;
		errorMessage = "You have provided incorrect field type or missing fields";
	} else if (err instanceof Prisma.PrismaClientKnownRequestError) {
		if (err.code === "P2002") {
			statusCode = 400;
			errorMessage = "Duplicate Key Error";
		} else if (err.code === "P2003") {
			statusCode = 400;
			errorMessage = "Foreign key constraint failed";
		} else if (err.code === "P2025") {
			statusCode = 400;
			errorMessage =
				"An operation failed because it depends on one or more records that were required but not found.";
		}
	} else if (err instanceof Prisma.PrismaClientInitializationError) {
		if (err.errorCode === "P1000") {
			statusCode = 401;
			errorMessage =
				"Authentication failed against database server. Please Check Your Credentials";
		} else if (err.errorCode === "P1001") {
			statusCode = 400;
			errorMessage = "Can't reach database server";
		}
	} else if (err instanceof Prisma.PrismaClientUnknownRequestError) {
		statusCode = 500;
		errorMessage = "Error occurred during query execution";
	} else if (err instanceof AppError) {
		errorMessage = err.message;
		statusCode = err.statusCode;
	} else if (err instanceof Error) {
		errorMessage = err.message;
	}

	// Final guard: never pass an invalid status to res.status()
	if (!Number.isInteger(statusCode) || statusCode < 100 || statusCode > 599) {
		statusCode = 500;
	}

	const isDev = config.node_env === "development";

	res.status(statusCode).json({
		success: false,
		statusCode,
		name: isDev ? errorName : "Internal Server Error",
		message: isDev ? errorMessage : "Internal Server Error",
		error: isDev ? err : undefined,
		stack: isDev ? err?.stack : undefined,
	});
};