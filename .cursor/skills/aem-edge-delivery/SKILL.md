---
name: aem-edge-delivery
description: Develops AEM Edge Delivery Services sites with Universal Editor, Cloud Manager, and xwalk content modeling. Use when working on EDS blocks, component models, fstab/mountpoints, AEM CLI local dev, Cloud Manager deployment, Universal Editor authoring, or when the user mentions aem.live, xwalk, boilerplate-xwalk, or AGENTS.md patterns.
---

# AEM Edge Delivery Services (Universal Editor)

Develop fast, author-friendly sites on AEM Sites as a Cloud Service using Edge Delivery Services (EDS), Universal Editor (UE), and Cloud Manager code sync.

## First steps

1. **Read project `AGENTS.md`** if present — it overrides generic guidance for repo-specific conventions.
2. **Inspect before coding** — never assume markup; use `curl` against local or preview URLs:
   - `curl http://localhost:3000/path/to/page`
   - `curl http://localhost:3000/path/to/page.plain.html`
   - `curl http://localhost:3000/path/to/page.md`
3. **Search official docs** at [https://www.aem.live/docs/](https://www.aem.live/docs/) — see [reference.md](reference.md) for search commands and key doc paths.
4. **Follow boilerplate patterns** from [aem-boilerplate-xwalk](https://github.com/adobe-rnd/aem-boilerplate-xwalk) for blocks, models, and project structure.

## Stack constraints

| Layer | Rule |
|-------|------|
| JavaScript | ES6+, vanilla, no transpiling, `.js` extensions on imports |
| CSS | Modern CSS only, no Tailwind/frameworks, mobile-first, block-scoped selectors |
| HTML | Semantic HTML5, AEM markup conventions, WCAG 2.1 AA |
| Core library | **Never modify** `scripts/aem.js` |

Breakpoints: `600px`, `900px`, `1200px` (`min-width`).

## Local development

```bash
npm install
npx -y @adobe/aem-cli up --no-open --forward-browser-logs   # http://localhost:3000
npm run lint
npm run lint:fix
```

- Run AEM CLI in background when possible.
- No authored content? Create static pages in `drafts/` and start with `--html-folder drafts`.
- Before commit: `npm run lint`.

## Project structure (xwalk / Universal Editor)

```
blocks/{blockname}/
  {blockname}.js          # decorate()
  {blockname}.css         # block-scoped styles
  _{blockname}.json       # UE definitions, models, filters
models/                   # page, section, default content models
scripts/editor-support.js # UE WYSIWYG patch handling (extend carefully)
component-definitions.json   # generated — do not edit directly
component-models.json        # generated
component-filters.json       # generated
fstab.yaml                     # Cloud Manager content mountpoints
```

After editing `_{blockname}.json` or `models/_*.json`:

```bash
npm run build:json
npm run lint
```

## Universal Editor content modeling

UE uses **xwalk** plugin JSON in partial files. Aggregated JSON is built by `npm run build:json`.

### Model file anatomy (`_{blockname}.json`)

```json
{
  "definitions": [{ "title": "Hero", "id": "hero", "plugins": { "xwalk": { "page": { ... } } } }],
  "models": [{ "id": "hero", "fields": [...] }],
  "filters": [{ "id": "cards", "components": ["card"] }]
}
```

**Resource types:**
- Block container: `core/franklin/components/block/v1/block`
- Block item (repeatable row): `core/franklin/components/block/v1/block/item`

**Field components:** `text`, `richtext`, `reference` (images), `select`, `multiselect`, `tab`, `aem-content`, etc.

**Rules:**
- Build semantically appealing models — they define the author experience.
- Validate with `eslint-plugin-xwalk` via `npm run lint`.
- Example PRs: [boilerplate-xwalk Examples](https://github.com/adobe-rnd/aem-boilerplate-xwalk/pulls?q=is%3Aopen+is%3Apr+label%3AExample)
- Deep reference: [reference.md](reference.md#universal-editor--content-modeling)

### Editor support

`scripts/editor-support.js` re-decorates blocks/sections when authors patch content in UE. When block DOM structure changes significantly, verify UE preview still re-renders correctly after property edits.

## Block development workflow

Full guide: [blocks-development.md](blocks-development.md)

### Checklist

```
- [ ] Define initial content structure (author contract) before coding
- [ ] Create blocks/{name}/ with .js, .css, _{name}.json
- [ ] Register definitions in models/_component-definition.json (via glob or explicit entry)
- [ ] Run npm run build:json && npm run lint
- [ ] Test decorate() against .plain.html markup from curl
- [ ] Handle missing/optional authored fields gracefully
- [ ] Scope CSS to .{blockname}
- [ ] Optimize committed images; use createOptimizedPicture for author images
- [ ] Verify responsive + accessibility (headings, alt text, ARIA)
- [ ] Test in UE preview after push to feature branch
```

### Block JS template

```javascript
/**
 * loads and decorates the block
 * @param {Element} block The block element
 */
export default async function decorate(block) {
  // 1. Load dependencies (dynamic import if non-LCP)
  // 2. Extract configuration from block DOM
  // 3. Transform self DOM
  // 4. Add event listeners
}
```

Use `moveInstrumentation` from `scripts/scripts.js` when restructuring DOM so UE instrumentation survives.

## Three-phase page loading

Respect loading phases in `scripts/scripts.js`:

| Phase | Load |
|-------|------|
| **Eager** | First section, core decoration, LCP-critical blocks |
| **Lazy** | Remaining sections, header, footer |
| **Delayed** | Martech, analytics (`delayed.js`) |

Non-critical JS/CSS → lazy import or `delayed.js`. Non-critical styles → `lazy-styles.css`.

## Cloud Manager & environments

### Content source (`fstab.yaml`)

Maps site paths to AEM authoring delivery URLs:

```yaml
mountpoints:
  /:
    url: "https://author-....adobeaemcloud.com/bin/franklin.delivery/{org}/{repo}/{branch}"
    type: "markup"
    suffix: ".html"
```

Branch in URL determines which code/content syncs to preview.

### Environment URLs

Get `{owner}`, `{repo}`, `{branch}` from `git remote -v` and `git branch`:

| Environment | URL pattern |
|-------------|-------------|
| Local | `http://localhost:3000` |
| Feature preview | `https://{branch}--{repo}--{owner}.aem.page/` |
| Production preview | `https://main--{repo}--{owner}.aem.page/` |
| Production live | `https://main--{repo}--{owner}.aem.live/` |

### Publishing workflow

1. Push feature branch → AEM Code Sync deploys to feature preview
2. PageSpeed Insights on feature preview URL — target **100**
3. Open PR to `main` with **preview URL demonstrating the change** (required)
4. `gh pr checks` — verify code sync, lint, performance
5. Merge → production via Code Sync

Install [AEM Code Sync GitHub App](https://github.com/apps/aem-code-sync) on the repository.

## Performance & quality

- [Keeping it 100](https://www.aem.live/developer/keeping-it-100)
- Lazy-load non-critical assets
- Minimize JS; use block-level code splitting under `/blocks/`
- `npm run lint` before every commit

## Documentation discovery

**Primary index:** [https://www.aem.live/docs/](https://www.aem.live/docs/)

**Full-text search** (run in terminal):

```bash
curl -s https://www.aem.live/docpages-index.json | jq -r '.data[] | select(.content | test("KEYWORD"; "i")) | "\(.path): \(.title)"'
```

**Web search:** restrict to `site:www.aem.live`

Curated doc map: [reference.md](reference.md)

## Security

- All code is public client-side — no secrets in git
- Use `.hlxignore` to exclude files from delivery (same syntax as `.gitignore`)

## When stuck

1. Search [reference.md](reference.md) doc paths
2. Compare with [aem-boilerplate-xwalk](https://github.com/adobe-rnd/aem-boilerplate-xwalk) blocks
3. Read [David's Model](https://www.aem.live/docs/davidsmodel)
4. [Developing with AI Tools](https://www.aem.live/developer/ai-coding-agents)
