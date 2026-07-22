import { moveInstrumentation } from '../../scripts/scripts.js';

function getRows(block) {
  return [...block.children].filter((child) => child.tagName === 'DIV');
}

function getField(block, prop) {
  return block.querySelector(`[data-aue-prop="${prop}"]`);
}

function getFieldRow(block, prop) {
  const field = getField(block, prop);
  return field?.closest('.footer-top > div') || null;
}

function getText(element) {
  return element?.textContent?.trim() || '';
}

function findHeading(block, rows) {
  const headingField = getField(block, 'text');
  const headingEl = headingField || block.querySelector('h1, h2, h3, h4, h5, h6');
  const headingRow = getFieldRow(block, 'text')
    || headingEl?.closest('.footer-top > div')
    || rows[0];

  return {
    headingEl,
    headingRow,
    headingText: getText(headingField || headingEl) || 'Connect with us',
    headingSource: headingField?.closest('.footer-top > div > div')
      || headingEl?.closest('.footer-top > div > div')
      || headingRow,
  };
}

function findAnchor(block) {
  const ctaField = getField(block, 'cta');
  return ctaField?.querySelector('a[href]')
    || ctaField?.closest('a[href]')
    || block.querySelector('a[href]');
}

function findCtaText(block, rows, headingRow, linkRow, anchor) {
  const ctaTextField = getField(block, 'ctaText');
  const ctaTextFromField = getText(ctaTextField);
  if (ctaTextFromField) return ctaTextFromField;

  const ctaTextRow = getFieldRow(block, 'ctaText');
  if (ctaTextRow && ctaTextRow !== headingRow && ctaTextRow !== linkRow) {
    const ctaTextFromRow = getText(ctaTextRow);
    if (ctaTextFromRow) return ctaTextFromRow;
  }

  if (rows.length === 1) {
    const cells = [...rows[0].children].filter((child) => child.tagName === 'DIV');
    const headingCell = headingRow?.querySelector(':scope > div') || cells[0];
    const labelCell = cells.find((cell) => cell !== headingCell && !cell.querySelector('a[href]'));
    const ctaTextFromCell = getText(labelCell);
    if (ctaTextFromCell) return ctaTextFromCell;
  }

  const labelRow = rows.find((row) => {
    if (row === headingRow || row === linkRow) return false;
    if (row.querySelector('a[href]')) return false;
    return Boolean(getText(row));
  });
  if (labelRow) return getText(labelRow);

  return getText(anchor) || 'Contact Us';
}

/**
 * loads and decorates the footer top block
 * @param {Element} block The block element
 */
export default function decorate(block) {
  if (block.querySelector('.footer-top-inner')) return;

  const rows = getRows(block);
  if (!rows.length) return;

  const { headingRow, headingText, headingSource } = findHeading(block, rows);
  const anchor = findAnchor(block);
  const linkRow = anchor?.closest('.footer-top > div') || null;
  const href = anchor?.getAttribute('href') || '';
  const ctaText = findCtaText(block, rows, headingRow, linkRow, anchor);

  const inner = document.createElement('div');
  inner.className = 'footer-top-inner';

  const content = document.createElement('div');
  content.className = 'footer-top-content';

  const heading = document.createElement('h2');
  heading.className = 'footer-top-heading';
  heading.textContent = headingText;
  if (headingSource) moveInstrumentation(headingSource, heading);
  content.append(heading);

  if (href) {
    const link = document.createElement('a');
    link.className = 'footer-top-link';
    link.href = href;
    if (anchor) moveInstrumentation(anchor, link);

    const textSpan = document.createElement('span');
    textSpan.className = 'footer-top-link-text';
    textSpan.textContent = ctaText;

    const arrow = document.createElement('span');
    arrow.className = 'footer-top-link-arrow';
    arrow.setAttribute('aria-hidden', 'true');
    arrow.textContent = '→';

    link.append(textSpan, arrow);
    content.append(link);
  }

  inner.append(content);
  moveInstrumentation(block, inner);
  block.replaceChildren(inner);
}
