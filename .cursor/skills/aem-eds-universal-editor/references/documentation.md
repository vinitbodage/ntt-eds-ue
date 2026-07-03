# Searching aem.live Documentation

Official documentation: [https://www.aem.live/docs/](https://www.aem.live/docs/)

## Search Methods

### Method 1: Skill search script (preferred)

```bash
node .cursor/skills/aem-eds-universal-editor/scripts/search-docs.js <keyword1> [keyword2]
node .cursor/skills/aem-eds-universal-editor/scripts/search-docs.js --all universal editor
```

Results include `path`, `title`, `description`, `snippet`, and `relevanceScore`.

Fetch full content: `https://www.aem.live{path}`

### Method 2: docs-search skill

When the docs-search skill is installed:

```bash
node .claude/skills/docs-search/scripts/search.js universal editor
node .claude/skills/docs-search/scripts/search.js component model definitions
```

### Method 3: docpages-index.json

```bash
curl -s https://www.aem.live/docpages-index.json
```

Filter with jq or node for keywords:

```bash
curl -s https://www.aem.live/docpages-index.json | node -e "
let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{
  const re=new RegExp(process.argv[1]||'block','i');
  JSON.parse(d).data.filter(p=>re.test(p.title+p.path+(p.content||'').slice(0,500)))
    .sort((a,b)=>(b.relevanceScore||0)-(a.relevanceScore||0))
    .slice(0,10).forEach(p=>console.log(p.path+': '+p.title));
})" "component model"
```

### Method 4: Web search

Restrict to official docs:

```
site:www.aem.live universal editor blocks
site:www.aem.live component model definitions
```

## Key Documentation by Task

| Task | Start here |
|------|-----------|
| Project setup | /developer/ue-tutorial |
| AEM authoring overview | /docs/aem-authoring |
| Component models | /developer/component-model-definitions |
| Block markup | /developer/markup-sections-blocks, /developer/markup-reference |
| Path mapping | /developer/authoring-path-mapping |
| Performance | /developer/keeping-it-100 |
| Project anatomy | /developer/anatomy-of-a-project |
| Developer tutorial | /developer/tutorial |
| David's Model | /docs/davidsmodel |
| AI agent tips | /developer/ai-coding-agents |
| xwalk ESLint rules | https://github.com/adobe-rnd/eslint-plugin-xwalk |

## Deprecation Warnings

If search results include a `deprecation` field, **inform the user** and prefer non-deprecated alternatives. Example: folder mapping is deprecated in favor of path mapping.

## Code Examples vs Documentation

- **Documentation** (this guide): concepts, setup, best practices → aem.live/docs
- **Code examples**: block implementations → [aem-boilerplate-xwalk](https://github.com/adobe-rnd/aem-boilerplate-xwalk) and **block-collection-and-party** skill
