# Content Migration from AEM Sites to Edge Delivery

Guide for migrating content from a legacy AEM Sites project (or external site) to **Edge Delivery Services** with **Universal Editor** authoring. Based on [aem.live/docs](https://www.aem.live/docs/) and [helix-importer guidelines](https://github.com/adobe/helix-importer-ui/blob/main/importer-guidelines.md).

## Migration Overview

```
Legacy AEM Sites / external site
        │
        ▼  inventory page types + components
   Block & model mapping (EDS blocks + _{block}.json)
        │
        ▼  tools/importer/import.js
   AEM Importer → JCR package + asset-mapping.json
        │
        ▼  path mapping + site config
   AEM Author (UE) → publish → *.aem.page / *.aem.live
```

Three parallel workstreams:

| Stream | Deliverable |
|--------|-------------|
| **Code** | EDS blocks (JS/CSS), UE component models, section filters |
| **Content** | `import.js` rules, JCR packages, asset upload |
| **Config** | Path mapping, site template, cloud configuration, redirects |

Invoke **content-modeling** and **ue-component-model** before bulk import — imported structure must match UE models.

---

## Phase Checklist

```
- [ ] 1. Inventory legacy page types and components
- [ ] 2. Map each legacy component → EDS block id
- [ ] 3. Map each page template → EDS section + block layout
- [ ] 4. Implement EDS blocks + _{block}.json models
- [ ] 5. Run npm run build:json && npm run lint
- [ ] 6. Create tools/importer/import.js transformation rules
- [ ] 7. Test import on 1–3 sample URLs (Workbench)
- [ ] 8. Configure path mapping (mappings, includes, excludes)
- [ ] 9. Bulk import + upload JCR package and assets
- [ ] 10. Open pages in UE, fix edge cases, publish to preview
- [ ] 11. Add redirects for changed URLs
- [ ] 12. Validate preview/live + PageSpeed 100
```

---

## 1. Map Legacy Components → EDS Blocks

### Mapping table (create per project)

| Legacy AEM component / DOM pattern | EDS block `id` | Model `id` | Notes |
|-----------------------------------|----------------|------------|-------|
| `website/components/hero` | `hero` | `hero` | image + imageAlt + text |
| `website/components/teaser` | `hero-banner` | `hero-banner` | title, description, link, multi images |
| `core/wcm/components/carousel` | `carousel` | `carousel` | container + slide items |
| Rich text paragraph | default content (`text`) | `text` | No block needed |
| Experience fragment | `fragment` | `fragment` | aem-experience-fragment field |

**Rules:**

- Block `id` in `component-definition.json` / `_{block}.json` **must match** the name passed to `WebImporter.Blocks.createBlock`
- Block table cell order **must match** UE model field order (contract between import and authoring)
- Prefer default content (headings, text, images, links) over blocks when possible ([David's Model](https://www.aem.live/docs/davidsmodel))
- Register every new block `id` in `models/_section.json` section filter

### Block cell structure for import

Importer blocks are HTML tables. Each row = block instance; each cell = model field value.

```javascript
/* global WebImporter */

// Hero banner: title | description | link | images (multi)
const heroSection = document.querySelector('.legacy-hero');
const block = WebImporter.Blocks.createBlock(document, {
  name: 'hero-banner',  // must match block id in _hero-banner.json
  cells: [[
    heroSection.querySelector('h1'),
    heroSection.querySelector('.subtitle')?.textContent?.trim(),
    heroSection.querySelector('a[href]'),
    [...heroSection.querySelectorAll('img')],
  ]],
});
main.append(block);
```

Container blocks (cards, carousel) use multiple rows or child item blocks — match the container + item definitions in `_{block}.json`.

### Metadata block (every page)

```javascript
const meta = {
  Title: document.querySelector('title')?.textContent?.trim(),
  Description: document.querySelector('meta[property="og:description"]')?.content,
  Image: document.querySelector('meta[property="og:image"]')?.content,
};
const block = WebImporter.Blocks.getMetadataBlock(document, meta);
main.prepend(block);
```

---

## 2. Map Page Templates → EDS Structure

Legacy AEM **editable templates** define allowed components and layout. EDS uses **sections** containing **default content** and **blocks**.

### Template mapping table

| Legacy template | EDS page structure |
|----------------|-------------------|
| Home page template | Section 1: hero-banner · Section 2: cards · Section 3: default text |
| Article template | Section 1: title + image (default) · Section 2: richtext body |
| Landing template | Section 1: hero · Section 2: columns · Section 3: CTA buttons |

**Steps:**

1. Export or browse legacy page HTML per template type
2. Identify repeating section boundaries (hero, main content, related items)
3. Define one EDS section per visual/logical region
4. Map each region's components to blocks or default content
5. Encode per-template rules in `import.js` (detect template via CSS class, meta tag, or URL pattern)

```javascript
transformDOM: ({ document, url }) => {
  const main = document.querySelector('main');
  const isArticle = document.querySelector('body.article-page');

  if (isArticle) {
    convertArticleToSections(main, document);
  } else {
    convertHomeToSections(main, document);
  }
  return main;
},
```

### Site template (new EDS site in AEM)

For a **new** EDS site shell in AEM Sites console:

1. Download site template from [xwalk releases](https://github.com/adobe-rnd/aem-boilerplate-xwalk/releases)
2. **Create → Site from template → Import**
3. Set **Project URL** to `https://main--{repo}--{owner}.aem.page`
4. Migrated JCR content is imported **into** this site tree under `/content/{site}/`

### Configuration template (not page layout)

[Configuration templates](https://www.aem.live/docs/configuration-templates) manage **project config** (CDN, access control, metadata) — not page layout. Use for:

- Path mapping spreadsheets
- CDN vendor settings
- Admin/author access lists
- MSM inheritance across locales

---

## 3. Path Mapping (AEM path → public URL)

Configure when AEM content paths differ from public URLs. Full reference: [authoring-path-mapping](https://www.aem.live/developer/authoring-path-mapping).

```json
{
  "paths": {
    "mappings": [
      "/content/ntt-eds-ue/us/en/:/",
      "/content/dam/ntt-eds-ue/:/assets/"
    ],
    "includes": [
      "/content/ntt-eds-ue/",
      "/content/dam/ntt-eds-ue/"
    ],
    "excludes": [
      "/content/ntt-eds-ue/**/drafts/**"
    ]
  }
}
```

| Section | Purpose |
|---------|---------|
| `mappings` | Prefix map: AEM internal path → public URL path |
| `includes` | What gets published to EDS (supports `*`, `**` globs) |
| `excludes` | Filter out drafts, internal pages, `*.xml` sitemaps |

**Order matters:** put least-specific mappings first; last match wins.

**Legacy URL redirects:** when `generateDocumentPath` sanitizes URLs differently from legacy paths, add redirects via a `redirects` spreadsheet or CDN rules. Use importer bulk report to capture old → new URL pairs.

Configure via [admin edit tool](https://tools.aem.live/tools/admin-edit/index.html) or Configuration Service API. Verify at `https://main--{repo}--{owner}.aem.page/config.json`.

---

## 4. Import Workflow (AEM Authoring / UE)

### Setup

```bash
npm install -g @adobe/aem-cli
aem import --no-open
```

Select **AEM Authoring** in the importer UI. Place transformation code at `tools/importer/import.js` (proxied at `http://localhost:3001/tools/importer/`).

### Workbench (single page test)

1. Paste source URL
2. Select **Save as JCR package**
3. Set **Content Import Path** under `/content/{site}/`
4. Set **Asset Import Path** under `/content/dam/{site}/`
5. Iterate `import.js` — changes hot-reload in Workbench
6. Inspect Preview and Markdown tabs

### import.js structure

```javascript
export default {
  transformDOM: ({ document, url }) => {
    const main = document.querySelector('main');
    WebImporter.DOMUtils.remove(main, ['header', 'footer', 'nav', '.cookie-banner']);
    createMetadataBlock(main, document);
    // per-template / per-component conversion rules
    return main;
  },

  generateDocumentPath: ({ url }) => {
    const path = new URL(url).pathname;
    return WebImporter.FileUtils.sanitizePath(path);
  },
};
```

### Bulk import

1. Crawl or paste URL list (Import → Bulk or Crawl tab)
2. Download Excel report (success, 404, redirects)
3. Batch large sites (60–100 pages per batch for heavy SPAs; disable JS if only markup needed)

### Upload to AEM

JCR packages are **binaryless** — assets are proxied. Use `asset-mapping.json` + [@adobe/aem-import-helper](https://github.com/adobe/aem-import-helper):

```bash
npm run aem-upload -- \
  --token token.txt \
  --zip /path/to/package.zip \
  --asset-mapping /path/to/asset-mapping.json \
  --target https://author-pxxx-exxx.adobeaemcloud.com
```

For automated xwalk pipeline imports, pass component JSON to the import helper:

```bash
npm run import -- \
  --urls urls.txt \
  --importjs tools/importer/import.js \
  --options '{"type":"xwalk","data":{"siteName":"mysite","assetFolder":"mysite"}}' \
  --models ./component-models.json \
  --filters ./component-filters.json \
  --definitions ./component-definition.json
```

---

## 5. Update Content After Import

### In Universal Editor

1. Open imported page → **Edit**
2. Verify blocks render and property panels match model fields
3. Fix gaps the importer missed (manual block add, image re-link)
4. **Publish → Preview** first, then Live

### After model or block structure changes

Existing imported pages may break if the content model contract changes:

```bash
npm run build:json    # after _{block}.json edits
npm run lint
```

Then either:
- Re-import affected pages with updated `import.js`, or
- Manually fix pages in UE, or
- Write a one-time migration script (last resort)

### After path mapping changes

1. Update path mapping in Configuration Service
2. Re-publish affected pages from UE
3. Verify public URLs at `*.aem.page`
4. Update redirects if public paths changed

### MSM / multi-locale migration

For localized sites, see [repoless MSM guide](https://www.aem.live/developer/repoless-multisite-manager):

- One `aem.live` site per locale MSM branch
- Separate path mapping per site (e.g. `/content/brand/ch/:/`)
- Shared GitHub code repo across locales

---

## 6. Validation

| Check | How |
|-------|-----|
| Block renders | `curl http://localhost:3000/path` and browser inspect |
| UE authoring | Open page in UE, edit each field, confirm live update |
| Path mapping | Compare AEM path vs public URL |
| Assets | Images load from `/assets/` or mapped DAM path |
| Redirects | Test legacy URLs → new paths |
| Performance | PageSpeed Insights on preview URL (target 100) |

---

## Essential Documentation

| Topic | URL |
|-------|-----|
| Importing content | https://www.aem.live/developer/importer |
| Importer guidelines (import.js) | https://github.com/adobe/helix-importer-ui/blob/main/importer-guidelines.md |
| Path mapping | https://www.aem.live/developer/authoring-path-mapping |
| Component models | https://www.aem.live/developer/component-model-definitions |
| Markup & blocks | https://www.aem.live/developer/markup-sections-blocks |
| Configuration templates | https://www.aem.live/docs/configuration-templates |
| MSM / multi-site | https://www.aem.live/developer/repoless-multisite-manager |
| AEM Import Helper | https://github.com/adobe/aem-import-helper |
| David's Model | https://www.aem.live/docs/davidsmodel |
