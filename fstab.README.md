# Content mountpoints (fstab)

| File | Content source | Use when |
|------|----------------|----------|
| `fstab.yaml` | [Author Bus](https://content.da.live/vinitbodage/ntt-eds-ue/) | da.live document authoring and da.live UE (default) |
| `fstab.aem.yaml` | AEM author | AEM Universal Editor (xwalk) only |

Copy the appropriate file to `fstab.yaml` before deploying, or configure the content mount in [AEM Config Service](https://admin.aem.live/config/vinitbodage/sites/ntt-eds-ue.json).

**Preview error fix:** If da.live preview fails with `not authorized` against an `adobeaemcloud.com` URL, `fstab.yaml` is still pointing at AEM author instead of Author Bus.
