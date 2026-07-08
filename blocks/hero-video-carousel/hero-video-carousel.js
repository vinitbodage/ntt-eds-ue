import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

function isConfigRow(row) {
  if (row.children.length !== 1) return false;
  const cell = row.querySelector(':scope > div');
  if (!cell) return false;
  if (row.querySelector('picture, img, video, h1, h2, h3, h4, h5, h6')) return false;
  const text = cell.textContent.trim();
  return text === 'true' || text === 'false' || !Number.isNaN(Number(text));
}

function parseConfig(rows) {
  const config = { autoplayDuration: 8, autoplay: true };
  const slideRows = [];

  rows.forEach((row) => {
    if (!isConfigRow(row)) {
      slideRows.push(row);
      return;
    }

    const text = row.textContent.trim();
    if (text === 'true' || text === 'false') {
      config.autoplay = text === 'true';
    } else {
      const value = Number(text);
      if (!Number.isNaN(value)) config.autoplayDuration = value;
    }
  });

  return { config, slideRows };
}

function getVideoLink(row) {
  const cells = [...row.children];
  const firstLink = cells[0]?.querySelector('a[href]');
  if (firstLink) return firstLink;

  return [...row.querySelectorAll('a[href]')].find((anchor) => (
    /\.(mp4|webm|ogg)(\?|$)/i.test(anchor.href) || anchor.href.includes('video')
  ));
}

function getCtaLink(row, videoLink) {
  return [...row.querySelectorAll('a[href]')].find((anchor) => anchor !== videoLink);
}

function ensureCtaLabel(anchor) {
  const text = anchor.textContent.trim();
  if (!text) {
    anchor.textContent = 'Read more';
  }
  if (!anchor.textContent.includes('→')) {
    anchor.append(' →');
  }
}

function optimizePosterImage(picture, isFirstSlide) {
  const img = picture?.querySelector('img');
  if (!img) return { posterSrc: '', posterAlt: '' };

  if (!isFirstSlide) {
    img.setAttribute('loading', 'lazy');
    return { posterSrc: img.src, posterAlt: img.alt || '' };
  }

  const optimizedPic = createOptimizedPicture(
    img.src,
    img.alt,
    false,
    [{ media: '(min-width: 900px)', width: '2000' }, { width: '750' }],
  );
  const optimizedImg = optimizedPic.querySelector('img');
  moveInstrumentation(img, optimizedImg);
  optimizedImg.setAttribute('fetchpriority', 'high');
  optimizedImg.setAttribute('loading', 'eager');
  picture.replaceWith(optimizedPic);
  return { posterSrc: optimizedImg.src, posterAlt: optimizedImg.alt || '' };
}

function buildMedia(videoLink, picture, isFirstSlide) {
  const media = document.createElement('div');
  media.className = 'hero-video-carousel-media';
  const { posterSrc, posterAlt } = optimizePosterImage(picture, isFirstSlide);
  const hasVideo = Boolean(videoLink?.href);

  if (!hasVideo) {
    if (posterSrc) {
      const poster = document.createElement('img');
      poster.className = 'hero-video-carousel-poster';
      poster.src = posterSrc;
      poster.alt = posterAlt;
      if (isFirstSlide) {
        poster.setAttribute('fetchpriority', 'high');
        poster.setAttribute('loading', 'eager');
      } else {
        poster.setAttribute('loading', 'lazy');
      }
      if (picture) {
        moveInstrumentation(picture, poster);
      }
      media.append(poster);
    }
    return {
      media,
      video: null,
      loadVideo: () => {},
      pauseVideo: () => {},
      playVideo: () => Promise.resolve(),
    };
  }

  const video = document.createElement('video');
  video.muted = true;
  video.loop = true;
  video.playsInline = true;
  video.setAttribute('playsinline', '');
  video.setAttribute('preload', isFirstSlide ? 'auto' : 'none');

  if (posterSrc) {
    video.poster = posterSrc;
    video.setAttribute('aria-label', posterAlt || 'Hero video');
  }

  const source = document.createElement('source');
  if (isFirstSlide) {
    source.src = videoLink.href;
    source.type = /\.webm(\?|$)/i.test(videoLink.href) ? 'video/webm' : 'video/mp4';
  } else {
    source.dataset.src = videoLink.href;
    source.dataset.type = /\.webm(\?|$)/i.test(videoLink.href) ? 'video/webm' : 'video/mp4';
  }
  video.append(source);

  if (videoLink) {
    moveInstrumentation(videoLink.closest('div') || videoLink, video);
  }

  const loadVideo = () => {
    if (source.src || !source.dataset.src) return;
    source.src = source.dataset.src;
    source.type = source.dataset.type;
    delete source.dataset.src;
    delete source.dataset.type;
    video.load();
  };

  const playVideo = () => {
    loadVideo();
    return video.play().catch(() => {});
  };

  media.append(video);
  return {
    media,
    video,
    loadVideo,
    pauseVideo: () => video.pause(),
    playVideo,
  };
}

function buildToggleIcon(isPaused) {
  const icon = document.createElement('span');
  icon.className = 'hero-video-carousel-toggle-icon';
  icon.setAttribute('aria-hidden', 'true');
  icon.innerHTML = isPaused
    ? '<svg viewBox="0 0 24 24" focusable="false"><path d="M8 5v14l11-7z"/></svg>'
    : '<svg viewBox="0 0 24 24" focusable="false"><path d="M6 5h4v14H6zm8 0h4v14h-4z"/></svg>';
  return icon;
}

function buildSegment(index, reducedMotion) {
  const segment = document.createElement('button');
  segment.type = 'button';
  segment.className = 'hero-video-carousel-segment';
  segment.setAttribute('role', 'tab');
  segment.setAttribute('aria-label', `Show slide ${index + 1}`);

  const fill = document.createElement('span');
  fill.className = 'hero-video-carousel-segment-fill';
  fill.setAttribute('aria-hidden', 'true');
  segment.append(fill);

  if (reducedMotion) {
    segment.disabled = index !== 0;
    segment.setAttribute('aria-disabled', index === 0 ? 'false' : 'true');
  }

  return { segment, segmentFill: fill };
}

function initCarousel(block, slideItems, config, liveRegion) {
  if (slideItems.length === 0) return;

  const toggle = block.querySelector('.hero-video-carousel-toggle');
  const progress = block.querySelector('.hero-video-carousel-progress');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canAutoRotate = slideItems.length > 1 && config.autoplay && !reducedMotion;

  let activeIndex = 0;
  let timer = null;
  let isUserPaused = false;

  const durationMs = Math.max(config.autoplayDuration, 1) * 1000;

  const updateLiveRegion = (index) => {
    const heading = slideItems[index]?.copy.querySelector('h1, h2, h3, h4, h5, h6');
    liveRegion.textContent = heading?.textContent?.trim() || '';
  };

  const pauseAllVideos = () => {
    slideItems.forEach((item) => item.pauseVideo());
  };

  const resetSegmentProgress = () => {
    slideItems.forEach((item, i) => {
      item.segmentFill.classList.remove('is-animating', 'is-complete');
      item.segmentFill.getBoundingClientRect();
      if (i !== activeIndex) return;

      if (canAutoRotate && !isUserPaused) {
        item.segmentFill.style.animationDuration = `${durationMs}ms`;
        item.segmentFill.classList.add('is-animating');
        return;
      }

      item.segmentFill.style.animationDuration = '';
      if (!canAutoRotate && !reducedMotion) {
        item.segmentFill.classList.add('is-complete');
      } else {
        item.segmentFill.classList.remove('is-complete');
      }
    });
  };

  const stopTimer = () => {
    if (timer) {
      window.clearTimeout(timer);
      timer = null;
    }
  };

  function goToSlide(index) {
    stopTimer();
    activeIndex = index;

    slideItems.forEach((item, i) => {
      const isActive = i === index;
      item.slide.classList.toggle('is-active', isActive);
      item.slide.setAttribute('aria-hidden', isActive ? 'false' : 'true');
      item.copy.classList.toggle('is-active', isActive);
      item.copy.setAttribute('aria-hidden', isActive ? 'false' : 'true');
      item.segment.classList.toggle('is-active', isActive);
      item.segment.setAttribute('aria-selected', isActive ? 'true' : 'false');

      if (!isActive) {
        item.pauseVideo();
      }
    });

    updateLiveRegion(index);
    resetSegmentProgress();

    if (!isUserPaused && !reducedMotion) {
      slideItems[index].playVideo();
    }

    if (canAutoRotate && !isUserPaused) {
      timer = window.setTimeout(() => {
        goToSlide((activeIndex + 1) % slideItems.length);
      }, durationMs);
    }
  }

  const syncToggle = () => {
    toggle.replaceChildren(buildToggleIcon(isUserPaused));
    toggle.setAttribute('aria-label', isUserPaused ? 'Play carousel' : 'Pause carousel');
    toggle.setAttribute('aria-pressed', isUserPaused ? 'false' : 'true');
    block.classList.toggle('is-paused', isUserPaused);
    block.classList.toggle('is-reduced-motion', reducedMotion);
  };

  slideItems.forEach((item, index) => {
    item.segment.addEventListener('click', () => {
      if (reducedMotion && index !== 0) return;
      goToSlide(index);
    });
  });

  toggle.addEventListener('click', () => {
    if (reducedMotion) return;

    isUserPaused = !isUserPaused;

    if (isUserPaused) {
      stopTimer();
      pauseAllVideos();
      slideItems.forEach((item) => item.segmentFill.classList.remove('is-animating'));
    } else {
      slideItems[activeIndex].playVideo();
      resetSegmentProgress();
      if (canAutoRotate) {
        timer = window.setTimeout(() => {
          goToSlide((activeIndex + 1) % slideItems.length);
        }, durationMs);
      }
    }

    syncToggle();
  });

  if (slideItems.length < 2) {
    progress.hidden = true;
  }

  if (reducedMotion) {
    isUserPaused = true;
    block.classList.add('is-reduced-motion');
    goToSlide(0);
    pauseAllVideos();
    toggle.disabled = true;
    toggle.setAttribute('aria-disabled', 'true');
  } else {
    goToSlide(0);
  }

  syncToggle();

  block.addEventListener('mouseenter', () => {
    if (isUserPaused || !canAutoRotate) return;
    stopTimer();
    slideItems[activeIndex]?.segmentFill.classList.remove('is-animating');
  });

  block.addEventListener('mouseleave', () => {
    if (isUserPaused || !canAutoRotate) return;
    resetSegmentProgress();
    timer = window.setTimeout(() => {
      goToSlide((activeIndex + 1) % slideItems.length);
    }, durationMs);
  });

  block.addEventListener('focusin', (event) => {
    if (event.target.closest('.hero-video-carousel-toggle, .hero-video-carousel-segment')) return;
    if (isUserPaused || !canAutoRotate) return;
    stopTimer();
  });

  block.addEventListener('focusout', (event) => {
    if (block.contains(event.relatedTarget)) return;
    if (isUserPaused || !canAutoRotate) return;
    resetSegmentProgress();
    timer = window.setTimeout(() => {
      goToSlide((activeIndex + 1) % slideItems.length);
    }, durationMs);
  });
}

/**
 * loads and decorates the hero video carousel block
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const { config, slideRows } = parseConfig([...block.children]);
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  block.dataset.autoplayDuration = String(config.autoplayDuration);
  block.dataset.autoplay = String(config.autoplay);
  block.style.setProperty('--hero-video-carousel-duration', `${Math.max(config.autoplayDuration, 1)}s`);

  const inner = document.createElement('div');
  inner.className = 'hero-video-carousel-inner';

  const slides = document.createElement('ul');
  slides.className = 'hero-video-carousel-slides';

  const content = document.createElement('div');
  content.className = 'hero-video-carousel-content';

  const progress = document.createElement('div');
  progress.className = 'hero-video-carousel-progress';
  progress.setAttribute('role', 'tablist');
  progress.setAttribute('aria-label', 'Hero video carousel slides');

  const liveRegion = document.createElement('div');
  liveRegion.className = 'hero-video-carousel-live';
  liveRegion.setAttribute('aria-live', 'polite');
  liveRegion.setAttribute('aria-atomic', 'true');

  const copies = document.createElement('div');
  copies.className = 'hero-video-carousel-copies';

  const slideItems = [];

  slideRows.forEach((row, index) => {
    const slide = document.createElement('li');
    slide.className = 'hero-video-carousel-slide';
    moveInstrumentation(row, slide);

    const videoLink = getVideoLink(row);
    const picture = row.querySelector('picture');
    const heading = row.querySelector('h1, h2, h3, h4, h5, h6');
    const ctaLink = getCtaLink(row, videoLink);

    const {
      media,
      video,
      loadVideo,
      pauseVideo,
      playVideo,
    } = buildMedia(videoLink, picture, index === 0);
    slide.append(media);

    const copy = document.createElement('div');
    copy.className = 'hero-video-carousel-copy';

    if (heading) {
      copy.append(heading);
    }

    if (ctaLink) {
      ensureCtaLabel(ctaLink);
      ctaLink.classList.add('button', 'accent');

      const ctaWrapper = document.createElement('p');
      ctaWrapper.className = 'button-wrapper';
      ctaWrapper.append(ctaLink);
      copy.append(ctaWrapper);
    }

    const { segment, segmentFill } = buildSegment(index, reducedMotion);

    slideItems.push({
      slide,
      copy,
      video,
      segment,
      segmentFill,
      loadVideo,
      pauseVideo,
      playVideo,
    });

    slides.append(slide);
    copies.append(copy);
    progress.append(segment);
  });

  content.append(liveRegion, progress, copies);

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'hero-video-carousel-toggle';

  inner.append(slides, content, toggle);
  block.replaceChildren(inner);

  initCarousel(block, slideItems, config, liveRegion);
}
