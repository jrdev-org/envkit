export const MESSAGES = {
	INIT_SUCCESS: "Project initialized successfully.",
	AUTH_REQUIRED: "You must be logged in to perform this action.",
	LOGIN_SUCCESS: "Authentication successful.",
	LOGOUT_SUCCESS: "You have been logged out.",
	ERROR_GENERIC: "An unexpected error occurred.",
	PROJECT_CREATED: (name: string) => `Project '${name}' created successfully.`,
	API_ERROR: (message: string) => `API error: ${message}`,
};
