const CONTENT_STACK_MODEL = 'content-stack-section';
const LAYOUT_CLASSES = ['layout-center', 'layout-left', 'layout-right'];
const STYLE_CLASSES = ['highlight', 'navy', ...LAYOUT_CLASSES];

function toClassName(name) {
  return typeof name === 'string'
    ? name
      .toLowerCase()
      .replace(/[^0-9a-z]/gi, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
    : '';
}

function readMetadataField(section, fieldName) {
  const blocks = section.querySelectorAll(':scope .section-metadata');
  let value = '';
  blocks.forEach((meta) => {
    meta.querySelectorAll(':scope > div').forEach((row) => {
      const cols = [...row.children];
      if (cols.length < 2) return;
      if (toClassName(cols[0].textContent) !== fieldName) return;
      value = cols[1].textContent.trim();
    });
  });
  return value;
}

function readSectionField(section, fieldName) {
  const prop = section.querySelector(`[data-aue-prop="${fieldName}"]`);
  if (prop?.textContent.trim()) return prop.textContent.trim();

  const metadataValue = readMetadataField(section, fieldName);
  if (metadataValue) return metadataValue;

  const camelKey = fieldName.replace(/-([a-z])/g, (_, char) => char.toUpperCase());
  return section.dataset[camelKey] || section.dataset[fieldName] || '';
}

function splitStyleValues(value) {
  return (value || '')
    .split(',')
    .map((item) => toClassName(item.trim()))
    .filter(Boolean);
}

function applySectionClasses(section) {
  STYLE_CLASSES.forEach((cls) => section.classList.remove(cls));

  const styleValues = [
    ...splitStyleValues(readSectionField(section, 'style')),
    ...splitStyleValues(readSectionField(section, 'layout')),
  ];

  [...new Set(styleValues)].forEach((cls) => {
    if (STYLE_CLASSES.includes(cls)) {
      section.classList.add(cls);
    }
  });
}

function isContentStackSection(section) {
  return section.matches(`[data-aue-model="${CONTENT_STACK_MODEL}"], .content-stack-section`)
    || section.querySelector('[data-aue-prop="layout"]')
    || readMetadataField(section, 'layout')
    || section.dataset.layout;
}

function decorateContentStackSection(section) {
  if (!section.classList.contains('section')) return;

  section.classList.add('content-stack-section');
  applySectionClasses(section);
}

/**
 * Decorates Content Stack Section layout variants.
 * @param {Element} main The main container element
 */
export default function decorateContentStackSections(main) {
  main.querySelectorAll(':scope > .section').forEach((section) => {
    if (isContentStackSection(section)) {
      decorateContentStackSection(section);
    }
  });
}

let authoringObserverAttached = false;

function attachAuthoringObserver(main) {
  const { classList } = document.documentElement;
  if (authoringObserverAttached || (!classList.contains('adobe-ue-edit') && !classList.contains('adobe-ue-preview'))) {
    return;
  }

  authoringObserverAttached = true;
  let timer;
  const observer = new MutationObserver(() => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => decorateContentStackSections(main), 50);
  });
  observer.observe(main, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: ['data-aue-prop', 'class'],
  });
}

export function initContentStackSectionAuthoring(main) {
  attachAuthoringObserver(main);
}
