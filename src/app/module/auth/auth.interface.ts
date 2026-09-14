import { Role } from "../../../generated/prisma/enums"

export interface ILoginUserPayload {
    email: string
    password: string
}

export interface IRegisterPatientPayload {
    email: string
    password: string
}

export interface IRequestUser {
    userId: string
    email: string
    role: Role
}