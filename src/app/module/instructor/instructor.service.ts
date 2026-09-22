import type { UploadApiResponse } from "cloudinary";
import ejs from "ejs";
import httpStatus from "http-status";
import path from "path";
import type { Prisma } from "../../../generated/prisma/client";
import { ApplicationStatus } from "../../../generated/prisma/enums";
import config from "../../config";
import { cloudinary } from "../../lib/cloudinary";
import { transporter } from "../../lib/nodemailer";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { isSupportedImageBuffer } from "../../utils/imageSignature";
import type { IRequestUser } from "../auth/auth.interface";
import type {
	IApproveInstructorPayload,
	IInstructorApplyPayload,
	IInstructorQuery,
	IRejectInstructorPayload,
	IUpdateInstructorPayload,
	IUpdateMyProfilePayload,
} from "./instructor.interface";

const getInstructorProfileId = async (userId: string) => {
	const profile = await prisma.instructorProfile.findUnique({
		where: { userId },
	});

	if (!profile) {
		throw new AppError(
			httpStatus.FORBIDDEN,
			"Instructor profile not found. Please submit your instructor application first.",
		);
	}

	if (profile.isDeleted) {
		throw new AppError(
			httpStatus.FORBIDDEN,
			"Your instructor profile is deleted. Please contact the administration for assistance.",
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

const ensureDepartmentExists = async (departmentId: string) => {
	const department = await prisma.department.findUnique({
		where: { id: departmentId },
	});

	if (!department || department.isDeleted) {
		throw new AppError(httpStatus.NOT_FOUND, "Department not found");
	}

	return department;
};

const generateInstructorId = async () => {
	const year = new Date().getFullYear();
	let seq = (await prisma.instructorProfile.count()) + 1;

	let instructorId = `INS-${year}-${String(seq).padStart(4, "0")}`;

	while (
		await prisma.instructorProfile.findUnique({ where: { instructorId } })
	) {
		seq += 1;
		instructorId = `INS-${year}-${String(seq).padStart(4, "0")}`;
	}

	return instructorId;
};

const applyForInstructor = async (
	payload: IInstructorApplyPayload,
	user: IRequestUser,
) => {
	const { userId, name, email } = user;

	const [existingProfile, existingApplication] = await Promise.all([
		prisma.instructorProfile.findUnique({ where: { userId } }),
		prisma.instructorApplication.findUnique({ where: { userId } }),
	]);

	if (existingProfile && existingProfile.isDeleted === false) {
		throw new AppError(
			httpStatus.CONFLICT,
			"You are already an approved instructor",
		);
	}

	if (existingApplication) {
		throw new AppError(
			httpStatus.CONFLICT,
			"Application already submitted. You can update and resubmit it.",
		);
	}

	const department = await resolveDepartment(payload.departmentName);

	const application = await prisma.instructorApplication.create({
		data: {
			userId,
			name,
			email,
			phone: payload.phone,
			departmentId: department.id,
			designation: payload.designation,
			coverNote: payload.coverNote,
		},
		include: {
			department: true,
		},
	});

	return application;
};

const updateApplication = async (
	payload: IInstructorApplyPayload,
	user: IRequestUser,
) => {
	const { userId, name, email } = user;

	const existingApplication = await prisma.instructorApplication.findUnique({
		where: { userId },
	});

	if (!existingApplication) {
		throw new AppError(httpStatus.NOT_FOUND, "Application not found");
	}

	if (existingApplication.status === ApplicationStatus.APPROVED) {
		throw new AppError(httpStatus.CONFLICT, "Application already approved");
	}

	const department = await resolveDepartment(payload.departmentName);

	const updatedApplication = await prisma.instructorApplication.update({
		where: { id: existingApplication.id },
		data: {
			name,
			email,
			phone: payload.phone,
			departmentId: department.id,
			designation: payload.designation,
			coverNote: payload.coverNote,
			status: ApplicationStatus.PENDING,
			reviewedById: null,
			reviewNote: null,
			reviewedAt: null,
		},
		include: {
			department: true,
		},
	});

	return updatedApplication;
};

const getMyApplication = async (userId: string) => {
	const application = await prisma.instructorApplication.findUnique({
		where: { userId },
		include: {
			department: true,
			user: {
				select: {
					id: true,
					name: true,
					email: true,
					imageURL: true,
				},
			},
		},
	});

	return application;
};

const uploadResume = async (buffer: Buffer, userId: string) => {
	const application = await prisma.instructorApplication.findUnique({
		where: { userId },
	});

	if (!application || application.status === ApplicationStatus.APPROVED) {
		throw new AppError(
			httpStatus.CONFLICT,
			"Resume cannot be uploaded right now",
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

	const updatedApplication = await prisma.instructorApplication.update({
		where: { id: application.id },
		data: {
			resumeUrl: cloudinaryResult.secure_url,
		},
	});

	return updatedApplication;
};

const updateMyProfile = async (
	payload: IUpdateMyProfilePayload,
	userId: string,
) => {
	const instructorProfileId = await getInstructorProfileId(userId);

	const updatedProfile = await prisma.instructorProfile.update({
		where: { id: instructorProfileId },
		data: {
			fullName: payload.fullName,
			phone: payload.phone,
		},
		include: {
			department: true,
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
	const [instructorProfile, application] = await Promise.all([
		prisma.instructorProfile.findUnique({ where: { userId } }),
		prisma.instructorApplication.findUnique({ where: { userId } }),
	]);

	if (!instructorProfile && !application) {
		throw new AppError(
			httpStatus.FORBIDDEN,
			"Apply as an instructor before uploading a profile image",
		);
	}

	if (!isSupportedImageBuffer(buffer)) {
		throw new AppError(httpStatus.BAD_REQUEST, "Only image files are allowed");
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

	if (instructorProfile) {
		const [updatedProfile] = await prisma.$transaction([
			prisma.instructorProfile.update({
				where: { id: instructorProfile.id },
				data: {
					avatarUrl: cloudinaryResult.secure_url,
				},
				include: {
					department: true,
				},
			}),
			prisma.user.update({
				where: { id: userId },
				data: {
					imageURL: cloudinaryResult.secure_url,
					imagePublicId: cloudinaryResult.public_id,
				},
			}),
		]);

		return updatedProfile;
	}

	if (
		application &&
		(application.status === ApplicationStatus.PENDING ||
			application.status === ApplicationStatus.REJECTED)
	) {
		const previousPublicId = application.avatarPublicId;

		const [updatedApplication] = await prisma.$transaction([
			prisma.instructorApplication.update({
				where: { id: application.id },
				data: {
					avatarUrl: cloudinaryResult.secure_url,
					avatarPublicId: cloudinaryResult.public_id,
				},
			}),
			prisma.user.update({
				where: { id: userId },
				data: {
					imageURL: cloudinaryResult.secure_url,
					imagePublicId: cloudinaryResult.public_id,
				},
			}),
		]);

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
			instructorProfile: {
				include: {
					department: true,
					courseSections: {
						where: { isDeleted: false },
						include: {
							course: true,
							semester: true,
						},
					},
				},
			},
			instructorApplication: true,
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

const getAllApplications = async (query: { status?: ApplicationStatus }) => {
	const where: Prisma.InstructorApplicationWhereInput = {};

	if (query.status && Object.values(ApplicationStatus).includes(query.status)) {
		where.status = query.status;
	}

	const applications = await prisma.instructorApplication.findMany({
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
		},
		orderBy: {
			createdAt: "desc",
		},
	});

	return applications;
};

const approveApplication = async (
	applicationId: string,
	payload: IApproveInstructorPayload,
	adminId: string,
) => {
	const application = await prisma.instructorApplication.findUnique({
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

	const departmentId = payload.departmentId ?? application.departmentId;

	if (payload.departmentId) {
		await ensureDepartmentExists(payload.departmentId);
	}

	const designation = payload.designation ?? application.designation;
	const instructorId = await generateInstructorId();

	const instructorProfile = await prisma.instructorProfile.create({
		data: {
			userId: application.userId,
			fullName: application.name,
			instructorId,
			phone: application.phone,
			avatarUrl: application.avatarUrl,
			designation,
			departmentId,
		},
		include: {
			department: true,
		},
	});

	await prisma.instructorApplication.update({
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
			name: application.name,
		},
	});

	const templatePath = path.join(
		process.cwd(),
		"src/app/templates/instructor-welcome-email.ejs",
	);

	const html = await ejs.renderFile(templatePath, {
		name: application.name,
	});

	await transporter.sendMail({
		from: config.email_sender,
		to: application.user.email,
		subject: "Welcome To EduSphere",
		html,
	});

	return instructorProfile;
};

const rejectApplication = async (
	applicationId: string,
	payload: IRejectInstructorPayload,
	adminId: string,
) => {
	const application = await prisma.instructorApplication.findUnique({
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

	const updatedApplication = await prisma.instructorApplication.update({
		where: { id: applicationId },
		data: {
			status: ApplicationStatus.REJECTED,
			reviewedById: adminId,
			reviewNote: payload.reviewNote,
			reviewedAt: new Date(),
		},
	});

	const templatePath = path.join(
		process.cwd(),
		"src/app/templates/instructor-application-rejected.ejs",
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

const getAllInstructors = async (query: IInstructorQuery) => {
	const page = Math.max(1, Number(query.page) || 1);
	const limit = Math.max(1, Math.min(100, Number(query.limit) || 10));
	const skip = (page - 1) * limit;

	const where: Prisma.InstructorProfileWhereInput = {
		isDeleted: false,
	};

	if (query.departmentId) {
		where.departmentId = query.departmentId;
	}

	if (query.searchTerm) {
		where.OR = [
			{ fullName: { contains: query.searchTerm, mode: "insensitive" } },
			{ instructorId: { contains: query.searchTerm, mode: "insensitive" } },
			{ user: { name: { contains: query.searchTerm, mode: "insensitive" } } },
		];
	}

	const [data, total] = await prisma.$transaction([
		prisma.instructorProfile.findMany({
			where,
			skip,
			take: limit,
			orderBy: { createdAt: "desc" },
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
				_count: {
					select: {
						courseSections: true,
					},
				},
			},
		}),
		prisma.instructorProfile.count({ where }),
	]);

	return {
		data,
		meta: {
			page,
			limit,
			total,
			totalPages: Math.ceil(total / limit),
		},
	};
};

const getInstructorById = async (id: string) => {
	const instructor = await prisma.instructorProfile.findFirst({
		where: { id, isDeleted: false },
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
			courseSections: {
				where: { isDeleted: false },
				include: {
					course: true,
					semester: true,
				},
			},
		},
	});

	if (!instructor) {
		throw new AppError(httpStatus.NOT_FOUND, "Instructor not found");
	}

	return instructor;
};

const updateInstructor = async (
	id: string,
	payload: IUpdateInstructorPayload,
) => {
	const instructor = await prisma.instructorProfile.findFirst({
		where: { id, isDeleted: false },
	});

	if (!instructor) {
		throw new AppError(httpStatus.NOT_FOUND, "Instructor not found");
	}

	if (payload.departmentId) {
		await ensureDepartmentExists(payload.departmentId);
	}

	const updatedInstructor = await prisma.instructorProfile.update({
		where: { id },
		data: {
			fullName: payload.fullName,
			phone: payload.phone,
			designation: payload.designation,
			departmentId: payload.departmentId,
		},
		include: {
			department: true,
		},
	});

	if (payload.fullName) {
		await prisma.user.update({
			where: { id: instructor.userId },
			data: {
				name: payload.fullName,
			},
		});
	}

	return updatedInstructor;
};

const deleteInstructor = async (id: string) => {
	const instructor = await prisma.instructorProfile.findFirst({
		where: { id, isDeleted: false },
	});

	if (!instructor) {
		throw new AppError(httpStatus.NOT_FOUND, "Instructor not found");
	}

	const [updatedInstructor] = await prisma.$transaction([
		prisma.instructorProfile.update({
			where: { id },
			data: {
				isDeleted: true,
				deletedAt: new Date(),
			},
		}),
		prisma.courseSection.updateMany({
			where: { instructorId: id, isDeleted: false },
			data: { instructorId: null },
		}),
	]);

	return updatedInstructor;
};

export const InstructorService = {
	applyForInstructor,
	updateApplication,
	getMyApplication,
	uploadResume,
	updateMyProfile,
	updateMyProfileImage,
	getMyInfo,
	getAllApplications,
	approveApplication,
	rejectApplication,
	getAllInstructors,
	getInstructorById,
	updateInstructor,
	deleteInstructor,
};
