import { loadProductDetail, readSkuFromUrl } from '../../scripts/api/product-detail-api.js';
import readProductDetailsConfig from './product-details-config.js';

function renderLoader(message = 'Loading product...') {
  const loader = document.createElement('div');
  loader.className = 'product-details-loader';
  loader.setAttribute('role', 'status');
  loader.setAttribute('aria-live', 'polite');
  loader.setAttribute('aria-busy', 'true');

  const spinner = document.createElement('span');
  spinner.className = 'product-details-loader-spinner';
  spinner.setAttribute('aria-hidden', 'true');

  const label = document.createElement('p');
  label.className = 'product-details-loader-label';
  label.textContent = message;

  loader.append(spinner, label);
  return loader;
}

function renderStatus(message, isError = false) {
  const status = document.createElement('p');
  status.className = 'product-details-status';
  status.setAttribute('role', 'status');
  if (isError) status.classList.add('is-error');
  status.textContent = message;
  return status;
}

function renderCategories(categories) {
  if (!categories?.length) return null;

  const nav = document.createElement('nav');
  nav.className = 'product-details-categories';
  nav.setAttribute('aria-label', 'Product categories');

  const list = document.createElement('ol');
  list.className = 'product-details-category-list';

  categories.forEach((category) => {
    const item = document.createElement('li');
    item.className = 'product-details-category-item';
    item.textContent = category.name;
    list.append(item);
  });

  nav.append(list);
  return nav;
}

function getGalleryItems(product) {
  if (product.gallery?.length) return product.gallery;
  if (product.imageUrl) return [{ url: product.imageUrl, label: product.imageLabel }];
  return [];
}

function renderGallery(product) {
  const galleryItems = getGalleryItems(product);

  if (!galleryItems.length) return null;

  const gallery = document.createElement('div');
  gallery.className = 'product-details-gallery';

  const main = document.createElement('div');
  main.className = 'product-details-gallery-main';

  const mainImage = document.createElement('img');
  mainImage.className = 'product-details-image';
  mainImage.src = galleryItems[0].url;
  mainImage.alt = galleryItems[0].label || product.name || 'Product image';
  mainImage.loading = 'eager';
  main.append(mainImage);
  gallery.append(main);

  if (galleryItems.length > 1) {
    const thumbs = document.createElement('div');
    thumbs.className = 'product-details-gallery-thumbs';
    thumbs.setAttribute('role', 'list');

    galleryItems.forEach((item, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'product-details-gallery-thumb';
      button.setAttribute('role', 'listitem');
      button.setAttribute('aria-label', item.label || `View image ${index + 1}`);
      if (index === 0) button.classList.add('is-active');

      const thumbImage = document.createElement('img');
      thumbImage.src = item.url;
      thumbImage.alt = '';
      thumbImage.loading = 'lazy';
      button.append(thumbImage);

      button.addEventListener('click', () => {
        mainImage.src = item.url;
        mainImage.alt = item.label || product.name || 'Product image';
        thumbs.querySelectorAll('.product-details-gallery-thumb').forEach((el) => {
          el.classList.toggle('is-active', el === button);
        });
      });

      thumbs.append(button);
    });

    gallery.append(thumbs);
  }

  return gallery;
}

function renderProductDetails(block, product) {
  block.replaceChildren();

  const wrapper = document.createElement('div');
  wrapper.className = 'product-details-content';

  const layout = document.createElement('div');
  layout.className = 'product-details-layout';

  const mediaColumn = document.createElement('div');
  mediaColumn.className = 'product-details-media';
  const gallery = renderGallery(product);
  if (gallery) mediaColumn.append(gallery);
  layout.append(mediaColumn);

  const infoColumn = document.createElement('div');
  infoColumn.className = 'product-details-info';

  const categories = renderCategories(product.categories);
  if (categories) infoColumn.append(categories);

  const title = document.createElement('h1');
  title.className = 'product-details-title';
  title.textContent = product.name;
  infoColumn.append(title);

  if (product.sku) {
    const sku = document.createElement('p');
    sku.className = 'product-details-sku';
    sku.textContent = `SKU: ${product.sku}`;
    infoColumn.append(sku);
  }

  if (product.priceLabel) {
    const priceRow = document.createElement('div');
    priceRow.className = 'product-details-price-row';

    const price = document.createElement('p');
    price.className = 'product-details-price';
    price.textContent = product.priceLabel;
    priceRow.append(price);

    if (product.onSale && product.regularPriceLabel) {
      const regularPrice = document.createElement('p');
      regularPrice.className = 'product-details-regular-price';
      regularPrice.textContent = product.regularPriceLabel;
      priceRow.append(regularPrice);
    }

    infoColumn.append(priceRow);
  }

  if (product.stockStatus) {
    const stock = document.createElement('p');
    stock.className = 'product-details-stock';
    stock.textContent = product.stockStatus.replace(/_/g, ' ');
    infoColumn.append(stock);
  }

  if (product.shortDescriptionHtml) {
    const shortDescription = document.createElement('div');
    shortDescription.className = 'product-details-short-description';
    shortDescription.innerHTML = product.shortDescriptionHtml;
    infoColumn.append(shortDescription);
  }

  layout.append(infoColumn);
  wrapper.append(layout);

  if (product.descriptionHtml) {
    const descriptionSection = document.createElement('section');
    descriptionSection.className = 'product-details-description';

    const descriptionHeading = document.createElement('h2');
    descriptionHeading.className = 'product-details-description-heading';
    descriptionHeading.textContent = 'Product Details';
    descriptionSection.append(descriptionHeading);

    const description = document.createElement('div');
    description.className = 'product-details-description-body';
    description.innerHTML = product.descriptionHtml;
    descriptionSection.append(description);

    wrapper.append(descriptionSection);
  }

  block.append(wrapper);
}

/**
 * Loads and decorates the product details block.
 * @param {Element} block The block element
 */
export default async function decorate(block) {
  if (block.querySelector('.product-details-content')) return;

  const config = readProductDetailsConfig(block);
  const sku = readSkuFromUrl(config.skuQueryParam);

  if (!sku) {
    block.replaceChildren(renderStatus(
      `No product SKU found. Add a ?${config.skuQueryParam}= query parameter to the page URL.`,
      true,
    ));
    return;
  }

  block.replaceChildren(renderLoader());

  try {
    const product = await loadProductDetail(config, sku);

    if (!product) {
      block.replaceChildren(renderStatus(
        `Unable to load product "${sku}". Check the product detail API endpoint and mesh configuration.`,
        true,
      ));
      return;
    }

    renderProductDetails(block, product);
  } catch {
    block.replaceChildren(renderStatus('Unable to load product.', true));
  }
}
