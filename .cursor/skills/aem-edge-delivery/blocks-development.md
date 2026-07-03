# Block Development Guide

Reference implementation: [aem-boilerplate-xwalk](https://github.com/adobe-rnd/aem-boilerplate-xwalk)

Official docs:
- [Universal Editor blocks](https://www.aem.live/developer/universal-editor-blocks)
- [Markup, sections, blocks](https://www.aem.live/developer/markup-sections-blocks)
- [Content modeling](https://www.aem.live/developer/component-model-definitions)

---

## 1. Plan the content contract

Before writing code, define what authors provide and how it maps to initial HTML.

Each block receives a table-like DOM structure: rows (`div`) and cells (`div`) generated from the UE model. The **initial structure is the contract** — changing it later can break authored pages.

Inspect real markup:

```bash
curl -s http://localhost:3000/your-page.plain.html
```

Log `block.innerHTML` in `decorate()` during development.

---

## 2. Scaffold the block

Create `blocks/{blockname}/`:

```
blocks/teaser/
  teaser.js
  teaser.css
  _teaser.json
```

### Simple block model (single item)

Use when the block has fixed fields (e.g. hero):

```json
{
  "definitions": [{
    "title": "Teaser",
    "id": "teaser",
    "plugins": {
      "xwalk": {
        "page": {
          "resourceType": "core/franklin/components/block/v1/block",
          "template": {
            "name": "Teaser",
            "model": "teaser"
          }
        }
      }
    }
  }],
  "models": [{
    "id": "teaser",
    "fields": [
      { "component": "reference", "valueType": "string", "name": "image", "label": "Image", "multi": false },
      { "component": "text", "valueType": "string", "name": "imageAlt", "label": "Alt", "value": "" },
      { "component": "richtext", "name": "text", "value": "", "label": "Text", "valueType": "string" }
    ]
  }],
  "filters": []
}
```

### Collection block (repeatable items)

Use when authors add multiple rows (e.g. cards):

1. **Container definition** — references a filter
2. **Item definition** — `block/item` resource type with its own model
3. **Filter** — lists allowed item component IDs

See `blocks/cards/_cards.json` in this repo for a working example.

---

## 3. Register in component definitions

Block definitions are picked up via glob in `models/_component-definition.json`:

```json
{
  "...": "../blocks/*/_*.json#/definitions"
}
```

If using a non-standard path, add an explicit entry.

Run:

```bash
npm run build:json
npm run lint
```

---

## 4. Write the decorate function

### Pattern: transform table DOM to semantic structure

```javascript
import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

export default function decorate(block) {
  const ul = document.createElement('ul');
  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    moveInstrumentation(row, li);
    while (row.firstElementChild) li.append(row.firstElementChild);
    ul.append(li);
  });
  block.replaceChildren(ul);
}
```

### Rules

- **Preserve UE instrumentation** — use `moveInstrumentation(oldNode, newNode)` when moving/replacing elements
- **Handle optional fields** — authors may omit images, text, etc.
- **Optimize images** — `createOptimizedPicture(src, alt, eager, breakpoints)`
- **Self-contained** — block logic stays in `blocks/{name}/`
- **No global CSS selectors** — scope to `.{blockname}` (e.g. `.cards .cards-card-body`)

### CSS conventions

```css
/* Good */
.cards ul { ... }
.cards .cards-card-image { ... }

/* Bad — unscoped */
.item-list { ... }

/* Avoid — reserved for sections */
.cards-container { ... }
```

Mobile-first media queries at `600px`, `900px`, `1200px`.

---

## 5. Test locally

### With CMS content

```bash
npx -y @adobe/aem-cli up --no-open --forward-browser-logs
```

### Without CMS content

Create `drafts/test-teaser.html` with AEM markup structure, then:

```bash
npx -y @adobe/aem-cli up --no-open --html-folder drafts
```

Verify:
- [ ] Decoration produces expected DOM
- [ ] Responsive layout at all breakpoints
- [ ] Images have alt text
- [ ] Heading hierarchy is correct
- [ ] Keyboard/screen reader accessibility

---

## 6. Universal Editor preview

After pushing to a feature branch:

1. Open `https://{branch}--{repo}--{owner}.aem.page/your-page`
2. Edit block properties in UE — confirm `editor-support.js` re-decorates correctly
3. Add/remove repeatable items (collection blocks)
4. Publish preview and verify live decoration

If UE patches fail to re-render, check:
- `data-aue-resource` attributes preserved via `moveInstrumentation`
- Block name in model matches folder name
- `decorate()` is idempotent (safe to run twice)

---

## 7. Performance checklist

- Keep eager-phase JS minimal for above-the-fold blocks
- Defer non-critical logic with dynamic `import()`
- Put heavy styles in block CSS (auto code-split per block)
- Global post-LCP styles → `styles/lazy-styles.css`
- Target Lighthouse 100: [keeping-it-100](https://www.aem.live/developer/keeping-it-100)

---

## 8. Example blocks in boilerplate-xwalk

Study these in the GitHub repo before inventing new patterns:

| Block | Pattern |
|-------|---------|
| `hero` | Single-model block with image + richtext |
| `cards` | Container + item + filter |
| `columns` | Layout block |
| `fragment` | Content reuse |
| `header` / `footer` | Global blocks (lazy-loaded) |

Example PRs with complex patterns:
https://github.com/adobe-rnd/aem-boilerplate-xwalk/pulls?q=is%3Aopen+is%3Apr+label%3AExample
