import type { Metadata } from "next";

export const metadata: Metadata = { title: "Writing" };

export default function WritingPage() {
  return (
    <main id="main-content">
      <header className="page-hero shell">
        <div className="eyebrow">Notes and essays</div>
        <h1>Writing</h1>
        <p>The Markdown collection and content pipeline are ready for future research notes, essays, and project updates. This section will appear in the main navigation when the first post is published.</p>
      </header>
    </main>
  );
}
