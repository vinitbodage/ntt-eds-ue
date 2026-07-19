# Document Authoring & Universal Editor

This branch uses [Document Authoring (da.live)](https://da.live/docs) as the content source. Component models live in `ue/models/` and use the `da` plugin.

## Setup

1. Provision the site at [da.live/start](https://da.live/start) for org `vinitbodage` and site `ntt-eds-ue`.
2. Push this branch and use the feature preview URL: `https://feature-document-authoring--ntt-eds-ue--vinitbodage.aem.page/`
3. Edit content at [da.live](https://da.live) or via Sidekick **Document Authoring**.

After editing model partials in `ue/models/`, run:

```sh
npm run build:json
npm run lint
```

See https://github.com/adobe/da-live/wiki/Universal-Editor for UE instrumentation details.
