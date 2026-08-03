# NTT Search API integration

This document describes how the EDS Search block and header overlay connect to NTT search services.

## Recommended deployment (same-origin proxy)

Browsers should call **same-origin** URLs only. Map these paths in AEM Config Service / `fstab.yaml` to the real NTT backend (BFF or API gateway). Do not commit API keys.

| Public path (EDS) | Purpose | Query params |
|-------------------|---------|--------------|
| `/api/search/trending` | Trending queries | `limit`, optional `locale` |
| `/api/search/suggest` | Autosuggest / typeahead | `q` (or `suggestQueryParam`), `limit`, optional `locale` |
| `/api/search/results` | Full search results | `q` (or `resultsQueryParam`), `limit`, optional `locale` |

Configure production URLs via [`placeholders.json`](../placeholders.json) or the Search block fields in Universal Editor.

## Response shapes (normalized client-side)

The client normalizes several JSON shapes in [`scripts/api/search-api.js`](../scripts/api/search-api.js).

### Trending / suggest (list endpoints)

```json
{
  "data": [
    { "label": "Cloud Services", "value": "cloud services", "path": "/services/cloud", "category": "Services" }
  ]
}
```

Also supported top-level arrays: `results`, `items`, `suggestions`, `products`.

### Search results

```json
{
  "results": [
    {
      "title": "Cloud-led innovation",
      "description": "Short summary text",
      "path": "/insights/cloud-innovation",
      "image": "/path/to/image.jpg",
      "category": "Insight"
    }
  ]
}
```

Fields mapped to UI: `title` | `header`, `description`, `path` | `url` | `href`, `image`, `category` → meta.

## Local development mocks

| File | Used for |
|------|----------|
| [`drafts/mock-trending.json`](../drafts/mock-trending.json) | Trending |
| [`drafts/mock-suggest.json`](../drafts/mock-suggest.json) | Autosuggest |
| [`drafts/mock-search-results.json`](../drafts/mock-search-results.json) | Results (client-side term filter when `q` is present) |

## Locale

Optional `locale` field on the Search block or `searchLocale` in placeholders (e.g. `global/en`). Passed as `locale` query param when set.

## CORS

Direct calls to third-party origins are restricted. Extend `ALLOWED_EXTERNAL_ORIGINS` in `search-api.js` only when NTT exposes CORS-enabled public endpoints; otherwise use the proxy paths above.
