import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { InvoiceController } from "./invoice.controller";

const router = Router();

router.get(
	"/enrollments/:enrollmentId",
	auth(Role.STUDENT, Role.ADMIN, Role.SUPER_ADMIN),
	InvoiceController.downloadEnrollmentInvoice,
);

export const InvoiceRoutes = router;
