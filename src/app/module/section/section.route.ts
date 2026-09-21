import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { SectionController } from "./section.controller";
import { SectionValidation } from "./section.validate";

const router = Router();

router.post(
	"/",
	auth(Role.ADMIN, Role.SUPER_ADMIN),
	validateRequest(SectionValidation.CreateSectionZodSchema),
	SectionController.createSection,
);
router.get(
	"/",
	auth(Role.ADMIN, Role.SUPER_ADMIN, Role.INSTRUCTOR, Role.STUDENT),
	SectionController.getAllSections,
);
router.get(
	"/:id",
	auth(Role.ADMIN, Role.SUPER_ADMIN, Role.INSTRUCTOR, Role.STUDENT),
	SectionController.getSectionById,
);
router.patch(
	"/:id/assign-instructor",
	auth(Role.ADMIN, Role.SUPER_ADMIN),
	validateRequest(SectionValidation.AssignInstructorZodSchema),
	SectionController.assignInstructor,
);
router.patch(
	"/:id",
	auth(Role.ADMIN, Role.SUPER_ADMIN),
	validateRequest(SectionValidation.UpdateSectionZodSchema),
	SectionController.updateSection,
);
router.delete(
	"/:id",
	auth(Role.ADMIN, Role.SUPER_ADMIN),
	SectionController.deleteSection,
);

export const SectionRoutes = router;
