/**
 * Verified Resend "from" for all app email (event reminders, contact support, etc.).
 * Override with RESEND_FROM_EMAIL when needed (e.g. staging).
 */
export function getResendFromAddress(): string {
  return process.env.RESEND_FROM_EMAIL ?? "Rosterly <support@rosterlylineups.app>";
}
