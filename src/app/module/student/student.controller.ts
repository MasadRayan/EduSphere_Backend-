import type { Request, Response } from "express";
import httpStatus from "http-status";
import type { ApplicationStatus } from "../../../generated/prisma/enums";
import { AppError } from "../../utils/AppError";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import type { IRequestUser } from "../auth/auth.interface";
import { StudentService } from "./student.service";
import { buildTranscriptPdfBuffer } from "./student.transcript";
import { StudentValidation } from "./student.validate";

const applyForEnrollment = catchAsync(async (req: Request, res: Response) => {
	const user = req.user as unknown as IRequestUser;
	const result = await StudentService.applyForEnrollment(req.body, user);

	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message:
			"Enrollment application submitted successfully. Pending admin approval.",
		data: result,
	});
});

const updateApplication = catchAsync(async (req: Request, res: Response) => {
	const user = req.user as unknown as IRequestUser;
	const result = await StudentService.updateApplication(req.body, user);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Enrollment application updated and resubmitted successfully",
		data: result,
	});
});

const getMyApplication = catchAsync(async (req: Request, res: Response) => {
	const user = req.user as unknown as IRequestUser;
	const result = await StudentService.getMyApplication(user.userId);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Application fetched successfully",
		data: result,
	});
});

const getAllApplications = catchAsync(async (req: Request, res: Response) => {
	const result = await StudentService.getAllApplications({
		status: req.query.status as ApplicationStatus | undefined,
	});

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Applications fetched successfully",
		data: result,
	});
});

const approveApplication = catchAsync(async (req: Request, res: Response) => {
	const user = req.user as unknown as IRequestUser;
	const id = req.params.id as string;
	const result = await StudentService.approveApplication(
		id,
		req.body,
		user.userId,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Application approved and student enrolled successfully",
		data: result,
	});
});

const rejectApplication = catchAsync(async (req: Request, res: Response) => {
	const user = req.user as unknown as IRequestUser;
	const id = req.params.id as string;
	const result = await StudentService.rejectApplication(
		id,
		req.body,
		user.userId,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Application rejected successfully",
		data: result,
	});
});

const updateMyProfile = catchAsync(async (req: Request, res: Response) => {
	const user = req.user as unknown as IRequestUser;
	const result = await StudentService.updateMyProfile(req.body, user.userId);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Profile updated successfully",
		data: result,
	});
});

const updateMyProfileImage = catchAsync(async (req: Request, res: Response) => {
	const user = req.user as unknown as IRequestUser;

	if (!req.file) {
		throw new AppError(httpStatus.BAD_REQUEST, "No image uploaded");
	}

	const result = await StudentService.updateMyProfileImage(
		req.file.buffer,
		user.userId,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Profile image updated successfully",
		data: result,
	});
});

const updateCurrentSemester = catchAsync(
	async (req: Request, res: Response) => {
		const id = req.params.id as string;
		const result = await StudentService.updateCurrentSemester(id, req.body);

		sendResponse(res, {
			statusCode: httpStatus.OK,
			success: true,
			message: "Current semester updated successfully",
			data: result,
		});
	},
);

const updateStudentSection = catchAsync(async (req: Request, res: Response) => {
	const id = req.params.id as string;
	const result = await StudentService.updateStudentSection(id, req.body);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Student section updated successfully",
		data: result,
	});
});

const updateStudentStatus = catchAsync(async (req: Request, res: Response) => {
	const id = req.params.id as string;
	const result = await StudentService.updateStudentStatus(id, req.body);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Student status updated successfully",
		data: result,
	});
});

const getMyInfo = catchAsync(async (req: Request, res: Response) => {
	const user = req.user as unknown as IRequestUser;
	const result = await StudentService.getMyInfo(user.userId);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "User profile fetched successfully",
		data: result,
	});
});

const registeredCourses = catchAsync(async (req: Request, res: Response) => {
	const user = req.user as unknown as IRequestUser;
	const result = await StudentService.registeredCourses(user.userId);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Registered courses fetched successfully",
		data: result,
	});
});

const registeredCourseDetails = catchAsync(
	async (req: Request, res: Response) => {
		const user = req.user as unknown as IRequestUser;
		const id = req.params.id as string;
		const result = await StudentService.registeredCourseDetails(
			id,
			user.userId,
		);

		sendResponse(res, {
			statusCode: httpStatus.OK,
			success: true,
			message: "Registered course details fetched successfully",
			data: result,
		});
	},
);

const attendanceDetails = catchAsync(async (req: Request, res: Response) => {
	const user = req.user as unknown as IRequestUser;
	const result = await StudentService.attendanceDetails(user.userId);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Attendance details fetched successfully",
		data: result,
	});
});

const getMyGrades = catchAsync(async (req: Request, res: Response) => {
	const user = req.user as unknown as IRequestUser;
	const result = await StudentService.getMyGrades(user.userId);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Grades fetched successfully",
		data: result,
	});
});

const getMyGradesDetails = catchAsync(async (req: Request, res: Response) => {
	const user = req.user as unknown as IRequestUser;
	const id = req.params.id as string;
	const result = await StudentService.getMyGradesDetails(id, user.userId);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Grade details fetched successfully",
		data: result,
	});
});

const getMyCGPA = catchAsync(async (req: Request, res: Response) => {
	const user = req.user as unknown as IRequestUser;
	const result = await StudentService.getMyCGPA(user.userId);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "CGPA fetched successfully",
		data: result,
	});
});

const getTranscript = catchAsync(async (req: Request, res: Response) => {
	const user = req.user as unknown as IRequestUser;

	const queryResult = StudentValidation.TranscriptQueryZodSchema.safeParse(
		req.query,
	);

	if (!queryResult.success) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			queryResult.error.issues[0].message,
		);
	}

	const { semesterId } = queryResult.data;
	const transcriptData = await StudentService.getTranscript(
		user.userId,
		semesterId,
	);
	const buffer = await buildTranscriptPdfBuffer(transcriptData);

	res.setHeader("Content-Type", "application/pdf");
	res.setHeader(
		"Content-Disposition",
		`inline; filename="transcript-${transcriptData.student.studentId}.pdf"`,
	);
	res.end(buffer);
});

export const StudentController = {
	applyForEnrollment,
	updateApplication,
	getMyApplication,
	getAllApplications,
	approveApplication,
	rejectApplication,
	updateMyProfile,
	updateMyProfileImage,
	updateCurrentSemester,
	updateStudentSection,
	updateStudentStatus,
	getMyInfo,
	registeredCourses,
	registeredCourseDetails,
	attendanceDetails,
	getMyGrades,
	getMyGradesDetails,
	getMyCGPA,
	getTranscript,
};
