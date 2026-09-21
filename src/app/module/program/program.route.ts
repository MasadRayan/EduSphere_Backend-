import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { ProgramController } from "./program.controller";
import { ProgramValidation } from "./program.validate";

const router = Router();

router.post(
	"/",
	auth(Role.ADMIN, Role.SUPER_ADMIN),
	validateRequest(ProgramValidation.CreateProgramZodSchema),
	ProgramController.createProgram,
);
router.get(
	"/",
	auth(Role.ADMIN, Role.SUPER_ADMIN, Role.INSTRUCTOR, Role.STUDENT),
	ProgramController.getAllPrograms,
);
router.get(
	"/:id",
	auth(Role.ADMIN, Role.SUPER_ADMIN, Role.INSTRUCTOR, Role.STUDENT),
	ProgramController.getProgramById,
);
router.patch(
	"/:id",
	auth(Role.ADMIN, Role.SUPER_ADMIN),
	validateRequest(ProgramValidation.UpdateProgramZodSchema),
	ProgramController.updateProgram,
);
router.delete(
	"/:id",
	auth(Role.ADMIN, Role.SUPER_ADMIN),
	ProgramController.deleteProgram,
);

export const ProgramRoutes = router;
