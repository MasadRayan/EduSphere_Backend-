import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { ExamController } from "./exam.controller";
import { ExamValidation } from "./exam.validate";

const router = Router();

const manageRoles = [Role.ADMIN, Role.SUPER_ADMIN, Role.INSTRUCTOR];

router.post(
	"/",
	auth(...manageRoles),
	validateRequest(ExamValidation.CreateExamZodSchema),
	ExamController.createExam,
);
router.get("/", auth(...manageRoles), ExamController.getAllExams);
router.get("/:id", auth(...manageRoles), ExamController.getExam);
router.patch(
	"/:id",
	auth(...manageRoles),
	validateRequest(ExamValidation.UpdateExamZodSchema),
	ExamController.updateExam,
);
router.delete("/:id", auth(...manageRoles), ExamController.deleteExam);
router.get("/:id/results", auth(...manageRoles), ExamController.getExamResults);

export const ExamRoutes = router;
