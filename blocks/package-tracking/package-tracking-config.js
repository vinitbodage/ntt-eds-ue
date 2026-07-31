import { toSafeSameOriginFetchUrl } from '../../scripts/api/search-api.js';

const DEFAULTS = {
  heading: 'Track your package',
  inputPlaceholder: 'Enter 12-digit number or waybill (e.g. ABC12345678)',
  buttonLabel: 'Track',
  trackingApiEndpoint: '',
};

const CONFIG_KEY_ALIASES = {
  heading: 'heading',
  trackingapiendpoint: 'trackingApiEndpoint',
  inputplaceholder: 'inputPlaceholder',
  buttonlabel: 'buttonLabel',
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

/**
 * Reads authored package tracking block configuration.
 * @param {Element} block package tracking block element
 * @returns {object} block configuration
 */
export default function readPackageTrackingConfig(block) {
  const keyValueConfig = readKeyValueConfig(block);

  const config = {
    heading: readFieldText(block.querySelector('[data-aue-prop="heading"]'))
      || keyValueConfig.heading
      || DEFAULTS.heading,
    trackingApiEndpoint: readFieldText(block.querySelector('[data-aue-prop="trackingApiEndpoint"]'))
      || keyValueConfig.trackingApiEndpoint
      || DEFAULTS.trackingApiEndpoint,
    inputPlaceholder: readFieldText(block.querySelector('[data-aue-prop="inputPlaceholder"]'))
      || keyValueConfig.inputPlaceholder
      || DEFAULTS.inputPlaceholder,
    buttonLabel: readFieldText(block.querySelector('[data-aue-prop="buttonLabel"]'))
      || keyValueConfig.buttonLabel
      || DEFAULTS.buttonLabel,
  };

  return {
    ...config,
    trackingApiEndpoint: toSafeSameOriginFetchUrl(config.trackingApiEndpoint, ''),
  };
}
