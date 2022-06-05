declare global {
	namespace NodeJS {
		interface ProcessEnv {
			CLOUD_NAME: string;
			API_KEY: string;
			API_SECRET: string;
			SENDGRID_API_KEY: string;
			DB_HOST: string;
			DB_USER: string;
			DB_PASSWORD: string;
			DB_DATABASE: string;
			DB_PORT: string;
			ENCRYPTION_KEY: string;
			IMAGE4IO_API_KEY: string;
			IMAGE4IO_API_SECRET: string;
		}
	}
}

// If this file has no import/export statements (i.e. is a script)
// convert it into a module by adding an empty export statement.
export {};
