/**
 * Default API Mesh GraphQL settings for the Product List block.
 * Authors can override these values in Universal Editor block properties.
 */
const DEFAULT_MESH_ID = 'b214abfa-ec45-403d-8623-72af08f32293';

/**
 * Builds the default API Mesh GraphQL endpoint from a mesh ID.
 * @param {string} [meshId] API Mesh ID
 * @returns {string}
 */
export function buildDefaultGraphqlEndpoint(meshId = DEFAULT_MESH_ID) {
  const candidate = String(meshId || '').trim();
  if (!/^[a-f0-9-]{36}$/i.test(candidate)) return '';
  return `https://edge-sandbox-graph.adobe.io/api/${candidate}/graphql`;
}

export const DEFAULTS = {
  heading: 'Products',
  meshId: DEFAULT_MESH_ID,
  graphqlEndpoint: buildDefaultGraphqlEndpoint(DEFAULT_MESH_ID),
  graphqlApiKey: '',
  pageSize: 12,
  mockApiEndpoint: '/drafts/mock-product-list.json',
};

const CONFIG_KEY_ALIASES = {
  heading: 'heading',
  meshid: 'meshId',
  graphqlendpoint: 'graphqlEndpoint',
  graphqlapikey: 'graphqlApiKey',
  pagesize: 'pageSize',
  mockapiendpoint: 'mockApiEndpoint',
};

function normalizeConfigKey(key) {
  return key.trim().toLowerCase().replace(/[\s_-]+/g, '');
}

function readFieldText(field) {
  if (!field) return '';

  const text = field.textContent?.trim() || '';
  const link = field.querySelector('a[href]');
  if (!link) return text;

  const href = link.getAttribute('href')?.trim() || '';
  if (text.startsWith('https://') || text.startsWith('http://')) return text;
  if (href.startsWith('https://') || href.startsWith('http://')) return href;
  return text || href;
}

function readKeyValueConfig(block) {
  const config = {};
  [...block.children].forEach((row) => {
    const cells = [...row.children];
    if (cells.length < 2) return;
    const key = cells[0].textContent.trim();
    const value = readFieldText(cells[1]);
    if (!key || !value) return;

    const configKey = CONFIG_KEY_ALIASES[normalizeConfigKey(key)];
    if (configKey) config[configKey] = value;
  });
  return config;
}

function parsePageSize(value, fallback) {
  const parsed = Number.parseInt(String(value ?? '').trim(), 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, 48);
}

/**
 * Reads authored product list block configuration.
 * @param {Element} block product list block element
 * @returns {object} block configuration
 */
export default function readProductListConfig(block) {
  const keyValueConfig = readKeyValueConfig(block);

  const pageSize = parsePageSize(
    readFieldText(block.querySelector('[data-aue-prop="pageSize"]'))
      || keyValueConfig.pageSize,
    DEFAULTS.pageSize,
  );

  const meshId = readFieldText(block.querySelector('[data-aue-prop="meshId"]'))
    || keyValueConfig.meshId
    || DEFAULTS.meshId;

  const authoredEndpoint = readFieldText(block.querySelector('[data-aue-prop="graphqlEndpoint"]'))
    || keyValueConfig.graphqlEndpoint;

  const graphqlEndpoint = authoredEndpoint?.trim()
    || buildDefaultGraphqlEndpoint(meshId)
    || DEFAULTS.graphqlEndpoint;

  return {
    heading: readFieldText(block.querySelector('[data-aue-prop="heading"]'))
      || keyValueConfig.heading
      || DEFAULTS.heading,
    meshId,
    graphqlEndpoint,
    graphqlApiKey: readFieldText(block.querySelector('[data-aue-prop="graphqlApiKey"]'))
      || keyValueConfig.graphqlApiKey
      || DEFAULTS.graphqlApiKey,
    pageSize,
    mockApiEndpoint: readFieldText(block.querySelector('[data-aue-prop="mockApiEndpoint"]'))
      || keyValueConfig.mockApiEndpoint
      || DEFAULTS.mockApiEndpoint,
  };
}
