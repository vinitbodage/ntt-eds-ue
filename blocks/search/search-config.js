import {
  sanitizeSearchQueryParam,
  sanitizeSearchTerm,
  toSafeSameOriginFetchUrl,
  toSafeSameOriginPath,
  toSafeSuggestFetchUrl,
  DEFAULT_SUGGEST_PATH,
} from '../../scripts/api/search-api.js';

const DEFAULTS = {
  recentSearchLimit: 3,
  trendingLimit: 5,
  searchQueryParam: 'q',
  suggestQueryParam: 'q',
  resultsQueryParam: 'q',
  queryIndexSource: '/query-index.json',
  suggestApiEndpoint: DEFAULT_SUGGEST_PATH,
};

const MAX_LIST_LIMIT = 50;

const CONFIG_KEY_ALIASES = {
  resultpageurl: 'resultPageUrl',
  searchresultspage: 'resultPageUrl',
  queryindexsource: 'queryIndexSource',
  queryindex: 'queryIndexSource',
  resultsapiendpoint: 'resultsApiEndpoint',
  searchresultsapi: 'resultsApiEndpoint',
  trendingapiendpoint: 'trendingApiEndpoint',
  trendinglimit: 'trendingLimit',
  recentsearchlimit: 'recentSearchLimit',
  suggestapiendpoint: 'suggestApiEndpoint',
  autosuggestapiendpoint: 'suggestApiEndpoint',
  searchqueryparam: 'searchQueryParam',
  suggestqueryparam: 'suggestQueryParam',
  resultsqueryparam: 'resultsQueryParam',
  locale: 'locale',
};

function normalizeConfigKey(key) {
  return key.trim().toLowerCase().replace(/[\s_-]+/g, '');
}

function readFieldText(field) {
  if (!field) return '';
  const link = field.querySelector('a[href]');
  if (link) return link.href;
  return field.textContent.trim();
}

function readFieldNumber(field, fallback, max = MAX_LIST_LIMIT) {
  const value = Number.parseInt(readFieldText(field), 10);
  if (!Number.isFinite(value) || value <= 0) return fallback;
  return Math.min(value, max);
}

function readKeyValueConfig(block) {
  const config = {};
  [...block.children].forEach((row) => {
    const cells = [...row.children];
    if (cells.length < 2) return;
    const key = cells[0].textContent.trim();
    const value = readFieldText(cells[1]);
    if (!key || !value) return;

    const configKey = CONFIG_KEY_ALIASES[normalizeConfigKey(key)];
    if (!configKey) return;

    if (configKey === 'trendingLimit' || configKey === 'recentSearchLimit') {
      config[configKey] = Number.parseInt(value, 10);
    } else {
      config[configKey] = value;
    }
  });
  return config;
}

function readProp(block, name, keyValueConfig) {
  return readFieldText(block.querySelector(`[data-aue-prop="${name}"]`))
    || keyValueConfig[name]
    || '';
}

/**
 * Reads authored search block configuration.
 * @param {Element} block search block element
 * @returns {object} search configuration
 */
export default function readSearchConfig(block) {
  const keyValueConfig = readKeyValueConfig(block);

  const config = {
    resultPageUrl: readProp(block, 'resultPageUrl', keyValueConfig)
      || readFieldText(block.querySelector('[data-aue-prop="searchUrl"]')),
    queryIndexSource: readProp(block, 'queryIndexSource', keyValueConfig) || DEFAULTS.queryIndexSource,
    resultsApiEndpoint: readProp(block, 'resultsApiEndpoint', keyValueConfig),
    trendingApiEndpoint: readProp(block, 'trendingApiEndpoint', keyValueConfig),
    trendingLimit: readFieldNumber(
      block.querySelector('[data-aue-prop="trendingLimit"]'),
      keyValueConfig.trendingLimit || DEFAULTS.trendingLimit,
    ),
    recentSearchLimit: readFieldNumber(
      block.querySelector('[data-aue-prop="recentSearchLimit"]'),
      keyValueConfig.recentSearchLimit || DEFAULTS.recentSearchLimit,
    ),
    suggestApiEndpoint: readProp(block, 'suggestApiEndpoint', keyValueConfig) || DEFAULTS.suggestApiEndpoint,
    searchQueryParam: readProp(block, 'searchQueryParam', keyValueConfig) || DEFAULTS.searchQueryParam,
    suggestQueryParam: readProp(block, 'suggestQueryParam', keyValueConfig) || DEFAULTS.suggestQueryParam,
    resultsQueryParam: readProp(block, 'resultsQueryParam', keyValueConfig) || DEFAULTS.resultsQueryParam,
    locale: readProp(block, 'locale', keyValueConfig),
  };

  return {
    ...config,
    resultPageUrl: toSafeSameOriginPath(config.resultPageUrl, ''),
    queryIndexSource: toSafeSameOriginFetchUrl(config.queryIndexSource, DEFAULTS.queryIndexSource),
    resultsApiEndpoint: toSafeSameOriginFetchUrl(config.resultsApiEndpoint, ''),
    trendingApiEndpoint: toSafeSameOriginFetchUrl(config.trendingApiEndpoint, ''),
    suggestApiEndpoint: toSafeSuggestFetchUrl(
      config.suggestApiEndpoint,
      DEFAULTS.suggestApiEndpoint,
    ),
    searchQueryParam: sanitizeSearchQueryParam(
      config.searchQueryParam,
      DEFAULTS.searchQueryParam,
    ),
    suggestQueryParam: sanitizeSearchQueryParam(
      config.suggestQueryParam,
      DEFAULTS.suggestQueryParam,
    ),
    resultsQueryParam: sanitizeSearchQueryParam(
      config.resultsQueryParam,
      DEFAULTS.resultsQueryParam,
    ),
    locale: sanitizeSearchTerm(config.locale).slice(0, 100),
    trendingLimit: Math.min(config.trendingLimit || DEFAULTS.trendingLimit, MAX_LIST_LIMIT),
    recentSearchLimit: Math.min(
      config.recentSearchLimit || DEFAULTS.recentSearchLimit,
      MAX_LIST_LIMIT,
    ),
  };
}

export { DEFAULTS };
