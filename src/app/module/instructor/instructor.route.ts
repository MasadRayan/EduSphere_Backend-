import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import {
	handleMulterErrors,
	resumeUpload,
	upload,
} from "../../middleware/upload";
import { validateRequest } from "../../middleware/validateRequest";
import { InstructorController } from "./instructor.controller";
import { InstructorValidation } from "./instructor.validate";

const router = Router();

// ---- Instructor routes ----
router.get("/me", auth(Role.INSTRUCTOR), InstructorController.getMyInfo);

router.post(
	"/apply",
	auth(Role.STUDENT, Role.INSTRUCTOR, Role.ADMIN, Role.SUPER_ADMIN),
	validateRequest(InstructorValidation.InstructorApplyZodSchema),
	InstructorController.applyForInstructor,
);
router.put(
	"/apply",
	auth(Role.STUDENT, Role.INSTRUCTOR, Role.ADMIN, Role.SUPER_ADMIN),
	validateRequest(InstructorValidation.InstructorApplyZodSchema),
	InstructorController.updateApplication,
);
router.get(
	"/application",
	auth(Role.STUDENT, Role.INSTRUCTOR, Role.ADMIN, Role.SUPER_ADMIN),
	InstructorController.getMyApplication,
);
router.post(
	"/resume",
	auth(Role.STUDENT, Role.INSTRUCTOR, Role.ADMIN, Role.SUPER_ADMIN),
	resumeUpload.single("resume"),
	handleMulterErrors,
	InstructorController.uploadResume,
);
router.patch(
	"/profile",
	auth(Role.INSTRUCTOR),
	validateRequest(InstructorValidation.UpdateMyProfileZodSchema),
	InstructorController.updateMyProfile,
);
router.patch(
	"/avatar",
	auth(Role.INSTRUCTOR),
	upload.single("avatar"),
	handleMulterErrors,
	InstructorController.updateMyProfileImage,
);

// ---- Admin routes ----
router.get(
	"/applications",
	auth(Role.ADMIN, Role.SUPER_ADMIN),
	InstructorController.getAllApplications,
);
router.patch(
	"/applications/:id/approve",
	auth(Role.ADMIN, Role.SUPER_ADMIN),
	validateRequest(InstructorValidation.ApproveInstructorZodSchema),
	InstructorController.approveApplication,
);
router.patch(
	"/applications/:id/reject",
	auth(Role.ADMIN, Role.SUPER_ADMIN),
	validateRequest(InstructorValidation.RejectInstructorZodSchema),
	InstructorController.rejectApplication,
);
router.get(
	"/",
	auth(Role.ADMIN, Role.SUPER_ADMIN, Role.INSTRUCTOR),
	InstructorController.getAllInstructors,
);
router.get(
	"/:id",
	auth(Role.ADMIN, Role.SUPER_ADMIN, Role.INSTRUCTOR),
	InstructorController.getInstructorById,
);
router.patch(
	"/:id",
	auth(Role.ADMIN, Role.SUPER_ADMIN),
	validateRequest(InstructorValidation.UpdateInstructorZodSchema),
	InstructorController.updateInstructor,
);
router.delete(
	"/:id",
	auth(Role.ADMIN, Role.SUPER_ADMIN),
	InstructorController.deleteInstructor,
);

export const InstructorRoutes = router;
