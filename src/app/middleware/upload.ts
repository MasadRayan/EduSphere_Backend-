import type { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import multer, { type FileFilterCallback } from "multer";
import { AppError } from "../utils/AppError";

const ALLOWED_MIME_TYPES = [
	"image/jpeg",
	"image/jpg",
	"image/pjpeg",
	"image/png",
	"image/webp",
	"image/gif",
];

// Some clients send a generic type instead of the real one (e.g. Postman sends
// "application/octet-stream" when it cannot determine the file type). We let
// these through and verify the actual image signature from the buffer later.
const DEFERRED_MIME_TYPES = ["application/octet-stream", "binary/octet-stream"];

const storage = multer.memoryStorage();

const fileFilter = (
	_req: Request,
	file: Express.Multer.File,
	cb: FileFilterCallback,
) => {
	if (
		ALLOWED_MIME_TYPES.includes(file.mimetype) ||
		file.mimetype.startsWith("image/") ||
		DEFERRED_MIME_TYPES.includes(file.mimetype)
	) {
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

const RESUME_ALLOWED_MIME_TYPES = [
	"application/pdf",
	"application/msword",
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const resumeFileFilter = (
	_req: Request,
	file: Express.Multer.File,
	cb: FileFilterCallback,
) => {
	if (
		RESUME_ALLOWED_MIME_TYPES.includes(file.mimetype) ||
		file.mimetype.startsWith("image/") ||
		file.mimetype.startsWith("application/vnd.oasis.opendocument") ||
		DEFERRED_MIME_TYPES.includes(file.mimetype)
	) {
		cb(null, true);
	} else {
		cb(
			new AppError(
				httpStatus.BAD_REQUEST,
				"Only PDF, DOC, DOCX, or image files are allowed",
			),
		);
	}
};

export const resumeUpload = multer({
	storage,
	limits: {
		fileSize: 5 * 1024 * 1024, // 5 MB
	},
	fileFilter: resumeFileFilter,
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
