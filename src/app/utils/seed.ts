import bcrypt from "bcryptjs";
import httpStatus from "http-status";
import { Role } from "../../generated/prisma/enums";
import config from "../config";
import { prisma } from "../lib/prisma";
import { AppError } from "./AppError";

const getSaltRounds = () => Number(config.bcrypt_salt_rounds) || 10;

const assertEnv = (values: (string | undefined)[], message: string) => {
	if (values.some((value) => !value)) {
		throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, message);
	}
};

export const seedSuperAdmin = async () => {
	try {
		const isSuperAdminExist = await prisma.user.findFirst({
			where: {
				role: Role.SUPER_ADMIN,
			},
		});

		if (isSuperAdminExist) {
			console.log("Super Admin Already Exists!");
			return;
		}

		const name = config.super_admin_name;
		const email = config.super_admin_email;
		const password = config.super_admin_password;

		assertEnv(
			[name, email, password],
			"Super Admin Name, Email, Password Missing In Env File!!!",
		);

		const hashedPassword = await bcrypt.hash(
			password as string,
			getSaltRounds(),
		);

		const superAdmin = await prisma.user.create({
			data: {
				name: name as string,
				email: email as string,
				password: hashedPassword,
				role: Role.SUPER_ADMIN,
				needPasswordChange: false,
				emailVerified: true,
			},
		});

		console.log("Super Admin Created : ", superAdmin);
	} catch (error) {
		console.log("Error Seeding Super Admin : ", error);
	}
};

export const seedAdmin = async () => {
	try {
		const email = config.admin_email;

		assertEnv(
			[config.admin_name, email, config.admin_password],
			"Admin Name, Email, Password Missing In Env File!!!",
		);

		const isAdminExist = await prisma.user.findUnique({
			where: {
				email: email as string,
			},
		});

		if (isAdminExist) {
			console.log("Admin Already Exists!");
			return;
		}

		const name = config.admin_name as string;
		const password = config.admin_password as string;

		const hashedPassword = await bcrypt.hash(password, getSaltRounds());

		const admin = await prisma.user.create({
			data: {
				name,
				email: email as string,
				password: hashedPassword,
				role: Role.ADMIN,
				needPasswordChange: false,
				emailVerified: true,
			},
		});

		console.log("Admin Created : ", admin);
	} catch (error) {
		console.log("Error Seeding Admin : ", error);
	}
};

export const seedTeacher = async () => {
	try {
		const email = config.teacher_email;

		assertEnv(
			[config.teacher_name, email, config.teacher_password],
			"Teacher Name, Email, Password Missing In Env File!!!",
		);

		const department = await prisma.department.upsert({
			where: {
				name: config.seed_department_name,
			},
			update: {},
			create: {
				name: config.seed_department_name,
				code: config.seed_department_code,
			},
		});

		const existingTeacher = await prisma.user.findUnique({
			where: {
				email: email as string,
			},
			include: {
				instructorProfile: true,
			},
		});

		if (existingTeacher) {
			if (!existingTeacher.instructorProfile) {
				await prisma.instructorProfile.create({
					data: {
						userId: existingTeacher.id,
						fullName: existingTeacher.name,
						instructorId: "INS-2026-0001",
						departmentId: department.id,
						designation: "Lecturer",
					},
				});

				console.log("Teacher Instructor Profile Recreated!");
			} else {
				console.log("Teacher Already Exists!");
			}

			return;
		}

		const name = config.teacher_name as string;
		const password = config.teacher_password as string;

		const hashedPassword = await bcrypt.hash(password, getSaltRounds());

		const teacher = await prisma.user.create({
			data: {
				name,
				email: email as string,
				password: hashedPassword,
				role: Role.INSTRUCTOR,
				needPasswordChange: false,
				emailVerified: true,
				instructorProfile: {
					create: {
						fullName: name,
						instructorId: "INS-2026-0001",
						departmentId: department.id,
						designation: "Lecturer",
					},
				},
			},
			omit: {
				password: true,
			},
			include: {
				instructorProfile: true,
			},
		});

		console.log("Teacher Created : ", teacher);
	} catch (error) {
		console.log("Error Seeding Teacher : ", error);
	}
};

export const seedAcademicData = async () => {
	try {
		const department = await prisma.department.findUnique({
			where: { name: config.seed_department_name },
		});

		if (!department) {
			console.log("Seed department missing; skipping academic seed data.");
			return;
		}

		const year = Number(config.seed_semester_year) || new Date().getFullYear();

		const semester = await prisma.semester.upsert({
			where: {
				name_year: {
					name: config.seed_semester_name,
					year,
				},
			},
			update: {
				registrationDeadline: new Date(Date.UTC(year, 9, 15)),
			},
			create: {
				name: config.seed_semester_name,
				year,
				startDate: new Date(Date.UTC(year, 8, 1)),
				endDate: new Date(Date.UTC(year, 11, 31)),
				registrationDeadline: new Date(Date.UTC(year, 9, 15)),
				isActive: true,
			},
		});

		const course = await prisma.course.upsert({
			where: { code: config.seed_course_code },
			update: {},
			create: {
				code: config.seed_course_code,
				title: config.seed_course_title,
				creditHours: Number(config.seed_course_credit_hours) || 3,
				departmentId: department.id,
			},
		});

		const instructor = await prisma.instructorProfile.findFirst({
			where: { departmentId: department.id, isDeleted: false },
		});

		await prisma.courseSection.upsert({
			where: {
				courseId_semesterId_sectionCode: {
					courseId: course.id,
					semesterId: semester.id,
					sectionCode: config.seed_section_code,
				},
			},
			update: {},
			create: {
				courseId: course.id,
				semesterId: semester.id,
				sectionCode: config.seed_section_code,
				instructorId: instructor?.id ?? null,
				capacity: Number(config.seed_section_capacity) || 40,
				schedule: "Sun/Tue 10:00-11:30",
			},
		});

		const program = await prisma.program.findFirst({
			where: { departmentId: department.id, isDeleted: false },
		});

		if (program) {
			await prisma.studentSection.upsert({
				where: {
					programId_enrollmentYear_sectionCode: {
						programId: program.id,
						enrollmentYear: year,
						sectionCode: config.seed_student_section_code,
					},
				},
				update: {},
				create: {
					programId: program.id,
					enrollmentYear: year,
					sectionCode: config.seed_student_section_code,
					capacity: Number(config.seed_section_capacity) || 40,
				},
			});
		}

		console.log(
			"Academic seed data ensured (semester, course, course section, student section).",
		);
	} catch (error) {
		console.log("Error Seeding Academic Data : ", error);
	}
};

export const seedDatabase = async () => {
	await seedSuperAdmin();
	await seedAdmin();
	await seedTeacher();
	await seedAcademicData();
};
