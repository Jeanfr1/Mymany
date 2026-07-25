import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Data Deletion — Manyjean",
  robots: { index: true, follow: true },
};

const CONTACT = "[YOUR CONTACT EMAIL]";

export default function DataDeletionPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-2xl font-semibold">Data Deletion</h1>
      <p className="mt-4 text-sm leading-6">
        This application (“Manyjean”) is a private tool that automates replies on
        the operator’s own Instagram account(s) using the official Instagram
        Platform APIs.
      </p>

      <h2 className="mt-6 text-lg font-medium">How to request deletion</h2>
      <p className="mt-2 text-sm leading-6">
        To request deletion of data associated with your Instagram interactions
        (your Instagram-scoped ID, username, message text, delivery records, and
        any click events), contact <b>{CONTACT}</b> with the Instagram username
        you used. We will delete the associated records.
      </p>

      <h2 className="mt-6 text-lg font-medium">Operator account deletion</h2>
      <p className="mt-2 text-sm leading-6">
        The account operator can disconnect an Instagram account at any time from
        the app’s Connection page, which removes the stored access token. To
        fully erase all stored data for a connected account, contact {CONTACT}.
      </p>

      <h2 className="mt-6 text-lg font-medium">Meta data deletion callback</h2>
      <p className="mt-2 text-sm leading-6">
        This URL (<code>/data-deletion</code>) is provided as the app’s data
        deletion instructions URL in the Meta App Dashboard.
      </p>
    </main>
  );
}
