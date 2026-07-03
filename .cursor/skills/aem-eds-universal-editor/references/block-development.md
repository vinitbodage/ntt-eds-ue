# Block Development for Universal Editor

Reference patterns from [aem-boilerplate-xwalk](https://github.com/adobe-rnd/aem-boilerplate-xwalk). Study similar blocks in the boilerplate before implementing.

## Pipeline: Author → HTML → Block JS

```
Universal Editor (component JSON) → AEM JCR → HTML table → Markdown → block div → decorate()
```

1. Author creates content in UE using component models
2. AEM stores JCR nodes; `Block.java` renders HTML table structure
3. `helix-html2md` converts to Markdown; pipeline converts to block div HTML
4. `blocks/<name>/<name>.js` `decorate(block)` transforms the DOM

Inspect at each stage:

```bash
curl http://localhost:3000/page          # rendered HTML
curl http://localhost:3000/page.md       # markdown
curl http://localhost:3000/page.plain.html
```

## File Checklist for a New Block

```
blocks/my-block/
  my-block.js       # export default async function decorate(block)
  my-block.css      # main .my-block { ... }
  _my-block.json    # definitions + models + filters
```

After creating `_my-block.json`:

```bash
npm run build:json
```

Add block `id` to `section` filter in `component-filters.json` (or in distributed config + central section filter).

## Block Types

| Type | Clue in JS | Config |
|------|-----------|--------|
| Simple | Single content area | 1 definition with `model` |
| Container | Iterates `block.children` | Container with `filter` + item definition |
| Key-value | Independent properties | `"key-value": true` in template |

## JavaScript Essentials

**Re-use DOM elements** delivered by the platform:

```javascript
export default async function decorate(block) {
  const picture = block.querySelector('picture');
  const heading = block.querySelector('h2');

  const wrapper = document.createElement('div');
  wrapper.className = 'my-block-content';
  if (heading) wrapper.append(heading);
  if (picture) {
    const figure = document.createElement('figure');
    figure.append(picture);
    wrapper.append(figure);
  }

  block.replaceChildren(wrapper);
}
```

**Handle missing fields** — authors may omit optional content.

**CSS-only variants** (e.g. `dark`, `wide`) need no JS; style with `main .my-block.dark`.

**JS variants** (e.g. `carousel`) need decoration logic when DOM structure differs.

## CSS Essentials

```css
main .my-block {
  padding: 1rem;
  max-width: var(--max-content-width);
}

@media (width >= 600px) {
  main .my-block { padding: 2rem; }
}

@media (width >= 900px) {
  main .my-block { flex-direction: row; }
}
```

- Scope every selector under `main .my-block`
- Use CSS custom properties from `styles.css`
- Mobile-first breakpoints: 600px, 900px, 1200px

## Distributed Config Example (_hero.json)

```json
{
  "definitions": [{
    "title": "Hero",
    "id": "hero",
    "plugins": {
      "xwalk": {
        "page": {
          "resourceType": "core/franklin/components/block/v1/block",
          "template": { "name": "Hero", "model": "hero" }
        }
      }
    }
  }],
  "models": [{
    "id": "hero",
    "fields": [
      { "component": "reference", "name": "image", "label": "Image", "valueType": "string" },
      { "component": "text", "name": "imageAlt", "label": "Alt", "valueType": "string" },
      { "component": "richtext", "name": "text", "label": "Text", "valueType": "string" }
    ]
  }],
  "filters": []
}
```

## Boilerplate Reference Blocks

Study these in [aem-boilerplate-xwalk/blocks](https://github.com/adobe-rnd/aem-boilerplate-xwalk/tree/main/blocks):

| Block | Pattern |
|-------|---------|
| hero | Simple block, image + richtext |
| cards | Container with child items |
| columns | Layout block |
| fragment | Experience fragment reference |
| embed | External URL embed |

Complex examples: search [xwalk PRs labeled Example](https://github.com/adobe-rnd/aem-boilerplate-xwalk/pulls?q=is%3Apr+label%3AExample).

## editor-support.js

When authors edit in UE, patches update `data-aue-resource` elements. `editor-support.js` re-runs decoration. If your block needs special UE behavior:

- Ensure `decorate()` is idempotent (safe to run multiple times)
- Avoid global event listeners that duplicate on re-decoration
- For RTE customization, extend `editor-support-rte.js`

## Testing

1. Create test content in CMS or `drafts/` static HTML
2. Run `aem up` and verify in browser
3. Open page in Universal Editor and edit properties — confirm live update
4. Run `npm run lint`
5. Check PageSpeed on feature preview URL

Invoke **testing-blocks** skill for full validation workflow.
