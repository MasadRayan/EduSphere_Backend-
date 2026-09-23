import {
	ApplicationStatus,
	AttendanceStatus,
	EnrollmentStatus,
	PaymentStatus,
	RegistrationStatus,
} from "../../../generated/prisma/enums";
import { prisma } from "../../lib/prisma";
import {
	getInstructorProfile,
	getStudentProfile,
} from "../../utils/profileAccess";
import type { IRequestUser } from "../auth/auth.interface";
import type { IAnalyticsQueryResult } from "./analytics.validate";

type DateRange = {
	gte?: Date;
	lte?: Date;
};

const buildDateRange = (
	query: IAnalyticsQueryResult,
): DateRange | undefined => {
	const { startDate, endDate } = query;

	if (!startDate && !endDate) {
		return undefined;
	}

	return {
		...(startDate ? { gte: startDate } : {}),
		...(endDate ? { lte: endDate } : {}),
	};
};

const buildSemesterFilter = (semesterId?: string) =>
	semesterId ? { semesterId } : {};

const getAdminAnalytics = async (query: IAnalyticsQueryResult) => {
	const dateFilter = buildDateRange(query);
	const semesterFilter = buildSemesterFilter(query.semesterId);

	const [totalStudents, totalInstructors] = await Promise.all([
		prisma.studentProfile.count({ where: { isDeleted: false } }),
		prisma.instructorProfile.count({ where: { isDeleted: false } }),
	]);

	const [
		studentApplications,
		studentApplicationPending,
		studentApplicationApproved,
		studentApplicationRejected,
		instructorApplications,
		instructorApplicationPending,
		instructorApplicationApproved,
		instructorApplicationRejected,
	] = await Promise.all([
		prisma.studentApplication.count(),
		prisma.studentApplication.count({
			where: { status: ApplicationStatus.PENDING },
		}),
		prisma.studentApplication.count({
			where: { status: ApplicationStatus.APPROVED },
		}),
		prisma.studentApplication.count({
			where: { status: ApplicationStatus.REJECTED },
		}),
		prisma.instructorApplication.count(),
		prisma.instructorApplication.count({
			where: { status: ApplicationStatus.PENDING },
		}),
		prisma.instructorApplication.count({
			where: { status: ApplicationStatus.APPROVED },
		}),
		prisma.instructorApplication.count({
			where: { status: ApplicationStatus.REJECTED },
		}),
	]);

	const [
		totalDepartments,
		totalPrograms,
		totalCourses,
		totalSemesters,
		activeSemesters,
	] = await Promise.all([
		prisma.department.count({ where: { isDeleted: false } }),
		prisma.program.count({ where: { isDeleted: false } }),
		prisma.course.count({ where: { isDeleted: false } }),
		prisma.semester.count(),
		prisma.semester.count({ where: { isActive: true } }),
	]);

	const [
		totalCourseSections,
		totalSemesterEnrollments,
		enrolledEnrollments,
		totalCourseRegistrations,
		enrolledRegistrations,
		completedRegistrations,
	] = await Promise.all([
		prisma.courseSection.count({
			where: { isDeleted: false, ...semesterFilter },
		}),
		prisma.semesterEnrollment.count({
			where: {
				isDeleted: false,
				...semesterFilter,
				...(dateFilter ? { createdAt: dateFilter } : {}),
			},
		}),
		prisma.semesterEnrollment.count({
			where: {
				isDeleted: false,
				status: EnrollmentStatus.ENROLLED,
				...semesterFilter,
				...(dateFilter ? { createdAt: dateFilter } : {}),
			},
		}),
		prisma.courseRegistration.count({
			where: {
				isDeleted: false,
				...(query.semesterId ? { courseSection: semesterFilter } : {}),
				...(dateFilter ? { registeredAt: dateFilter } : {}),
			},
		}),
		prisma.courseRegistration.count({
			where: {
				isDeleted: false,
				status: RegistrationStatus.ENROLLED,
				...(query.semesterId ? { courseSection: semesterFilter } : {}),
				...(dateFilter ? { registeredAt: dateFilter } : {}),
			},
		}),
		prisma.courseRegistration.count({
			where: {
				isDeleted: false,
				status: RegistrationStatus.COMPLETED,
				...(query.semesterId ? { courseSection: semesterFilter } : {}),
				...(dateFilter ? { registeredAt: dateFilter } : {}),
			},
		}),
	]);

	const [
		totalExams,
		totalResults,
		totalAttendanceRecords,
		presentAttendanceRecords,
	] = await Promise.all([
		prisma.exam.count({
			where: {
				courseSection: {
					isDeleted: false,
					...semesterFilter,
				},
				...(dateFilter ? { date: dateFilter } : {}),
			},
		}),
		prisma.result.count({
			where: {
				exam: {
					courseSection: {
						isDeleted: false,
						...semesterFilter,
					},
				},
				...(dateFilter ? { createdAt: dateFilter } : {}),
			},
		}),
		prisma.attendance.count({
			where: {
				courseSection: {
					isDeleted: false,
					...semesterFilter,
				},
				...(dateFilter ? { date: dateFilter } : {}),
			},
		}),
		prisma.attendance.count({
			where: {
				courseSection: {
					isDeleted: false,
					...semesterFilter,
				},
				status: AttendanceStatus.PRESENT,
				...(dateFilter ? { date: dateFilter } : {}),
			},
		}),
	]);

	const paymentWhere = {
		...(dateFilter ? { createdAt: dateFilter } : {}),
		...(query.semesterId
			? { semesterEnrollment: { semesterId: query.semesterId } }
			: {}),
	};

	const [revenueResult, refundedResult] = await Promise.all([
		prisma.payment.aggregate({
			where: { ...paymentWhere, status: PaymentStatus.SUCCEEDED },
			_sum: { amount: true },
		}),
		prisma.payment.aggregate({
			where: { ...paymentWhere, status: PaymentStatus.REFUNDED },
			_sum: { amount: true },
		}),
	]);

	const totalRevenue = revenueResult._sum.amount || 0;
	const totalRefunded = refundedResult._sum.amount || 0;
	const netRevenue = totalRevenue - totalRefunded;
	const overallAttendanceRate = totalAttendanceRecords
		? Math.round((presentAttendanceRecords / totalAttendanceRecords) * 100)
		: 0;

	return {
		users: {
			totalStudents,
			totalInstructors,
		},
		applications: {
			student: {
				total: studentApplications,
				pending: studentApplicationPending,
				approved: studentApplicationApproved,
				rejected: studentApplicationRejected,
			},
			instructor: {
				total: instructorApplications,
				pending: instructorApplicationPending,
				approved: instructorApplicationApproved,
				rejected: instructorApplicationRejected,
			},
		},
		academics: {
			departments: totalDepartments,
			programs: totalPrograms,
			courses: totalCourses,
			semesters: totalSemesters,
			activeSemesters,
		},
		enrollments: {
			courseSections: totalCourseSections,
			semesterEnrollments: totalSemesterEnrollments,
			enrolledEnrollments,
			courseRegistrations: totalCourseRegistrations,
			enrolledRegistrations,
			completedRegistrations,
		},
		assessment: {
			exams: totalExams,
			results: totalResults,
			attendanceRecords: totalAttendanceRecords,
			presentRecords: presentAttendanceRecords,
			attendanceRate: overallAttendanceRate,
		},
		finance: {
			totalRevenue,
			totalRefunded,
			netRevenue,
		},
	};
};

const getStudentAnalytics = async (
	query: IAnalyticsQueryResult,
	user: IRequestUser,
) => {
	const profile = await getStudentProfile(user.userId);
	const studentId = profile.id;

	const dateFilter = buildDateRange(query);
	const semesterFilter = buildSemesterFilter(query.semesterId);

	const registrationWhere = {
		studentId,
		isDeleted: false,
		...(query.semesterId ? { courseSection: semesterFilter } : {}),
		...(dateFilter ? { registeredAt: dateFilter } : {}),
	};

	const registrations = await prisma.courseRegistration.findMany({
		where: {
			...registrationWhere,
			status: {
				in: [RegistrationStatus.ENROLLED, RegistrationStatus.COMPLETED],
			},
		},
		include: {
			courseSection: {
				include: { course: true },
			},
		},
	});

	let totalCreditsCompleted = 0;
	let completedCourses = 0;
	let inProgressCredits = 0;
	let coursesInProgress = 0;

	for (const registration of registrations) {
		const creditHours = registration.courseSection.course.creditHours;

		if (registration.status === RegistrationStatus.COMPLETED) {
			totalCreditsCompleted += creditHours;
			completedCourses++;
		} else {
			inProgressCredits += creditHours;
			coursesInProgress++;
		}
	}

	const attendanceRecords = await prisma.attendance.findMany({
		where: {
			studentId,
			courseSection: { isDeleted: false, ...semesterFilter },
			...(dateFilter ? { date: dateFilter } : {}),
		},
		select: { status: true },
	});

	const totalClasses = attendanceRecords.length;
	const attendedClasses = attendanceRecords.filter(
		(record) => record.status !== AttendanceStatus.ABSENT,
	).length;
	const attendancePercentage = totalClasses
		? Math.round((attendedClasses / totalClasses) * 100)
		: 0;

	const [totalExamsAvailable, totalExamsTaken] = await Promise.all([
		prisma.exam.count({
			where: {
				courseSection: {
					isDeleted: false,
					...semesterFilter,
					registrations: {
						some: {
							studentId,
							isDeleted: false,
							status: {
								in: [RegistrationStatus.ENROLLED, RegistrationStatus.COMPLETED],
							},
						},
					},
				},
			},
		}),
		prisma.result.count({
			where: {
				studentId,
				...(query.semesterId
					? { exam: { courseSection: semesterFilter } }
					: {}),
				...(dateFilter ? { createdAt: dateFilter } : {}),
			},
		}),
	]);

	const completionRate = totalExamsAvailable
		? Math.round((totalExamsTaken / totalExamsAvailable) * 100)
		: 0;

	const gradeGroups = await prisma.result.groupBy({
		by: ["grade"],
		where: {
			studentId,
			grade: { not: null },
			...(query.semesterId ? { exam: { courseSection: semesterFilter } } : {}),
		},
		_count: { _all: true },
	});

	const gradeBreakdown = Object.fromEntries(
		gradeGroups.map((group) => [group.grade as string, group._count._all]),
	);

	const paymentWhere = {
		userId: user.userId,
		...(dateFilter ? { createdAt: dateFilter } : {}),
	};

	const [amountSpentResult, totalRefundedResult] = await Promise.all([
		prisma.payment.aggregate({
			where: { ...paymentWhere, status: PaymentStatus.SUCCEEDED },
			_sum: { amount: true },
		}),
		prisma.payment.aggregate({
			where: { ...paymentWhere, status: PaymentStatus.REFUNDED },
			_sum: { amount: true },
		}),
	]);

	const totalAmountSpent = amountSpentResult._sum.amount || 0;
	const totalRefunded = totalRefundedResult._sum.amount || 0;

	return {
		academic: {
			cgpa: profile.cgpa,
			totalCreditsCompleted,
			completedCourses,
			coursesInProgress,
			inProgressCredits,
			totalExamsTaken,
			totalExamsAvailable,
			completionRate,
		},
		attendance: {
			totalClasses,
			attendedClasses,
			attendancePercentage,
		},
		grades: {
			gradeBreakdown,
		},
		finance: {
			totalAmountSpent,
			totalRefunded,
		},
	};
};

const getInstructorAnalytics = async (
	query: IAnalyticsQueryResult,
	user: IRequestUser,
) => {
	const profile = await getInstructorProfile(user.userId);
	const instructorId = profile.id;

	const dateFilter = buildDateRange(query);
	const semesterFilter = buildSemesterFilter(query.semesterId);

	const sectionWhere = {
		instructorId,
		isDeleted: false,
		...semesterFilter,
	};

	const registrationWhere = {
		courseSection: { ...sectionWhere },
		isDeleted: false,
		status: {
			in: [RegistrationStatus.ENROLLED, RegistrationStatus.COMPLETED],
		},
		...(dateFilter ? { registeredAt: dateFilter } : {}),
	};

	const [
		sections,
		distinctCourses,
		seatsFilled,
		totalStudentsEnrolled,
		totalExams,
		pendingGrading,
		totalAttendanceRecords,
		presentAttendanceRecords,
		totalGradeEntries,
	] = await Promise.all([
		prisma.courseSection.findMany({
			where: sectionWhere,
			select: { id: true, capacity: true },
		}),
		prisma.courseSection.groupBy({
			by: ["courseId"],
			where: sectionWhere,
			_count: { _all: true },
		}),
		prisma.courseRegistration.count({ where: registrationWhere }),
		prisma.courseRegistration.groupBy({
			by: ["studentId"],
			where: registrationWhere,
			_count: { _all: true },
		}),
		prisma.exam.count({
			where: {
				courseSection: { ...sectionWhere },
				...(dateFilter ? { date: dateFilter } : {}),
			},
		}),
		prisma.exam.count({
			where: {
				courseSection: { ...sectionWhere },
				results: { none: {} },
			},
		}),
		prisma.attendance.count({
			where: {
				courseSection: { ...sectionWhere },
				...(dateFilter ? { date: dateFilter } : {}),
			},
		}),
		prisma.attendance.count({
			where: {
				courseSection: { ...sectionWhere },
				status: AttendanceStatus.PRESENT,
				...(dateFilter ? { date: dateFilter } : {}),
			},
		}),
		prisma.result.count({
			where: {
				exam: { courseSection: { ...sectionWhere } },
				...(dateFilter ? { createdAt: dateFilter } : {}),
			},
		}),
	]);

	const totalSections = sections.length;
	const totalCapacity = sections.reduce(
		(sum, section) => sum + section.capacity,
		0,
	);
	const totalCoursesTaught = distinctCourses.length;
	const fillRate = totalCapacity
		? Math.round((seatsFilled / totalCapacity) * 100)
		: 0;
	const attendanceRate = totalAttendanceRecords
		? Math.round((presentAttendanceRecords / totalAttendanceRecords) * 100)
		: 0;

	const upcomingStart =
		query.startDate && query.startDate > new Date()
			? query.startDate
			: new Date();

	const upcomingExams = await prisma.exam.count({
		where: {
			courseSection: { ...sectionWhere },
			date: {
				gte: upcomingStart,
				...(query.endDate ? { lte: query.endDate } : {}),
			},
		},
	});

	return {
		sections: {
			totalSections,
			totalCoursesTaught,
			totalCapacity,
			seatsFilled,
			fillRate,
		},
		students: {
			totalStudentsEnrolled: totalStudentsEnrolled.length,
		},
		exams: {
			totalExams,
			upcomingExams,
			pendingGrading,
		},
		attendance: {
			totalRecords: totalAttendanceRecords,
			presentRecords: presentAttendanceRecords,
			attendanceRate,
		},
		grading: {
			totalGradeEntries,
		},
	};
};

export const AnalyticsService = {
	getAdminAnalytics,
	getStudentAnalytics,
	getInstructorAnalytics,
};
