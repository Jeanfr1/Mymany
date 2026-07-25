import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms — Manyjean",
  robots: { index: true, follow: true },
};

const OPERATOR = "[YOUR NAME OR BUSINESS NAME]";
const CONTACT = "[YOUR CONTACT EMAIL]";

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-2xl font-semibold">Terms of Use</h1>
      <p className="mt-4 text-sm leading-6">
        This application (“Manyjean”) is a private tool operated by {OPERATOR}{" "}
        for automating replies on the operator’s own Instagram account(s). It is
        not a public service and is provided “as is”, without warranties.
      </p>
      <ul className="mt-4 list-disc pl-5 text-sm leading-6">
        <li>
          The app uses the official Meta / Instagram Platform APIs and follows
          Meta’s current policies and messaging rules.
        </li>
        <li>
          The app does not send cold or bulk messages, does not import cold
          audiences, and does not attempt to bypass Instagram’s messaging window.
        </li>
        <li>
          Message delivery is subject to Instagram’s rules and availability and is
          not guaranteed.
        </li>
      </ul>
      <p className="mt-4 text-sm leading-6">Contact: {CONTACT}.</p>
    </main>
  );
}
