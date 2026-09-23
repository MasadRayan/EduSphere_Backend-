import ejs from "ejs";
import path from "path";
import PDFDocument from "pdfkit";
import config from "../../config";
import { transporter } from "../../lib/nodemailer";
import type { IInvoiceMailPayload } from "./courseRegistration.interface";

const buildInvoiceBuffer = async (
	payload: IInvoiceMailPayload,
): Promise<Buffer> => {
	const doc = new PDFDocument({ margin: 50, size: "A4" });

	const chunks: Buffer[] = [];
	doc.on("data", (chunk: Buffer) => chunks.push(chunk));

	// Header
	doc
		.fillColor("#0f172a")
		.fontSize(22)
		.text("Semester Registration Invoice", { align: "center" })
		.moveDown(0.5)
		.fontSize(10)
		.fillColor("#64748b")
		.text(`Invoice Number: ${payload.invoiceNumber}`, { align: "center" })
		.text(
			`Date: ${new Intl.DateTimeFormat("en-GB", {
				dateStyle: "long",
				timeStyle: "short",
			}).format(payload.paidAt)}`,
			{ align: "center" },
		)
		.moveDown(1);

	// Divider
	doc
		.moveTo(50, doc.y)
		.lineTo(595 - 50, doc.y)
		.lineWidth(1)
		.strokeColor("#e2e8f0")
		.stroke()
		.moveDown(1);

	// Bill to
	doc
		.fillColor("#0f172a")
		.fontSize(12)
		.text("BILLED TO")
		.moveDown(0.5)
		.fontSize(11)
		.text(payload.studentName)
		.moveDown(0.25)
		.fontSize(10)
		.fillColor("#64748b")
		.text(payload.to)
		.moveDown(1);

	// Enrollment info
	doc
		.fillColor("#0f172a")
		.fontSize(12)
		.text("ENROLLMENT DETAILS")
		.moveDown(0.5)
		.fontSize(11)
		.fillColor("#475569")
		.text(`Semester: ${payload.semesterName} ${payload.year}`)
		.text(`Total Credits: ${payload.totalCredits}`)
		.text(`Per Credit Fee: BDT ${config.credit_fee_rate.toFixed(2)}`)
		.moveDown(1);

	// Divider
	doc
		.moveTo(50, doc.y)
		.lineTo(595 - 50, doc.y)
		.strokeColor("#e2e8f0")
		.stroke()
		.moveDown(1);

	// Course table header
	doc
		.fillColor("#334155")
		.fontSize(10)
		.text("COURSES", { continued: true })
		.text(`CREDITS`, { width: 80, align: "right", continued: true })
		.text(`FEE`, { width: 120, align: "right" })
		.moveDown(0.25);

	doc
		.moveTo(50, doc.y)
		.lineTo(595 - 50, doc.y)
		.strokeColor("#e2e8f0")
		.stroke()
		.moveDown(0.25);

	// Course table rows
	for (const course of payload.courses) {
		doc
			.fillColor("#0f172a")
			.fontSize(10)
			.text(
				`${course.courseCode} - ${course.courseTitle} (${course.sectionCode})`,
				{
					continued: true,
				},
			)
			.text(`${course.creditHours}`, {
				width: 80,
				align: "right",
				continued: true,
			})
			.text(`BDT ${course.fee.toFixed(2)}`, { width: 120, align: "right" })
			.moveDown(0.15);
	}

	// Divider
	doc
		.moveTo(50, doc.y)
		.lineTo(595 - 50, doc.y)
		.strokeColor("#e2e8f0")
		.stroke()
		.moveDown(1);

	// Total
	doc
		.fillColor("#0f172a")
		.fontSize(12)
		.text("TOTAL PAID", { continued: true })
		.text(`BDT ${payload.amount.toFixed(2)}`, { align: "right" })
		.moveDown(1)
		.fontSize(10)
		.fillColor("#64748b")
		.text(`Transaction ID: ${payload.trxId ?? "N/A"}`)
		.text(`Payment Method: bKash`)
		.moveDown(1)
		.fontSize(9)
		.fillColor("#94a3b8")
		.text(
			"This is an auto-generated invoice for your semester course registration. For any queries, contact the registrar office.",
			{ align: "center", lineGap: 2 },
		);

	doc.end();

	return new Promise((resolve, reject) => {
		doc.on("end", () => resolve(Buffer.concat(chunks)));
		doc.on("error", reject);
	});
};

export const sendEnrollmentInvoice = async (payload: IInvoiceMailPayload) => {
	const templatePath = path.join(
		process.cwd(),
		"src/app/templates/enrollment-invoice.ejs",
	);

	const html = await ejs.renderFile(templatePath, payload);

	const invoiceBuffer = await buildInvoiceBuffer(payload);

	await transporter.sendMail({
		from: config.email_sender,
		to: payload.to,
		subject: `Semester ${payload.semesterName} ${payload.year} Registration Invoice`,
		html,
		attachments: [
			{
				filename: `invoice-${payload.invoiceNumber}.pdf`,
				content: invoiceBuffer,
			},
		],
	});
};
