import type { Request, Response } from "express";
import httpStatus from "http-status";
import config from "../../config";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import type {
	IRegistrationQuery,
	IUpdateRegistrationStatusPayload,
} from "./courseRegistration.interface";
import { CourseRegistrationService } from "./courseRegistration.service";

const enrollSemester = catchAsync(async (req: Request, res: Response) => {
	const userId = req.user!.userId;
	const result = await CourseRegistrationService.enrollSemester(
		userId,
		req.body,
	);

	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message:
			"Enrollment initiated for the semester. Please complete payment via bKash.",
		data: result,
	});
});

const getRedirectBase = () => {
	const candidate = (config.frontend_url || config.backend_url || "").trim();

	if (!candidate) {
		return "http://localhost:3000";
	}

	const isProduction =
		config.node_env === "production" && candidate.includes("localhost");
	const base =
		isProduction && config.backend_url ? config.backend_url : candidate;

	return base.replace(/\/+$/, "");
};

const handlePaymentCallback = async (req: Request, res: Response) => {
	try {
		const result = await CourseRegistrationService.handlePaymentCallback(
			req.query as Record<string, string>,
		);

		res.redirect(result.redirectUrl);
	} catch (error) {
		const reason =
			error instanceof Error ? encodeURIComponent(error.message) : "unknown";

		res.redirect(`${getRedirectBase()}?payment=failed&reason=${reason}`);
	}
};

const getMyEnrollments = catchAsync(async (req: Request, res: Response) => {
	const result = await CourseRegistrationService.getMyEnrollments(
		req.user!.userId,
		req.query as unknown as IRegistrationQuery,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Enrollments fetched successfully",
		data: result.data,
		meta: result.meta,
	});
});

const getAllEnrollments = catchAsync(async (req: Request, res: Response) => {
	const result = await CourseRegistrationService.getAllEnrollments(
		req.query as unknown as IRegistrationQuery,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Enrollments fetched successfully",
		data: result.data,
		meta: result.meta,
	});
});

const getEnrollmentById = catchAsync(async (req: Request, res: Response) => {
	const result = await CourseRegistrationService.getEnrollmentById(
		req.user!.userId,
		req.user!.role,
		req.params.id as string,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Enrollment fetched successfully",
		data: result,
	});
});

const cancelEnrollment = catchAsync(async (req: Request, res: Response) => {
	const result = await CourseRegistrationService.cancelEnrollment(
		req.user!.userId,
		req.user!.role,
		req.params.id as string,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Enrollment cancelled. Refund processed.",
		data: result,
	});
});

const updateRegistrationStatus = catchAsync(
	async (req: Request, res: Response) => {
		const result = await CourseRegistrationService.updateRegistrationStatus(
			req.params.id as string,
			(req.body as IUpdateRegistrationStatusPayload).status,
		);

		sendResponse(res, {
			statusCode: httpStatus.OK,
			success: true,
			message: "Course registration status updated successfully",
			data: result,
		});
	},
);

export const CourseRegistrationController = {
	enrollSemester,
	handlePaymentCallback,
	getMyEnrollments,
	getAllEnrollments,
	getEnrollmentById,
	cancelEnrollment,
	updateRegistrationStatus,
};
