import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

const BREAKPOINTS = [{ media: '(min-width: 600px)', width: '600' }, { width: '1200' }];

function getLinkInfo(cell) {
  const anchor = cell?.querySelector('a[href]');
  if (!anchor) return { href: '', title: '' };
  return {
    href: anchor.getAttribute('href') || '',
    title: anchor.getAttribute('title') || anchor.textContent.trim(),
  };
}

function buildSlide(row) {
  const cells = [...row.children];
  const imageCell = cells.find((cell) => cell.querySelector('picture'));
  const linkCell = cells.find((cell) => cell.querySelector('a[href]'));
  const textCells = cells.filter((cell) => cell !== imageCell && cell !== linkCell);

  const picture = imageCell?.querySelector('picture');
  const img = picture?.querySelector('img');
  const title = textCells[0]?.textContent.trim() || '';
  const description = textCells[1]?.textContent.trim() || '';
  const { href, title: linkTitle } = getLinkInfo(linkCell);

  const li = document.createElement('li');
  li.className = 'hero-banner-slide';
  moveInstrumentation(row, li);

  const wrapper = document.createElement(href ? 'a' : 'div');
  wrapper.className = 'hero-banner-link';
  if (href) {
    wrapper.href = href;
    wrapper.setAttribute('aria-label', linkTitle || title || 'Banner link');
    if (linkTitle) wrapper.title = linkTitle;
  }

  const imageWrapper = document.createElement('div');
  imageWrapper.className = 'hero-banner-image';

  if (img) {
    const optimizedPic = createOptimizedPicture(
      img.src,
      img.alt || title,
      true,
      BREAKPOINTS,
    );
    moveInstrumentation(img, optimizedPic.querySelector('img'));
    imageWrapper.append(optimizedPic);
  }

  const content = document.createElement('div');
  content.className = 'hero-banner-content';

  if (title) {
    const heading = document.createElement('h2');
    heading.className = 'hero-banner-title';
    heading.textContent = title;
    content.append(heading);
  }

  if (description) {
    const paragraph = document.createElement('p');
    paragraph.className = 'hero-banner-description';
    paragraph.textContent = description;
    content.append(paragraph);
  }

  wrapper.append(imageWrapper, content);
  li.append(wrapper);
  return li;
}

function createNavButton(label, className) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = className;
  button.setAttribute('aria-label', label);
  return button;
}

function initCarousel(block, slides, slideCount) {
  let activeIndex = 0;

  const showSlide = (index) => {
    activeIndex = (index + slideCount) % slideCount;
    slides.forEach((slide, i) => {
      const isActive = i === activeIndex;
      slide.classList.toggle('active', isActive);
      slide.setAttribute('aria-hidden', isActive ? 'false' : 'true');
      slide.querySelector('.hero-banner-link')?.setAttribute('tabindex', isActive ? '0' : '-1');
    });
    block.querySelectorAll('.hero-banner-dot').forEach((dot, i) => {
      dot.classList.toggle('active', i === activeIndex);
      dot.setAttribute('aria-selected', i === activeIndex ? 'true' : 'false');
    });
  };

  if (slideCount > 1) {
    const prev = createNavButton('Previous banner', 'hero-banner-prev');
    const next = createNavButton('Next banner', 'hero-banner-next');
    const dots = document.createElement('div');
    dots.className = 'hero-banner-dots';
    dots.setAttribute('role', 'tablist');
    dots.setAttribute('aria-label', 'Banner slides');

    slides.forEach((_, i) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'hero-banner-dot';
      dot.setAttribute('role', 'tab');
      dot.setAttribute('aria-label', `Show banner ${i + 1}`);
      dot.addEventListener('click', () => showSlide(i));
      dots.append(dot);
    });

    prev.addEventListener('click', () => showSlide(activeIndex - 1));
    next.addEventListener('click', () => showSlide(activeIndex + 1));

    block.append(prev, next, dots);
  }

  showSlide(0);
}

/**
 * loads and decorates the hero banner block
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const slides = [...block.children].map((row) => buildSlide(row));
  if (!slides.length) return;

  block.textContent = '';
  block.setAttribute('role', 'region');
  block.setAttribute('aria-roledescription', 'carousel');
  block.setAttribute('aria-label', 'Hero banner');

  const viewport = document.createElement('div');
  viewport.className = 'hero-banner-viewport';

  const list = document.createElement('ul');
  list.className = 'hero-banner-slides';
  list.append(...slides);
  viewport.append(list);
  block.append(viewport);

  initCarousel(block, slides, slides.length);
}
