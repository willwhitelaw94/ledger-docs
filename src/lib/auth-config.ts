/**
 * TCID OAuth authentication configuration.
 *
 * Reads the existing NUXT_* environment variables for backward compatibility
 * with the CDK / ECS task-definition mappings.
 */
export const authConfig = {
  clientId: process.env.NUXT_TCID_CLIENT_ID,
  clientSecret: process.env.NUXT_TCID_CLIENT_SECRET,
  issuerUrl:
    process.env.NUXT_TCID_ISSUER_URL ?? "https://accounts.trilogycare.com.au",
  appUrl: process.env.NUXT_PUBLIC_APP_URL,
  sessionSecret: process.env.TCID_SESSION_SECRET,
};

/**
 * Returns true when the minimum required OAuth variables are present.
 * When false the app should run with all pages public (no login wall).
 */
export function isAuthConfigured(): boolean {
  return Boolean(
    authConfig.clientId && authConfig.clientSecret && authConfig.appUrl,
  );
}
