export type LinkItem = {
  label: string;
  url: string;
};

export type ContentRecord = {
  slug: string;
  collection: string;
  title: string;
  markdown: string;
  html: string;
  text: string;
  order?: number;
  description?: string;
  [key: string]: unknown;
};

export type ProjectRecord = ContentRecord & {
  era: "current" | "past";
  status: string;
  year: string;
  featured?: boolean;
  accent?: string;
  topics?: string[];
  collaborators?: string[];
  links?: LinkItem[];
};

export type SoftwareRecord = ContentRecord & {
  repo: string;
  tagline: string;
  featured?: boolean;
  status: string;
  url: string;
  homepage?: string;
  technologies?: string[];
};

export type TeachingRecord = ContentRecord & {
  code?: string;
  term: string;
  institution: string;
  format: string;
  url: string;
  repo: string;
  topics?: string[];
};

export type PublicationAuthor = {
  name: string;
  id: string | null;
};

export type Publication = {
  id: string;
  title: string;
  normalizedTitle: string;
  publicationDate: string | null;
  year: number | null;
  type: string;
  source: string;
  doi: string | null;
  url: string;
  citedByCount: number;
  openAccess: boolean;
  openAccessStatus: string | null;
  authors: PublicationAuthor[];
  topics: string[];
  openAlexIds: string[];
  alternateUrls: string[];
};

export type GitHubRepo = {
  name: string;
  description: string;
  url: string;
  homepage: string | null;
  language: string | null;
  stars: number;
  forks: number;
  pushedAt: string;
  topics: string[];
};
