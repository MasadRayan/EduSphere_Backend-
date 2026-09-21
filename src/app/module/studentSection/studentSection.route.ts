import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { StudentSectionController } from "./studentSection.controller";
import { StudentSectionValidation } from "./studentSection.validate";

const router = Router();

router.post(
	"/",
	auth(Role.ADMIN, Role.SUPER_ADMIN),
	validateRequest(StudentSectionValidation.CreateStudentSectionZodSchema),
	StudentSectionController.createStudentSection,
);
router.get(
	"/",
	auth(Role.ADMIN, Role.SUPER_ADMIN, Role.INSTRUCTOR, Role.STUDENT),
	StudentSectionController.getAllStudentSections,
);
router.get(
	"/:id",
	auth(Role.ADMIN, Role.SUPER_ADMIN, Role.INSTRUCTOR, Role.STUDENT),
	StudentSectionController.getStudentSectionById,
);
router.patch(
	"/:id",
	auth(Role.ADMIN, Role.SUPER_ADMIN),
	validateRequest(StudentSectionValidation.UpdateStudentSectionZodSchema),
	StudentSectionController.updateStudentSection,
);
router.delete(
	"/:id",
	auth(Role.ADMIN, Role.SUPER_ADMIN),
	StudentSectionController.deleteStudentSection,
);

export const StudentSectionRoutes = router;
