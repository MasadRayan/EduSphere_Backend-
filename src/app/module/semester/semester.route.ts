import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { SemesterController } from "./semester.controller";
import { SemesterValidation } from "./semester.validate";

const router = Router();

router.post(
	"/",
	auth(Role.ADMIN, Role.SUPER_ADMIN),
	validateRequest(SemesterValidation.CreateSemesterZodSchema),
	SemesterController.createSemester,
);
router.get(
	"/",
	auth(Role.ADMIN, Role.SUPER_ADMIN, Role.INSTRUCTOR, Role.STUDENT),
	SemesterController.getAllSemesters,
);
router.get(
	"/:id",
	auth(Role.ADMIN, Role.SUPER_ADMIN, Role.INSTRUCTOR, Role.STUDENT),
	SemesterController.getSemesterById,
);
router.patch(
	"/:id",
	auth(Role.ADMIN, Role.SUPER_ADMIN),
	validateRequest(SemesterValidation.UpdateSemesterZodSchema),
	SemesterController.updateSemester,
);
router.delete(
	"/:id",
	auth(Role.ADMIN, Role.SUPER_ADMIN),
	SemesterController.deleteSemester,
);

export const SemesterRoutes = router;
