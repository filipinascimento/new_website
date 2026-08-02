# Visualization improvements

## Purpose

The homepage currently uses the same baseline as the main Helios Web app: a live 3D Watts–Strogatz small-world network with 10,000 nodes, GPU force layout, and the standard Helios controls. This is a useful demonstration of the software, but it is not yet a representation of Filipi's research.

The next version should make the visualization biographical and analytically meaningful. It should answer a visitor's question—*what does this researcher work on, and how has that work developed?*—instead of serving as decorative motion.

## Recommended direction: a personal map of science

Build a public research map with two visual layers:

1. **Portfolio layer** — Filipi's combined, deduplicated OpenAlex works, highlighted and fully interactive.
2. **Context layer** — a carefully sampled set of related works that places the portfolio within the broader structure of science.

The initial view should be legible without opening a control panel. Hover and click can reveal titles, year, venue, citations, open-access status, topics, software, and project connections. The full controls can live in a dedicated `/map` page; the homepage can use a curated version of the same data and link to the larger explorer.

### Visual encodings

- Position: 2D text-embedding projection, with an optional 3D mode.
- Color: broad research themes derived from OpenAlex topics and reviewed by hand.
- Size: a restrained transform of citation count, with a toggle for equal-size points.
- Shape or outline: publications, software, projects, and teaching artifacts.
- Opacity: contextual works recede; portfolio works remain prominent.
- Time: year range filter plus an optional career-timeline playback.
- Relations: citation, topical similarity, project membership, or software-to-paper links, selected one at a time rather than drawn simultaneously.

## Candidate experiences

### 1. Citation constellation

Use the deduplicated works in `data/openalex/works.json` as the seed set. Extend the OpenAlex pipeline to retain `referenced_works` and, where useful, a bounded sample of citing works. The visualization can switch between:

- citations among Filipi's papers;
- a one-hop citation neighborhood;
- co-citation or bibliographic-coupling similarity; and
- a chronological view that shows how later work grows from earlier themes.

This is the fastest personalized version because the identity reconciliation already exists. It will need context nodes to avoid producing a very small, sparse graph.

### 2. Text-embedding research atlas

Embed titles and abstracts from the public OpenAlex record, project summaries, and selected software descriptions. Project the vectors with UMAP and expose meaningful groupings rather than opaque cluster numbers.

Possible interactions:

- search across titles and topics;
- compare early, middle, and recent periods;
- highlight one project or software package and see its nearby papers;
- show a smoothed density surface for selected years or themes; and
- toggle between semantic similarity and citation structure.

Abstracts should be reconstructed from OpenAlex's inverted index at build time. Generated vectors and the final public projection can be cached as versioned build artifacts so the website does not compute embeddings in the browser.

### 3. Research over a background map of science

This adapts the strongest idea in the prior Luddy Research Map prototype:

- a large, quiet background sample establishes the shape of science;
- OpenAlex portfolio papers are overlaid and emphasized;
- categories, year, and search filters change the interpretation of the same map;
- citation-scaled points and hover details provide local context; and
- a density layer shows where a selected body of work concentrates.

The Luddy prototype used MPNETv2 embeddings over a 200,000-paper Web of Science sample, projected to 2D with UMAP, then overlaid OpenAlex records. For this public site, prefer an OpenAlex-derived background unless redistribution rights for any alternative corpus are unambiguous. A 3,000–20,000-node sampled context is likely enough for the homepage; a larger payload can be reserved for `/map`.

### 4. Research-to-technology view

Adapt the shared-space pattern already explored in the APTO science-map work: place scientific papers and technological records in a common embedding, then offer a small number of outcome overlays. On the personal site, only public or deliberately summarized data should be used. No protected row-level translational data belongs in the repository or client bundle.

The public version could connect publications to patents, software, or open project outputs and describe the bridge from scientific ideas to usable systems. Current confidential projects should remain at the same overview level as the Markdown project pages.

### 5. Guided research story

Borrow the narrative rhythm—not the layout—from the APTO Story page:

- begin with one clear question;
- move through a small number of research chapters;
- let the same visualization transition between themes, years, and artifact types; and
- end with links to the underlying papers, software, and projects.

This could become a future `/story` route and use the same data as the explorer. It should respect reduced-motion preferences and never make scrolling necessary to understand a basic fact.

## Data and build pipeline

1. Extend `scripts/fetch-openalex.mjs` with a map-oriented output that retains citations, topics, abstract text, and related-work identifiers.
2. Keep author reconciliation shared with the publication pipeline so the website cannot display a different scholarly identity in different sections.
3. Generate embeddings and projections in a scheduled or manually triggered data job, not during a normal page request.
4. Emit a compact, versioned Helios network file plus a human-readable metadata manifest.
5. Validate node counts, missing titles, duplicate works, year ranges, broken URLs, and projection bounds before publishing.
6. Record the source date, OpenAlex author IDs, embedding model, projection parameters, and sampling method in the manifest.

The existing `openalexnet` software can help build citation and coauthorship neighborhoods. Helios Network should remain the graph store and Helios Web the renderer.

## Interaction and design principles

- Start with a composed scene; controls should refine it, not rescue it.
- Keep the graph surface borderless on the homepage.
- Use one accent color for Filipi's work and muted contextual colors for the background.
- Avoid rainbow categories unless the category distinctions are essential and named.
- Prefer direct labels for a few representative works over labeling every node.
- Provide a textual summary and list equivalent for accessibility and small screens.
- Preserve the user's camera and filter state only on the dedicated explorer, not on the homepage.
- Offer a static image or lightweight fallback when WebGPU/WebGL is unavailable.

## Performance targets

- Homepage: interactive within roughly 2 seconds on a modern laptop after assets are cached; keep the personalized payload small enough for GitHub Pages.
- Dedicated map: progressive loading is acceptable, with a visible data description and status.
- Do not ship the 40 MB Luddy prototype payload or the 553 MB background parquet file as homepage assets.
- Cache the Helios bundle and network payload with content hashes.
- Measure startup, first meaningful frame, pan/zoom responsiveness, mobile memory, and reduced-motion behavior.

## Suggested sequence

### Phase A — portfolio map

- Add OpenAlex citation/topic fields.
- Create a compact portfolio-plus-neighborhood network.
- Review labels and topic groupings by hand.
- Publish on `/map` and embed a simplified scene on the homepage.

### Phase B — semantic context

- Add title/abstract embeddings and an OpenAlex background sample.
- Introduce year, topic, artifact-type, and relation controls.
- Add density comparison between time periods or project themes.

### Phase C — research story

- Connect projects, software, publications, and teaching artifacts.
- Add a short guided narrative with stable scenes.
- Evaluate whether a career timeline or research-to-technology view is the stronger public story.

## Decision checkpoint

Keep the 10k Watts–Strogatz network as the honest Helios demonstration until Phase A is ready. Do not replace it with a small hand-arranged or randomly clustered graph presented as a research map. The first personalized release should be grounded in the same deduplicated OpenAlex record used by the publications page.

## References

- [Helios Web app](https://heliosweb.io/app/) — current 10k Watts–Strogatz baseline and standard controls.
- [Helios Web documentation](https://heliosweb.io/docs/) — renderer, layouts, mappers, filters, legends, and persistence.
- [OpenAlex API](https://docs.openalex.org/) — public works, topics, citations, and abstract inverted indexes.
- [openalexnet](https://github.com/filipinascimento/openalexnet) — existing helper library for OpenAlex citation and coauthorship networks.
- [APTO Story](https://filipinascimento.github.io/apto-website/story/) — reference for narrative pacing and research chapters.
- Luddy Research Map prototype — local reference for OpenAlex overlays, a 200k-paper background map, UMAP positions, category coloring, faculty/year filters, hover details, and density selection.
