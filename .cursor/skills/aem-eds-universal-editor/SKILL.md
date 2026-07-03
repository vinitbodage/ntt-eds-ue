---
name: aem-eds-universal-editor
description: >-
  Guide for AEM Edge Delivery Services projects using Universal Editor in AEM
  as a Cloud Service (Cloud Manager). Covers xwalk boilerplate setup, component
  models, block development, editor-support, local dev, and publishing. Use
  when working on EDS + Universal Editor + Cloud Manager projects, AEM Sites
  authoring for Edge Delivery, component-definition/models/filters JSON, block
  decoration with UE, editor-support.js, fstab/Code Sync setup, or questions
  about authoring content in AEM Cloud Service for *.aem.page/*.aem.live sites.
---

# AEM Edge Delivery Services with Universal Editor

Guide for building and maintaining EDS projects authored in the **Universal Editor** on **AEM as a Cloud Service** (Cloud Manager). Projects are based on [aem-boilerplate-xwalk](https://github.com/adobe-rnd/aem-boilerplate-xwalk).

When the project contains `AGENTS.md`, follow its conventions. This skill extends that guidance with UE-specific workflows.

## When to Use

- Setting up or troubleshooting an EDS + UE project in Cloud Manager
- Creating or modifying blocks that authors add in Universal Editor
- Configuring component definitions, models, or filters for UE
- Working with `editor-support.js` for WYSIWYG authoring
- Publishing content from AEM to Edge Delivery preview/live
- Searching official documentation at [aem.live/docs](https://www.aem.live/docs/)

## Prerequisites

- AEM as a Cloud Service release **2026.4** or newer
- Node.js **20** or newer
- GitHub account and Git basics
- AEM Sidekick browser extension
- Access to an AEM Cloud Service authoring environment

## Project Baseline

Default structure from [aem-boilerplate-xwalk](https://github.com/adobe-rnd/aem-boilerplate-xwalk):

```
blocks/{blockname}/
  {blockname}.js          # Block decoration (export default async function decorate)
  {blockname}.css         # Scoped block styles
  _{blockname}.json       # UE definitions, models, filters (distributed config)
scripts/
  aem.js                  # NEVER MODIFY — core EDS library
  scripts.js              # Global decoration entry point
  editor-support.js       # UE WYSIWYG patch handling
  editor-support-rte.js   # Rich text decoration in UE
models/                   # Page/section/document component config
component-definitions.json
component-models.json
component-filters.json
```

**Key technologies:** Vanilla ES6+ JavaScript (no transpiling), CSS3 (no frameworks), semantic HTML5 decorated by block JS.

## Documentation Search

Always prefer official docs at [https://www.aem.live/docs/](https://www.aem.live/docs/) over general web search.

### Quick search

```bash
node .cursor/skills/aem-eds-universal-editor/scripts/search-docs.js universal editor
node .cursor/skills/aem-eds-universal-editor/scripts/search-docs.js component model definitions
```

Fetch full pages at `https://www.aem.live{path}`.

### Fallback (no script)

```bash
curl -s https://www.aem.live/docpages-index.json | node -e "
let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{
  const kw=process.argv[1]||'universal editor';
  JSON.parse(d).data.filter(p=>new RegExp(kw,'i').test(p.title+p.path+(p.content||'').slice(0,800)))
    .slice(0,10).forEach(p=>console.log(p.path,':',p.title));
})" "universal editor"
```

Also restrict web search: `site:www.aem.live <keywords>`.

Full search workflow: [references/documentation.md](references/documentation.md)

### Essential doc pages

| Topic | URL |
|-------|-----|
| AEM authoring overview | https://www.aem.live/docs/aem-authoring |
| UE setup tutorial | https://www.aem.live/developer/ue-tutorial |
| Component model definitions | https://www.aem.live/developer/component-model-definitions |
| Markup, sections, blocks | https://www.aem.live/developer/markup-sections-blocks |
| Markup reference | https://www.aem.live/developer/markup-reference |
| Path mapping | https://www.aem.live/developer/authoring-path-mapping |
| Performance (100 score) | https://www.aem.live/developer/keeping-it-100 |
| Boilerplate examples | https://github.com/adobe-rnd/aem-boilerplate-xwalk/pulls?q=is%3Apr+label%3AExample |

## Workflows

### 1. New Project Setup (Cloud Manager + UE)

```
- [ ] Create repo from aem-boilerplate-xwalk template
- [ ] Update fstab.yaml mount point to AEM authoring URL
- [ ] Install AEM Code Sync GitHub app on the repository
- [ ] Import EDS site template in AEM Sites console
- [ ] Create site with project URL (main--{repo}--{owner}.aem.page)
- [ ] Configure technical account for publishing
- [ ] Verify UE opens and publishes to preview
```

Detailed steps: [references/cloud-manager-setup.md](references/cloud-manager-setup.md)

### 2. New Block with Universal Editor Support

Follow this order — the initial content structure is the contract between authors and developers:

```
- [ ] Step 1: Design content model (content-modeling skill)
- [ ] Step 2: Create UE component config (ue-component-model skill)
- [ ] Step 3: Run npm run build:json if using distributed _{block}.json files
- [ ] Step 4: Implement block JS + CSS (building-blocks skill)
- [ ] Step 5: Test locally and in UE (testing-blocks skill)
- [ ] Step 6: Lint — npm run lint
```

**Block JS pattern:**

```javascript
/**
 * loads and decorates the block
 * @param {Element} block The block element
 */
export default async function decorate(block) {
  // 1. Load dependencies
  // 2. Extract configuration from DOM (handle missing fields gracefully)
  // 3. Transform DOM — re-use existing elements (picture, headings, links)
  // 4. Add event listeners
}
```

Inspect delivered HTML before coding:

```bash
curl http://localhost:3000/path/to/page
curl http://localhost:3000/path/to/page.md
curl http://localhost:3000/path/to/page.plain.html
```

Block development details: [references/block-development.md](references/block-development.md)

Study reference implementations in [aem-boilerplate-xwalk/blocks](https://github.com/adobe-rnd/aem-boilerplate-xwalk/tree/main/blocks).

### 3. Component Model Changes

After editing `_{blockname}.json` or root JSON files:

```bash
npm run build:json   # Regenerate aggregated component-*.json
npm run lint         # Validates xwalk model rules
```

Key rules:

- Add block `id` to the `section` filter or authors cannot add it
- `template.model` must match model `id` exactly
- Use `core/franklin/components/block/v1/block` resourceType for blocks
- Pair fields for semantic collapsing: `image`+`imageAlt`, `title`+`titleType`, `link`+`linkText`

Invoke **ue-component-model** for definitions, models, and filters.

### 4. Universal Editor Authoring (editor-support)

`scripts/editor-support.js` handles live DOM updates when authors edit in UE. It:

- Listens for UE patch events on `data-aue-resource` elements
- Re-decorates blocks and sections after content changes
- Sanitizes HTML via DOMPurify before applying updates

Do not remove or break `editor-support.js` loading in `scripts.js`. For RTE customization, see `editor-support-rte.js`.

Ensure `decorate()` is idempotent — safe to run multiple times after UE patches.

### 5. Local Development

```bash
npm install
npx -y @adobe/aem-cli up --no-open --forward-browser-logs
```

Server: `http://localhost:3000`. For static test content without CMS pages, use `drafts/` folder with `--html-folder drafts`.

Invoke **aem-cli** skill for TLS, proxy, port, and troubleshooting.

### 6. Publishing and Environments

| Environment | URL pattern |
|-------------|-------------|
| Local | `http://localhost:3000` |
| Feature preview | `https://{branch}--{repo}--{owner}.aem.page/` |
| Production preview | `https://main--{repo}--{owner}.aem.page/` |
| Production live | `https://main--{repo}--{owner}.aem.live/` |

**Publishing workflow:**

1. Push code to feature branch → AEM Code Sync deploys to feature preview
2. Authors publish content from UE (Preview destination first)
3. Open PR to `main` with preview URL demonstrating changes
4. Run PageSpeed Insights targeting score 100
5. Use `gh pr checks` to verify CI

## Code Style

### JavaScript
- ES6+, Airbnb ESLint, `.js` extensions in imports, LF line endings
- Handle missing author fields gracefully in `decorate()`

### CSS
- Scope all selectors: `.{blockname} .item-list` not `.item-list`
- Mobile-first; breakpoints at 600px, 900px, 1200px
- Avoid `{blockname}-container` and `{blockname}-wrapper` class names

### HTML
- Semantic HTML5, WCAG 2.1 AA, proper heading hierarchy

### Performance
- Three-phase loading: eager (LCP), lazy (rest of page), delayed (martech)
- Never modify `scripts/aem.js`
- Optimize committed images; use `lazy-styles.css` and `delayed.js` for non-critical assets

## Related Skills

| Skill | When to invoke |
|-------|----------------|
| **ue-component-model** | Component definitions, models, filters JSON |
| **content-modeling** | Designing author-facing block structure |
| **building-blocks** | Block JS/CSS implementation |
| **testing-blocks** | Lint, browser, and performance testing |
| **aem-cli** | Local dev server setup and troubleshooting |
| **docs-search** | Full-text aem.live documentation search |

## Common Pitfalls

- **Skipping section filter registration** — block invisible in UE add menu
- **Changing initial content structure** without migration — breaks existing pages
- **Forgetting `npm run build:json`** after editing `_{block}.json` files
- **Modifying `aem.js`** — never do this; extend via `scripts.js`
- **Publishing before technical account setup** — publish fails in UE
- **PR without preview URL** — PR will be rejected per publishing process

## Reference Files

- [references/cloud-manager-setup.md](references/cloud-manager-setup.md) — Cloud Manager, Code Sync, site template, technical account
- [references/block-development.md](references/block-development.md) — Block patterns from xwalk boilerplate
- [references/documentation.md](references/documentation.md) — Documentation search workflow
