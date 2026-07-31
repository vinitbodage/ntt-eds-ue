import fetchJson from './fetch-json.js';

const MAX_SEARCH_TERM_LENGTH = 200;
const MAX_LABEL_LENGTH = 500;
const SAFE_QUERY_PARAM_PATTERN = /^[a-z][a-z0-9_-]*$/i;

/**
 * Validates and normalizes a URL search parameter name.
 * @param {string} param candidate parameter name
 * @param {string} fallback fallback when invalid
 * @returns {string}
 */
export function sanitizeSearchQueryParam(param, fallback = 'q') {
  const candidate = String(param || '').trim();
  return SAFE_QUERY_PARAM_PATTERN.test(candidate) ? candidate : fallback;
}

/**
 * Strips control characters and enforces a max length on search terms.
 * @param {string} term user or API-provided search term
 * @param {number} [maxLength] max allowed length
 * @returns {string}
 */
export function sanitizeSearchTerm(term, maxLength = MAX_SEARCH_TERM_LENGTH) {
  if (term == null || term === '') return '';
  const cleaned = String(term)
    .split('')
    .filter((char) => {
      const code = char.charCodeAt(0);
      return code >= 32 && code !== 127;
    })
    .join('')
    .trim();
  return cleaned.slice(0, maxLength);
}

/**
 * Restricts fetch targets to the current origin.
 * @param {string} value URL or path from configuration
 * @param {string} fallback fallback when value is unsafe
 * @returns {string}
 */
export function toSafeSameOriginFetchUrl(value, fallback = '') {
  const candidate = String(value || '').trim();
  if (!candidate) return fallback;

  try {
    const url = new URL(candidate, window.location.origin);
    if (!['http:', 'https:'].includes(url.protocol)) return fallback;
    if (url.origin !== window.location.origin) return fallback;
    return url.toString();
  } catch {
    return fallback;
  }
}

/**
 * Builds a URL with query parameters.
 * @param {string} endpoint base API URL
 * @param {Record<string, string|number>} params query parameters
 * @returns {string}
 */
function buildApiUrl(endpoint, params = {}) {
  const safeEndpoint = toSafeSameOriginFetchUrl(endpoint);
  if (!safeEndpoint) return '';

  const url = new URL(safeEndpoint);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  });
  return url.toString();
}

function sanitizeLabel(value) {
  return sanitizeSearchTerm(value, MAX_LABEL_LENGTH);
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
    const label = sanitizeLabel(item);
    return { label, value: label, path: '' };
  }

  if (!item || typeof item !== 'object') {
    return { label: '', value: '', path: '' };
  }

  const label = sanitizeLabel(
    item.label || item.title || item.text || item.name || item.query || '',
  );
  const value = sanitizeLabel(item.value || item.query || label);
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
  const url = buildApiUrl(endpoint, { limit });
  if (!url) return [];

  const json = await fetchJson(url);
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
  const safeQuery = sanitizeSearchTerm(query);
  if (!safeQuery) return [];

  const params = { q: safeQuery, query: safeQuery };
  if (limit) params.limit = limit;

  const url = buildApiUrl(endpoint, params);
  if (!url) return [];

  const json = await fetchJson(url);
  return extractItems(json).map(normalizeSearchItem).filter((item) => item.label);
}

/**
 * Fetches query index data for search results rendering.
 * @param {string} source query index URL
 * @returns {Promise<object[]|null>}
 */
export async function fetchQueryIndex(source) {
  const safeSource = toSafeSameOriginFetchUrl(source);
  if (!safeSource) return null;

  const json = await fetchJson(safeSource);
  if (!json) return null;
  return extractItems(json).map((item) => ({
    ...item,
    title: sanitizeLabel(item.title || item.header || ''),
    description: sanitizeLabel(item.description || ''),
    path: toSafeSameOriginPath(item.path || item.url || item.href || item.link || ''),
    image: toSafeSameOriginPath(item.image || '', ''),
  }));
}
