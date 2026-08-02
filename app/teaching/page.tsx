import type { Metadata } from "next";
import contentJson from "@/data/content.json";
import { ArrowUpRight } from "lucide-react";
import type { TeachingRecord } from "../lib/types";

export const metadata: Metadata = {
  title: "Teaching",
  description: "Courses, workshops, and mentorship by Filipi Nascimento Silva.",
};

export default function TeachingPage() {
  const teaching = contentJson.teaching as TeachingRecord[];
  return (
    <main id="main-content">
      <header className="page-hero shell page-hero--split">
        <div>
          <div className="eyebrow">Teaching and mentorship</div>
          <h1>Teaching</h1>
        </div>
        <p>My teaching connects conceptual foundations to reproducible analysis, critical evaluation, and finished public-facing projects.</p>
      </header>
      <section className="section shell section--first">
        <div className="course-grid">
          {teaching.map((course) => (
            <article className="course-card" key={course.slug}>
              <div className="course-card__meta">{course.term} · {course.format}</div>
              <h2>{course.title}</h2>
              {course.code && <div className="course-card__code">{course.code}</div>}
              <p className="course-card__institution">{course.institution}</p>
              <div className="course-card__body" dangerouslySetInnerHTML={{ __html: course.html }} />
              {course.topics && <div className="tag-list">{course.topics.map((topic) => <span key={topic}>{topic}</span>)}</div>}
              <div className="course-card__links">
                <a href={course.url} target="_blank" rel="noreferrer">Course site<ArrowUpRight size={14} /></a>
                <a href={course.repo} target="_blank" rel="noreferrer">Materials on GitHub<ArrowUpRight size={14} /></a>
              </div>
            </article>
          ))}
        </div>
      </section>
      <section className="section section--tint">
        <div className="shell teaching-detail-grid">
          <div>
            <div className="eyebrow">Mentorship</div>
            <h2>Research supervision</h2>
            <p>Graduate and undergraduate projects in interactive network visualization, embeddings, LLM interfaces, scientific software, and computational modeling. Past mentoring includes Google Summer of Code projects for Helios and FURY under the Python Software Foundation.</p>
          </div>
          <div>
            <div className="eyebrow">Workshops</div>
            <h2>Short-form teaching</h2>
            <p>Tutorials and workshops for IC2S2, ISSI/CADRE, the Indiana University Network Science Institute, and university network-science courses, with an emphasis on practical data acquisition, network visualization, and reproducible exploration.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
