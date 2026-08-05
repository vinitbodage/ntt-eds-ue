/**
 * Default API Mesh settings for the Product Details block.
 * Authors can override these values in Universal Editor block properties.
 */
const DEFAULT_MESH_ID = 'b214abfa-ec45-403d-8623-72af08f32293';
const DEFAULT_APP_BUILDER_PRODUCT_DETAIL_PROXY = 'https://120642-edsapi-stage.adobeio-static.net/api/v1/web/api-mesh/api-mesh-product-detail';

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
  meshId: DEFAULT_MESH_ID,
  graphqlEndpoint: buildDefaultGraphqlEndpoint(DEFAULT_MESH_ID),
  productDetailProxyEndpoint: DEFAULT_APP_BUILDER_PRODUCT_DETAIL_PROXY,
  graphqlApiKey: '',
  skuQueryParam: 'sku',
  mockApiEndpoint: '/drafts/mock-product-detail.json',
};

const CONFIG_KEY_ALIASES = {
  meshid: 'meshId',
  graphqlendpoint: 'graphqlEndpoint',
  productdetailproxyendpoint: 'productDetailProxyEndpoint',
  graphqlapikey: 'graphqlApiKey',
  skuqueryparam: 'skuQueryParam',
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

/**
 * Reads authored product details block configuration.
 * @param {Element} block product details block element
 * @returns {object} block configuration
 */
export default function readProductDetailsConfig(block) {
  const keyValueConfig = readKeyValueConfig(block);

  const meshId = readFieldText(block.querySelector('[data-aue-prop="meshId"]'))
    || keyValueConfig.meshId
    || DEFAULTS.meshId;

  const authoredEndpoint = readFieldText(block.querySelector('[data-aue-prop="graphqlEndpoint"]'))
    || keyValueConfig.graphqlEndpoint;

  const graphqlEndpoint = authoredEndpoint?.trim()
    || buildDefaultGraphqlEndpoint(meshId)
    || DEFAULTS.graphqlEndpoint;

  return {
    meshId,
    graphqlEndpoint,
    productDetailProxyEndpoint: readFieldText(block.querySelector('[data-aue-prop="productDetailProxyEndpoint"]'))
      || keyValueConfig.productDetailProxyEndpoint
      || DEFAULTS.productDetailProxyEndpoint,
    graphqlApiKey: readFieldText(block.querySelector('[data-aue-prop="graphqlApiKey"]'))
      || keyValueConfig.graphqlApiKey
      || DEFAULTS.graphqlApiKey,
    skuQueryParam: readFieldText(block.querySelector('[data-aue-prop="skuQueryParam"]'))
      || keyValueConfig.skuQueryParam
      || DEFAULTS.skuQueryParam,
    mockApiEndpoint: readFieldText(block.querySelector('[data-aue-prop="mockApiEndpoint"]'))
      || keyValueConfig.mockApiEndpoint
      || DEFAULTS.mockApiEndpoint,
  };
}
