import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { DepartmentController } from "./department.controller";
import { DepartmentValidation } from "./department.validate";

const router = Router();

router.post(
	"/",
	auth(Role.ADMIN, Role.SUPER_ADMIN),
	validateRequest(DepartmentValidation.CreateDepartmentZodSchema),
	DepartmentController.createDepartment,
);
router.get(
	"/",
	auth(Role.ADMIN, Role.SUPER_ADMIN, Role.INSTRUCTOR, Role.STUDENT),
	DepartmentController.getAllDepartments,
);
router.get(
	"/:id",
	auth(Role.ADMIN, Role.SUPER_ADMIN, Role.INSTRUCTOR, Role.STUDENT),
	DepartmentController.getDepartmentById,
);
router.patch(
	"/:id",
	auth(Role.ADMIN, Role.SUPER_ADMIN),
	validateRequest(DepartmentValidation.UpdateDepartmentZodSchema),
	DepartmentController.updateDepartment,
);
router.delete(
	"/:id",
	auth(Role.ADMIN, Role.SUPER_ADMIN),
	DepartmentController.deleteDepartment,
);

export const DepartmentRoutes = router;
