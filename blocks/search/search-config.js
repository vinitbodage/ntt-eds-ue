const DEFAULTS = {
  recentSearchLimit: 3,
  trendingLimit: 5,
  searchQueryParam: 'q',
  queryIndexSource: '/query-index.json',
};

function readFieldText(field) {
  if (!field) return '';
  const link = field.querySelector('a[href]');
  if (link) return link.href;
  return field.textContent.trim();
}

function readFieldNumber(field, fallback) {
  const value = Number.parseInt(readFieldText(field), 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function readKeyValueConfig(block) {
  const config = {};
  [...block.children].forEach((row) => {
    const cells = [...row.children];
    if (cells.length < 2) return;
    const key = cells[0].textContent.trim();
    const value = readFieldText(cells[1]);
    if (!key || !value) return;

    switch (key.toLowerCase()) {
      case 'result page url':
      case 'search results page':
        config.resultPageUrl = value;
        break;
      case 'query index source':
      case 'query index':
        config.queryIndexSource = value;
        break;
      case 'trending api endpoint':
        config.trendingApiEndpoint = value;
        break;
      case 'trending limit':
        config.trendingLimit = Number.parseInt(value, 10);
        break;
      case 'recent search limit':
        config.recentSearchLimit = Number.parseInt(value, 10);
        break;
      case 'suggest api endpoint':
      case 'autosuggest api endpoint':
        config.suggestApiEndpoint = value;
        break;
      case 'search query param':
        config.searchQueryParam = value;
        break;
      default:
        break;
    }
  });
  return config;
}

/**
 * Reads authored search block configuration.
 * @param {Element} block search block element
 * @returns {object} search configuration
 */
export default function readSearchConfig(block) {
  const keyValueConfig = readKeyValueConfig(block);
  const legacySourceLink = block.querySelector('a[href]');

  const config = {
    resultPageUrl: readFieldText(block.querySelector('[data-aue-prop="resultPageUrl"]'))
      || keyValueConfig.resultPageUrl
      || readFieldText(block.querySelector('[data-aue-prop="searchUrl"]')),
    queryIndexSource: readFieldText(block.querySelector('[data-aue-prop="queryIndexSource"]'))
      || keyValueConfig.queryIndexSource
      || legacySourceLink?.href
      || DEFAULTS.queryIndexSource,
    trendingApiEndpoint: readFieldText(block.querySelector('[data-aue-prop="trendingApiEndpoint"]'))
      || keyValueConfig.trendingApiEndpoint,
    trendingLimit: readFieldNumber(
      block.querySelector('[data-aue-prop="trendingLimit"]'),
      keyValueConfig.trendingLimit || DEFAULTS.trendingLimit,
    ),
    recentSearchLimit: readFieldNumber(
      block.querySelector('[data-aue-prop="recentSearchLimit"]'),
      keyValueConfig.recentSearchLimit || DEFAULTS.recentSearchLimit,
    ),
    suggestApiEndpoint: readFieldText(block.querySelector('[data-aue-prop="suggestApiEndpoint"]'))
      || keyValueConfig.suggestApiEndpoint,
    searchQueryParam: readFieldText(block.querySelector('[data-aue-prop="searchQueryParam"]'))
      || keyValueConfig.searchQueryParam
      || DEFAULTS.searchQueryParam,
  };

  return config;
}
