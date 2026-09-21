export const isSupportedImageBuffer = (buffer: Buffer): boolean => {
	if (!buffer || buffer.length < 12) {
		return false;
	}

	if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
		return true;
	}

	const pngSignature = Buffer.from([
		0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
	]);
	if (buffer.subarray(0, 8).equals(pngSignature)) {
		return true;
	}

	const header = buffer.subarray(0, 6).toString("ascii");
	if (header === "GIF87a" || header === "GIF89a") {
		return true;
	}

	if (
		buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
		buffer.subarray(8, 12).toString("ascii") === "WEBP"
	) {
		return true;
	}

	return false;
};
