/**
 * Default API Mesh GraphQL settings for the Product List block.
 * Authors can override these values in Universal Editor block properties.
 */
export const DEFAULTS = {
  heading: 'Products',
  meshId: 'b214abfa-ec45-403d-8623-72af08f32293',
  graphqlEndpoint: '',
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
  const link = field.querySelector('a[href]');
  if (link) return link.href;
  return field.textContent.trim();
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

  return {
    heading: readFieldText(block.querySelector('[data-aue-prop="heading"]'))
      || keyValueConfig.heading
      || DEFAULTS.heading,
    meshId: readFieldText(block.querySelector('[data-aue-prop="meshId"]'))
      || keyValueConfig.meshId
      || DEFAULTS.meshId,
    graphqlEndpoint: readFieldText(block.querySelector('[data-aue-prop="graphqlEndpoint"]'))
      || keyValueConfig.graphqlEndpoint
      || DEFAULTS.graphqlEndpoint,
    graphqlApiKey: readFieldText(block.querySelector('[data-aue-prop="graphqlApiKey"]'))
      || keyValueConfig.graphqlApiKey
      || DEFAULTS.graphqlApiKey,
    pageSize,
    mockApiEndpoint: readFieldText(block.querySelector('[data-aue-prop="mockApiEndpoint"]'))
      || keyValueConfig.mockApiEndpoint
      || DEFAULTS.mockApiEndpoint,
  };
}
