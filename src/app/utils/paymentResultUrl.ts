import config from "../config";

const PAYMENT_RESULT_PATH = "/student/payment-result";

const trimTrailingSlashes = (value: string) => value.replace(/\/+$/, "");

const isLocalHostname = (candidate: string) => {
	try {
		const hostname = new URL(candidate).hostname;
		return hostname === "localhost" || hostname === "127.0.0.1";
	} catch {
		return false;
	}
};

const withResultPath = (base: string) => {
	const trimmed = trimTrailingSlashes(base);
	return trimmed.endsWith(PAYMENT_RESULT_PATH)
		? trimmed
		: `${trimmed}${PAYMENT_RESULT_PATH}`;
};

/**
 * Resolves where the browser should land after a bKash payment attempt.
 *
 * Production must never redirect to localhost or to the API origin. If the
 * configured payment result URL is local, fall back to `FRONTEND_URL` plus the
 * result page path. In development, local URLs are kept as-is.
 */
export const getPaymentResultUrl = () => {
	const isProduction = config.node_env === "production";
	const resultUrl = config.payment_result_url?.trim();
	const frontendUrl = config.frontend_url?.trim();

	const isLocalInProduction = (candidate: string) =>
		isProduction && isLocalHostname(candidate);

	if (resultUrl && !isLocalInProduction(resultUrl)) {
		return trimTrailingSlashes(resultUrl);
	}

	if (frontendUrl && !isLocalInProduction(frontendUrl)) {
		return withResultPath(frontendUrl);
	}

	if (resultUrl) {
		return trimTrailingSlashes(resultUrl);
	}

	if (frontendUrl) {
		return withResultPath(frontendUrl);
	}

	if (isProduction) {
		console.warn(
			"PAYMENT_RESULT_URL and FRONTEND_URL are missing or local in production; " +
				"falling back to the local payment result page. Set a public URL before deploying.",
		);
	}

	return `http://localhost:3000${PAYMENT_RESULT_PATH}`;
};
