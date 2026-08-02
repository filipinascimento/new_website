# Filipi Nascimento Silva: research website

A modern, Markdown-first research portfolio for [filipinascimento.github.io/new_website](https://filipinascimento.github.io/new_website/). It combines editorial content, a deduplicated publication record, curated software metadata, and a live Helios Web visualization.

## What is generated and what is edited

The authored source of truth is under `content/`:

- `content/site/`: profile and homepage copy
- `content/projects/`: current and selected past projects
- `content/software/`: curated software entries
- `content/teaching/`: courses and teaching material
- `content/cv/`: privacy-safe public web CV
- `content/posts/`: prepared collection for future writing

Every entry is a plain `.md` file with YAML front matter. `npm run content:build` converts those collections into `data/content.json`; generated JSON should not be hand-edited.

The complete CV files containing private contact details live outside this repository in `../CV/generated/`. They must not be copied into `content/`, `public/`, or any Git commit.

## Publication and software data

`config/profile-sources.json` contains the verified public identity sources, including the primary OpenAlex author ID, nine confirmed split IDs, manual DOI fallbacks, and the curated GitHub repository list.

Run:

```bash
OPENALEX_MAILTO=you@example.com npm run data:refresh
```

This command:

1. fetches all configured OpenAlex profiles and paginated works;
2. adds explicitly configured DOI records that do not yet carry the correct author ID;
3. deduplicates works by DOI and normalized title;
4. writes the structured record to `data/openalex/` and a readable generated Markdown record to `content/publications/generated.md`;
5. refreshes metadata only for the selected GitHub repositories; and
6. rebuilds the Markdown collections.

The GitHub Pages workflow repeats the refresh weekly and commits changed public data before deploying it.

## Helios Web

The homepage uses `helios-web` 0.10 and `helios-network` 0.10. The package currently ships browser-only WebAssembly and worker assets that server-oriented static compilers try to analyze. `npm run vendor:helios` copies the installed official browser bundles into `public/vendor/`, rewrites only their local import/worker URLs, and leaves the npm packages as the declared version source.

Run that command after upgrading either Helios package. It is also run automatically before every local and production build.

## Local development

Node.js 22.13 or newer is required.

```bash
npm install
npm run dev
```

Useful commands:

```bash
npm run data:refresh   # OpenAlex + selected GitHub repositories
npm run content:build  # Markdown only
npm run build          # Sites/vinext production build
npm run build:github   # GitHub Pages static export to out/
npm test               # content, identity, privacy, and vendor checks
npm run verify         # lint, tests, and both production builds
```

## Themes and future writing

Light and dark themes share the same editorial design tokens. The first visit follows the operating-system preference; the header toggle stores an explicit choice in `localStorage`.

The `/writing` route and `content/posts/` collection are already wired. Add the first post as Markdown, then expose Writing in `app/components/SiteHeader.tsx` when it is ready to publish.

## Deployment

`.github/workflows/pages.yml` builds the static export and deploys it with GitHub Pages. The same repository can also be built by OpenAI Sites through the existing vinext configuration; no database or private authentication is required.
