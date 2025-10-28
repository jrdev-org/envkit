/** biome-ignore-all lint/suspicious/noExplicitAny: the error builder handles unknown errors */
type ErrorCode =
	| "VALIDATION_ERROR"
	| "NOT_FOUND"
	| "UNAUTHORIZED"
	| "FORBIDDEN"
	| "CONFLICT"
	| "RATE_LIMITED"
	| "INTERNAL_ERROR"
	| "DATABASE_ERROR"
	| "NETWORK_ERROR"
	| "UNKNOWN";

interface ErrorDescriptor {
	code: ErrorCode;
	message: string;
	status: number;
	details?: Record<string, unknown>;
}

export class AppError extends Error {
	code: ErrorCode;
	status: number;
	details?: Record<string, unknown>;

	constructor(desc: ErrorDescriptor) {
		super(desc.message);
		this.code = desc.code;
		this.status = desc.status;
		this.details = desc.details;
	}

	toJSON() {
		return {
			code: this.code,
			message: this.message,
			...(this.details ? { details: this.details } : {}),
		};
	}
}

/** Build consistent error objects based on context */
export function buildError(input: any): AppError {
	if (input instanceof AppError) return input;

	// Validation errors (Valibot / Zod / etc.)
	if (isValidationError(input)) {
		return new AppError({
			code: "VALIDATION_ERROR",
			message: "Invalid request data",
			status: 400,
			details: input.issues ?? input,
		});
	}

	// Convex not found errors
	if (matchErrorMessage(input, "document not found")) {
		return new AppError({
			code: "NOT_FOUND",
			message: "The requested resource was not found",
			status: 404,
		});
	}

	// Authentication/Authorization issues
	if (matchErrorMessage(input, "unauthorized")) {
		return new AppError({
			code: "UNAUTHORIZED",
			message: "You must be authenticated to perform this action",
			status: 401,
		});
	}

	if (matchErrorMessage(input, "forbidden")) {
		return new AppError({
			code: "FORBIDDEN",
			message: "You do not have permission to perform this action",
			status: 403,
		});
	}

	// Conflict (duplicate entries, existing names, etc.)
	if (
		matchErrorMessage(input, "duplicate") ||
		matchErrorMessage(input, "already exists")
	) {
		return new AppError({
			code: "CONFLICT",
			message: "A resource with this identifier already exists",
			status: 409,
		});
	}

	// Network or RPC issues
	if (
		matchErrorMessage(input, "fetch failed") ||
		matchErrorMessage(input, "network")
	) {
		return new AppError({
			code: "NETWORK_ERROR",
			message: "Network error, please try again later",
			status: 503,
		});
	}

	// Convex or DB failure
	if (
		matchErrorMessage(input, "convex") ||
		matchErrorMessage(input, "query failed")
	) {
		return new AppError({
			code: "DATABASE_ERROR",
			message: "Database operation failed",
			status: 500,
		});
	}

	// Generic fallback
	return new AppError({
		code: "UNKNOWN",
		message: "An unexpected error occurred",
		status: 500,
		details: { raw: serializeError(input) },
	});
}

function isValidationError(err: any): boolean {
	return Boolean(
		err?.issues || err?.name === "ValibotError" || err?.name === "ZodError",
	);
}

function matchErrorMessage(err: unknown, term: string): boolean {
	const msg =
		typeof err === "string" ? err : err instanceof Error ? err.message : "";
	return msg.toLowerCase().includes(term.toLowerCase());
}

function serializeError(err: unknown): Record<string, any> {
	if (err instanceof Error)
		return { name: err.name, message: err.message, stack: err.stack };
	return typeof err === "object" ? (err ?? {}) : { value: String(err) };
}
