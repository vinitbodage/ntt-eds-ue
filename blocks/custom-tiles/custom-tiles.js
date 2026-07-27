/*
 * Custom Tiles Block
 * Responsive grid of custom tiles with image, title, description, and link.
 * Supports Universal Editor and Document Authoring.
 */
import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

export default function decorate(block) {
  if (block.querySelector('ul')) return;

  const ul = document.createElement('ul');
  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    li.className = 'custom-tiles-tile';
    moveInstrumentation(row, li);
    while (row.firstElementChild) li.append(row.firstElementChild);

    [...li.children].forEach((div) => {
      if (div.children.length === 1 && div.querySelector('picture')) {
        div.className = 'custom-tiles-tile-image';
      } else {
        div.className = 'custom-tiles-tile-body';
        const heading = div.querySelector('h1, h2, h3, h4, h5, h6');
        if (heading) heading.classList.add('custom-tiles-tile-title');
      }
    });

    ul.append(li);
  });

  ul.querySelectorAll('picture > img').forEach((img) => {
    const optimized = createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }]);
    moveInstrumentation(img, optimized.querySelector('img'));
    img.closest('picture').replaceWith(optimized);
  });

  block.replaceChildren(ul);
}
