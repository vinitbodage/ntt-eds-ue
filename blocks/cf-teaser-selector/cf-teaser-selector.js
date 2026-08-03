/* eslint-disable no-underscore-dangle */
import getCfTeaserConfig from './cf-teaser-selector-config.js';

function isAuthoring() {
  const { classList } = document.documentElement;
  return classList.contains('adobe-ue-edit') || classList.contains('adobe-ue-preview');
}

function buildCfResourceUrn(cfPath, cfVariation) {
  const variation = cfVariation || 'master';
  return `urn:aemconnection:${cfPath}/jcr:content/data/${variation}`;
}

function buildCfAssetsUrl(config, cfPath) {
  return `${config.aemAuthorUrl}/ui#/aem/assets.html${cfPath}`;
}

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

function resolveAssetUrl(baseUrl, assetPath, config) {
  if (!assetPath) return '';
  if (/^https?:\/\//i.test(assetPath)) return assetPath;

  if (assetPath.startsWith('/content/dam/')) {
    return `${config.aemAuthorUrl}${assetPath}`;
  }

  if (assetPath.startsWith('/')) return `${baseUrl}${assetPath}`;
  return assetPath;
}

function extractTeaser(data, config) {
  return data?.data?.[config.graphQlResultKey]?.item || null;
}

function normalizeTeaserItem(item) {
  if (!item) return null;

  return {
    title: item.teaserTitle || item.title || '',
    descriptionHtml: item.teaserDescription?.html || item.description?.html || '',
    imagePath: item.teaserImage?._path || item.image?._path || '',
    ctaText: item.ctaText || item.cta_title || '',
    ctaLink: item.ctaLink || item.cta_link || '',
  };
}

function buildCtaHref(link) {
  if (!link) return '#';
  if (/^https?:\/\//i.test(link)) return link;
  return link.endsWith('.html') ? link : `${link}.html`;
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

function buildTeaserMarkup(cfPath, cfVariation, teaser, assetBaseUrl, config) {
  const normalized = normalizeTeaserItem(teaser);
  if (!normalized) return '';

  const variation = cfVariation || 'master';
  const imagePath = resolveAssetUrl(assetBaseUrl, normalized.imagePath, config);
  const imageAlt = normalized.title || '';
  const ctaLink = buildCtaHref(normalized.ctaLink);
  const imageMarkup = imagePath
    ? `<img src="${imagePath}" alt="${imageAlt}" data-aue-prop="teaserImage" data-aue-label="Image" data-aue-type="media" loading="lazy">`
    : '';
  const ctaMarkup = normalized.ctaText
    ? `<a href="${ctaLink}" data-aue-prop="ctaText" data-aue-label="Button Text" data-aue-type="text" class="button secondary">${normalized.ctaText}</a>`
    : '';

  return `
  <div class="cf-teaser" data-aue-resource="${buildCfResourceUrn(cfPath, variation)}" data-aue-label="CF Teaser" data-aue-type="reference">
    <div class="teaser-background">
      ${imageMarkup}
    </div>
    <div class="teaser-content">
      <div class="teaser-text">
        <h3 data-aue-prop="teaserTitle" data-aue-label="Title" data-aue-type="text" class="title">${normalized.title}</h3>
        <div data-aue-prop="teaserDescription" data-aue-label="Description" data-aue-type="richtext" class="description">
          ${normalized.descriptionHtml}
        </div>
      </div>
      ${ctaMarkup ? `<div class="teaser-cta">${ctaMarkup}</div>` : ''}
    </div>
  </div>`;
}

function buildCfEditSection(cfPath, cfVariation, config) {
  const variation = cfVariation || 'master';
  const cfResource = buildCfResourceUrn(cfPath, variation);
  const assetsUrl = buildCfAssetsUrl(config, cfPath);

  return `
  <div class="cf-teaser-edit">
    <p class="cf-teaser-edit-label">Teaser content is managed in a Content Fragment.</p>
    <div class="cf-teaser-edit-actions">
      <button
        type="button"
        class="cf-teaser-edit-button"
        data-aue-resource="${cfResource}"
        data-aue-label="Edit Content Fragment"
        data-aue-type="reference"
      >
        Edit Content Fragment
      </button>
      <a
        class="cf-teaser-edit-link"
        href="${assetsUrl}"
        target="_blank"
        rel="noopener noreferrer"
      >
        Open in Assets
      </a>
    </div>
    <p class="cf-teaser-edit-path">${cfPath} · ${variation}</p>
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
      if (isAuthoring()) {
        block.insertAdjacentHTML('beforeend', buildCfEditSection(cfPath, cfVariation, config));
      }
      return;
    }

    block.setAttribute('data-aue-type', 'container');
    block.innerHTML = buildTeaserMarkup(
      cfPath,
      cfVariation,
      result.teaser,
      result.assetBaseUrl,
      config,
    );

    if (isAuthoring()) {
      block.insertAdjacentHTML('beforeend', buildCfEditSection(cfPath, cfVariation, config));
    }
  } catch {
    renderStatus(block, 'Unable to load teaser content.');
  }
}
