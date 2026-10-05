export const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || 'admin@qbrainlabs.com';

const rawPassword = process.env.E2E_ADMIN_PASSWORD;
if (!rawPassword) {
    throw new Error(
        'E2E_ADMIN_PASSWORD environment variable is required to run the Playwright suite. ' +
        'Set it to the password for the seeded admin account before running tests, ' +
        'e.g. `export E2E_ADMIN_PASSWORD=...`'
    );
}
export const ADMIN_PASSWORD: string = rawPassword;
