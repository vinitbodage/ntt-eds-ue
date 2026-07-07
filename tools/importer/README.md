# NTT Site Migration (Generic Importer)

Content imported from [nttdata.com/global/en](https://www.nttdata.com/global/en/) (or other NTT properties) using class-token selectors in `import.js`.

## Block mapping

Selectors follow Helix Importer + UE model contracts. Block `name` values match `id` in `_{block}.json`.

| Source pattern | EDS block | Imported table structure |
|----------------|-----------|---------------------------|
| `[class*="mainvisual"]`, `[class*="banner-container"]` | `hero-banner` | 4 rows: title, description, link, images (`ul>li>picture`) |
| `c-Ncolumn` / `c-Ncolumn-tab` grids | `columns` | 1 row per grid row, N cells per row |
| `[class*="p-panel"]` | `cards` | 1 row per card: `[image, richtext]` |
| `p-block` (no nested panels/columns) | default content | heading + paragraphs + link |

## Style import

`REQUIRED_STYLES` inlines computed CSS during transform (per [importer guidelines](https://github.com/adobe/helix-importer-ui/blob/main/importer-guidelines.md)). Use the Importer UI **Eyedropper** to capture full theme CSS for `styles/styles.css`.

## Local preview

```bash
npm run dev
```

Open: http://localhost:3000/drafts/en-us

## Import UI (interactive)

```bash
npm run import:ui
```

Open: http://localhost:3001/tools/importer/helix-importer-ui/index.html

1. Select **AEM Authoring**
2. Content Import Path: `/content/ntt-eds-ue/global/en`
3. Asset Import Path: `/content/dam/ntt-eds-ue`
4. Import URL: `https://www.nttdata.com/global/en/`
5. Uses `tools/importer/import.js` for block transformation

## Import as a Service (batch)

Requires `AEM_IMPORT_API_KEY` in `.env`.

```bash
npm run import:service
```

## Path mapping (after import)

```json
{
  "paths": {
    "mappings": ["/content/ntt-eds-ue/global/en/:/global/en/"],
    "includes": ["/content/ntt-eds-ue/", "/content/dam/ntt-eds-ue/"],
    "excludes": ["/content/ntt-eds-ue/**/drafts/**"]
  }
}
```

Configure at https://tools.aem.live/tools/admin-edit/index.html
