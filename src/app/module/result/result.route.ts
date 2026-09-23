import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { ResultController } from "./result.controller";
import { ResultValidation } from "./result.validate";

const router = Router();

const manageRoles = [Role.ADMIN, Role.SUPER_ADMIN, Role.INSTRUCTOR];

router.post(
	"/",
	auth(...manageRoles),
	validateRequest(ResultValidation.EnterResultsZodSchema),
	ResultController.createResults,
);
router.get("/", auth(...manageRoles), ResultController.getResults);
router.patch(
	"/:resultId",
	auth(...manageRoles),
	validateRequest(ResultValidation.UpdateResultZodSchema),
	ResultController.updateResult,
);

export const ResultRoutes = router;
