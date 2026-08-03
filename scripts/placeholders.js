import { toCamelCase } from './aem.js';

/**
 * Gets placeholders object from placeholders.json.
 * @param {string} [prefix] Location of placeholders
 * @returns {Promise<object>} placeholders object
 */
export default async function fetchPlaceholders(prefix = 'default') {
  window.placeholders = window.placeholders || {};
  if (!window.placeholders[prefix]) {
    window.placeholders[prefix] = new Promise((resolve) => {
      fetch(`${prefix === 'default' ? '' : prefix}/placeholders.json`)
        .then((resp) => {
          if (resp.ok) return resp.json();
          return {};
        })
        .then((json) => {
          const placeholders = {};
          json.data?.forEach((placeholder) => {
            placeholders[toCamelCase(placeholder.Key)] = placeholder.Text;
          });
          window.placeholders[prefix] = placeholders;
          resolve(window.placeholders[prefix]);
        })
        .catch(() => {
          window.placeholders[prefix] = {};
          resolve(window.placeholders[prefix]);
        });
    });
  }
  return window.placeholders[prefix];
}
