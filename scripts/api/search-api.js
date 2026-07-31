import fetchJson from './fetch-json.js';

/**
 * Builds a URL with query parameters.
 * @param {string} endpoint base API URL
 * @param {Record<string, string|number>} params query parameters
 * @returns {string}
 */
function buildApiUrl(endpoint, params = {}) {
  const url = new URL(endpoint, window.location.origin);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  });
  return url.toString();
}

/**
 * Converts a candidate navigation target into a safe same-origin path.
 * @param {string} value URL or path from search API/index data
 * @param {string} fallback fallback path when value is unsafe
 * @returns {string}
 */
export function toSafeSameOriginPath(value, fallback = '') {
  const candidate = String(value || '').trim();
  if (!candidate) return fallback;

  const isAbsoluteHttpUrl = /^https?:\/\//i.test(candidate);
  if (!candidate.startsWith('/') && !isAbsoluteHttpUrl) return fallback;
  if (candidate.startsWith('//')) return fallback;

  try {
    const url = new URL(candidate, window.location.origin);
    if (!['http:', 'https:'].includes(url.protocol)) return fallback;
    if (url.origin !== window.location.origin) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}

/**
 * Normalizes API items into a consistent search suggestion shape.
 * @param {object} item raw API item
 * @returns {{ label: string, value: string, path: string }}
 */
export function normalizeSearchItem(item) {
  if (typeof item === 'string') {
    return { label: item, value: item, path: '' };
  }

  const label = item.label || item.title || item.text || item.name || item.query || '';
  const value = item.value || item.query || label;
  const path = toSafeSameOriginPath(item.path || item.url || item.href || item.link || '');

  return { label, value, path };
}

/**
 * Extracts an array of items from common API response shapes.
 * @param {any} json API response
 * @returns {object[]}
 */
export function extractItems(json) {
  if (!json) return [];
  if (Array.isArray(json)) return json;
  if (Array.isArray(json.data)) return json.data;
  if (Array.isArray(json.results)) return json.results;
  if (Array.isArray(json.items)) return json.items;
  if (Array.isArray(json.suggestions)) return json.suggestions;
  return [];
}

/**
 * Fetches trending search items.
 * @param {string} endpoint trending API URL
 * @param {number} limit max items to request
 * @returns {Promise<Array<{ label: string, value: string, path: string }>>}
 */
export async function fetchTrendingItems(endpoint, limit = 5) {
  const json = await fetchJson(buildApiUrl(endpoint, { limit }));
  return extractItems(json).map(normalizeSearchItem).filter((item) => item.label);
}

/**
 * Fetches autosuggest items for a query.
 * @param {string} endpoint suggest API URL
 * @param {string} query user search query
 * @param {number} [limit] optional max items
 * @returns {Promise<Array<{ label: string, value: string, path: string }>>}
 */
export async function fetchSuggestions(endpoint, query, limit) {
  const params = { q: query, query };
  if (limit) params.limit = limit;

  const json = await fetchJson(buildApiUrl(endpoint, params));
  return extractItems(json).map(normalizeSearchItem).filter((item) => item.label);
}

/**
 * Fetches query index data for search results rendering.
 * @param {string} source query index URL
 * @returns {Promise<object[]|null>}
 */
export async function fetchQueryIndex(source) {
  const json = await fetchJson(source);
  if (!json) return null;
  return extractItems(json).map((item) => ({
    ...item,
    path: toSafeSameOriginPath(item.path || item.url || item.href || item.link || ''),
  }));
}
