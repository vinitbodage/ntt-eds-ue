const CONTENT_STACK_MODEL = 'content-stack-section';
const LAYOUT_CLASSES = ['layout-center', 'layout-left', 'layout-right'];

function toClassName(name) {
  return typeof name === 'string'
    ? name
      .toLowerCase()
      .replace(/[^0-9a-z]/gi, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
    : '';
}

function parseMargin(value) {
  const parsed = Number.parseInt(String(value ?? '0').trim(), 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function applyLayoutClasses(section) {
  LAYOUT_CLASSES.forEach((cls) => section.classList.remove(cls));

  const { layout } = section.dataset;
  if (!layout) return;

  layout
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .forEach((item) => section.classList.add(toClassName(item)));
}

function applyTitleMarginBottom(section) {
  const margin = parseMargin(section.dataset.titleMarginBottom);
  section.style.setProperty('--content-stack-title-margin-bottom', `${margin}px`);

  const heading = section.querySelector(
    ':scope > .default-content-wrapper:first-child :is(h1, h2, h3, h4, h5, h6)',
  );
  if (heading) {
    heading.style.marginBottom = margin > 0 ? `${margin}px` : '';
  }
}

function isContentStackSection(section) {
  return section.matches(`[data-aue-model="${CONTENT_STACK_MODEL}"], .content-stack-section`)
    || section.dataset.layout
    || section.dataset.titleMarginBottom;
}

function decorateContentStackSection(section) {
  if (!section.classList.contains('section')) return;

  section.classList.add('content-stack-section');
  applyLayoutClasses(section);
  applyTitleMarginBottom(section);
}

/**
 * Decorates Content Stack Section layout and title spacing.
 * @param {Element} main The main container element
 */
export default function decorateContentStackSections(main) {
  main.querySelectorAll(':scope > .section').forEach((section) => {
    if (isContentStackSection(section)) {
      decorateContentStackSection(section);
    }
  });
}
