import httpStatus from "http-status";
import type { Prisma } from "../../../generated/prisma/client";
import { PaymentStatus, Role } from "../../../generated/prisma/enums";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import type { IRequestUser } from "../auth/auth.interface";
import type { IPaymentListQuery } from "./payment.interface";

const paymentInclude = {
	user: {
		select: { id: true, name: true, email: true, role: true },
	},
	semesterEnrollment: {
		select: {
			id: true,
			semesterId: true,
			totalCredits: true,
			totalFee: true,
		},
	},
} satisfies Prisma.PaymentInclude;

const buildWhere = (query: IPaymentListQuery, userId?: string) => {
	const where: Prisma.PaymentWhereInput = {};

	if (userId) {
		where.userId = userId;
	}

	if (query.status) {
		where.status = query.status;
	}

	if (query.purpose) {
		where.purpose = query.purpose;
	}

	if (query.semesterId) {
		where.semesterEnrollment = { is: { semesterId: query.semesterId } };
	}

	if (query.studentId) {
		where.user = {
			is: { studentProfile: { is: { id: query.studentId } } },
		};
	}

	if (query.startDate || query.endDate) {
		where.createdAt = {
			...(query.startDate ? { gte: query.startDate } : {}),
			...(query.endDate ? { lte: query.endDate } : {}),
		};
	}

	return where;
};

const listPayments = async (query: IPaymentListQuery, userId?: string) => {
	const page = Math.max(1, Number(query.page) || 1);
	const limit = Math.max(1, Math.min(100, Number(query.limit) || 10));
	const skip = (page - 1) * limit;

	const where = buildWhere(query, userId);

	const [data, total, revenueAgg, refundedAgg] = await prisma.$transaction([
		prisma.payment.findMany({
			where,
			skip,
			take: limit,
			orderBy: { createdAt: "desc" },
			include: paymentInclude,
		}),
		prisma.payment.count({ where }),
		prisma.payment.aggregate({
			where: { ...where, status: PaymentStatus.SUCCEEDED },
			_sum: { amount: true },
		}),
		prisma.payment.aggregate({
			where: { ...where, status: PaymentStatus.REFUNDED },
			_sum: { amount: true },
		}),
	]);

	return {
		data,
		meta: {
			page,
			limit,
			total,
			totalPages: Math.ceil(total / limit),
			summary: {
				revenue: revenueAgg._sum.amount ?? 0,
				refunded: refundedAgg._sum.amount ?? 0,
			},
		},
	};
};

const getAllPayments = async (query: IPaymentListQuery) => listPayments(query);

const getMyPayments = async (user: IRequestUser, query: IPaymentListQuery) => {
	if (user.role === Role.STUDENT && query.studentId) {
		throw new AppError(
			httpStatus.FORBIDDEN,
			"You can only view your own payments",
		);
	}

	return listPayments(query, user.userId);
};

const getPaymentById = async (id: string, user: IRequestUser) => {
	const payment = await prisma.payment.findFirst({
		where: { id },
		include: paymentInclude,
	});

	if (!payment) {
		throw new AppError(httpStatus.NOT_FOUND, "Payment not found");
	}

	if (user.role === Role.STUDENT && payment.userId !== user.userId) {
		throw new AppError(
			httpStatus.FORBIDDEN,
			"You are not allowed to view this payment",
		);
	}

	return payment;
};

export const PaymentService = {
	getAllPayments,
	getMyPayments,
	getPaymentById,
};
