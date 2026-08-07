import {
  toSafeSameOriginFetchUrl,
  toSafeSameOriginPath,
  toSafeSuggestFetchUrl,
} from '../api/search-api.js';
import { DEFAULTS } from '../../blocks/search/search-config.js';

/**
 * Fills empty config values from placeholders (site-wide defaults).
 * @param {object} config partial search config
 * @param {object} placeholders placeholders object
 * @returns {object}
 */
export function mergeSearchConfigFromPlaceholders(config, placeholders = {}) {
  const merged = { ...config };

  if (!merged.resultPageUrl && placeholders.searchResultsPage) {
    merged.resultPageUrl = toSafeSameOriginPath(placeholders.searchResultsPage, '');
  }
  if (!merged.trendingApiEndpoint && placeholders.searchTrendingApi) {
    merged.trendingApiEndpoint = toSafeSameOriginFetchUrl(placeholders.searchTrendingApi, '');
  }
  if (!merged.suggestApiEndpoint && placeholders.searchSuggestApi) {
    merged.suggestApiEndpoint = toSafeSuggestFetchUrl(
      placeholders.searchSuggestApi,
      DEFAULTS.suggestApiEndpoint,
    );
  }
  if (!merged.resultsApiEndpoint && placeholders.searchResultsApi) {
    merged.resultsApiEndpoint = toSafeSameOriginFetchUrl(placeholders.searchResultsApi, '');
  }
  if (!merged.locale && placeholders.searchLocale) {
    merged.locale = String(placeholders.searchLocale).trim();
  }

  return merged;
}

/**
 * Default config for the header search overlay (no authored block).
 * @param {object} placeholders placeholders object
 * @returns {object}
 */
export function buildOverlaySearchConfig(placeholders = {}) {
  return mergeSearchConfigFromPlaceholders({
    recentSearchLimit: DEFAULTS.recentSearchLimit,
    trendingLimit: DEFAULTS.trendingLimit,
    searchQueryParam: DEFAULTS.searchQueryParam,
    suggestQueryParam: DEFAULTS.suggestQueryParam,
    resultsQueryParam: DEFAULTS.resultsQueryParam,
    queryIndexSource: DEFAULTS.queryIndexSource,
    suggestApiEndpoint: DEFAULTS.suggestApiEndpoint,
    resultPageUrl: '',
    resultsApiEndpoint: '',
    trendingApiEndpoint: '',
    locale: '',
  }, placeholders);
}
