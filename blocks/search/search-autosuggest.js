import {
  fetchSuggestions,
  fetchTrendingItems,
  toSafeSameOriginPath,
} from '../../scripts/api/search-api.js';
import {
  addRecentSearch,
  getRecentSearches,
  getTrendingFromCache,
  setTrendingCache,
} from '../../scripts/search/search-storage.js';

const MIN_QUERY_LENGTH = 3;
const DEBOUNCE_MS = 300;

function buildResultPageUrl(config, term, item) {
  const fallbackPath = toSafeSameOriginPath(config.resultPageUrl, window.location.pathname);
  const basePath = toSafeSameOriginPath(item?.path, fallbackPath);
  const url = new URL(basePath || window.location.pathname, window.location.origin);
  url.searchParams.set(config.searchQueryParam, term);
  return url.toString();
}

function createSection(title, items, onSelect) {
  if (!items.length) return null;

  const section = document.createElement('div');
  section.className = 'search-autosuggest-section';
  section.setAttribute('role', 'group');
  section.setAttribute('aria-label', title);

  const heading = document.createElement('p');
  heading.className = 'search-autosuggest-section-title';
  heading.textContent = title;
  section.append(heading);

  const list = document.createElement('ul');
  list.className = 'search-autosuggest-list';
  list.setAttribute('role', 'listbox');

  items.forEach((item) => {
    const li = document.createElement('li');
    li.setAttribute('role', 'option');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'search-autosuggest-item';
    button.textContent = item.label || item.value || item;
    button.addEventListener('click', () => onSelect(item));
    li.append(button);
    list.append(li);
  });

  section.append(list);
  return section;
}

function getRecentItems(config) {
  return getRecentSearches()
    .slice(0, config.recentSearchLimit)
    .map((term) => ({ label: term, value: term, path: '' }));
}

async function getTrendingItems(config) {
  if (!config.trendingApiEndpoint) return [];

  const cached = getTrendingFromCache(config.trendingApiEndpoint, config.trendingLimit);
  if (cached) return cached;

  const items = await fetchTrendingItems(config.trendingApiEndpoint, config.trendingLimit);
  if (items.length) {
    setTrendingCache(config.trendingApiEndpoint, config.trendingLimit, items);
  }
  return items;
}

/**
 * Initializes autosuggest behavior for a search input.
 * @param {Element} block search block element
 * @param {HTMLInputElement} input search input
 * @param {Element} popup autosuggest popup container
 * @param {object} config search configuration
 * @param {object} labels section labels from placeholders
 */
export default function initAutosuggest(block, input, popup, config, labels) {
  let debounceTimer;
  let suggestRequestId = 0;

  const navigateToResult = (item) => {
    const term = (typeof item === 'string' ? item : item.value || item.label || '').trim();
    if (!term) return;

    addRecentSearch(term, config.recentSearchLimit);
    window.location.href = buildResultPageUrl(config, term, item);
  };

  const renderPopup = async (query = '') => {
    const renderId = suggestRequestId + 1;
    suggestRequestId = renderId;

    popup.innerHTML = '';
    popup.hidden = false;
    input.setAttribute('aria-expanded', 'true');

    const sections = [];
    const trimmedQuery = query.trim();
    const recentItems = getRecentItems(config);

    if (recentItems.length) {
      sections.push(createSection(
        labels.recentSearches,
        recentItems,
        navigateToResult,
      ));
    }

    if (config.trendingApiEndpoint) {
      const trendingItems = await getTrendingItems(config);
      if (renderId !== suggestRequestId) return;
      sections.push(createSection(
        labels.trendingSearches,
        trendingItems,
        navigateToResult,
      ));
    }

    if (trimmedQuery.length >= MIN_QUERY_LENGTH && config.suggestApiEndpoint) {
      const suggestions = await fetchSuggestions(
        config.suggestApiEndpoint,
        trimmedQuery,
      );
      if (renderId !== suggestRequestId) return;
      sections.push(createSection(
        labels.suggestions,
        suggestions,
        navigateToResult,
      ));
    }

    sections.filter(Boolean).forEach((section) => popup.append(section));

    if (!popup.children.length) {
      popup.hidden = true;
      input.setAttribute('aria-expanded', 'false');
    }
  };

  const hidePopup = () => {
    popup.hidden = true;
    input.setAttribute('aria-expanded', 'false');
  };

  const showPopup = () => {
    renderPopup(input.value);
  };

  input.addEventListener('focus', showPopup);
  input.addEventListener('click', showPopup);

  input.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      renderPopup(input.value);
    }, DEBOUNCE_MS);
  });

  input.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      hidePopup();
    }
    if (event.key === 'Enter') {
      const term = input.value.trim();
      if (term.length >= MIN_QUERY_LENGTH) {
        event.preventDefault();
        navigateToResult({ label: term, value: term, path: '' });
      }
    }
  });

  document.addEventListener('click', (event) => {
    if (!block.contains(event.target)) {
      hidePopup();
    }
  });

  return { hidePopup, showPopup };
}
