import config from "../config";
import { AppError } from "../utils/AppError";
import { redisClient } from "./redis";
import httpStatus from "http-status";

export interface IBkashCreatePaymentPayload {
	amount: string;
	merchantInvoiceNumber: string;
	callbackURL: string;
	payerReference: string;
}

export interface IBkashCreatePaymentResponse {
	// tokenized checkout "create" response
	paymentID: string;
	createTime: string;
	organizationName: string;
	intent: string;
	merchantInvoiceNumber: string;
	transactionStatus: string;
	amount: string;
	currency: string;
	payerReference: string;
	merchantAssociationInfo: string;
	bkashURL: string;
	bkashQRCode: string;
	statusCode: string;
	statusMessage: string;
	errorCode?: string;
	errorMessage?: string;
}

export interface IBkashExecutePaymentResponse {
	paymentID: string;
	merchantInvoiceNumber: string;
	amount: string;
	currency: string;
	transactionStatus: string;
	trxID: string;
	payerReference?: string;
	customerMsisdn?: string;
	customerAccount?: string;
	payerType?: string;
	paymentCreateTime?: string;
	executeTime?: string;
	statusCode: string;
	statusMessage: string;
	errorCode?: string;
	errorMessage?: string;
}

export interface IBkashRefundPayload {
	paymentID: string;
	trxID: string;
	amount: string;
	sku: string;
	reason: string;
}

export interface IBkashRefundResponse {
	paymentID: string;
	merchantInvoiceNumber: string;
	trxID: string;
	transactionStatus: string;
	amount: string;
	currency: string;
	refundedAmount?: string;
	completeRefund?: boolean;
	refundTransactionStatus?: string;
	refundTrxID?: string;
	statusCode: string;
	statusMessage: string;
	errorCode?: string;
	errorMessage?: string;
}

export const bkashRequest = async (
	path: string,
	body: Record<string, unknown>,
) => {
	const idToken = await getBkashIdToken();

	if (!idToken) {
		throw new AppError(
			httpStatus.BAD_GATEWAY,
			"Bkash access token could not be retrieved",
		);
	}

	const response = await fetch(`${config.bkash_base_url}${path}`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Accept: "application/json",
			Authorization: idToken,
			"X-APP-Key": config.bkash_app_key!,
		},
		body: JSON.stringify(body),
	});

	return response.json();
};

export const bkashCreatePayment = async (
	payload: IBkashCreatePaymentPayload,
): Promise<IBkashCreatePaymentResponse> => {
	const result = await bkashRequest("/tokenized/checkout/create", {
		mode: "0011",
		payerReference: payload.payerReference,
		callbackURL: payload.callbackURL,
		amount: payload.amount,
		currency: "BDT",
		intent: "sale",
		merchantInvoiceNumber: payload.merchantInvoiceNumber,
	});

	if (result.statusCode && result.statusCode !== "0000") {
		throw new AppError(
			httpStatus.BAD_GATEWAY,
			result.statusMessage || "Bkash payment creation failed",
		);
	}

	return result as IBkashCreatePaymentResponse;
};

export const bkashExecutePayment = async (
	paymentID: string,
): Promise<IBkashExecutePaymentResponse> => {
	const result = await bkashRequest("/tokenized/checkout/execute", {
		paymentID,
	});

	if (result.statusCode && result.statusCode !== "0000") {
		throw new AppError(
			httpStatus.BAD_GATEWAY,
			result.statusMessage || "Bkash payment execution failed",
		);
	}

	return result as IBkashExecutePaymentResponse;
};

export const bkashRefundPayment = async (
	payload: IBkashRefundPayload,
): Promise<IBkashRefundResponse> => {
	const result = await bkashRequest("/tokenized/checkout/payment/refund", {
		paymentID: payload.paymentID,
		trxID: payload.trxID,
		amount: payload.amount,
		sku: payload.sku,
		reason: payload.reason,
	});

	if (result.statusCode && result.statusCode !== "0000") {
		throw new AppError(
			httpStatus.BAD_GATEWAY,
			result.statusMessage || "Bkash refund failed",
		);
	}

	return result as IBkashRefundResponse;
};

export const getBkashIdToken = async () => {
	try {
		const IdTokenKey = "bkash:idToken";
		const RefreshTokenKey = "bkash:refreshToken";

		let bkashIdToken = await redisClient.get(IdTokenKey);
		const bkashIdTokenTTL = await redisClient.ttl(IdTokenKey);

		const bkashRefreshToken = await redisClient.get(RefreshTokenKey);
		const bkashRefreshTokenTTL = await redisClient.ttl(RefreshTokenKey);

		// console.log({
		//     bkashIdToken,
		//     bkashIdTokenTTL,
		//     bkashRefreshToken,
		//     bkashRefreshTokenTTL
		// });

		//bkash id token remaining time is less than equal 10 minutes or bkash id is expired
		// bkash refresh token must exist
		// bkash refresh token remaining time is more than 10 minutes
		if (
			(bkashIdTokenTTL <= 600 || !bkashIdToken) &&
			bkashRefreshToken &&
			bkashRefreshTokenTTL > 600
		) {
			const refreshTokenResponse = await fetch(
				`${config.bkash_base_url}/tokenized/checkout/token/refresh`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Accept: "application/json",
						username: config.bkash_username,
						password: config.bkash_password,
					},
					body: JSON.stringify({
						app_key: config.bkash_app_key,
						app_secret: config.bkash_app_secret,
						refresh_token: bkashRefreshToken,
					}),
				},
			);
			if (!refreshTokenResponse.ok) {
				throw new AppError(
					httpStatus.BAD_GATEWAY,
					"Bkash Access Token Grant Failed",
				);
			}

			const bkashRefreshTokenResult = await refreshTokenResponse.json();

			bkashIdToken = bkashRefreshTokenResult.id_token as string;

			await redisClient.set(IdTokenKey, bkashIdToken, {
				expiration: {
					type: "EX",
					value: 60 * 60,
				},
			});

			return bkashIdToken;
		}

		if (bkashIdTokenTTL > 600) {
			return bkashIdToken;
		}

		const response = await fetch(
			`${config.bkash_base_url}/tokenized/checkout/token/grant`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Accept: "application/json",
					username: config.bkash_username,
					password: config.bkash_password,
				},
				body: JSON.stringify({
					app_key: config.bkash_app_key,
					app_secret: config.bkash_app_secret,
				}),
			},
		);

		if (!response.ok) {
			throw new AppError(
				httpStatus.BAD_GATEWAY,
				"Bkash Access Token Grant Failed",
			);
		}

		const result = await response.json();

		//bkash id token set
		await redisClient.set(IdTokenKey, result.id_token, {
			expiration: {
				type: "EX",
				value: 60 * 60, // 1hour
			},
		});

		//bkash refresh token set
		await redisClient.set(RefreshTokenKey, result.refresh_token, {
			expiration: {
				type: "EX",
				value: 60 * 60 * 24 * 28, // 28 days
			},
		});

		bkashIdToken = result.id_token;

		return bkashIdToken;
	} catch (error: any) {
		if (error instanceof AppError) {
			throw error;
		}
		throw new AppError(httpStatus.BAD_GATEWAY, error.message);
	}
};
