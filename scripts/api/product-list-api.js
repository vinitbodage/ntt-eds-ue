import fetchJson from './fetch-json.js';
import { toSafeSameOriginFetchUrl } from './search-api.js';

const DEFAULT_MOCK_ENDPOINT = '/drafts/mock-product-list.json';

/** Headers allowed on cross-origin API Mesh requests (must match mesh CORS allowedHeaders). */
export const GRAPHQL_REQUEST_HEADERS = [
  'Accept',
  'Content-Type',
  'x-api-key',
];

export const PRODUCTS_QUERY = `
  query GetProducts($pageSize: Int!) {
    products(search: "", pageSize: $pageSize) {
      items {
        id
        name
        sku
        url_key
        price_range {
          minimum_price {
            final_price {
              value
              currency
            }
          }
        }
        small_image {
          url
        }
      }
      total_count
    }
  }
`;

/**
 * Sanitizes an author-configured GraphQL endpoint URL.
 * @param {string} value endpoint URL from block authoring
 * @returns {string}
 */
export function toSafeGraphqlEndpoint(value) {
  const candidate = String(value || '').trim();
  if (!candidate) return '';

  try {
    const url = new URL(candidate);
    if (url.protocol !== 'https:') return '';
    return url.toString();
  } catch {
    return '';
  }
}

/**
 * Uses the GraphQL endpoint authored on the block (resolved in product-list-config.js).
 * @param {object} config product list configuration
 * @returns {string}
 */
export function resolveGraphqlEndpoint(config) {
  return toSafeGraphqlEndpoint(config?.graphqlEndpoint);
}

/**
 * Resolves an optional same-origin GraphQL proxy endpoint.
 * @param {string} value proxy URL from block authoring
 * @returns {string}
 */
export function resolveGraphqlProxyEndpoint(value) {
  return toSafeSameOriginFetchUrl(value, '');
}

function sanitizeText(value, maxLength = 500) {
  if (value == null) return '';
  return String(value).trim().slice(0, maxLength);
}

function sanitizeUrl(value) {
  const candidate = sanitizeText(value, 2000);
  if (!candidate) return '';
  try {
    const url = new URL(candidate);
    if (!['http:', 'https:'].includes(url.protocol)) return '';
    return url.toString();
  } catch {
    return '';
  }
}

/**
 * Builds CORS-safe request headers for API Mesh GraphQL calls.
 * Only includes headers listed in GRAPHQL_REQUEST_HEADERS.
 * @param {object} config product list configuration
 * @returns {Record<string, string>}
 */
export function buildGraphqlHeaders(config) {
  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };

  const safeApiKey = sanitizeText(config?.graphqlApiKey, 256);
  if (safeApiKey) {
    headers['x-api-key'] = safeApiKey;
  }

  return Object.fromEntries(
    Object.entries(headers).filter(([name]) => GRAPHQL_REQUEST_HEADERS
      .some((allowed) => allowed.toLowerCase() === name.toLowerCase())),
  );
}

/**
 * Restricts mock API targets to the current origin.
 * @param {string} value mock endpoint URL or path
 * @returns {string}
 */
export function toSafeMockEndpoint(value) {
  const candidate = String(value || '').trim();
  if (!candidate) return '';

  try {
    const url = new URL(candidate, window.location.origin);
    if (url.origin !== window.location.origin) return '';
    return url.toString();
  } catch {
    return '';
  }
}

function isCrossOriginUrl(url) {
  try {
    return new URL(url).origin !== window.location.origin;
  } catch {
    return false;
  }
}

function parseGraphqlResponse(json) {
  if (!json || json?.errors?.length) return null;
  return json;
}

async function postGraphqlDirect(endpoint, query, variables, config) {
  const headers = buildGraphqlHeaders(config);

  const response = await fetch(endpoint, {
    method: 'POST',
    mode: 'cors',
    credentials: 'omit',
    headers,
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) return null;

  const json = await response.json();
  return parseGraphqlResponse(json);
}

async function postGraphqlViaProxy(proxyEndpoint, endpoint, query, variables, config) {
  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };

  const response = await fetch(proxyEndpoint, {
    method: 'POST',
    mode: 'cors',
    credentials: 'same-origin',
    headers,
    body: JSON.stringify({
      endpoint,
      query,
      variables,
      apiKey: sanitizeText(config?.graphqlApiKey, 256) || undefined,
    }),
  });

  if (!response.ok) return null;

  const json = await response.json();
  return parseGraphqlResponse(json);
}

/**
 * Executes a GraphQL query using a same-origin proxy or direct cross-origin fetch.
 * @param {object} config product list configuration
 * @param {string} query GraphQL query
 * @param {object} variables query variables
 * @returns {Promise<object|null>}
 */
export async function executeGraphqlQuery(config, query, variables) {
  const endpoint = resolveGraphqlEndpoint(config);
  if (!endpoint) return null;

  const proxyEndpoint = resolveGraphqlProxyEndpoint(config?.graphqlProxyEndpoint);

  if (proxyEndpoint) {
    const proxied = await postGraphqlViaProxy(proxyEndpoint, endpoint, query, variables, config);
    if (proxied) return proxied;
  }

  if (!isCrossOriginUrl(endpoint)) {
    return postGraphqlDirect(endpoint, query, variables, config);
  }

  try {
    const direct = await postGraphqlDirect(endpoint, query, variables, config);
    if (direct) return direct;
  } catch {
    // Fall through to proxy retry when direct CORS/network fetch fails.
  }

  if (proxyEndpoint) {
    return postGraphqlViaProxy(proxyEndpoint, endpoint, query, variables, config);
  }

  return null;
}

function formatPrice(price) {
  if (!price || price.value == null) return '';
  const amount = Number(price.value);
  if (!Number.isFinite(amount)) return '';

  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: price.currency || 'USD',
    }).format(amount);
  } catch {
    return `${amount} ${price.currency || ''}`.trim();
  }
}

/**
 * Normalizes a Commerce/Venia product item from GraphQL.
 * @param {object} item raw product item
 * @returns {object|null}
 */
export function normalizeProduct(item) {
  if (!item || typeof item !== 'object') return null;

  const price = item.price_range?.minimum_price?.final_price;
  const imageUrl = sanitizeUrl(item.small_image?.url);

  return {
    id: sanitizeText(item.id, 64),
    name: sanitizeText(item.name, 200),
    sku: sanitizeText(item.sku, 64),
    urlKey: sanitizeText(item.url_key, 200),
    imageUrl,
    imageAlt: sanitizeText(item.name, 200),
    priceLabel: formatPrice(price),
  };
}

/**
 * Extracts product items from a GraphQL response.
 * @param {object} data parsed GraphQL JSON
 * @returns {{ items: object[], totalCount: number }}
 */
export function extractProducts(data) {
  const items = data?.data?.products?.items || [];
  const totalCount = Number(data?.data?.products?.total_count) || items.length;

  return {
    items: items.map(normalizeProduct).filter(Boolean),
    totalCount,
  };
}

/**
 * Fetches products from API Mesh GraphQL.
 * @param {object} config product list configuration
 * @returns {Promise<{ items: object[], totalCount: number, source: string }|null>}
 */
export async function fetchProducts(config) {
  const data = await executeGraphqlQuery(
    config,
    PRODUCTS_QUERY,
    { pageSize: config.pageSize },
  );

  if (!data) return null;

  const { items, totalCount } = extractProducts(data);
  if (!items.length) return null;

  const source = resolveGraphqlProxyEndpoint(config?.graphqlProxyEndpoint) ? 'proxy' : 'graphql';

  return { items, totalCount, source };
}

/**
 * Fetches products from a same-origin mock JSON endpoint.
 * @param {string} mockEndpoint mock API URL
 * @returns {Promise<{ items: object[], totalCount: number, source: string }|null>}
 */
export async function fetchProductsFromMock(mockEndpoint) {
  const safeEndpoint = toSafeMockEndpoint(mockEndpoint);
  if (!safeEndpoint) return null;

  const data = await fetchJson(safeEndpoint);
  if (!data) return null;

  const { items, totalCount } = extractProducts(data);
  if (!items.length) return null;

  return { items, totalCount, source: 'mock' };
}

/**
 * Loads products from GraphQL with localhost mock fallback.
 * @param {object} config product list configuration
 * @returns {Promise<{ items: object[], totalCount: number, source: string }|null>}
 */
export async function loadProducts(config) {
  const graphqlResult = await fetchProducts(config);
  if (graphqlResult) return graphqlResult;

  const mockEndpoint = config.mockApiEndpoint || DEFAULT_MOCK_ENDPOINT;
  if (window.location.hostname.includes('localhost')) {
    return fetchProductsFromMock(mockEndpoint);
  }

  return null;
}
