import fetchJson from './fetch-json.js';

const DEFAULT_MOCK_ENDPOINT = '/drafts/mock-product-list.json';

const ALLOWED_GRAPHQL_ORIGINS = new Set(['https://edge-graph.adobe.io']);
const MESH_ID_PATTERN = /^[a-f0-9-]{36}$/i;

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

/** Request headers sent by the Product List block (must be allowlisted in API Mesh CORS). */
export const GRAPHQL_REQUEST_HEADERS = [
  'Accept',
  'Content-Type',
  'x-api-key',
];

/**
 * Validates an API Mesh ID.
 * @param {string} meshId mesh identifier
 * @returns {string}
 */
export function sanitizeMeshId(meshId) {
  const candidate = String(meshId || '').trim();
  return MESH_ID_PATTERN.test(candidate) ? candidate : '';
}

/**
 * Restricts GraphQL fetch targets to the API Mesh domain.
 * @param {string} value endpoint URL
 * @returns {string}
 */
export function toSafeGraphqlEndpoint(value) {
  const candidate = String(value || '').trim();
  if (!candidate) return '';

  try {
    const url = new URL(candidate);
    if (!['http:', 'https:'].includes(url.protocol)) return '';
    if (!ALLOWED_GRAPHQL_ORIGINS.has(url.origin)) return '';
    return url.toString();
  } catch {
    return '';
  }
}

/**
 * Builds the API Mesh GraphQL endpoint URL.
 * @param {string} meshId API Mesh ID
 * @param {string} [overrideEndpoint] optional full endpoint override
 * @returns {string}
 */
export function buildGraphqlEndpoint(meshId, overrideEndpoint = '') {
  const endpoint = String(overrideEndpoint || '').trim();
  if (endpoint) return toSafeGraphqlEndpoint(endpoint);

  const safeMeshId = sanitizeMeshId(meshId);
  if (!safeMeshId) return '';
  return `https://edge-graph.adobe.io/api/${safeMeshId}/graphql`;
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

async function postGraphql(endpoint, query, variables, config) {
  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };

  const safeApiKey = sanitizeText(config.graphqlApiKey, 256);
  if (safeApiKey) {
    headers['x-api-key'] = safeApiKey;
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    mode: 'cors',
    credentials: 'omit',
    headers,
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) return null;

  const json = await response.json();
  if (json?.errors?.length) return null;
  return json;
}

/**
 * Fetches products from API Mesh GraphQL.
 * @param {object} config product list configuration
 * @returns {Promise<{ items: object[], totalCount: number, source: string }|null>}
 */
export async function fetchProducts(config) {
  const endpoint = buildGraphqlEndpoint(config.meshId, config.graphqlEndpoint);
  if (!endpoint) return null;

  const data = await postGraphql(
    endpoint,
    PRODUCTS_QUERY,
    { pageSize: config.pageSize },
    config,
  );

  if (!data) return null;

  const { items, totalCount } = extractProducts(data);
  if (!items.length) return null;

  return { items, totalCount, source: 'graphql' };
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
