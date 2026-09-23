import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { AuthController } from "./auth.controller";
import { UserValidation } from "./auth.validation";

const router = Router();

router.post(
	"/register",
	validateRequest(UserValidation.StudentRegistrationZodSchema),
	AuthController.registerStudent,
);
router.post(
	"/verify-email",
	validateRequest(UserValidation.StudentEmailVerifyZodSchema),
	AuthController.verifyStudentEmail,
);
router.post(
	"/login",
	validateRequest(UserValidation.LoginZodSchema),
	AuthController.loginUser,
);
router.get(
	"/me",
	auth(Role.ADMIN, Role.INSTRUCTOR, Role.STUDENT, Role.SUPER_ADMIN),
	AuthController.getMe,
);
router.post("/refresh-token", AuthController.refreshToken);
router.post("/google-login", AuthController.googleLogin);
router.post(
	"/forgot-password",
	validateRequest(UserValidation.ForgotPasswordZodSchema),
	AuthController.forgotPassword,
);
router.post(
	"/reset-password",
	validateRequest(UserValidation.ResetPasswordZodSchema),
	AuthController.resetPassword,
);
router.patch(
	"/change-password",
	auth(Role.ADMIN, Role.INSTRUCTOR, Role.STUDENT, Role.SUPER_ADMIN),
	validateRequest(UserValidation.ChangePasswordZodSchema),
	AuthController.changePassword,
);
export const AuthRoutes = router;
