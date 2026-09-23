import PDFDocument from "pdfkit";

export interface ITranscriptCourseRow {
	code: string;
	title: string;
	creditHours: number;
	gradePoint: number | null;
	grade: string | null;
}

export interface ITranscriptSemester {
	id: string;
	name: string;
	year: number;
	gpa: number;
	creditsAttempted: number;
	creditsEarned: number;
	courses: ITranscriptCourseRow[];
}

export interface ITranscriptData {
	student: {
		fullName: string;
		studentId: string;
		departmentName: string;
		programName: string;
		sectionCode: string | null;
		enrollmentYear: number;
	};
	semesters: ITranscriptSemester[];
	summary: {
		creditsAttempted: number;
		creditsEarned: number;
		cgpa: number;
	};
}

const drawDivider = (doc: PDFKit.PDFDocument, color = "#e2e8f0") => {
	doc
		.moveTo(50, doc.y)
		.lineTo(595 - 50, doc.y)
		.lineWidth(1)
		.strokeColor(color)
		.stroke()
		.moveDown(0.5);
};

export const buildTranscriptPdfBuffer = (
	data: ITranscriptData,
): Promise<Buffer> => {
	const doc = new PDFDocument({ margin: 50, size: "A4" });

	const chunks: Buffer[] = [];
	doc.on("data", (chunk: Buffer) => chunks.push(chunk));

	// Header
	doc
		.fillColor("#0f172a")
		.fontSize(22)
		.text("Academic Transcript", { align: "center" })
		.moveDown(0.25)
		.fontSize(11)
		.fillColor("#64748b")
		.text("EduSphere University", { align: "center" })
		.text(
			`Generated on ${new Intl.DateTimeFormat("en-GB", {
				dateStyle: "long",
			}).format(new Date())}`,
			{ align: "center" },
		)
		.moveDown(0.5);

	drawDivider(doc);

	// Student info
	doc
		.fillColor("#0f172a")
		.fontSize(11)
		.text(`Name: ${data.student.fullName}`)
		.text(`Student ID: ${data.student.studentId}`)
		.text(`Department: ${data.student.departmentName}`)
		.text(`Program: ${data.student.programName}`)
		.text(
			`Section: ${data.student.sectionCode ?? "N/A"}   |   Enrollment Year: ${data.student.enrollmentYear}`,
		)
		.moveDown(0.5);

	drawDivider(doc);

	for (const semester of data.semesters) {
		doc
			.fillColor("#0f172a")
			.fontSize(13)
			.text(`${semester.name} ${semester.year}`)
			.moveDown(0.25);

		// Table header
		doc
			.fillColor("#334155")
			.fontSize(9)
			.text("COURSE", { continued: true })
			.text("CREDITS", { width: 60, align: "right", continued: true })
			.text("GRADE POINT", { width: 85, align: "right", continued: true })
			.text("GRADE", { width: 60, align: "right" })
			.moveDown(0.25);

		drawDivider(doc);

		for (const course of semester.courses) {
			doc
				.fillColor("#0f172a")
				.fontSize(9)
				.text(`${course.code} - ${course.title}`, { continued: true })
				.text(`${course.creditHours}`, {
					width: 60,
					align: "right",
					continued: true,
				})
				.text(`${course.gradePoint ?? "N/A"}`, {
					width: 85,
					align: "right",
					continued: true,
				})
				.text(`${course.grade ?? "N/A"}`, { width: 60, align: "right" })
				.moveDown(0.15);
		}

		drawDivider(doc);

		doc
			.fillColor("#475569")
			.fontSize(10)
			.text(
				`Semester GPA: ${semester.gpa.toFixed(2)}   |   Credits Attempted: ${semester.creditsAttempted}   |   Credits Earned: ${semester.creditsEarned}`,
			)
			.moveDown(0.75);
	}

	if (!data.semesters.length) {
		doc
			.fillColor("#64748b")
			.fontSize(11)
			.text("No completed courses found for the selected period.")
			.moveDown(1);
	}

	// Cumulative summary
	drawDivider(doc);

	doc
		.fillColor("#0f172a")
		.fontSize(12)
		.text("CUMULATIVE SUMMARY", { continued: true })
		.text(`CGPA: ${data.summary.cgpa.toFixed(2)}`, {
			align: "right",
			continued: true,
		})
		.moveDown(0.5);

	doc
		.fillColor("#475569")
		.fontSize(10)
		.text(
			`Total Credits Attempted: ${data.summary.creditsAttempted}   |   Total Credits Earned: ${data.summary.creditsEarned}`,
		)
		.moveDown(1);

	doc
		.fontSize(9)
		.fillColor("#94a3b8")
		.text(
			"This is an auto-generated transcript. For official verification, contact the registrar office.",
			{ align: "center", lineGap: 2 },
		);

	doc.end();

	return new Promise((resolve, reject) => {
		doc.on("end", () => resolve(Buffer.concat(chunks)));
		doc.on("error", reject);
	});
};
