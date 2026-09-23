export const gradeFromPercentage = (percentage: number) => {
	if (percentage >= 80) {
		return { grade: "A+", gradePoint: 4.0 };
	}
	if (percentage >= 75) {
		return { grade: "A", gradePoint: 3.75 };
	}
	if (percentage >= 70) {
		return { grade: "A-", gradePoint: 3.5 };
	}
	if (percentage >= 65) {
		return { grade: "B+", gradePoint: 3.25 };
	}
	if (percentage >= 60) {
		return { grade: "B", gradePoint: 3.0 };
	}
	if (percentage >= 55) {
		return { grade: "B-", gradePoint: 2.75 };
	}
	if (percentage >= 50) {
		return { grade: "C+", gradePoint: 2.5 };
	}
	if (percentage >= 45) {
		return { grade: "C", gradePoint: 2.25 };
	}
	if (percentage >= 40) {
		return { grade: "D", gradePoint: 2.0 };
	}
	return { grade: "F", gradePoint: 0.0 };
};

export const gradeLetterFromPoint = (gradePoint: number) => {
	if (gradePoint >= 4.0) {
		return "A+";
	}
	if (gradePoint >= 3.75) {
		return "A";
	}
	if (gradePoint >= 3.5) {
		return "A-";
	}
	if (gradePoint >= 3.25) {
		return "B+";
	}
	if (gradePoint >= 3.0) {
		return "B";
	}
	if (gradePoint >= 2.75) {
		return "B-";
	}
	if (gradePoint >= 2.5) {
		return "C+";
	}
	if (gradePoint >= 2.25) {
		return "C";
	}
	if (gradePoint >= 2.0) {
		return "D";
	}
	return "F";
};
