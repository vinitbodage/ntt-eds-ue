import fetchPlaceholders from '../../scripts/placeholders.js';
import { mergeSearchConfigFromPlaceholders } from '../../scripts/search/search-config-merge.js';
import { mountSearch, isResultsPage } from '../../scripts/search/search-ui.js';
import readSearchConfig from './search-config.js';

/**
 * loads and decorates the search block
 * @param {Element} block The block element
 */
export default async function decorate(block) {
  const placeholders = await fetchPlaceholders();
  const config = mergeSearchConfigFromPlaceholders(readSearchConfig(block), placeholders);
  const showResults = isResultsPage(config);

  block.textContent = '';
  block.dataset.blockStatus = 'loaded';

  await mountSearch(block, {
    config,
    placeholders,
    mode: 'page',
    showResults,
  });
}

export { fetchQueryIndex as fetchData } from '../../scripts/api/search-api.js';
