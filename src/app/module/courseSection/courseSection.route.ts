import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { CourseSectionController } from "./courseSection.controller";
import { CourseSectionValidation } from "./courseSection.validate";

const router = Router();

router.post(
	"/",
	auth(Role.ADMIN, Role.SUPER_ADMIN),
	validateRequest(CourseSectionValidation.CreateCourseSectionZodSchema),
	CourseSectionController.createCourseSection,
);
router.get(
	"/",
	auth(Role.ADMIN, Role.SUPER_ADMIN, Role.INSTRUCTOR, Role.STUDENT),
	CourseSectionController.getAllCourseSections,
);
router.get(
	"/:id",
	auth(Role.ADMIN, Role.SUPER_ADMIN, Role.INSTRUCTOR, Role.STUDENT),
	CourseSectionController.getCourseSectionById,
);
router.patch(
	"/:id/assign-instructor",
	auth(Role.ADMIN, Role.SUPER_ADMIN),
	validateRequest(CourseSectionValidation.AssignInstructorZodSchema),
	CourseSectionController.assignInstructor,
);
router.patch(
	"/:id",
	auth(Role.ADMIN, Role.SUPER_ADMIN),
	validateRequest(CourseSectionValidation.UpdateCourseSectionZodSchema),
	CourseSectionController.updateCourseSection,
);
router.delete(
	"/:id",
	auth(Role.ADMIN, Role.SUPER_ADMIN),
	CourseSectionController.deleteCourseSection,
);

export const CourseSectionRoutes = router;
