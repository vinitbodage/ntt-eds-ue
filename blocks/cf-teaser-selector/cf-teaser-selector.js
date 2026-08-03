/* eslint-disable no-underscore-dangle */
import getCfTeaserConfig from './cf-teaser-selector-config.js';

function readCfPath(block) {
  const link = block.querySelector(':scope div:nth-child(1) > div a');
  return link?.textContent?.trim() || link?.innerHTML?.trim() || '';
}

function readCfVariation(block) {
  return block.querySelector(':scope div:nth-child(2) > div > p')?.textContent?.trim() || '';
}

function buildGraphQlUrl(config, cfPath, cfVariation) {
  const isAuthor = window?.location?.origin?.includes('author');
  const baseUrl = isAuthor ? config.aemAuthorUrl : config.aemPublishUrl;
  const variation = encodeURIComponent(cfVariation || 'master');
  const path = encodeURIComponent(cfPath);
  const cacheBuster = Math.random() * 1000;

  return `${baseUrl}${config.persistedGraphQlQuery};path=${path};variation=${variation};ts=${cacheBuster}`;
}

function buildTeaserMarkup(cfPath, cfVariation, teaser) {
  const variation = cfVariation || 'master';
  const imagePath = teaser?.image?._path || '';
  const imageAlt = teaser?.title || '';
  const ctaLink = teaser?.cta_link ? `${teaser.cta_link}.html` : '#';

  return `
  <div class="cf-teaser" data-aue-resource="urn:aemconnection:${cfPath}/jcr:content/data/${variation}" data-aue-label="CF Teaser" data-aue-type="reference">
    <div class="teaser-background">
      <img src="${imagePath}" alt="${imageAlt}" data-aue-prop="image" data-aue-label="Image" data-aue-type="media">
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

/**
 * Loads teaser content from a selected Content Fragment and decorates the block.
 * @param {Element} block The block element
 */
export default async function decorate(block) {
  if (block.querySelector('.cf-teaser')) return;

  const config = getCfTeaserConfig();
  const cfPath = readCfPath(block);
  const cfVariation = readCfVariation(block);

  if (!cfPath) return;

  const url = buildGraphQlUrl(config, cfPath, cfVariation);

  try {
    const response = await fetch(url, { credentials: 'include' });
    if (!response.ok) return;

    const data = await response.json();
    const teaser = data?.data?.[config.graphQlResultKey]?.item;
    if (!teaser) return;

    block.setAttribute('data-aue-type', 'container');
    block.innerHTML = buildTeaserMarkup(cfPath, cfVariation, teaser);
  } catch {
    // Leave authored placeholder markup when CF data cannot be loaded.
  }
}
