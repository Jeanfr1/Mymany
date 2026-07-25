import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — Manyjean",
  robots: { index: true, follow: true },
};

// NOTE: Bracketed items are placeholders the operator must fill in with real,
// truthful details before going live. Do not invent legal/company details.
const OPERATOR = "[YOUR NAME OR BUSINESS NAME]";
const CONTACT = "[YOUR CONTACT EMAIL]";

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-12 prose-sm">
      <h1 className="text-2xl font-semibold">Privacy Policy</h1>
      <p className="mt-2 text-sm text-muted">Last updated: [DATE]</p>

      <Section title="Who we are">
        This application (“Manyjean”) is a private tool operated by {OPERATOR} to
        automate replies on the operator’s own Instagram account(s). It uses the
        official Meta / Instagram Platform APIs.
      </Section>

      <Section title="What data we collect">
        <ul className="list-disc pl-5">
          <li>
            Instagram account details of the connected account(s): account ID,
            username, name, and profile picture URL.
          </li>
          <li>
            An access token for the connected account, stored <b>encrypted</b>.
          </li>
          <li>
            Interactions initiated by Instagram users: comments containing a
            keyword, story replies, and direct messages that trigger an
            automation, including the sender’s Instagram-scoped ID, username, and
            message text.
          </li>
          <li>
            Delivery records (which automated messages were sent) and, for links
            this app sends, click events (timestamp, coarse user-agent, and a
            <b> hashed</b> IP — never the raw IP).
          </li>
        </ul>
      </Section>

      <Section title="Why we use it">
        Solely to deliver the automated replies you (the user) explicitly
        initiated by commenting or messaging — for example, sending a link you
        requested. We do <b>not</b> send cold or bulk messages to people who have
        not initiated a permitted interaction.
      </Section>

      <Section title="How long we keep it">
        Data is retained only as long as needed to operate the automations and
        for basic diagnostics. You may request deletion at any time (see below).
      </Section>

      <Section title="Click tracking">
        Instagram does not provide click data for external links. When an
        automation sends a link, this app may use its own redirect endpoint to
        record that the link it sent was clicked. This applies only to links this
        app sends.
      </Section>

      <Section title="Data sharing">
        We do <b>not</b> sell your data. Data is processed by our infrastructure
        providers (hosting and database) strictly to run the service, and by Meta
        as part of the Instagram APIs.
      </Section>

      <Section title="Your choices & deletion">
        You can request deletion of your data or disconnection at any time. See
        the <a href="/data-deletion" className="text-brand underline">Data
        Deletion</a> page, or contact {CONTACT}.
      </Section>

      <Section title="Contact">
        Questions: {CONTACT}.
      </Section>
    </main>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-6">
      <h2 className="text-lg font-medium">{title}</h2>
      <div className="mt-2 text-sm leading-6">{children}</div>
    </section>
  );
}
