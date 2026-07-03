# Cloud Manager and Universal Editor Setup

Based on the [UE Tutorial](https://www.aem.live/developer/ue-tutorial) and [AEM Authoring docs](https://www.aem.live/docs/aem-authoring).

## 1. Create Code Repository

1. Go to [aem-boilerplate-xwalk](https://github.com/adobe-rnd/aem-boilerplate-xwalk)
2. **Use this template** → Create a new repository
3. Clone locally: `git clone https://github.com/<owner>/<repo>`

For Commerce integration, use [aem-boilerplate-xcom](https://github.com/adobe-rnd/aem-boilerplate-xcom) instead.

## 2. Connect Code to AEM Content (fstab.yaml)

Edit `fstab.yaml` **before** installing AEM Code Sync:

```yaml
mountpoints:
  /:
    url: "https://<author-host>/bin/franklin.delivery/<org>/<site>/main"
```

- Replace with your AEM as a Cloud Service authoring instance URL
- Edge Delivery always references `fstab.yaml` from `main` branch initially
- After Code Sync configures the config service, `fstab.yaml` can be deleted
- To change content source later: https://tools.aem.live/tools/site-admin/index.html

## 3. Install AEM Code Sync

1. Navigate to https://github.com/apps/aem-code-sync → Configure
2. Select your GitHub org → **Only select repositories** → choose your repo → Save

Code Sync automatically:
- Adds org and site to Edge Delivery Configuration Service
- Sets primary GitHub email as admin
- Sets content source URL from `fstab.yaml`

If admin setup fails, use https://labs.aem.live/tools/user-admin/index.html to add your AEM user email as **Admin**.

## 4. Create AEM Site

1. Download site template from [xwalk releases](https://github.com/adobe-rnd/aem-boilerplate-xwalk/releases)
2. In AEM Sites console: **Create → Site from template → Import** the template
3. Provide:
   - **Site title** — descriptive name
   - **Site name** — URL-safe name
   - **Project URL** — `https://main--<repo>--<owner>.aem.page`
4. Open `index.html` → **Edit** → Universal Editor opens

## 5. Technical Account (Publishing)

1. AEM → **Tools → Cloud Services → Edge Delivery Services Configuration**
2. Open your site's configuration → **Authentication** tab
3. Copy the technical account ID (e.g. `...@techacct.adobe.com`)
4. In https://tools.aem.live/tools/user-admin/index.html:
   - Ensure your email is listed as Admin first
   - Add technical account with **Config Admin** role

## 6. First Publish

1. In Universal Editor, click **Publish**
2. Select **Preview** as destination → Publish
3. Verify at `https://main--<repo>--<owner>.aem.page`

## 7. Start Local Development

```bash
npm install -g @adobe/aem-cli
cd <repo>
npm install
aem up --no-open --forward-browser-logs
```

## Authoring Workflow Summary

```
AEM Sites Console          Universal Editor              Edge Delivery
(create pages, MSM,         (author blocks,               (*.aem.page preview,
 workflows, launches)        configure properties)         *.aem.live production)
        │                            │                              │
        └──────── content in AEM ────┴──── publish to EDS ─────────┘
```

AEM renders semantic HTML with EDS scripts/styles. UE patches are persisted to AEM JCR, then published to Edge Delivery for delivery at 100 performance score.
