import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SMS Consent & Opt-In Policy — Rosterly",
  description: "How Rosterly collects consent for SMS text message reminders.",
};

export default function SmsConsentPage() {
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
          <h1 className="text-3xl font-bold mb-2">SMS Consent &amp; Opt-In Policy</h1>
          <p className="text-muted-foreground text-sm">Last updated: {lastUpdated}</p>
        </div>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">What SMS messages does Rosterly send?</h2>
          <p className="text-muted-foreground leading-relaxed">
            Rosterly sends automated <strong>event reminder text messages</strong> to parents and guardians of youth
            baseball players. These messages notify recipients of upcoming games, practices, and other team events that
            have been scheduled by their team&apos;s coach or manager.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            <strong>Example message:</strong> &ldquo;Reminder: Game vs. Blue Jays in 2 hours @ Riverfront Park, Field
            3. View details: rosterlylineups.app/events/abc123 Reply STOP to unsubscribe.&rdquo;
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">How is consent collected?</h2>
          <p className="text-muted-foreground leading-relaxed">
            SMS consent is collected in one of the following ways:
          </p>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground leading-relaxed">
            <li>
              A team coach or manager enters a guardian&apos;s phone number into the Rosterly platform when adding a
              player to a roster. By providing the number, the coach confirms that verbal or written consent has been
              obtained from the guardian to receive text message reminders.
            </li>
            <li>
              A team member or guardian who creates their own Rosterly account may opt in to SMS notifications within
              their account settings.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Message frequency</h2>
          <p className="text-muted-foreground leading-relaxed">
            Message frequency varies depending on the number of events your team schedules and the reminder timing
            configured by the coach. Reminders can be set for 1 day before, 8 hours before, 2 hours before, or any
            custom time configured by the team.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Rates &amp; Fees</h2>
          <p className="text-muted-foreground leading-relaxed">
            Rosterly does not charge for SMS messages. However, standard message and data rates may apply from your
            mobile carrier.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">How to opt out</h2>
          <p className="text-muted-foreground leading-relaxed">
            You can opt out of SMS messages at any time by replying <strong>STOP</strong> to any message you receive
            from Rosterly. After opting out, you will receive one final confirmation message and then no further SMS
            messages will be sent to your number.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            You can also contact your team&apos;s coach to have your phone number removed from the roster, or email us
            directly at{" "}
            <a href="mailto:support@rosterlylineups.app" className="text-primary underline">
              support@rosterlylineups.app
            </a>
            .
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">How to get help</h2>
          <p className="text-muted-foreground leading-relaxed">
            Reply <strong>HELP</strong> to any message to receive our support contact information, or reach us directly
            at{" "}
            <a href="mailto:support@rosterlylineups.app" className="text-primary underline">
              support@rosterlylineups.app
            </a>
            .
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Data privacy</h2>
          <p className="text-muted-foreground leading-relaxed">
            Phone numbers collected for SMS reminders are used solely for sending event notifications. We do not sell or
            share phone numbers with third parties except as required to deliver the SMS service (via Twilio). For full
            details, see our{" "}
            <Link href="/privacy" className="text-primary underline">
              Privacy Policy
            </Link>
            .
          </p>
        </section>

        <div className="border-t border-border pt-6 flex gap-6 text-sm text-muted-foreground">
          <Link href="/privacy" className="hover:text-foreground transition-colors">
            Privacy Policy
          </Link>
          <Link href="/terms" className="hover:text-foreground transition-colors">
            Terms of Service
          </Link>
          <Link href="/" className="hover:text-foreground transition-colors">
            Back to Rosterly
          </Link>
        </div>
      </main>
    </div>
  );
}
