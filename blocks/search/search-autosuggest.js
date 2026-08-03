import {
  fetchSuggestions,
  fetchTrendingItems,
  sanitizeSearchTerm,
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

function createSuggestButton(item, onSelect) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'search-autosuggest-item';

  const label = document.createElement('span');
  label.className = 'search-autosuggest-item-label';
  label.textContent = item.label || item.value || item;
  button.append(label);

  if (item.meta) {
    const meta = document.createElement('span');
    meta.className = 'search-autosuggest-item-meta';
    meta.textContent = item.meta;
    button.append(meta);
  }

  button.addEventListener('click', () => onSelect(item));
  button.addEventListener('focus', () => {
    const listPopup = button.closest('.search-autosuggest');
    listPopup?.querySelectorAll('.search-autosuggest-item.is-active').forEach((el) => {
      el.classList.remove('is-active');
    });
    button.classList.add('is-active');
  });
  return button;
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
    li.append(createSuggestButton(item, onSelect));
    list.append(li);
  });

  section.append(list);
  return section;
}

function createEmptyState(message) {
  const status = document.createElement('p');
  status.className = 'search-autosuggest-status';
  status.textContent = message;
  return status;
}

function isPopupTarget(field, target) {
  return field.contains(target);
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

  const items = await fetchTrendingItems(config.trendingApiEndpoint, config.trendingLimit, {
    locale: config.locale,
  });
  if (items.length) {
    setTrendingCache(config.trendingApiEndpoint, config.trendingLimit, items);
  }
  return items;
}

/**
 * Initializes autosuggest behavior for a search input.
 * @param {HTMLInputElement} input search input
 * @param {Element} popup autosuggest popup container
 * @param {Element} field search field wrapper containing input and popup
 * @param {object} config search configuration
 * @param {object} labels section labels from placeholders
 */
export default function initAutosuggest(input, popup, field, config, labels) {
  let debounceTimer;
  let suggestRequestId = 0;

  const navigateToResult = (item) => {
    const rawTerm = typeof item === 'string' ? item : item.value || item.label || '';
    const term = sanitizeSearchTerm(rawTerm);
    if (!term) return;

    addRecentSearch(term, config.recentSearchLimit);
    window.location.href = buildResultPageUrl(config, term, item);
  };

  const renderPopup = async (query = '') => {
    const renderId = suggestRequestId + 1;
    suggestRequestId = renderId;

    popup.innerHTML = '';
    popup.hidden = false;
    popup.dataset.loading = 'true';
    input.setAttribute('aria-expanded', 'true');
    popup.append(createEmptyState(labels.loading || 'Loading...'));

    const sections = [];
    const trimmedQuery = sanitizeSearchTerm(query);
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
        {
          queryParam: config.suggestQueryParam,
          locale: config.locale,
          limit: 10,
        },
      );
      if (renderId !== suggestRequestId) return;
      sections.push(createSection(
        labels.suggestions,
        suggestions,
        navigateToResult,
      ));
    }

    if (renderId !== suggestRequestId) return;

    popup.innerHTML = '';
    delete popup.dataset.loading;
    sections.filter(Boolean).forEach((section) => popup.append(section));

    if (!popup.children.length) {
      const emptyMessage = trimmedQuery.length >= MIN_QUERY_LENGTH
        ? (labels.noSuggestions || 'No suggestions found.')
        : (labels.empty || 'Start typing to search.');
      popup.append(createEmptyState(emptyMessage));
    }
  };

  const hidePopup = () => {
    popup.hidden = true;
    input.setAttribute('aria-expanded', 'false');
  };

  const showPopup = () => {
    renderPopup(input.value);
  };

  field.addEventListener('mousedown', (event) => {
    event.stopPropagation();
  });

  input.addEventListener('focus', showPopup);
  input.addEventListener('click', showPopup);

  input.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      renderPopup(input.value);
    }, DEBOUNCE_MS);
  });

  input.addEventListener('keydown', (event) => {
    const options = [...popup.querySelectorAll('.search-autosuggest-item')];
    const activeIndex = options.findIndex((btn) => btn.classList.contains('is-active'));

    if (event.key === 'ArrowDown' && options.length) {
      event.preventDefault();
      const next = activeIndex < options.length - 1 ? activeIndex + 1 : 0;
      options.forEach((btn, i) => btn.classList.toggle('is-active', i === next));
      options[next]?.focus();
      return;
    }

    if (event.key === 'ArrowUp' && options.length) {
      event.preventDefault();
      const prev = activeIndex > 0 ? activeIndex - 1 : options.length - 1;
      options.forEach((btn, i) => btn.classList.toggle('is-active', i === prev));
      options[prev]?.focus();
      return;
    }

    if (event.key === 'Escape') {
      hidePopup();
    }
    if (event.key === 'Enter') {
      const active = popup.querySelector('.search-autosuggest-item.is-active');
      if (active) {
        event.preventDefault();
        active.click();
        return;
      }
      const term = sanitizeSearchTerm(input.value);
      if (term.length >= MIN_QUERY_LENGTH) {
        event.preventDefault();
        navigateToResult({ label: term, value: term, path: '' });
      }
    }
  });

  document.addEventListener('mousedown', (event) => {
    if (!isPopupTarget(field, event.target)) {
      hidePopup();
    }
  });

  return { hidePopup, showPopup };
}
