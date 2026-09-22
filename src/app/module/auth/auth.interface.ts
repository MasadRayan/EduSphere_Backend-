import type { Role } from "../../../generated/prisma/enums";

export interface ILoginUserPayload {
	email: string;
	password: string;
}

export interface IRegisterStudentPayload {
	name: string;
	email: string;
	password: string;
	role?: "STUDENT" | "INSTRUCTOR";
}

export interface IVerifyEmailPayload {
	email: string;
	otp: string;
}

export interface IGoogleLoginPayload {
	idToken: string;
}

export interface IForgotPasswordPayload {
	email: string;
}

export interface IResetPasswordPayload {
	email: string;
	otp: string;
	newPassword: string;
}

export interface IRequestUser {
	userId: string;
	name: string;
	email: string;
	role: Role;
}
