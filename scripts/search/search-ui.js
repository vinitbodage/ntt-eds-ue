import { decorateIcons, loadCSS } from '../aem.js';
import { sanitizeSearchTerm } from '../api/search-api.js';
import initAutosuggest from '../../blocks/search/search-autosuggest.js';
import {
  clearSearchResults,
  createSearchResultsContainer,
  createSearchResultsHeading,
  renderSearchResults,
} from '../../blocks/search/search-results.js';

function searchIcon() {
  const icon = document.createElement('span');
  icon.classList.add('icon', 'icon-search');
  return icon;
}

function createClearButton(input, onClear) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'search-clear';
  button.setAttribute('aria-label', 'Clear search');
  button.hidden = true;
  button.innerHTML = '<span class="icon icon-close"></span>';
  button.addEventListener('click', () => {
    input.value = '';
    input.focus();
    button.hidden = true;
    onClear?.();
  });
  input.addEventListener('input', () => {
    button.hidden = !input.value;
  });
  return button;
}

function createAutosuggestPopup(input) {
  const popup = document.createElement('div');
  popup.className = 'search-autosuggest';
  popup.hidden = true;
  popup.setAttribute('role', 'region');
  popup.id = `search-autosuggest-${Math.random().toString(36).slice(2, 9)}`;
  input.setAttribute('aria-controls', popup.id);
  input.setAttribute('aria-expanded', 'false');
  input.setAttribute('aria-autocomplete', 'list');
  return popup;
}

function createSearchInput(config, placeholders, labels, options = {}) {
  const field = document.createElement('div');
  field.className = 'search-field';

  const input = document.createElement('input');
  input.setAttribute('type', 'search');
  input.className = 'search-input';

  const searchPlaceholder = placeholders.searchPlaceholder || 'Search';
  input.placeholder = searchPlaceholder;
  input.setAttribute('aria-label', searchPlaceholder);
  input.maxLength = 200;

  const popup = createAutosuggestPopup(input);
  const clearButton = options.showClear ? createClearButton(input, options.onClear) : null;

  field.append(input);
  if (clearButton) field.append(clearButton);
  field.append(popup);

  initAutosuggest(input, popup, field, config, labels);

  return {
    input, popup, field, clearButton,
  };
}

function createSearchBox(config, placeholders, labels, options = {}) {
  const box = document.createElement('div');
  box.classList.add('search-box');

  const { field } = createSearchInput(config, placeholders, labels, options);
  box.append(searchIcon(), field);

  return box;
}

function getSearchParam(config) {
  const raw = new URLSearchParams(window.location.search).get(config.searchQueryParam) || '';
  return sanitizeSearchTerm(raw);
}

export function isResultsPage(config) {
  if (!config.resultPageUrl) return true;
  try {
    const resultPath = new URL(config.resultPageUrl, window.location.origin).pathname;
    return window.location.pathname === resultPath;
  } catch {
    return false;
  }
}

function updateUrlQuery(config, searchValue) {
  if (!window.history.replaceState) return;
  const url = new URL(window.location.href);
  if (searchValue) {
    url.searchParams.set(config.searchQueryParam, searchValue);
  } else {
    url.searchParams.delete(config.searchQueryParam);
  }
  window.history.replaceState({}, '', url.toString());
}

/**
 * Builds label strings from placeholders.
 * @param {object} placeholders placeholders
 * @returns {object}
 */
export function buildSearchLabels(placeholders = {}) {
  return {
    recentSearches: placeholders.searchRecent || 'Recent searches',
    trendingSearches: placeholders.searchTrending || 'Trending searches',
    suggestions: placeholders.searchSuggestions || 'Suggestions',
    loading: placeholders.searchLoading || 'Loading...',
    empty: placeholders.searchEmpty || 'Start typing to search.',
    noSuggestions: placeholders.searchNoSuggestions || 'No suggestions found.',
  };
}

/**
 * Mounts search UI into a root element (block or overlay panel).
 * @param {Element} root container element
 * @param {object} options mount options
 * @returns {Promise<{ input: HTMLInputElement }>}
 */
export async function mountSearch(root, options) {
  const {
    config,
    placeholders = {},
    mode = 'page',
    showResults = false,
  } = options;

  const labels = buildSearchLabels(placeholders);
  const fullConfig = { ...config, placeholders };

  root.classList.add('search');
  if (mode === 'overlay') {
    root.classList.add('search--overlay');
  }
  if (showResults) {
    root.classList.add('minimal');
  }

  const onClear = showResults
    ? () => {
      clearSearchResults(root);
      updateUrlQuery(fullConfig, '');
      root.querySelector('.search-results-heading')?.remove();
    }
    : undefined;

  root.append(createSearchBox(fullConfig, placeholders, labels, {
    showClear: mode === 'overlay' || showResults,
    onClear,
  }));

  if (showResults) {
    root.append(createSearchResultsContainer(root));
  }

  const input = root.querySelector('.search-input');
  const initialQuery = getSearchParam(fullConfig);

  if (showResults && initialQuery) {
    input.value = initialQuery;
    createSearchResultsHeading(root, initialQuery, fullConfig);
    await renderSearchResults(root, fullConfig, initialQuery);
  }

  if (showResults) {
    input.addEventListener('input', async (event) => {
      const searchValue = sanitizeSearchTerm(event.target.value);
      updateUrlQuery(fullConfig, searchValue);

      if (searchValue.length < 3) {
        clearSearchResults(root);
        root.querySelector('.search-results-heading')?.remove();
        return;
      }

      createSearchResultsHeading(root, searchValue, fullConfig);
      await renderSearchResults(root, fullConfig, searchValue);
    });

    input.addEventListener('keyup', (event) => {
      if (event.code === 'Escape') {
        clearSearchResults(root);
        root.querySelector('.search-results-heading')?.remove();
        updateUrlQuery(fullConfig, '');
      }
    });
  }

  decorateIcons(root);

  return { input };
}

/**
 * Loads search block styles once.
 * @returns {Promise<void>}
 */
export async function loadSearchStyles() {
  const base = window.hlx?.codeBasePath || '';
  await loadCSS(`${base}/blocks/search/search.css`);
}
