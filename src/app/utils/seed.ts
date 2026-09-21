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

		const isTeacherExist = await prisma.user.findUnique({
			where: {
				email: email as string,
			},
		});

		if (isTeacherExist) {
			console.log("Teacher Already Exists!");
			return;
		}

		const name = config.teacher_name as string;
		const password = config.teacher_password as string;

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

export const seedDatabase = async () => {
	await seedSuperAdmin();
	await seedAdmin();
	await seedTeacher();
};
