import app from "./app";
import type { Request, Response } from "express";

import { prisma } from "./app/lib/prisma";
import { redisClient } from "./app/lib/redis";

let ready: Promise<void> | null = null;

const isHealthCheck = (req: Request) =>
	req.path === "/health" || req.url?.split("?")[0] === "/health";

const init = async () => {
	await prisma.$connect();
	if (!redisClient.isOpen) await redisClient.connect();
};

export default async function handler(req: Request, res: Response) {
	if (isHealthCheck(req)) return app(req, res);

	try {
		if (!ready) ready = init();
		await ready;
	} catch (error) {
		ready = null;
		console.error("Init error:", error);
		return res.status(500).json({ message: "Server init failed" });
	}
	return app(req, res);
}
