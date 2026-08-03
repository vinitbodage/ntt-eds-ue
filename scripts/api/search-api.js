import fetchJson from './fetch-json.js';

const MAX_SEARCH_TERM_LENGTH = 200;
const MAX_LABEL_LENGTH = 500;
const SAFE_QUERY_PARAM_PATTERN = /^[a-z][a-z0-9_-]*$/i;
const DEFAULT_SUGGEST_PATH = '/drafts/mock-suggest.json';
const ALLOWED_EXTERNAL_ORIGINS = new Set(['https://dummyjson.com']);

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
 * Allows same-origin or allowlisted external suggest API URLs.
 * @param {string} value URL or path from configuration
 * @param {string} fallback fallback when value is unsafe
 * @returns {string}
 */
export function toSafeSuggestFetchUrl(value, fallback = '') {
  const candidate = String(value || '').trim();
  if (!candidate) return fallback;

  const sameOrigin = toSafeSameOriginFetchUrl(candidate);
  if (sameOrigin) return sameOrigin;

  try {
    const url = new URL(candidate);
    if (!['http:', 'https:'].includes(url.protocol)) return fallback;
    if (!ALLOWED_EXTERNAL_ORIGINS.has(url.origin)) return fallback;
    return url.toString();
  } catch {
    return fallback;
  }
}

function isExternalUrl(url) {
  try {
    return new URL(url).origin !== window.location.origin;
  } catch {
    return false;
  }
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
 * @returns {{ label: string, value: string, path: string, meta?: string }}
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
  const meta = sanitizeLabel(item.category || item.brand || item.type || item.contentType || '');

  return {
    label, value, path, meta,
  };
}

/**
 * Normalizes a full search result record.
 * @param {object} item raw API item
 * @returns {{ title: string, description: string, path: string, image: string, meta?: string }}
 */
export function normalizeSearchResult(item) {
  if (!item || typeof item !== 'object') {
    return {
      title: '', description: '', path: '', image: '',
    };
  }

  return {
    title: sanitizeLabel(item.title || item.header || item.name || ''),
    description: sanitizeLabel(item.description || item.summary || item.excerpt || ''),
    path: toSafeSameOriginPath(item.path || item.url || item.href || item.link || ''),
    image: toSafeSameOriginPath(item.image || item.thumbnail || '', ''),
    meta: sanitizeLabel(item.category || item.type || ''),
  };
}

/**
 * Extracts an array of items from common API response shapes.
 * @param {any} json API response
 * @returns {object[]}
 */
export function extractItems(json) {
  if (!json) return [];
  if (Array.isArray(json)) return json;
  if (Array.isArray(json.products)) return json.products;
  if (Array.isArray(json.data)) return json.data;
  if (Array.isArray(json.results)) return json.results;
  if (Array.isArray(json.items)) return json.items;
  if (Array.isArray(json.suggestions)) return json.suggestions;
  if (Array.isArray(json.hits)) return json.hits;
  if (Array.isArray(json.content)) return json.content;
  return [];
}

/**
 * Client-side filter when mock APIs return the full catalog.
 * @param {object[]} results normalized results
 * @param {string} query search query
 * @returns {object[]}
 */
export function filterResultsByQuery(results, query) {
  const terms = sanitizeSearchTerm(query).toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return results;

  return results.filter((result) => {
    const haystack = `${result.title} ${result.description} ${result.path} ${result.meta || ''}`.toLowerCase();
    return terms.every((term) => haystack.includes(term));
  });
}

/**
 * Builds a search API URL with query parameters.
 * @param {string} endpoint base API URL
 * @param {Record<string, string|number>} params query parameters
 * @param {boolean} [allowExternal] allow allowlisted external URLs
 * @returns {string}
 */
function buildSearchApiUrl(endpoint, params = {}, allowExternal = false) {
  const safeEndpoint = allowExternal
    ? toSafeSuggestFetchUrl(endpoint, '')
    : toSafeSameOriginFetchUrl(endpoint, '');
  if (!safeEndpoint) return '';

  const url = new URL(safeEndpoint);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  });
  return url.toString();
}

/**
 * Fetches trending search items.
 * @param {string} endpoint trending API URL
 * @param {number} limit max items to request
 * @param {object} [options] optional locale
 * @returns {Promise<Array<{ label: string, value: string, path: string, meta?: string }>>}
 */
export async function fetchTrendingItems(endpoint, limit = 5, options = {}) {
  const safeEndpoint = toSafeSameOriginFetchUrl(endpoint);
  if (!safeEndpoint) return [];

  const params = { limit };
  if (options.locale) params.locale = options.locale;

  const url = buildSearchApiUrl(safeEndpoint, params);
  const json = await fetchJson(url);
  return extractItems(json).map(normalizeSearchItem).filter((item) => item.label);
}

/**
 * Fetches autosuggest items for a query.
 * @param {string} endpoint suggest API URL
 * @param {string} query user search query
 * @param {object} [options] queryParam, limit, locale
 * @returns {Promise<Array<{ label: string, value: string, path: string, meta?: string }>>}
 */
export async function fetchSuggestions(endpoint, query, options = {}) {
  const safeQuery = sanitizeSearchTerm(query);
  if (!safeQuery) return [];

  const queryParam = sanitizeSearchQueryParam(options.queryParam, 'q');
  const params = { [queryParam]: safeQuery };
  if (options.limit) params.limit = options.limit;
  if (options.locale) params.locale = options.locale;

  const url = buildSearchApiUrl(endpoint, params, true);
  if (!url) return [];

  const fetchOptions = isExternalUrl(url) ? { credentials: 'omit', mode: 'cors' } : undefined;
  const json = await fetchJson(url, fetchOptions);
  return extractItems(json).map(normalizeSearchItem).filter((item) => item.label);
}

/**
 * Fetches full search results from the NTT search API.
 * @param {string} endpoint results API URL
 * @param {string} query user search query
 * @param {object} [options] queryParam, limit, locale, filterLocally
 * @returns {Promise<object[]>}
 */
export async function fetchSearchResults(endpoint, query, options = {}) {
  const safeEndpoint = toSafeSameOriginFetchUrl(endpoint);
  if (!safeEndpoint) return [];

  const safeQuery = sanitizeSearchTerm(query);
  if (!safeQuery) return [];

  const queryParam = sanitizeSearchQueryParam(options.queryParam, 'q');
  const params = { [queryParam]: safeQuery };
  if (options.limit) params.limit = options.limit;
  if (options.locale) params.locale = options.locale;

  const url = buildSearchApiUrl(safeEndpoint, params);
  const json = await fetchJson(url);
  let results = extractItems(json)
    .map(normalizeSearchResult)
    .filter((item) => item.title || item.path);

  if (options.filterLocally !== false) {
    results = filterResultsByQuery(results, safeQuery);
  }

  return results;
}

/**
 * Fetches query index data for search results rendering (fallback).
 * @param {string} source query index URL
 * @returns {Promise<object[]|null>}
 */
export async function fetchQueryIndex(source) {
  const safeSource = toSafeSameOriginFetchUrl(source);
  if (!safeSource) return null;

  const json = await fetchJson(safeSource);
  if (!json) return null;
  return extractItems(json).map((item) => ({
    ...normalizeSearchResult(item),
    header: sanitizeLabel(item.header || item.title || ''),
  }));
}

export { DEFAULT_SUGGEST_PATH };
