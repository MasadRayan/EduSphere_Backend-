import type { UploadApiResponse } from "cloudinary";
import ejs from "ejs";
import httpStatus from "http-status";
import path from "path";
import type { Prisma } from "../../../generated/prisma/client";
import {
	ApplicationStatus,
	AttendanceStatus,
	NotificationChannel,
	RegistrationStatus,
} from "../../../generated/prisma/enums";
import config from "../../config";
import { cloudinary } from "../../lib/cloudinary";
import { prisma } from "../../lib/prisma";
import { transporter } from "../../lib/nodemailer";
import { AppError } from "../../utils/AppError";
import type { IRequestUser } from "../auth/auth.interface";
import type {
	IApproveApplicationPayload,
	IGetApplicationsQuery,
	IRejectApplicationPayload,
	IStudentApplyPayload,
	IUpdateMyProfilePayload,
} from "./student.interface";

type AttendanceGroup = {
	sectionId: string;
	sectionCode: string;
	course: {
		code: string;
		title: string;
		creditHours: number;
	};
	semester: string;
	total: number;
	present: number;
	absent: number;
	late: number;
	excused: number;
	percentage: number;
	records: {
		date: Date;
		status: AttendanceStatus;
	}[];
};

type CourseGrade = {
	course: {
		code: string;
		title: string;
		creditHours: number;
	};
	semester: string;
	sectionCode: string;
	exams: {
		type: string;
		date: Date;
		totalMarks: number;
		marksObtained: number;
		grade: string | null;
		gradePoint: number | null;
	}[];
	totalMarks: number;
	marksObtained: number;
	averageGradePoint: number | null;
};

const getStudentProfileId = async (userId: string) => {
	const profile = await prisma.studentProfile.findUnique({
		where: { userId },
	});

	if (!profile) {
		throw new AppError(
			httpStatus.FORBIDDEN,
			"Student profile not found. Please complete your enrollment application first.",
		);
	}

	if (profile.studentStatus === "INACTIVE") {
		throw new AppError(
			httpStatus.FORBIDDEN,
			"Your student profile is inactive. Please contact the administration for assistance.",
		);
	}

	if (profile.isDeleted) {
		throw new AppError(
			httpStatus.FORBIDDEN,
			"Your student profile is deleted. Please contact the administration for assistance.",
		);
	}

	return profile.id;
};

const resolveDepartment = async (departmentName: string) => {
	const department = await prisma.department.findUnique({
		where: { name: departmentName },
	});

	if (!department || department.isDeleted) {
		throw new AppError(httpStatus.NOT_FOUND, "Department not found");
	}

	return department;
};

const resolveProgram = async (departmentId: string, programName: string) => {
	const program = await prisma.program.findFirst({
		where: {
			name: programName,
			departmentId,
			isDeleted: false,
		},
	});

	if (!program) {
		throw new AppError(
			httpStatus.NOT_FOUND,
			"Program not found for this department",
		);
	}

	return program;
};

const createNotification = async (
	userId: string,
	title: string,
	message: string,
) => {
	return prisma.notification.create({
		data: {
			userId,
			title,
			message,
			channel: NotificationChannel.SYSTEM,
			sentAt: new Date(),
		},
	});
};

const applyForEnrollment = async (
	payload: IStudentApplyPayload,
	user: IRequestUser,
) => {
	const { userId, name: fullName } = user;
	const { phone, enrollmentYear } = payload;

	const [existingProfile, existingApplication] = await Promise.all([
		prisma.studentProfile.findUnique({ where: { userId } }),
		prisma.studentApplication.findUnique({ where: { userId } }),
	]);

	if (existingProfile) {
		throw new AppError(httpStatus.CONFLICT, "You are already enrolled");
	}

	if (existingApplication) {
		throw new AppError(
			httpStatus.CONFLICT,
			"Application already submitted. You can update and resubmit it.",
		);
	}

	const department = await resolveDepartment(payload.departmentName);
	const program = await resolveProgram(department.id, payload.programName);

	const application = await prisma.studentApplication.create({
		data: {
			userId,
			fullName,
			phone,
			departmentId: department.id,
			programId: program.id,
			enrollmentYear,
		},
		include: {
			department: true,
			program: true,
		},
	});

	await createNotification(
		userId,
		"Application Submitted",
		"Your enrollment application has been submitted for review.",
	);

	return application;
};

const updateApplication = async (
	payload: IStudentApplyPayload,
	user: IRequestUser,
) => {
	const { userId, name: fullName } = user;

	const existingApplication = await prisma.studentApplication.findUnique({
		where: { userId },
	});

	if (!existingApplication) {
		throw new AppError(httpStatus.NOT_FOUND, "Application not found");
	}

	if (existingApplication.status === ApplicationStatus.APPROVED) {
		throw new AppError(httpStatus.CONFLICT, "Application already approved");
	}

	const department = await resolveDepartment(payload.departmentName);
	const program = await resolveProgram(department.id, payload.programName);

	const updatedApplication = await prisma.studentApplication.update({
		where: { id: existingApplication.id },
		data: {
			fullName,
			phone: payload.phone,
			departmentId: department.id,
			programId: program.id,
			enrollmentYear: payload.enrollmentYear,
			status: ApplicationStatus.PENDING,
			reviewedById: null,
			reviewNote: null,
			reviewedAt: null,
		},
		include: {
			department: true,
			program: true,
		},
	});

	await createNotification(
		userId,
		"Application Resubmitted",
		"Your enrollment application has been updated and resubmitted for review.",
	);

	return updatedApplication;
};

const getMyApplication = async (userId: string) => {
	const application = await prisma.studentApplication.findUnique({
		where: { userId },
		include: {
			department: true,
			program: true,
		},
	});

	return application;
};

const getAllApplications = async (query: IGetApplicationsQuery) => {
	const where: Prisma.StudentApplicationWhereInput = {};

	if (query.status && Object.values(ApplicationStatus).includes(query.status)) {
		where.status = query.status;
	}

	const applications = await prisma.studentApplication.findMany({
		where,
		include: {
			user: {
				select: {
					id: true,
					name: true,
					email: true,
					imageURL: true,
				},
			},
			department: true,
			program: true,
		},
		orderBy: {
			createdAt: "desc",
		},
	});

	return applications;
};

const approveApplication = async (
	applicationId: string,
	payload: IApproveApplicationPayload,
	adminId: string,
) => {
	const application = await prisma.studentApplication.findUnique({
		where: { id: applicationId },
		include: {
			user: true,
		},
	});

	if (!application) {
		throw new AppError(httpStatus.NOT_FOUND, "Application not found");
	}

	if (application.status !== ApplicationStatus.PENDING) {
		throw new AppError(httpStatus.CONFLICT, "Application already reviewed");
	}

	const studentId = payload.studentId.trim();

	const existingStudent = await prisma.studentProfile.findUnique({
		where: { studentId },
	});

	if (existingStudent) {
		throw new AppError(httpStatus.CONFLICT, "Student ID already in use");
	}

	const studentProfile = await prisma.studentProfile.create({
		data: {
			userId: application.userId,
			studentId,
			fullName: application.fullName,
			phone: application.phone,
			avatarUrl: application.avatarUrl,
			avatarPublicId: application.avatarPublicId,
			departmentId: application.departmentId,
			programId: application.programId,
			enrollmentYear: application.enrollmentYear,
		},
		include: {
			department: true,
			program: true,
		},
	});

	await prisma.studentApplication.update({
		where: { id: applicationId },
		data: {
			status: ApplicationStatus.APPROVED,
			reviewedById: adminId,
			reviewNote: payload.reviewNote,
			reviewedAt: new Date(),
		},
	});

	await prisma.user.update({
		where: { id: application.userId },
		data: {
			name: application.fullName,
		},
	});

	await createNotification(
		application.userId,
		"Application Approved",
		"Congratulations! Your enrollment application has been approved. Welcome to EduSphere!",
	);

	const templatePath = path.join(
		process.cwd(),
		"src/app/templates/student-welcome-email.ejs",
	);

	const html = await ejs.renderFile(templatePath, {
		name: application.fullName,
	});

	await transporter.sendMail({
		from: config.email_sender,
		to: application.user.email,
		subject: "Welcome To EduSphere",
		html,
	});

	return studentProfile;
};

const rejectApplication = async (
	applicationId: string,
	payload: IRejectApplicationPayload,
	adminId: string,
) => {
	const application = await prisma.studentApplication.findUnique({
		where: { id: applicationId },
		include: {
			user: true,
			department: true,
		},
	});

	if (!application) {
		throw new AppError(httpStatus.NOT_FOUND, "Application not found");
	}

	if (application.status !== ApplicationStatus.PENDING) {
		throw new AppError(httpStatus.CONFLICT, "Application already reviewed");
	}

	const updatedApplication = await prisma.studentApplication.update({
		where: { id: applicationId },
		data: {
			status: ApplicationStatus.REJECTED,
			reviewedById: adminId,
			reviewNote: payload.reviewNote,
			reviewedAt: new Date(),
		},
	});

	await createNotification(
		application.userId,
		"Application Rejected",
		"Your enrollment application was not approved. You can update and resubmit it.",
	);

	const templatePath = path.join(
		process.cwd(),
		"src/app/templates/student-application-rejected.ejs",
	);

	const html = await ejs.renderFile(templatePath, {
		name: application.user.name,
		departmentName: application.department?.name,
		reviewNote: payload.reviewNote,
	});

	await transporter.sendMail({
		from: config.email_sender,
		to: application.user.email,
		subject: "Application Update From EduSphere",
		html,
	});

	return updatedApplication;
};

const updateMyProfile = async (
	payload: IUpdateMyProfilePayload,
	userId: string,
) => {
	const studentProfileId = await getStudentProfileId(userId);

	const updatedProfile = await prisma.studentProfile.update({
		where: { id: studentProfileId },
		data: {
			fullName: payload.fullName,
			phone: payload.phone,
		},
		include: {
			department: true,
			program: true,
		},
	});

	if (payload.fullName) {
		await prisma.user.update({
			where: { id: userId },
			data: {
				name: payload.fullName,
			},
		});
	}

	return updatedProfile;
};

const updateMyProfileImage = async (buffer: Buffer, userId: string) => {
	const [studentProfile, application] = await Promise.all([
		prisma.studentProfile.findUnique({ where: { userId } }),
		prisma.studentApplication.findUnique({ where: { userId } }),
	]);

	if (!studentProfile && !application) {
		throw new AppError(
			httpStatus.FORBIDDEN,
			"Apply for enrollment before uploading a profile image",
		);
	}

	const cloudinaryResult = await new Promise<UploadApiResponse>(
		(resolve, reject) => {
			cloudinary.uploader
				.upload_stream(
					{
						resource_type: "auto",
					},
					(error, result) => {
						if (error) {
							return reject(error);
						}

						if (!result) {
							return reject(new Error("No result returned from Cloudinary"));
						}

						resolve(result);
					},
				)
				.end(buffer);
		},
	);

	if (studentProfile) {
		const previousPublicId = studentProfile.avatarPublicId;

		const updatedProfile = await prisma.studentProfile.update({
			where: { id: studentProfile.id },
			data: {
				avatarUrl: cloudinaryResult.secure_url,
				avatarPublicId: cloudinaryResult.public_id,
			},
			include: {
				department: true,
				program: true,
			},
		});

		if (previousPublicId) {
			await cloudinary.uploader.destroy(previousPublicId);
		}

		return updatedProfile;
	}

	if (
		application &&
		(application.status === ApplicationStatus.PENDING ||
			application.status === ApplicationStatus.REJECTED)
	) {
		const previousPublicId = application.avatarPublicId;

		const updatedApplication = await prisma.studentApplication.update({
			where: { id: application.id },
			data: {
				avatarUrl: cloudinaryResult.secure_url,
				avatarPublicId: cloudinaryResult.public_id,
			},
		});

		if (previousPublicId) {
			await cloudinary.uploader.destroy(previousPublicId);
		}

		return updatedApplication;
	}

	throw new AppError(
		httpStatus.CONFLICT,
		"Profile image cannot be updated right now",
	);
};

const getMyInfo = async (userId: string) => {
	const user = await prisma.user.findUnique({
		where: { id: userId },
		include: {
			studentProfile: {
				include: {
					department: true,
					program: true,
				},
			},
			studentApplication: {
				include: {
					department: true,
					program: true,
				},
			},
		},
		omit: {
			password: true,
		},
	});

	if (!user) {
		throw new AppError(httpStatus.NOT_FOUND, "User not found");
	}

	return user;
};

const registeredCourses = async (userId: string) => {
	const studentProfileId = await getStudentProfileId(userId);

	const registrations = await prisma.courseRegistration.findMany({
		where: {
			studentId: studentProfileId,
			isDeleted: false,
			status: {
				in: [RegistrationStatus.ENROLLED, RegistrationStatus.COMPLETED],
			},
		},
		include: {
			section: {
				include: {
					course: true,
					semester: true,
					instructor: {
						include: {
							user: {
								select: {
									name: true,
									email: true,
								},
							},
						},
					},
				},
			},
		},
		orderBy: {
			registeredAt: "desc",
		},
	});

	return registrations;
};

const registeredCourseDetails = async (
	courseRegistrationId: string,
	userId: string,
) => {
	const studentProfileId = await getStudentProfileId(userId);

	const registration = await prisma.courseRegistration.findFirst({
		where: {
			id: courseRegistrationId,
			studentId: studentProfileId,
			isDeleted: false,
		},
		include: {
			section: {
				include: {
					course: true,
					semester: true,
					instructor: {
						include: {
							user: {
								select: {
									name: true,
									email: true,
								},
							},
						},
					},
					exams: {
						include: {
							results: {
								where: { studentId: studentProfileId },
							},
						},
						orderBy: {
							date: "asc",
						},
					},
					attendances: {
						where: { studentId: studentProfileId },
						orderBy: {
							date: "asc",
						},
					},
				},
			},
		},
	});

	if (!registration) {
		throw new AppError(httpStatus.NOT_FOUND, "Registration not found");
	}

	return registration;
};

const attendanceDetails = async (userId: string) => {
	const studentProfileId = await getStudentProfileId(userId);

	const attendances = await prisma.attendance.findMany({
		where: {
			studentId: studentProfileId,
			section: { isDeleted: false },
		},
		include: {
			section: {
				include: {
					course: true,
					semester: true,
				},
			},
		},
		orderBy: {
			date: "asc",
		},
	});

	const grouped = new Map<string, AttendanceGroup>();

	for (const attendance of attendances) {
		const section = attendance.section;
		const key = section.id;

		if (!grouped.has(key)) {
			grouped.set(key, {
				sectionId: section.id,
				sectionCode: section.sectionCode,
				course: {
					code: section.course.code,
					title: section.course.title,
					creditHours: section.course.creditHours,
				},
				semester: `${section.semester.name} ${section.semester.year}`,
				total: 0,
				present: 0,
				absent: 0,
				late: 0,
				excused: 0,
				percentage: 0,
				records: [],
			});
		}

		const entry = grouped.get(key)!;

		entry.total++;
		entry.records.push({
			date: attendance.date,
			status: attendance.status,
		});

		if (attendance.status === AttendanceStatus.PRESENT) {
			entry.present++;
		} else if (attendance.status === AttendanceStatus.ABSENT) {
			entry.absent++;
		} else if (attendance.status === AttendanceStatus.LATE) {
			entry.late++;
		} else if (attendance.status === AttendanceStatus.EXCUSED) {
			entry.excused++;
		}
	}

	const result = Array.from(grouped.values()).map((entry) => {
		const attended = entry.present + entry.late + entry.excused;
		entry.percentage = entry.total
			? Math.round((attended / entry.total) * 100)
			: 0;
		return entry;
	});

	return result;
};

const getMyGrades = async (userId: string) => {
	const studentProfileId = await getStudentProfileId(userId);

	const results = await prisma.result.findMany({
		where: {
			studentId: studentProfileId,
		},
		include: {
			exam: {
				include: {
					section: {
						include: {
							course: true,
							semester: true,
						},
					},
				},
			},
		},
		orderBy: {
			exam: { date: "asc" },
		},
	});

	const grouped = new Map<string, CourseGrade>();

	for (const result of results) {
		const section = result.exam.section;
		const key = section.id;

		if (!grouped.has(key)) {
			grouped.set(key, {
				course: {
					code: section.course.code,
					title: section.course.title,
					creditHours: section.course.creditHours,
				},
				semester: `${section.semester.name} ${section.semester.year}`,
				sectionCode: section.sectionCode,
				exams: [],
				totalMarks: 0,
				marksObtained: 0,
				averageGradePoint: null,
			});
		}

		const entry = grouped.get(key)!;

		entry.exams.push({
			type: result.exam.type,
			date: result.exam.date,
			totalMarks: result.exam.totalMarks,
			marksObtained: result.marksObtained,
			grade: result.grade,
			gradePoint: result.gradePoint,
		});

		entry.totalMarks += result.exam.totalMarks;
		entry.marksObtained += result.marksObtained;
	}

	const result = Array.from(grouped.values()).map((entry) => {
		const gradePoints = entry.exams
			.map((exam) => exam.gradePoint)
			.filter((gradePoint): gradePoint is number => gradePoint !== null);

		entry.averageGradePoint = gradePoints.length
			? Number(
					(
						gradePoints.reduce((sum, gradePoint) => sum + gradePoint, 0) /
						gradePoints.length
					).toFixed(2),
				)
			: null;

		return entry;
	});

	return result;
};

const getMyGradesDetails = async (
	courseRegistrationId: string,
	userId: string,
) => {
	const studentProfileId = await getStudentProfileId(userId);

	const registration = await prisma.courseRegistration.findFirst({
		where: {
			id: courseRegistrationId,
			studentId: studentProfileId,
			isDeleted: false,
		},
		include: {
			section: {
				include: {
					course: true,
					semester: true,
					exams: {
						include: {
							results: {
								where: { studentId: studentProfileId },
							},
						},
						orderBy: {
							date: "asc",
						},
					},
					attendances: {
						where: { studentId: studentProfileId },
					},
				},
			},
		},
	});

	if (!registration) {
		throw new AppError(httpStatus.NOT_FOUND, "Registration not found");
	}

	const { attendances, exams, ...section } = registration.section;

	const totalClasses = attendances.length;
	const attendedClasses = attendances.filter(
		(attendance) => attendance.status !== AttendanceStatus.ABSENT,
	).length;

	const examResults = exams.map((exam) => ({
		examId: exam.id,
		type: exam.type,
		date: exam.date,
		totalMarks: exam.totalMarks,
		marksObtained: exam.results[0]?.marksObtained ?? null,
		grade: exam.results[0]?.grade ?? null,
		gradePoint: exam.results[0]?.gradePoint ?? null,
	}));

	const gradePoints = examResults
		.map((exam) => exam.gradePoint)
		.filter((gradePoint): gradePoint is number => gradePoint !== null);

	const averageGradePoint = gradePoints.length
		? Number(
				(
					gradePoints.reduce((sum, gradePoint) => sum + gradePoint, 0) /
					gradePoints.length
				).toFixed(2),
			)
		: null;

	return {
		registrationId: registration.id,
		status: registration.status,
		course: section.course,
		semester: section.semester,
		sectionCode: section.sectionCode,
		attendance: {
			totalClasses,
			attendedClasses,
			percentage: totalClasses
				? Math.round((attendedClasses / totalClasses) * 100)
				: 0,
		},
		exams: examResults,
		averageGradePoint,
	};
};

const getMyCGPA = async (userId: string) => {
	const studentProfileId = await getStudentProfileId(userId);

	const registrations = await prisma.courseRegistration.findMany({
		where: {
			studentId: studentProfileId,
			isDeleted: false,
			status: RegistrationStatus.COMPLETED,
		},
		include: {
			section: {
				include: {
					course: true,
					exams: {
						include: {
							results: {
								where: { studentId: studentProfileId },
							},
						},
					},
				},
			},
		},
	});

	let totalCredits = 0;
	let weightedPoints = 0;
	let courseCount = 0;

	for (const registration of registrations) {
		const course = registration.section.course;

		const gradePoints = registration.section.exams
			.map((exam) => exam.results[0]?.gradePoint)
			.filter(
				(gradePoint): gradePoint is number =>
					gradePoint !== null && gradePoint !== undefined,
			);

		const courseGradePoint = gradePoints.length
			? gradePoints.reduce((sum, gradePoint) => sum + gradePoint, 0) /
				gradePoints.length
			: null;

		if (courseGradePoint !== null) {
			totalCredits += course.creditHours;
			weightedPoints += courseGradePoint * course.creditHours;
			courseCount++;
		}
	}

	const cgpa = totalCredits
		? Number((weightedPoints / totalCredits).toFixed(2))
		: 0;

	await prisma.studentProfile.update({
		where: { id: studentProfileId },
		data: {
			cgpa,
		},
	});

	return {
		cgpa,
		totalCredits,
		courseCount,
	};
};

export const StudentService = {
	applyForEnrollment,
	updateApplication,
	getMyApplication,
	getAllApplications,
	approveApplication,
	rejectApplication,
	updateMyProfile,
	updateMyProfileImage,
	getMyInfo,
	registeredCourses,
	registeredCourseDetails,
	attendanceDetails,
	getMyGrades,
	getMyGradesDetails,
	getMyCGPA,
};
