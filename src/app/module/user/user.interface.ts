import type { Role, UserStatus } from "../../../generated/prisma/enums";

export interface IUsersQuery {
	role?: Role;
	status?: UserStatus;
	searchTerm?: string;
	page?: string;
	limit?: string;
}

export interface IUpdateUserRolePayload {
	role: Role;
}

export interface IUpdateUserStatusPayload {
	status: UserStatus;
}
