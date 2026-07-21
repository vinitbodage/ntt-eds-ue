import { moveInstrumentation } from '../../scripts/scripts.js';

const MARGIN_PROPS = ['marginTop', 'marginBottom'];
const PLACEHOLDER_TEXT = /^(title|description|link label|image alt text|learn more|read more|tile|#)$/i;

function isAuthoring() {
  const { classList } = document.documentElement;
  return classList.contains('adobe-ue-edit') || classList.contains('adobe-ue-preview');
}

function isEmptyOrPlaceholder(text) {
  const trimmed = (text || '').trim();
  return !trimmed || PLACEHOLDER_TEXT.test(trimmed);
}

function parseMargin(value) {
  const parsed = Number.parseInt(String(value ?? '0').trim(), 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function isMarginValueCell(element) {
  if (!element?.matches('div')) return false;
  const text = element.textContent.trim();
  return text !== '' && /^\d+$/.test(text);
}

function applyMargins(heading, margins) {
  MARGIN_PROPS.forEach((prop) => {
    const value = margins[prop];
    if (value > 0) {
      heading.style[prop] = `${value}px`;
    }
  });
}

function readInstrumentedMargins(block, removeCells) {
  const margins = {};
  let found = false;

  MARGIN_PROPS.forEach((prop) => {
    const field = block.querySelector(`[data-aue-prop="${prop}"]`);
    if (!field) return;
    margins[prop] = parseMargin(field.textContent);
    found = true;
    if (removeCells) {
      field.closest('.title-with-margin > div')?.remove();
    } else {
      field.classList.add('title-with-margin-config');
    }
  });

  return found ? margins : null;
}

function readDeliveryMargins(block, heading, removeCells) {
  const marginCells = [];

  [...block.children].forEach((row) => {
    if (row.tagName !== 'DIV') return;
    [...row.children].forEach((cell) => {
      if (cell.contains(heading)) return;
      if (isMarginValueCell(cell)) marginCells.push({ row, cell });
    });
  });

  if (marginCells.length < MARGIN_PROPS.length) return null;

  const margins = {};
  MARGIN_PROPS.forEach((prop, index) => {
    margins[prop] = parseMargin(marginCells[index].cell.textContent);
    if (removeCells) {
      marginCells[index].row.remove();
    } else {
      marginCells[index].cell.classList.add('title-with-margin-config');
    }
  });

  return margins;
}

function readMargins(block, heading, removeCells) {
  return readInstrumentedMargins(block, removeCells)
    || readDeliveryMargins(block, heading, removeCells);
}

function removeTitleTypeRows(block, titleRow, removeCells) {
  if (!removeCells) return;
  [...block.children].forEach((row) => {
    if (row === titleRow) return;
    const text = row.textContent?.trim();
    if (/^h[1-6]$/i.test(text)) row.remove();
  });
}

function removeDescriptionRow(source, removeCells) {
  if (!removeCells || !source) return;
  const row = source.closest('.title-with-margin > div');
  if (row && !row.querySelector('h1, h2, h3, h4, h5, h6')) {
    row.remove();
  }
}

function findDeliveryDescription(block, heading, removeCells) {
  const titleRow = heading.closest('.title-with-margin > div');
  const inlineParagraph = titleRow?.querySelector(':scope p:not(:has(a))');
  if (inlineParagraph && !isEmptyOrPlaceholder(inlineParagraph.textContent)) {
    return inlineParagraph;
  }

  const descriptionRow = [...block.children].find((row) => {
    if (row === titleRow || row.contains(heading)) return false;
    if (row.querySelector('[data-aue-prop="marginTop"], [data-aue-prop="marginBottom"]')) return false;
    if (row.querySelector('h1, h2, h3, h4, h5, h6')) return false;

    const cell = row.querySelector(':scope > div') || row;
    if (isMarginValueCell(cell)) return false;

    const text = cell.textContent.trim();
    return !isEmptyOrPlaceholder(text) && !/^h[1-6]$/i.test(text);
  });

  if (!descriptionRow) return null;

  const cell = descriptionRow.querySelector(':scope > div') || descriptionRow;
  const paragraph = cell.querySelector('p:not(:has(a))');
  if (paragraph && !isEmptyOrPlaceholder(paragraph.textContent)) {
    if (removeCells) descriptionRow.remove();
    return paragraph;
  }

  const description = document.createElement('p');
  description.textContent = cell.textContent.trim();
  moveInstrumentation(cell, description);
  if (removeCells) descriptionRow.remove();
  return description;
}

function getDescriptionElement(block, heading, removeCells) {
  const field = block.querySelector('[data-aue-prop="description"]');
  if (field) {
    const text = field.textContent.trim();
    if (isEmptyOrPlaceholder(text)) {
      removeDescriptionRow(field, removeCells);
      return null;
    }

    const paragraph = field.querySelector('p:not(:has(a))');
    if (paragraph) {
      moveInstrumentation(field, paragraph);
      removeDescriptionRow(field, removeCells);
      return paragraph;
    }

    const description = document.createElement('p');
    description.textContent = text;
    moveInstrumentation(field, description);
    removeDescriptionRow(field, removeCells);
    return description;
  }

  return findDeliveryDescription(block, heading, removeCells);
}

/**
 * loads and decorates the title-with-margin block
 * @param {Element} block The block element
 */
export default function decorate(block) {
  if (block.querySelector('.title-with-margin-inner')) return;

  const heading = block.querySelector('h1, h2, h3, h4, h5, h6');
  if (!heading) return;

  const titleRow = heading.closest('.title-with-margin > div');
  const removeCells = !isAuthoring();
  const margins = readMargins(block, heading, removeCells);
  if (margins) applyMargins(heading, margins);

  const description = getDescriptionElement(block, heading, removeCells);
  if (description) description.classList.add('title-with-margin-description');

  removeTitleTypeRows(block, titleRow, removeCells);

  const inner = document.createElement('div');
  inner.className = 'title-with-margin-inner';
  if (titleRow) moveInstrumentation(titleRow, inner);
  inner.append(heading);
  if (description) inner.append(description);
  block.replaceChildren(inner);
}
