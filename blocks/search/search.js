import {
  decorateIcons,
} from '../../scripts/aem.js';
import fetchPlaceholders from '../../scripts/placeholders.js';
import readSearchConfig from './search-config.js';
import initAutosuggest from './search-autosuggest.js';
import {
  clearSearchResults,
  createSearchResultsContainer,
  renderSearchResults,
} from './search-results.js';

function searchIcon() {
  const icon = document.createElement('span');
  icon.classList.add('icon', 'icon-search');
  return icon;
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

function createSearchInput(block, config, placeholders, labels) {
  const input = document.createElement('input');
  input.setAttribute('type', 'search');
  input.className = 'search-input';

  const searchPlaceholder = placeholders.searchPlaceholder || 'Search...';
  input.placeholder = searchPlaceholder;
  input.setAttribute('aria-label', searchPlaceholder);

  const popup = createAutosuggestPopup(input);
  initAutosuggest(block, input, popup, config, labels);

  return { input, popup };
}

function createSearchBox(block, config, placeholders, labels) {
  const box = document.createElement('div');
  box.classList.add('search-box');

  const field = document.createElement('div');
  field.className = 'search-field';

  const { input, popup } = createSearchInput(block, config, placeholders, labels);
  field.append(input, popup);
  box.append(searchIcon(), field);

  return box;
}

function getSearchParam(config) {
  return new URLSearchParams(window.location.search).get(config.searchQueryParam) || '';
}

function isResultsPage(config) {
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
 * loads and decorates the search block
 * @param {Element} block The block element
 */
export default async function decorate(block) {
  const placeholders = await fetchPlaceholders();
  const config = readSearchConfig(block);
  const labels = {
    recentSearches: placeholders.searchRecent || 'Recent searches',
    trendingSearches: placeholders.searchTrending || 'Trending searches',
    suggestions: placeholders.searchSuggestions || 'Suggestions',
  };

  const fullConfig = { ...config, placeholders };
  block.innerHTML = '';

  block.append(createSearchBox(block, fullConfig, placeholders, labels));

  const showResults = isResultsPage(fullConfig);
  if (showResults) {
    block.append(createSearchResultsContainer(block));
  }

  const input = block.querySelector('.search-input');
  const initialQuery = getSearchParam(fullConfig);

  if (showResults && initialQuery) {
    input.value = initialQuery;
    await renderSearchResults(block, fullConfig, initialQuery);
  }

  if (showResults) {
    input.addEventListener('input', async (event) => {
      const searchValue = event.target.value;
      updateUrlQuery(fullConfig, searchValue);

      if (searchValue.length < 3) {
        clearSearchResults(block);
        return;
      }

      await renderSearchResults(block, fullConfig, searchValue);
    });

    input.addEventListener('keyup', (event) => {
      if (event.code === 'Escape') {
        clearSearchResults(block);
        updateUrlQuery(fullConfig, '');
      }
    });
  }

  decorateIcons(block);
}

// Re-export for backward compatibility
export { fetchQueryIndex as fetchData } from '../../scripts/api/search-api.js';
