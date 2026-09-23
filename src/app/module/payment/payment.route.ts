import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { PaymentController } from "./payment.controller";

const router = Router();

router.get(
	"/",
	auth(Role.ADMIN, Role.SUPER_ADMIN),
	PaymentController.getAllPayments,
);
router.get("/my", auth(Role.STUDENT), PaymentController.getMyPayments);
router.get(
	"/:id",
	auth(Role.STUDENT, Role.ADMIN, Role.SUPER_ADMIN),
	PaymentController.getPaymentById,
);

export const PaymentRoutes = router;
