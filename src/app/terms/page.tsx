import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — Rosterly",
  description: "Terms governing your use of the Rosterly platform.",
};

export default function TermsOfServicePage() {
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
          <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
          <p className="text-muted-foreground text-sm">Last updated: {lastUpdated}</p>
        </div>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">1. Acceptance of Terms</h2>
          <p className="text-muted-foreground leading-relaxed">
            By creating an account or using Rosterly (&ldquo;Service&rdquo;), you agree to be bound by these Terms of
            Service. If you do not agree, do not use the Service.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">2. Description of Service</h2>
          <p className="text-muted-foreground leading-relaxed">
            Rosterly is a youth baseball team management platform that helps coaches organize rosters, lineups, events,
            and player statistics. Features include team scheduling, player availability tracking, lineup sharing, and
            event reminders via email, SMS, and in-app notifications.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">3. Eligibility</h2>
          <p className="text-muted-foreground leading-relaxed">
            You must be at least 18 years old to create an account and use Rosterly. By registering, you represent that
            you are 18 or older. Coaches or guardians may manage player profiles on behalf of minors.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">4. User Responsibilities</h2>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground leading-relaxed">
            <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
            <li>
              You agree only to enter player and contact information for individuals who have consented to its use.
            </li>
            <li>
              You agree not to use the Service for any unlawful purpose or in any way that violates these Terms.
            </li>
            <li>You are responsible for the accuracy of data you enter into the platform.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">5. SMS Communications</h2>
          <p className="text-muted-foreground leading-relaxed">
            When phone numbers are provided for SMS reminders, you confirm that the recipients have consented to receive
            text messages. You agree not to add phone numbers without the explicit consent of the recipient. Standard
            message and data rates may apply to recipients. Recipients may opt out at any time by replying{" "}
            <strong>STOP</strong>.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">6. Intellectual Property</h2>
          <p className="text-muted-foreground leading-relaxed">
            Rosterly and its original content, features, and functionality are owned by Rosterly and are protected by
            applicable intellectual property laws. You retain ownership of any data you input into the platform.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">7. Disclaimers</h2>
          <p className="text-muted-foreground leading-relaxed">
            The Service is provided &ldquo;as is&rdquo; without warranties of any kind, either express or implied.
            Rosterly does not guarantee uninterrupted or error-free operation of the Service.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">8. Limitation of Liability</h2>
          <p className="text-muted-foreground leading-relaxed">
            To the fullest extent permitted by law, Rosterly shall not be liable for any indirect, incidental, special,
            consequential, or punitive damages arising from your use of or inability to use the Service.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">9. Termination</h2>
          <p className="text-muted-foreground leading-relaxed">
            We reserve the right to suspend or terminate your account at any time for violations of these Terms. You
            may close your account at any time by contacting us at{" "}
            <a href="mailto:support@rosterlylineups.app" className="text-primary underline">
              support@rosterlylineups.app
            </a>
            .
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">10. Changes to Terms</h2>
          <p className="text-muted-foreground leading-relaxed">
            We may update these Terms from time to time. Continued use of the Service after changes constitutes
            acceptance of the revised Terms.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">11. Contact</h2>
          <p className="text-muted-foreground leading-relaxed">
            Questions about these Terms? Contact us at{" "}
            <a href="mailto:support@rosterlylineups.app" className="text-primary underline">
              support@rosterlylineups.app
            </a>
            .
          </p>
        </section>

        <div className="border-t border-border pt-6 flex gap-6 text-sm text-muted-foreground">
          <Link href="/privacy" className="hover:text-foreground transition-colors">
            Privacy Policy
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
