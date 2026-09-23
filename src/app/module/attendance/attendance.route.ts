import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { AttendanceController } from "./attendance.controller";
import { AttendanceValidation } from "./attendance.validate";

const router = Router();

const manageRoles = [Role.ADMIN, Role.SUPER_ADMIN, Role.INSTRUCTOR];

router.post(
	"/",
	auth(...manageRoles),
	validateRequest(AttendanceValidation.MarkAttendanceZodSchema),
	AttendanceController.markAttendance,
);
router.get("/", auth(...manageRoles), AttendanceController.getAttendance);

export const AttendanceRoutes = router;
