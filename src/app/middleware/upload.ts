import type { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import multer, { type FileFilterCallback } from "multer";
import { AppError } from "../utils/AppError";

const ALLOWED_MIME_TYPES = [
	"image/jpeg",
	"image/png",
	"image/webp",
	"image/gif",
];

const storage = multer.memoryStorage();

const fileFilter = (
	_req: Request,
	file: Express.Multer.File,
	cb: FileFilterCallback,
) => {
	if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
		cb(null, true);
	} else {
		cb(new AppError(httpStatus.BAD_REQUEST, "Only image files are allowed"));
	}
};

export const upload = multer({
	storage,
	limits: {
		fileSize: 5 * 1024 * 1024, // 5 MB
	},
	fileFilter,
});

export const handleMulterErrors = (
	err: unknown,
	_req: Request,
	_res: Response,
	next: NextFunction,
) => {
	if (err instanceof multer.MulterError) {
		next(new AppError(httpStatus.BAD_REQUEST, err.message));
	} else {
		next(err);
	}
};
