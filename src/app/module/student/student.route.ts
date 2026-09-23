import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { handleMulterErrors, upload } from "../../middleware/upload";
import { validateRequest } from "../../middleware/validateRequest";
import { StudentController } from "./student.controller";
import { StudentValidation } from "./student.validate";

const router = Router();

// ---- Student routes ----
router.get("/me", auth(Role.STUDENT), StudentController.getMyInfo);

router.post(
	"/apply",
	auth(Role.STUDENT),
	validateRequest(StudentValidation.StudentApplyZodSchema),
	StudentController.applyForEnrollment,
);
router.put(
	"/apply",
	auth(Role.STUDENT),
	validateRequest(StudentValidation.StudentApplyZodSchema),
	StudentController.updateApplication,
);
router.get(
	"/application",
	auth(Role.STUDENT),
	StudentController.getMyApplication,
);

router.patch(
	"/profile",
	auth(Role.STUDENT),
	validateRequest(StudentValidation.UpdateMyProfileZodSchema),
	StudentController.updateMyProfile,
);
router.patch(
	"/avatar",
	auth(Role.STUDENT),
	upload.single("avatar"),
	handleMulterErrors,
	StudentController.updateMyProfileImage,
);

router.get(
	"/registered-courses",
	auth(Role.STUDENT),
	StudentController.registeredCourses,
);
router.get(
	"/registered-courses/:id",
	auth(Role.STUDENT),
	StudentController.registeredCourseDetails,
);
router.get(
	"/attendance",
	auth(Role.STUDENT),
	StudentController.attendanceDetails,
);
router.get("/grades", auth(Role.STUDENT), StudentController.getMyGrades);
router.get(
	"/grades/:id",
	auth(Role.STUDENT),
	StudentController.getMyGradesDetails,
);
router.get("/cgpa", auth(Role.STUDENT), StudentController.getMyCGPA);
router.get("/transcript", auth(Role.STUDENT), StudentController.getTranscript);

// ---- Admin routes ----
router.get(
	"/applications",
	auth(Role.ADMIN, Role.SUPER_ADMIN),
	StudentController.getAllApplications,
);
router.patch(
	"/applications/:id/approve",
	auth(Role.ADMIN, Role.SUPER_ADMIN),
	validateRequest(StudentValidation.ApproveApplicationZodSchema),
	StudentController.approveApplication,
);
router.patch(
	"/applications/:id/reject",
	auth(Role.ADMIN, Role.SUPER_ADMIN),
	validateRequest(StudentValidation.RejectApplicationZodSchema),
	StudentController.rejectApplication,
);
router.patch(
	"/:id/current-semester",
	auth(Role.ADMIN, Role.SUPER_ADMIN),
	validateRequest(StudentValidation.UpdateCurrentSemesterZodSchema),
	StudentController.updateCurrentSemester,
);
router.patch(
	"/:id/section",
	auth(Role.ADMIN, Role.SUPER_ADMIN),
	validateRequest(StudentValidation.UpdateStudentSectionZodSchema),
	StudentController.updateStudentSection,
);
router.patch(
	"/:id/status",
	auth(Role.ADMIN, Role.SUPER_ADMIN),
	validateRequest(StudentValidation.UpdateStudentStatusZodSchema),
	StudentController.updateStudentStatus,
);

export const StudentRoutes = router;
