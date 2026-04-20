import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — Rosterly",
  description: "How Rosterly collects, uses, and protects your information.",
};

export default function PrivacyPolicyPage() {
  const lastUpdated = "April 18, 2026";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border px-6 py-4">
        <Link href="/" className="text-lg font-semibold text-primary hover:opacity-80 transition-opacity">
          Rosterly
        </Link>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12 space-y-10">
        <div>
          <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
          <p className="text-muted-foreground text-sm">Last updated: {lastUpdated}</p>
        </div>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">1. Introduction</h2>
          <p className="text-muted-foreground leading-relaxed">
            Rosterly (&ldquo;we,&rdquo; &ldquo;our,&rdquo; or &ldquo;us&rdquo;) operates the Rosterly youth baseball team
            management platform, accessible at <strong>rosterlylineups.app</strong>. This Privacy Policy explains how we
            collect, use, disclose, and protect information about you when you use our services.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">2. Information We Collect</h2>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground leading-relaxed">
            <li>
              <strong>Account information:</strong> name, email address, and password when you register.
            </li>
            <li>
              <strong>Team &amp; roster data:</strong> player names, jersey numbers, positions, batting/throwing
              preferences, and optional player photos uploaded by coaches.
            </li>
            <li>
              <strong>Contact information for SMS:</strong> phone numbers voluntarily provided by team coaches or
              guardians for the purpose of receiving event reminders.
            </li>
            <li>
              <strong>Event data:</strong> game and practice schedules, locations, lineups, and RSVP responses.
            </li>
            <li>
              <strong>Usage data:</strong> pages visited, features used, and general interaction logs to improve the
              service.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">3. How We Use Your Information</h2>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground leading-relaxed">
            <li>To provide and operate the Rosterly platform.</li>
            <li>To send event reminders via email, SMS, or in-app notifications (only to users who have opted in).</li>
            <li>To enable team collaboration between coaches, managers, and team members.</li>
            <li>To improve and develop our product based on usage patterns.</li>
            <li>To respond to support requests.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">4. SMS Messaging</h2>
          <p className="text-muted-foreground leading-relaxed">
            We may send SMS text messages for event reminders (e.g., upcoming games and practices) when a phone number
            is provided and consent is given. Message frequency varies based on the number of events scheduled by your
            team. Standard message and data rates may apply.
          </p>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground leading-relaxed">
            <li>
              <strong>To opt out:</strong> reply <strong>STOP</strong> to any message at any time.
            </li>
            <li>
              <strong>To get help:</strong> reply <strong>HELP</strong> or email{" "}
              <a href="mailto:support@rosterlylineups.app" className="text-primary underline">
                support@rosterlylineups.app
              </a>
              .
            </li>
          </ul>
          <p className="text-muted-foreground leading-relaxed">
            For full details on SMS consent and opt-in procedures, see our{" "}
            <Link href="/sms-consent" className="text-primary underline">
              SMS Consent page
            </Link>
            .
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">5. Data Sharing</h2>
          <p className="text-muted-foreground leading-relaxed">
            We do not sell your personal information. We may share data with trusted third-party service providers (such
            as Supabase for database hosting, Resend for email delivery, and Twilio for SMS delivery) solely to operate
            our service. These providers are bound by their own privacy policies and data processing agreements.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">6. Data Retention</h2>
          <p className="text-muted-foreground leading-relaxed">
            We retain your data for as long as your account is active or as needed to provide services. You may request
            deletion of your account and associated data by contacting us at{" "}
            <a href="mailto:support@rosterlylineups.app" className="text-primary underline">
              support@rosterlylineups.app
            </a>
            .
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">7. Children&apos;s Privacy</h2>
          <p className="text-muted-foreground leading-relaxed">
            Rosterly is intended for use by adults (coaches, managers, and guardians). We do not knowingly collect
            personal information directly from children under 13. Player profile data (name, jersey number, etc.) is
            entered by adult team coaches on behalf of their players.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">8. Security</h2>
          <p className="text-muted-foreground leading-relaxed">
            We use industry-standard security practices including encrypted connections (HTTPS), hashed passwords, and
            row-level database security to protect your data.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">9. Changes to This Policy</h2>
          <p className="text-muted-foreground leading-relaxed">
            We may update this Privacy Policy from time to time. We will notify you of significant changes by email or
            by posting a notice on the platform.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">10. Contact Us</h2>
          <p className="text-muted-foreground leading-relaxed">
            If you have questions about this policy, contact us at:{" "}
            <a href="mailto:support@rosterlylineups.app" className="text-primary underline">
              support@rosterlylineups.app
            </a>
          </p>
        </section>

        <div className="border-t border-border pt-6 flex gap-6 text-sm text-muted-foreground">
          <Link href="/terms" className="hover:text-foreground transition-colors">
            Terms of Service
          </Link>
          <Link href="/sms-consent" className="hover:text-foreground transition-colors">
            SMS Consent
          </Link>
          <Link href="/" className="hover:text-foreground transition-colors">
            Back to Rosterly
          </Link>
        </div>
      </main>
    </div>
  );
}
