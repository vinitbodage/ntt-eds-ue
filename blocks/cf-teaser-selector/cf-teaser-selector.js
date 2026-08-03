/* eslint-disable no-underscore-dangle */
import getCfTeaserConfig from './cf-teaser-selector-config.js';

function readCfPath(block) {
  const link = block.querySelector('[data-aue-prop="cfpath"] a, :scope div:nth-child(1) a[href]');
  if (!link) return '';

  const href = link.getAttribute('href')?.trim();
  if (href?.startsWith('/content/')) return href;

  return link.textContent?.trim() || href || '';
}

function readCfVariation(block) {
  const variationEl = block.querySelector('[data-aue-prop="contentFragmentVariation"], :scope div:nth-child(2) p');
  return variationEl?.textContent?.trim() || 'master';
}

function buildGraphQlUrl(baseUrl, config, cfPath, cfVariation) {
  const variation = cfVariation || 'master';
  const cacheBuster = Math.random() * 1000;

  return `${baseUrl}${config.persistedGraphQlQuery};path=${cfPath};variation=${variation};ts=${cacheBuster}`;
}

function resolveAssetUrl(baseUrl, assetPath) {
  if (!assetPath) return '';
  if (/^https?:\/\//i.test(assetPath)) return assetPath;
  if (assetPath.startsWith('/')) return `${baseUrl}${assetPath}`;
  return assetPath;
}

function extractTeaser(data, config) {
  return data?.data?.[config.graphQlResultKey]?.item || null;
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) return null;

  const data = await response.json();
  if (data?.errors?.length) return null;
  return data;
}

async function fetchTeaserFromAem(config, cfPath, cfVariation) {
  const authorUrl = buildGraphQlUrl(config.aemAuthorUrl, config, cfPath, cfVariation);
  const publishUrl = buildGraphQlUrl(config.aemPublishUrl, config, cfPath, cfVariation);

  const authorData = await fetchJson(authorUrl, { credentials: 'include' });
  const authorTeaser = extractTeaser(authorData, config);
  if (authorTeaser) {
    return { teaser: authorTeaser, assetBaseUrl: config.aemAuthorUrl };
  }

  const publishData = await fetchJson(publishUrl);
  const publishTeaser = extractTeaser(publishData, config);
  if (publishTeaser) {
    return { teaser: publishTeaser, assetBaseUrl: config.aemPublishUrl };
  }

  return null;
}

async function fetchTeaserFromMock(config) {
  if (!config.mockApiEndpoint || !window.location.hostname.includes('localhost')) {
    return null;
  }

  const data = await fetchJson(config.mockApiEndpoint);
  const teaser = extractTeaser(data, config);
  if (!teaser) return null;

  return {
    teaser,
    assetBaseUrl: window.location.origin,
  };
}

function buildTeaserMarkup(cfPath, cfVariation, teaser, assetBaseUrl) {
  const variation = cfVariation || 'master';
  const imagePath = resolveAssetUrl(assetBaseUrl, teaser?.image?._path || '');
  const imageAlt = teaser?.title || '';
  let ctaLink = '#';
  if (teaser?.cta_link) {
    ctaLink = teaser.cta_link.endsWith('.html') ? teaser.cta_link : `${teaser.cta_link}.html`;
  }

  return `
  <div class="cf-teaser" data-aue-resource="urn:aemconnection:${cfPath}/jcr:content/data/${variation}" data-aue-label="CF Teaser" data-aue-type="reference">
    <div class="teaser-background">
      <img src="${imagePath}" alt="${imageAlt}" data-aue-prop="image" data-aue-label="Image" data-aue-type="media" loading="lazy">
    </div>
    <div class="teaser-content">
      <div class="teaser-text">
        <h3 data-aue-prop="title" data-aue-label="Title" data-aue-type="text" class="title">${teaser?.title || ''}</h3>
        <div data-aue-prop="description" data-aue-label="Description" data-aue-type="richtext" class="description">
          ${teaser?.description?.html || ''}
        </div>
      </div>
      <div class="teaser-cta">
        <a href="${ctaLink}" data-aue-prop="cta_title" data-aue-label="Button Text" data-aue-type="text" class="button secondary">${teaser?.cta_title || ''}</a>
      </div>
    </div>
  </div>`;
}

function renderStatus(block, message) {
  block.innerHTML = `<div class="cf-teaser cf-teaser-status" role="status">${message}</div>`;
}

/**
 * Loads teaser content from a selected Content Fragment and decorates the block.
 * @param {Element} block The block element
 */
export default async function decorate(block) {
  if (block.querySelector('.cf-teaser')) return;

  const config = getCfTeaserConfig();
  const cfPath = readCfPath(block);
  const cfVariation = readCfVariation(block);

  if (!cfPath) {
    renderStatus(block, 'Select a Content Fragment to display the teaser.');
    return;
  }

  renderStatus(block, 'Loading teaser...');

  try {
    let result = await fetchTeaserFromAem(config, cfPath, cfVariation);

    if (!result && config.mockApiEndpoint) {
      result = await fetchTeaserFromMock(config);
    }

    if (!result?.teaser) {
      renderStatus(block, 'Unable to load teaser content. Check the Content Fragment path and GraphQL configuration.');
      return;
    }

    block.setAttribute('data-aue-type', 'container');
    block.innerHTML = buildTeaserMarkup(
      cfPath,
      cfVariation,
      result.teaser,
      result.assetBaseUrl,
    );
  } catch {
    renderStatus(block, 'Unable to load teaser content.');
  }
}
