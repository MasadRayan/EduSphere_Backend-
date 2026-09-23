import cookieParser from "cookie-parser";
import cors from "cors";
import express, {
	type Application,
	type Request,
	type Response,
} from "express";
import httpStatus from "http-status";
import config from "./app/config";
import { globalErrorHandler } from "./app/middleware/globalErrorHandler";
import { notFound } from "./app/middleware/notFound";
import { AnalyticsRoutes } from "./app/module/analytics/analytics.route";
import { AttendanceRoutes } from "./app/module/attendance/attendance.route";
import { AuthRoutes } from "./app/module/auth/auth.route";
import { CourseRoutes } from "./app/module/course/course.route";
import { CourseRegistrationRoutes } from "./app/module/courseRegistration/courseRegistration.route";
import { CourseSectionRoutes } from "./app/module/courseSection/courseSection.route";
import { DepartmentRoutes } from "./app/module/department/department.route";
import { ExamRoutes } from "./app/module/exam/exam.route";
import { InstructorRoutes } from "./app/module/instructor/instructor.route";
import { PaymentRoutes } from "./app/module/payment/payment.route";
import { ProgramRoutes } from "./app/module/program/program.route";
import { ResultRoutes } from "./app/module/result/result.route";
import { SemesterRoutes } from "./app/module/semester/semester.route";
import { StudentRoutes } from "./app/module/student/student.route";
import { StudentSectionRoutes } from "./app/module/studentSection/studentSection.route";
import { UserRoutes } from "./app/module/user/user.route";

const app: Application = express();

app.use(
	cors({
		origin: config.frontend_url,
		credentials: true,
	}),
);

// Enable URL-encoded form data parsing
app.use(express.urlencoded({ extended: true }));

// Middleware to parse JSON bodies
app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", AuthRoutes);
app.use("/api/departments", DepartmentRoutes);
app.use("/api/programs", ProgramRoutes);
app.use("/api/courses", CourseRoutes);
app.use("/api/semesters", SemesterRoutes);
app.use("/api/course-sections", CourseSectionRoutes);
app.use("/api/exams", ExamRoutes);
app.use("/api/attendance", AttendanceRoutes);
app.use("/api/analytics", AnalyticsRoutes);
app.use("/api/results", ResultRoutes);
app.use("/api/course-registrations", CourseRegistrationRoutes);
app.use("/api/payments", PaymentRoutes);
app.use("/api/users", UserRoutes);
app.use("/api/student-sections", StudentSectionRoutes);
app.use("/api/student", StudentRoutes);
app.use("/api/instructor", InstructorRoutes);

// Basic route
app.get("/", async (req: Request, res: Response) => {
	res.status(httpStatus.OK).json({
		success: true,
		message: "Welcome to EduSphere Backend",
	});
});

app.use(globalErrorHandler);
app.use(notFound);

export default app;
