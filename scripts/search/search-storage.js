const RECENT_SEARCHES_KEY = 'search-recent-searches';
const TRENDING_CACHE_KEY = 'search-trending-cache';

function readStorage(storage, key) {
  try {
    const raw = storage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeStorage(storage, key, value) {
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore quota or privacy mode errors
  }
}

/**
 * Returns recent searches from localStorage.
 * @returns {string[]}
 */
export function getRecentSearches() {
  return readStorage(localStorage, RECENT_SEARCHES_KEY) || [];
}

/**
 * Adds a search term to recent searches.
 * @param {string} term search term
 * @param {number} limit max stored items
 */
export function addRecentSearch(term, limit = 3) {
  const trimmed = term?.trim();
  if (!trimmed) return;

  const recent = getRecentSearches().filter((item) => item.toLowerCase() !== trimmed.toLowerCase());
  recent.unshift(trimmed);
  writeStorage(localStorage, RECENT_SEARCHES_KEY, recent.slice(0, limit));
}

/**
 * Builds a cache key for trending items.
 * @param {string} endpoint API endpoint
 * @param {number} limit item limit
 * @returns {string}
 */
function getTrendingCacheKey(endpoint, limit) {
  return `${endpoint}::${limit}`;
}

/**
 * Reads cached trending items from sessionStorage.
 * @param {string} endpoint API endpoint
 * @param {number} limit item limit
 * @returns {Array<{ label: string, value: string, path: string }>|null}
 */
export function getTrendingFromCache(endpoint, limit) {
  const cache = readStorage(sessionStorage, TRENDING_CACHE_KEY);
  if (!cache) return null;
  return cache[getTrendingCacheKey(endpoint, limit)] || null;
}

/**
 * Stores trending items in sessionStorage.
 * @param {string} endpoint API endpoint
 * @param {number} limit item limit
 * @param {Array<{ label: string, value: string, path: string }>} items trending items
 */
export function setTrendingCache(endpoint, limit, items) {
  const cache = readStorage(sessionStorage, TRENDING_CACHE_KEY) || {};
  cache[getTrendingCacheKey(endpoint, limit)] = items;
  writeStorage(sessionStorage, TRENDING_CACHE_KEY, cache);
}
