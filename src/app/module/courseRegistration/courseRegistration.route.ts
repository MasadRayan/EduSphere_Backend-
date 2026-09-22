import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { CourseRegistrationController } from "./courseRegistration.controller";
import { CourseRegistrationValidation } from "./courseRegistration.validate";

const router = Router();

router.post(
	"/enroll",
	auth(Role.STUDENT),
	validateRequest(CourseRegistrationValidation.CreateRegistrationZodSchema),
	CourseRegistrationController.enrollCourse,
);
router.get(
	"/bkash/callback",
	CourseRegistrationController.handlePaymentCallback,
);
router.get(
	"/my",
	auth(Role.STUDENT),
	CourseRegistrationController.getMyRegistrations,
);
router.get(
	"/",
	auth(Role.ADMIN, Role.SUPER_ADMIN),
	CourseRegistrationController.getAllRegistrations,
);
router.get(
	"/:id",
	auth(Role.STUDENT, Role.ADMIN, Role.SUPER_ADMIN),
	CourseRegistrationController.getRegistrationById,
);
router.patch(
	"/:id/cancel",
	auth(Role.STUDENT, Role.ADMIN, Role.SUPER_ADMIN),
	CourseRegistrationController.cancelRegistration,
);

export const CourseRegistrationRoutes = router;