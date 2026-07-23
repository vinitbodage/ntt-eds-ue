# da.live Universal Editor — Feature Card

This project supports AEM Universal Editor (xwalk) for all blocks, and da.live document editing for the **Feature Card** block only.

| Editor | Content source | Component plugin | Scope |
|--------|----------------|------------------|-------|
| AEM Universal Editor | AEM author (`fstab.yaml`) | `plugins.xwalk` in `models/` + `blocks/*/_*.json` | All blocks |
| da.live Universal Editor | Author Bus (`fstab.da.yaml`) | `plugins.da` in `ue/models/` | Feature Card only |

Both plugins are merged into the root `component-*.json` files at build time.

## Setup

1. Provision the site at [da.live/start](https://da.live/start) for org `vinitbodage` and site `ntt-eds-ue`.
2. For da.live deployments, use `fstab.da.yaml` as the content mountpoint.
3. Edit content at [da.live](https://da.live) or open WYSIWYG UE at `https://main--ntt-eds-ue--vinitbodage.ue.da.live/`.

## Adding da.live support to another block

1. Create `ue/models/blocks/{name}.json` with the `da` plugin.
2. Register it in `ue/models/component-definition.json`, `component-models.json`, and add to `ue/models/section.json` filters if needed.
3. Run `npm run build:json && npm run lint`.

See https://docs.da.live/developers/reference/universal-editor for da plugin field mapping.
