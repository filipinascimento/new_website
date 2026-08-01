import type { Metadata } from "next";
import contentJson from "@/data/content.json";
import githubJson from "@/data/github/repos.json";
import { ArrowUpRight, GitBranch } from "lucide-react";
import { SoftwareCard } from "../components/SoftwareCard";
import type { GitHubRepo, SoftwareRecord } from "../lib/types";

export const metadata: Metadata = {
  title: "Software",
  description: "Selected open-source software and research tools by Filipi Nascimento Silva.",
};

export default function SoftwarePage() {
  const software = contentJson.software as SoftwareRecord[];
  const repos = new Map((githubJson.featured as GitHubRepo[]).map((repo) => [repo.name, repo]));
  const syncDate = new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(githubJson.fetchedAt));
  return (
    <main id="main-content">
      <header className="page-hero shell page-hero--split">
        <div>
          <div className="eyebrow">Selected open source</div>
          <h1>Software for exploring complex systems.</h1>
        </div>
        <div>
          <p>This is a deliberately curated portfolio of research tools that are active, reusable, or tied to enduring published work—not a feed of every repository.</p>
          <a className="text-link" href="https://github.com/filipinascimento" target="_blank" rel="noreferrer"><GitBranch size={15} /> All GitHub repositories<ArrowUpRight size={13} /></a>
        </div>
      </header>
      <section className="section shell section--first">
        <div className="section-label-row"><h2>Featured tools</h2><span>Repository metadata synced {syncDate}</span></div>
        <div className="software-grid">
          {software.map((item) => <SoftwareCard software={item} repo={repos.get(item.repo)} key={item.slug} />)}
        </div>
      </section>
    </main>
  );
}
