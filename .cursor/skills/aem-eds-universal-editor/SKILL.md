---
name: aem-eds-universal-editor
description: >-
  Guide for AEM Edge Delivery Services projects using Universal Editor in AEM
  as a Cloud Service (Cloud Manager). Covers xwalk boilerplate setup, component
  models, block development, content migration from AEM Sites, path mapping,
  importer/block/template mapping, editor-support, local dev, and publishing.
  Use when working on EDS + Universal Editor + Cloud Manager projects, AEM Sites
  authoring for Edge Delivery, migrating legacy Sites content, mapping components
  to blocks, component-definition/models/filters JSON, block decoration with UE,
  editor-support.js, fstab/Code Sync setup, or questions about authoring content
  in AEM Cloud Service for *.aem.page/*.aem.live sites.
license: Apache-2.0
metadata:
  version: "1.1.0"
---

# AEM Edge Delivery Services with Universal Editor

Guide for building and maintaining EDS projects authored in the **Universal Editor** on **AEM as a Cloud Service** (Cloud Manager). Projects are based on [aem-boilerplate-xwalk](https://github.com/adobe-rnd/aem-boilerplate-xwalk).

## When to Use

- Setting up or troubleshooting a new EDS + UE project in Cloud Manager
- Creating or modifying blocks that authors add in Universal Editor
- Configuring component definitions, models, or filters for UE
- Working with `editor-support.js` for WYSIWYG authoring
- Publishing content from AEM to Edge Delivery preview/live
- Migrating content from legacy AEM Sites or external sites to EDS
- Mapping legacy components/templates to EDS blocks and section layouts
- Configuring path mapping and importing content with `aem import`
- Searching official documentation at [aem.live/docs](https://www.aem.live/docs/)

## Prerequisites

- AEM as a Cloud Service release **2026.4** or newer
- Node.js **20** or newer
- GitHub account and Git basics
- AEM Sidekick browser extension
- Access to an AEM Cloud Service authoring environment

## Project Baseline

Follow the conventions in the project's `AGENTS.md` when present. Default structure from [aem-boilerplate-xwalk](https://github.com/adobe-rnd/aem-boilerplate-xwalk):

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

### Quick search (no script)

```bash
curl -s https://www.aem.live/docpages-index.json | node -e "
let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{
  const kw=process.argv[1]||'universal editor';
  JSON.parse(d).data.filter(p=>new RegExp(kw,'i').test(p.title+p.path+(p.content||'').slice(0,800)))
    .slice(0,10).forEach(p=>console.log(p.relevanceScore||'',p.path,':',p.title));
})" "universal editor"
```

### Full-text search (recommended)

Use the **docs-search** skill when available:

```bash
node .claude/skills/docs-search/scripts/search.js universal editor
node .claude/skills/docs-search/scripts/search.js component model definitions
```

Fetch full pages at `https://www.aem.live{path}`.

### Essential doc pages

| Topic | URL |
|-------|-----|
| AEM authoring overview | https://www.aem.live/docs/aem-authoring |
| UE setup tutorial | https://www.aem.live/developer/ue-tutorial |
| Component model definitions | https://www.aem.live/developer/component-model-definitions |
| Markup, sections, blocks | https://www.aem.live/developer/markup-sections-blocks |
| Path mapping | https://www.aem.live/developer/authoring-path-mapping |
| Content import / migration | https://www.aem.live/developer/importer |
| Configuration templates | https://www.aem.live/docs/configuration-templates |
| MSM / multi-locale | https://www.aem.live/developer/repoless-multisite-manager |
| Performance (100 score) | https://www.aem.live/developer/keeping-it-100 |
| Boilerplate examples | https://github.com/adobe-rnd/aem-boilerplate-xwalk/pulls?q=is%3Apr+label%3AExample |

Also restrict web search: `site:www.aem.live <keywords>`.

## Workflows

### 1. New Project Setup (Cloud Manager + UE)

Track progress:

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
- [ ] Step 1: Design content model (invoke content-modeling skill)
- [ ] Step 2: Create UE component config (invoke ue-component-model skill)
- [ ] Step 3: Run npm run build:json if using distributed _{block}.json files
- [ ] Step 4: Implement block JS + CSS (invoke building-blocks skill)
- [ ] Step 5: Test locally and in UE (invoke testing-blocks skill)
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
curl http://localhost:3000/path/to/page.plain.html
```

Block development details: [references/block-development.md](references/block-development.md)

### 3. Component Model Changes

After editing `_{blockname}.json` or root JSON files:

```bash
npm run build:json   # Regenerate aggregated component-*.json
npm run lint         # Validates xwalk model rules
```

Invoke **ue-component-model** for definitions, models, and filters. Key rules:

- Add block `id` to the `section` filter or authors cannot add it
- `template.model` must match model `id` exactly
- Use `core/franklin/components/block/v1/block` resourceType for blocks
- Pair fields for semantic collapsing: `image`+`imageAlt`, `title`+`titleType`, `link`+`linkText`

### 4. Universal Editor Authoring (editor-support)

`scripts/editor-support.js` handles live DOM updates when authors edit in UE. It:

- Listens for UE patch events on `data-aue-resource` elements
- Re-decorates blocks and sections after content changes
- Sanitizes HTML via DOMPurify before applying updates

Do not remove or break `editor-support.js` loading in `scripts.js`. For RTE customization, see `editor-support-rte.js`.

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

### 7. Content Migration from AEM Sites

Migrate legacy AEM Sites (or external) content into EDS + UE authoring.

```
- [ ] Step 1: Inventory page types + legacy components
- [ ] Step 2: Map legacy components → EDS block ids + UE models
- [ ] Step 3: Map page templates → EDS sections + blocks layout
- [ ] Step 4: Implement blocks + _{block}.json (build:json, lint)
- [ ] Step 5: Write tools/importer/import.js transformation rules
- [ ] Step 6: Test import (aem import Workbench, 1–3 URLs)
- [ ] Step 7: Configure path mapping (mappings, includes, excludes)
- [ ] Step 8: Bulk import → upload JCR package + assets (aem-import-helper)
- [ ] Step 9: Verify in UE, publish preview, add URL redirects
```

**Block mapping:** `WebImporter.Blocks.createBlock` `name` must match block `id` in `_{block}.json`. Cell order must match UE model fields.

**Template mapping:** legacy editable template regions → EDS sections; components → blocks or default content.

**Path mapping:** AEM `/content/...` paths → public URLs via Configuration Service. See [references/content-migration.md](references/content-migration.md).

Invoke **aem-cli** for `aem import`. Invoke **content-modeling** + **ue-component-model** before bulk import.

## Code Style (from AGENTS.md)

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
| **docs-search** | Searching aem.live documentation |
| **github-git** | Branch, commit, push migration code changes |

## Common Pitfalls

- **Skipping section filter registration** — block invisible in UE add menu
- **Changing initial content structure** without migration — breaks existing pages
- **Forgetting `npm run build:json`** after editing `_{block}.json` files
- **Modifying `aem.js`** — never do this; extend via `scripts.js`
- **Publishing before technical account setup** — publish fails in UE
- **PR without preview URL** — PR will be rejected per publishing process
- **Importing before blocks/models exist** — imported structure won't match UE models
- **Block name mismatch in import.js** — `createBlock` name must equal component definition `id`
- **Skipping path mapping** — AEM paths won't match public URLs after publish
- **Forgetting asset upload** — JCR packages are binaryless; use `asset-mapping.json`
- **Changing model fields post-migration** — breaks existing imported pages without re-import

## Reference Files

- [references/cloud-manager-setup.md](references/cloud-manager-setup.md) — Cloud Manager, Code Sync, site template, technical account
- [references/block-development.md](references/block-development.md) — Block patterns from xwalk boilerplate
- [references/content-migration.md](references/content-migration.md) — Migration, block/template mapping, path mapping, import workflow
- [references/documentation.md](references/documentation.md) — Documentation search workflow
