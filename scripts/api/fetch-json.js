/**
 * Fetches JSON from an API endpoint.
 * @param {string} source API URL
 * @param {RequestInit} [options] fetch options
 * @returns {Promise<any|null>} parsed JSON or null on failure
 */
export default async function fetchJson(source, options) {
  if (!source) return null;

  try {
    const response = await fetch(source, options);
    if (!response.ok) {
      // eslint-disable-next-line no-console
      console.error('error loading API response', response.status, source);
      return null;
    }

    const json = await response.json();
    if (json === null || json === undefined) {
      // eslint-disable-next-line no-console
      console.error('empty API response', source);
      return null;
    }

    return json;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('failed to fetch API response', source, error);
    return null;
  }
}
