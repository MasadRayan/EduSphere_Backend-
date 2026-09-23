import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { UserController } from "./user.controller";
import { UserValidation } from "./user.validate";

const router = Router();

router.get("/", auth(Role.ADMIN, Role.SUPER_ADMIN), UserController.getAllUsers);
router.get(
	"/:id",
	auth(Role.ADMIN, Role.SUPER_ADMIN),
	UserController.getUserById,
);
router.patch(
	"/:id/role",
	auth(Role.SUPER_ADMIN),
	validateRequest(UserValidation.UpdateUserRoleZodSchema),
	UserController.updateUserRole,
);
router.patch(
	"/:id/status",
	auth(Role.ADMIN, Role.SUPER_ADMIN),
	validateRequest(UserValidation.UpdateUserStatusZodSchema),
	UserController.updateUserStatus,
);
router.delete(
	"/:id",
	auth(Role.ADMIN, Role.SUPER_ADMIN),
	UserController.deleteUser,
);

export const UserRoutes = router;
