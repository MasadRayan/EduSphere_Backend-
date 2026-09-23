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
	validateRequest(CourseRegistrationValidation.CreateEnrollmentZodSchema),
	CourseRegistrationController.enrollSemester,
);
router.get(
	"/bkash/callback",
	CourseRegistrationController.handlePaymentCallback,
);
router.get(
	"/my",
	auth(Role.STUDENT),
	CourseRegistrationController.getMyEnrollments,
);
router.get(
	"/",
	auth(Role.ADMIN, Role.SUPER_ADMIN),
	CourseRegistrationController.getAllEnrollments,
);
router.get(
	"/:id",
	auth(Role.STUDENT, Role.ADMIN, Role.SUPER_ADMIN),
	CourseRegistrationController.getEnrollmentById,
);
router.patch(
	"/:id/cancel",
	auth(Role.STUDENT, Role.ADMIN, Role.SUPER_ADMIN),
	CourseRegistrationController.cancelEnrollment,
);
router.patch(
	"/:id/status",
	auth(Role.ADMIN, Role.SUPER_ADMIN),
	validateRequest(
		CourseRegistrationValidation.UpdateRegistrationStatusZodSchema,
	),
	CourseRegistrationController.updateRegistrationStatus,
);

export const CourseRegistrationRoutes = router;
