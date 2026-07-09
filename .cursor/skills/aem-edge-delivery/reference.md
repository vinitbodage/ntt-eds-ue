# AEM Edge Delivery — Documentation Reference

Official documentation home: [https://www.aem.live/docs/](https://www.aem.live/docs/)

## Searching documentation

### Full-text index search

```bash
curl -s https://www.aem.live/docpages-index.json | jq -r '.data[] | select(.content | test("KEYWORD"; "i")) | "\(.path): \(.title)"'
```

Replace `KEYWORD` with terms like `universal editor`, `block`, `model`, `redirect`, `sidekick`.

### Web search

Use `site:www.aem.live` to restrict results to official docs.

### Direct fetch

Doc pages are served at `https://www.aem.live{path}` — e.g. `https://www.aem.live/developer/universal-editor-blocks`.

---

## Getting started

| Topic | Path |
|-------|------|
| Developer tutorial | [/developer/tutorial](https://www.aem.live/developer/tutorial) |
| UE setup (AEM as content source) | [/developer/ue-tutorial](https://www.aem.live/developer/ue-tutorial) |
| UE trial (pre-built env) | [/developer/ue-trial](https://www.aem.live/developer/ue-trial) |
| Anatomy of a project | [/developer/anatomy-of-a-project](https://www.aem.live/developer/anatomy-of-a-project) |
| David's Model | [/docs/davidsmodel](https://www.aem.live/docs/davidsmodel) |
| Developing with AI tools | [/developer/ai-coding-agents](https://www.aem.live/developer/ai-coding-agents) |

## Universal Editor & AEM authoring

| Topic | Path |
|-------|------|
| AEM authoring overview | [/docs/aem-authoring](https://www.aem.live/docs/aem-authoring) |
| Publishing from authoring to EDS | [/docs/publishing-from-authoring](https://www.aem.live/docs/publishing-from-authoring) |
| UE-instrumented blocks | [/developer/universal-editor-blocks](https://www.aem.live/developer/universal-editor-blocks) |
| Content modeling | [/developer/component-model-definitions](https://www.aem.live/developer/component-model-definitions) |
| Authoring path mapping | [/developer/authoring-path-mapping](https://www.aem.live/developer/authoring-path-mapping) |
| Tabular data authoring | [/docs/authoring-tabular-data](https://www.aem.live/docs/authoring-tabular-data) |
| Taxonomy authoring | [/docs/authoring-taxonomy](https://www.aem.live/docs/authoring-taxonomy) |
| UE assets publishing | [/docs/universal-editor-assets](https://www.aem.live/docs/universal-editor-assets) |
| Auth for authors | [/docs/authentication-setup-authoring](https://www.aem.live/docs/authentication-setup-authoring) |
| Repoless / multisite | [/developer/repoless-authoring](https://www.aem.live/developer/repoless-authoring) |

## Blocks & markup

| Topic | Path |
|-------|------|
| Markup, sections, blocks | [/developer/markup-sections-blocks](https://www.aem.live/developer/markup-sections-blocks) |
| HTML markup reference | [/developer/markup-reference](https://www.aem.live/developer/markup-reference) |
| Exploring blocks | [/docs/exploring-blocks](https://www.aem.live/docs/exploring-blocks) |
| Block collection index | [/developer/block-collection](https://www.aem.live/developer/block-collection) |
| Bring your own markup | [/developer/byom](https://www.aem.live/developer/byom) |
| Web components | [/developer/web-components](https://www.aem.live/developer/web-components) |

### Block collection (reference implementations)

- [Sections](https://www.aem.live/developer/block-collection/sections)
- [Text](https://www.aem.live/developer/block-collection/text)
- [Headings](https://www.aem.live/developer/block-collection/headings)
- [Buttons](https://www.aem.live/developer/block-collection/buttons)
- [Links](https://www.aem.live/developer/block-collection/links)
- [Lists](https://www.aem.live/developer/block-collection/lists)
- [Icons](https://www.aem.live/developer/block-collection/icons)
- [Footer](https://www.aem.live/developer/block-collection/footer)
- [Metadata](https://www.aem.live/developer/block-collection/metadata)
- [Section metadata](https://www.aem.live/developer/block-collection/section-metadata)
- [Breadcrumbs](https://www.aem.live/developer/block-collection/breadcrumbs)
- [Search](https://www.aem.live/developer/block-collection/search)
- [Modal](https://www.aem.live/developer/block-collection/modal)

## Authoring tools

| Topic | Path |
|-------|------|
| Sidekick | [/docs/sidekick](https://www.aem.live/docs/sidekick) |
| Sidekick library | [/docs/sidekick-library](https://www.aem.live/docs/sidekick-library) |
| Authoring guide | [/docs/authoring-guide](https://www.aem.live/docs/authoring-guide) |
| Authoring & publishing | [/docs/authoring](https://www.aem.live/docs/authoring) |
| AEM Assets Sidekick plugin | [/docs/aem-assets-sidekick-plugin](https://www.aem.live/docs/aem-assets-sidekick-plugin) |

## Performance & go-live

| Topic | Path |
|-------|------|
| Keeping it 100 | [/developer/keeping-it-100](https://www.aem.live/developer/keeping-it-100) |
| Go-live checklist | [/docs/go-live-checklist](https://www.aem.live/docs/go-live-checklist) |
| Redirects | [/docs/redirects](https://www.aem.live/docs/redirects) |
| Martech / Experience Cloud | [/developer/martech-integration](https://www.aem.live/developer/martech-integration) |

## Boilerplate & examples (GitHub)

| Resource | URL |
|----------|-----|
| xwalk boilerplate (UE) | [github.com/adobe-rnd/aem-boilerplate-xwalk](https://github.com/adobe-rnd/aem-boilerplate-xwalk) |
| Example PRs | [pulls?label=Example](https://github.com/adobe-rnd/aem-boilerplate-xwalk/pulls?q=is%3Aopen+is%3Apr+label%3AExample) |
| eslint-plugin-xwalk rules | [github.com/adobe-rnd/eslint-plugin-xwalk](https://github.com/adobe-rnd/eslint-plugin-xwalk?tab=readme-ov-file#rules) |
| Classic boilerplate | [github.com/adobe/aem-boilerplate](https://github.com/adobe/aem-boilerplate) |
| AEM Code Sync app | [github.com/apps/aem-code-sync](https://github.com/apps/aem-code-sync) |

## Cloud Manager concepts

Cloud Manager deploys code via **Git → AEM Code Sync → preview/live environments**.

Key repo files:
- `fstab.yaml` — content mountpoints to AEM authoring delivery endpoint
- `.hlxignore` — exclude files from code delivery
- `component-*.json` — generated UE model aggregates (run `npm run build:json`)

Preview URLs follow: `https://{branch}--{repo}--{owner}.aem.page/`

Live URLs follow: `https://{branch}--{repo}--{owner}.aem.live/` (typically `main` branch)

## xwalk lint rules

Run `npm run lint` to validate JSON models. Rule details:
https://github.com/adobe-rnd/eslint-plugin-xwalk?tab=readme-ov-file#rules

Common issues:
- Missing or duplicate model/definition IDs
- Invalid field component types
- Filter references to undefined components
