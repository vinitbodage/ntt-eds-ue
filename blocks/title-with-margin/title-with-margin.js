import { moveInstrumentation } from '../../scripts/scripts.js';

const MARGIN_PROPS = ['marginTop', 'marginBottom'];

function isAuthoring() {
  const { classList } = document.documentElement;
  return classList.contains('adobe-ue-edit') || classList.contains('adobe-ue-preview');
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

  removeTitleTypeRows(block, titleRow, removeCells);

  const inner = document.createElement('div');
  inner.className = 'title-with-margin-inner';
  if (titleRow) moveInstrumentation(titleRow, inner);
  inner.append(heading);
  block.replaceChildren(inner);
}
