import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { AnalyticsController } from "./analytics.controller";

const router = Router();

router.get(
	"/admin",
	auth(Role.ADMIN, Role.SUPER_ADMIN),
	AnalyticsController.getAdminAnalytics,
);
router.get(
	"/student",
	auth(Role.STUDENT),
	AnalyticsController.getStudentAnalytics,
);
router.get(
	"/instructor",
	auth(Role.INSTRUCTOR),
	AnalyticsController.getInstructorAnalytics,
);

export const AnalyticsRoutes = router;
