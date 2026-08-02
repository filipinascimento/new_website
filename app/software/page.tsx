import type { Metadata } from "next";
import contentJson from "@/data/content.json";
import { ArrowUpRight, GitBranch } from "lucide-react";
import { SoftwareCard } from "../components/SoftwareCard";
import type { SoftwareRecord } from "../lib/types";

export const metadata: Metadata = {
  title: "Software",
  description: "Selected open-source software and research tools by Filipi Nascimento Silva.",
};

export default function SoftwarePage() {
  const software = contentJson.software as SoftwareRecord[];
  return (
    <main id="main-content">
      <header className="page-hero shell page-hero--split">
        <div>
          <div className="eyebrow">Open source</div>
          <h1>Software</h1>
        </div>
        <div>
          <p>A curated selection of research tools connected to my work and publications.</p>
          <a className="text-link" href="https://github.com/filipinascimento" target="_blank" rel="noreferrer"><GitBranch size={15} /> All GitHub repositories<ArrowUpRight size={13} /></a>
        </div>
      </header>
      <section className="section shell section--first">
        <div className="section-label-row"><h2>Featured tools</h2><span>Open tools, libraries, and research applications</span></div>
        <div className="software-grid">
          {software.map((item) => <SoftwareCard software={item} key={item.slug} />)}
        </div>
      </section>
    </main>
  );
}
