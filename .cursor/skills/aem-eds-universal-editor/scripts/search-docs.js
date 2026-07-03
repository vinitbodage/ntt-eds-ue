#!/usr/bin/env node

/**
 * Search aem.live documentation index.
 * Usage: node search-docs.js [--all] <keyword1> [keyword2...]
 */

import https from 'https';

const INDEX_URL = 'https://www.aem.live/docpages-index.json';
const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
  'aem', 'cms', 'edge', 'delivery', 'services',
]);

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'AEM-EDS-UE-Skill/1.0' } }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (err) {
          reject(err);
        }
      });
    }).on('error', reject);
  });
}

function scorePage(page, keywords) {
  const title = page.title || '';
  const path = page.path || '';
  const description = page.description || '';
  const content = (page.content || '').slice(0, 2000);
  const haystack = `${title} ${path} ${description} ${content}`.toLowerCase();

  let score = 0;
  keywords.forEach((kw) => {
    const regex = new RegExp(kw, 'gi');
    const titleMatches = (title.match(regex) || []).length;
    const descMatches = (description.match(regex) || []).length;
    const contentMatches = (content.match(regex) || []).length;
    score += titleMatches * 10 + descMatches * 5 + contentMatches;
    if (!haystack.includes(kw)) score -= 5;
  });

  if (page.deprecation) score *= 0.5;
  return score;
}

function snippet(page, keywords) {
  const content = page.content || page.description || '';
  const lower = content.toLowerCase();
  const kw = keywords.find((k) => lower.includes(k)) || keywords[0];
  const idx = lower.indexOf(kw);
  if (idx < 0) return (page.description || '').slice(0, 120);
  const start = Math.max(0, idx - 60);
  return `...${content.slice(start, start + 160).replace(/\s+/g, ' ').trim()}...`;
}

async function main() {
  const args = process.argv.slice(2);
  const showAll = args[0] === '--all';
  const keywords = (showAll ? args.slice(1) : args)
    .map((k) => k.toLowerCase().trim())
    .filter((k) => k && !STOP_WORDS.has(k));

  if (!keywords.length) {
    console.error('Usage: node search-docs.js [--all] <keyword1> [keyword2...]');
    process.exit(1);
  }

  const { data } = await fetchJson(INDEX_URL);
  const results = data
    .map((page) => ({ page, score: scorePage(page, keywords) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score);

  const limit = showAll ? results.length : 10;
  results.slice(0, limit).forEach(({ page, score }) => {
    console.log(JSON.stringify({
      path: page.path,
      title: page.title,
      description: page.description,
      relevanceScore: Math.round(score),
      snippet: snippet(page, keywords),
      deprecation: page.deprecation || undefined,
      url: `https://www.aem.live${page.path}`,
    }));
  });

  if (!results.length) {
    console.error(`No results for: ${keywords.join(', ')}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
