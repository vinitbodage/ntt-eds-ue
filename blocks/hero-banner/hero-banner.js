import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

const AUTOPLAY_MS = 5000;

function optimizeSlidePictures(slides) {
  slides.querySelectorAll('picture > img').forEach((img) => {
    const optimizedPic = createOptimizedPicture(
      img.src,
      img.alt,
      false,
      [{ media: '(min-width: 900px)', width: '2000' }, { width: '750' }],
    );
    moveInstrumentation(img, optimizedPic.querySelector('img'));
    img.closest('picture').replaceWith(optimizedPic);
  });
}

function buildDots(slides, slideItems) {
  if (slideItems.length < 2) return null;

  const nav = document.createElement('div');
  nav.className = 'hero-banner-dots';
  nav.setAttribute('role', 'tablist');
  nav.setAttribute('aria-label', 'Banner slides');

  slideItems.forEach((_, index) => {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.className = `hero-banner-dot${index === 0 ? ' is-active' : ''}`;
    dot.setAttribute('role', 'tab');
    dot.setAttribute('aria-label', `Show slide ${index + 1}`);
    dot.setAttribute('aria-selected', index === 0 ? 'true' : 'false');
    dot.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      slides.dataset.activeIndex = String(index);
      slides.dispatchEvent(new CustomEvent('slidechange'));
    });
    nav.append(dot);
  });

  return nav;
}

function initCarousel(slides, dots) {
  const slideItems = [...slides.children];
  if (slideItems.length < 2) return () => {};

  let timer;

  const setActive = (index) => {
    const normalized = ((index % slideItems.length) + slideItems.length) % slideItems.length;
    slides.dataset.activeIndex = String(normalized);
    slideItems.forEach((slide, i) => {
      slide.classList.toggle('is-active', i === normalized);
      slide.setAttribute('aria-hidden', i === normalized ? 'false' : 'true');
    });
    if (dots) {
      dots.querySelectorAll('.hero-banner-dot').forEach((dot, i) => {
        dot.classList.toggle('is-active', i === normalized);
        dot.setAttribute('aria-selected', i === normalized ? 'true' : 'false');
      });
    }
  };

  const next = () => setActive(Number(slides.dataset.activeIndex || 0) + 1);

  const startAutoplay = () => {
    clearInterval(timer);
    timer = setInterval(next, AUTOPLAY_MS);
  };

  const stopAutoplay = () => clearInterval(timer);

  slides.addEventListener('slidechange', () => {
    setActive(Number(slides.dataset.activeIndex || 0));
    startAutoplay();
  });

  slides.closest('.hero-banner')?.addEventListener('mouseenter', stopAutoplay);
  slides.closest('.hero-banner')?.addEventListener('mouseleave', startAutoplay);
  slides.closest('.hero-banner')?.addEventListener('focusin', stopAutoplay);
  slides.closest('.hero-banner')?.addEventListener('focusout', startAutoplay);

  setActive(0);
  startAutoplay();
  return stopAutoplay;
}

function getDescriptionElement(block, heading, link, imageList) {
  const paragraph = [...block.querySelectorAll('p')].find(
    (p) => !p.querySelector('a') && !p.closest('ul'),
  );
  if (paragraph) return paragraph;

  const descriptionRow = [...block.children].find((row) => {
    if (row.tagName !== 'DIV') return false;
    if (row.contains(heading) || row.contains(link) || row.contains(imageList)) return false;
    return Boolean(row.textContent?.trim());
  });

  if (!descriptionRow) return null;

  const source = descriptionRow.querySelector(':scope > div') || descriptionRow;
  const description = document.createElement('p');
  description.textContent = source.textContent.trim();
  moveInstrumentation(source, description);
  return description;
}

/**
 * loads and decorates the hero banner block
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const heading = block.querySelector('h1, h2, h3, h4, h5, h6');
  const link = block.querySelector('a[href]');
  const imageList = block.querySelector('ul');
  const description = getDescriptionElement(block, heading, link, imageList);

  const media = document.createElement('div');
  media.className = 'hero-banner-media';

  const slides = document.createElement('ul');
  slides.className = 'hero-banner-slides';

  if (imageList) {
    [...imageList.children].forEach((item) => {
      const li = document.createElement('li');
      li.className = 'hero-banner-slide';
      moveInstrumentation(item, li);
      const picture = item.querySelector('picture');
      const img = item.querySelector('img');
      if (picture) {
        li.append(picture);
      } else if (img) {
        const pic = document.createElement('picture');
        pic.append(img);
        li.append(pic);
      } else {
        while (item.firstElementChild) li.append(item.firstElementChild);
      }
      slides.append(li);
    });
  } else {
    block.querySelectorAll('picture').forEach((picture) => {
      const li = document.createElement('li');
      li.className = 'hero-banner-slide';
      li.append(picture);
      slides.append(li);
    });
  }

  optimizeSlidePictures(slides);
  media.append(slides);

  const slideItems = [...slides.children];
  if (slideItems.length === 1) {
    slideItems[0].classList.add('is-active');
    slideItems[0].setAttribute('aria-hidden', 'false');
  }

  const dots = buildDots(slides, slideItems);
  if (dots) media.append(dots);

  const content = document.createElement('div');
  content.className = 'hero-banner-content';

  if (heading) {
    content.append(heading);
  }

  if (description) {
    content.append(description);
  }

  const inner = document.createElement('div');
  inner.className = 'hero-banner-inner';
  inner.append(media, content);

  block.replaceChildren(inner);

  if (link?.href) {
    const bannerLink = document.createElement('a');
    bannerLink.className = 'hero-banner-link';
    bannerLink.href = link.href;
    bannerLink.title = link.title || link.textContent || heading?.textContent || '';
    bannerLink.setAttribute(
      'aria-label',
      [heading?.textContent, description?.textContent].filter(Boolean).join(' — '),
    );
    moveInstrumentation(link, bannerLink);
    inner.prepend(bannerLink);
  }

  initCarousel(slides, dots);
}
