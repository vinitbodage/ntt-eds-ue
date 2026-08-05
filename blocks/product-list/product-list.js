import { loadProducts } from '../../scripts/api/product-list-api.js';
import readProductListConfig from './product-list-config.js';

function renderStatus(message, isError = false) {
  const status = document.createElement('p');
  status.className = 'product-list-status';
  status.setAttribute('role', 'status');
  if (isError) status.classList.add('is-error');
  status.textContent = message;
  return status;
}

function createProductCard(product) {
  const article = document.createElement('article');
  article.className = 'product-list-card';

  if (product.imageUrl) {
    const media = document.createElement('div');
    media.className = 'product-list-card-media';

    const img = document.createElement('img');
    img.src = product.imageUrl;
    img.alt = product.imageAlt || product.name || 'Product image';
    img.loading = 'lazy';
    media.append(img);
    article.append(media);
  }

  const body = document.createElement('div');
  body.className = 'product-list-card-body';

  if (product.name) {
    const title = document.createElement('h3');
    title.className = 'product-list-card-title';
    title.textContent = product.name;
    body.append(title);
  }

  if (product.sku) {
    const sku = document.createElement('p');
    sku.className = 'product-list-card-sku';
    sku.textContent = `SKU: ${product.sku}`;
    body.append(sku);
  }

  if (product.priceLabel) {
    const price = document.createElement('p');
    price.className = 'product-list-card-price';
    price.textContent = product.priceLabel;
    body.append(price);
  }

  article.append(body);
  return article;
}

function renderProducts(block, heading, result) {
  block.replaceChildren();

  const wrapper = document.createElement('div');
  wrapper.className = 'product-list-content';

  const header = document.createElement('div');
  header.className = 'product-list-header';

  const title = document.createElement('h2');
  title.className = 'product-list-heading';
  title.textContent = heading;
  header.append(title);

  const meta = document.createElement('p');
  meta.className = 'product-list-meta';
  meta.textContent = `${result.totalCount} products`;
  header.append(meta);

  const grid = document.createElement('div');
  grid.className = 'product-list-grid';
  grid.setAttribute('role', 'list');
  result.items.forEach((product) => {
    const card = createProductCard(product);
    card.setAttribute('role', 'listitem');
    grid.append(card);
  });

  wrapper.append(header, grid);
  block.append(wrapper);
}

/**
 * Loads and decorates the product list block.
 * @param {Element} block The block element
 */
export default async function decorate(block) {
  if (block.querySelector('.product-list-content')) return;

  const config = readProductListConfig(block);
  block.replaceChildren(renderStatus('Loading products...'));

  try {
    const result = await loadProducts(config);

    if (!result?.items?.length) {
      block.replaceChildren(renderStatus(
        'Unable to load products. Check the API Mesh GraphQL endpoint and mesh ID.',
        true,
      ));
      return;
    }

    renderProducts(block, config.heading, result);
  } catch {
    block.replaceChildren(renderStatus('Unable to load products.', true));
  }
}
