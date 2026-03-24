const THEME_STORAGE_KEY = 'wordify-theme';
const prefersReducedMotion =
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

const themeRoot = document.documentElement;
const themeButtons = Array.from(document.querySelectorAll('[data-theme-choice]'));
const themeColorMeta = document.querySelector('meta[name="theme-color"]');
const themeStylesheet = document.getElementById('theme-stylesheet');
const pageRoot = document.querySelector('.js-word-page');
const floatingNav = document.querySelector('.js-floating-nav');
const navigationEntry = performance.getEntriesByType?.('navigation')?.[0];
const initialHashTargetId = getHashTargetId();

function getHashTargetId() {
  return window.location.hash ? decodeURIComponent(window.location.hash.slice(1)) : '';
}

function isWordTargetId(targetId) {
  return typeof targetId === 'string' && targetId.startsWith('word-');
}

function setInstantScroll(callback) {
  const previousBehavior = themeRoot.style.scrollBehavior;
  themeRoot.style.scrollBehavior = 'auto';
  callback();
  window.requestAnimationFrame(() => {
    themeRoot.style.scrollBehavior = previousBehavior;
  });
}

function getScrollBehavior(instant = false) {
  return instant || prefersReducedMotion ? 'auto' : 'smooth';
}

function normalizeSearchTerms(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
}

function isAsciiSearchTerm(term) {
  return /^[a-z0-9-]+$/i.test(term);
}

function matchesCompactField(source, term, prefixOnly = false) {
  const normalized = String(source ?? '')
    .trim()
    .toLowerCase();
  if (!normalized) {
    return false;
  }

  const parts = normalized.split(/[\s/-]+/).filter(Boolean);
  if (parts.some((part) => part.startsWith(term))) {
    return true;
  }

  if (prefixOnly) {
    return false;
  }

  return normalized.includes(term) || parts.some((part) => term.length >= 3 && part.includes(term));
}

function matchesSearchTerm(card, term) {
  const searchWord = card.dataset.searchWord || '';
  const searchMeaning = card.dataset.searchMeaning || '';
  const searchLevels = card.dataset.searchLevels || '';

  if (isAsciiSearchTerm(term)) {
    const prefixOnly = term.length <= 2;
    return (
      matchesCompactField(searchWord, term, prefixOnly) ||
      matchesCompactField(searchLevels, term, prefixOnly)
    );
  }

  return searchWord.includes(term) || searchMeaning.includes(term) || searchLevels.includes(term);
}

function applyTheme(themeName, options = {}) {
  const { persist = true } = options;
  const button = themeButtons.find((item) => item.dataset.themeChoice === themeName);
  if (!button) {
    return;
  }

  themeRoot.dataset.theme = themeName;

  if (themeStylesheet && button.dataset.themeHref) {
    themeStylesheet.setAttribute('href', button.dataset.themeHref);
  }

  if (themeColorMeta) {
    themeColorMeta.setAttribute('content', button.dataset.themeColor || themeColorMeta.content);
  }

  themeButtons.forEach((item) => {
    item.classList.toggle('is-active', item.dataset.themeChoice === themeName);
  });

  if (persist) {
    window.localStorage.setItem(THEME_STORAGE_KEY, themeName);
  }
}

if (themeButtons.length > 0) {
  const defaultTheme = themeRoot.dataset.defaultTheme || themeButtons[0].dataset.themeChoice;
  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
  const initialTheme = themeButtons.some((button) => button.dataset.themeChoice === storedTheme)
    ? storedTheme
    : defaultTheme;

  applyTheme(initialTheme, { persist: false });

  themeButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const themeName = button.dataset.themeChoice;
      if (themeName) {
        applyTheme(themeName);
      }
    });
  });
}

if (document.body.classList.contains('page-root') && 'scrollRestoration' in window.history) {
  window.history.scrollRestoration = 'manual';
}

if (
  document.body.classList.contains('page-root') &&
  !initialHashTargetId &&
  navigationEntry?.type === 'navigate'
) {
  window.addEventListener(
    'pageshow',
    () => {
      setInstantScroll(() => {
        window.scrollTo(0, 0);
      });
    },
    { once: true },
  );
}

if (document.body.classList.contains('page-root') && initialHashTargetId) {
  setInstantScroll(() => {
    window.scrollTo(0, 0);
  });
}

let resetFiltersToDefault = () => {};

if (pageRoot) {
  const cards = Array.from(pageRoot.querySelectorAll('.word-card'));
  const searchInput = pageRoot.querySelector('.word-search');
  const searchClearButton = pageRoot.querySelector('.search-clear');
  const filterButtons = Array.from(pageRoot.querySelectorAll('.filter-chip'));
  const resultLine = pageRoot.querySelector('.result-line');
  const emptyState = pageRoot.querySelector('.empty-state');

  let activeLevel = 'all';

  const syncSearchClearButton = () => {
    if (!searchClearButton) {
      return;
    }

    searchClearButton.hidden = !searchInput || searchInput.value.trim() === '';
  };

  const updateVisibility = () => {
    const terms = normalizeSearchTerms(searchInput?.value || '');
    let visibleCount = 0;

    cards.forEach((card) => {
      const levels = card.dataset.levels || '';
      const levelMatched = activeLevel === 'all' || levels.split(' ').includes(activeLevel);
      const keywordMatched =
        terms.length === 0 || terms.every((term) => matchesSearchTerm(card, term));
      const visible = levelMatched && keywordMatched;

      card.classList.toggle('is-hidden', !visible);
      if (visible) {
        visibleCount += 1;
      }
    });

    syncSearchClearButton();

    if (resultLine) {
      resultLine.textContent = `当前显示 ${visibleCount} / ${cards.length} 个词条`;
    }

    if (emptyState) {
      emptyState.hidden = visibleCount !== 0;
    }
  };

  resetFiltersToDefault = () => {
    activeLevel = 'all';

    if (searchInput) {
      searchInput.value = '';
    }

    filterButtons.forEach((button) => {
      button.classList.toggle('is-active', button.dataset.level === 'all');
    });

    updateVisibility();
  };

  searchInput?.addEventListener('input', updateVisibility);
  searchInput?.addEventListener('search', updateVisibility);

  searchClearButton?.addEventListener('click', () => {
    if (!searchInput) {
      return;
    }

    searchInput.value = '';
    updateVisibility();
    searchInput.focus();
  });

  filterButtons.forEach((button) => {
    button.addEventListener('click', () => {
      activeLevel = button.dataset.level || 'all';
      filterButtons.forEach((item) => {
        item.classList.toggle('is-active', item === button);
      });
      updateVisibility();
    });
  });

  updateVisibility();
}

if (floatingNav) {
  const toggleButton = floatingNav.querySelector('.floating-nav-toggle');
  const closeButton = floatingNav.querySelector('[data-nav-close]');
  const panel = floatingNav.querySelector('.floating-nav-panel');
  const jumpItems = Array.from(floatingNav.querySelectorAll('[data-target-id]'));
  const observedTargets = jumpItems
    .map((item) => item.dataset.targetId || '')
    .filter(
      (targetId, index, list) =>
        targetId && targetId !== 'page-top' && list.indexOf(targetId) === index,
    )
    .map((targetId) => ({ targetId, element: document.getElementById(targetId) }))
    .filter((entry) => entry.element instanceof HTMLElement)
    .filter(
      (entry) =>
        entry.element.classList.contains('word-card') ||
        entry.element.classList.contains('family-card'),
    );

  const trackedWordCards = observedTargets
    .map((entry) => entry.element)
    .filter((element) => element.classList.contains('word-card'));

  let currentItemSyncFrame = 0;
  let currentItemLockUntil = 0;

  const setOpen = (open) => {
    if (!toggleButton || !panel) {
      return;
    }

    floatingNav.dataset.open = open ? 'true' : 'false';
    toggleButton.setAttribute('aria-expanded', open ? 'true' : 'false');
    panel.hidden = !open;
  };

  const setCurrentCard = (targetId) => {
    trackedWordCards.forEach((card) => {
      card.classList.toggle('is-current-card', card.id === targetId);
    });
  };

  const setCurrentItem = (targetId) => {
    jumpItems.forEach((item) => {
      item.classList.toggle('is-current', item.dataset.targetId === targetId);
    });
    setCurrentCard(targetId);
  };

  const lockCurrentItem = (duration = 900) => {
    currentItemLockUntil = window.performance.now() + duration;
  };

  const isCurrentItemLocked = () => window.performance.now() < currentItemLockUntil;

  const findObservedTarget = (targetId) =>
    observedTargets.find((entry) => entry.targetId === targetId);

  const getPinnedTargetId = () => {
    const targetId = getHashTargetId();
    if (!targetId || targetId === 'page-top') {
      return '';
    }

    const observedTarget = findObservedTarget(targetId);
    if (!observedTarget) {
      return '';
    }

    const rect = observedTarget.element.getBoundingClientRect();
    const visible = rect.bottom > 64 && rect.top < window.innerHeight * 0.72;
    return visible ? targetId : '';
  };

  const pickCurrentTargetId = () => {
    const anchorLine = window.innerWidth <= 640 ? 108 : 136;
    const visibleTargets = observedTargets
      .map((entry) => ({ ...entry, rect: entry.element.getBoundingClientRect() }))
      .filter(({ rect }) => rect.bottom > anchorLine && rect.top < window.innerHeight * 0.82)
      .sort(
        (left, right) =>
          Math.abs(left.rect.top - anchorLine) - Math.abs(right.rect.top - anchorLine),
      );

    return visibleTargets[0]?.targetId || '';
  };

  const syncCurrentItem = () => {
    currentItemSyncFrame = 0;

    const pinnedTargetId = getPinnedTargetId();
    if (pinnedTargetId) {
      setCurrentItem(pinnedTargetId);
      return;
    }

    if (isCurrentItemLocked()) {
      return;
    }

    const fallbackTargetId = pickCurrentTargetId();
    setCurrentItem(fallbackTargetId);
  };

  const scheduleCurrentItemSync = () => {
    if (currentItemSyncFrame !== 0) {
      return;
    }

    currentItemSyncFrame = window.requestAnimationFrame(syncCurrentItem);
  };

  const updateHashState = (targetId) => {
    if (!targetId || targetId === 'page-top') {
      window.history.replaceState(null, '', window.location.pathname);
      return;
    }

    window.history.replaceState(null, '', `#${targetId}`);
  };

  const scrollToTarget = (targetId, options = {}) => {
    const { instant = false, updateHash = true } = options;

    const performScroll = () => {
      const target = document.getElementById(targetId);
      if (!(target instanceof HTMLElement)) {
        return;
      }

      target.scrollIntoView({
        block: 'start',
        inline: 'nearest',
        behavior: getScrollBehavior(instant),
      });

      if (updateHash) {
        updateHashState(targetId);
      }

      if (targetId === 'page-top') {
        setCurrentItem('');
        lockCurrentItem(220);
        scheduleCurrentItemSync();
        return;
      }

      setCurrentItem(targetId);
      lockCurrentItem(isWordTargetId(targetId) ? 900 : 420);
      scheduleCurrentItemSync();
    };

    if (isWordTargetId(targetId)) {
      resetFiltersToDefault();
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(performScroll);
      });
      return;
    }

    performScroll();
  };

  toggleButton?.addEventListener('click', () => {
    setOpen(floatingNav.dataset.open !== 'true');
  });

  closeButton?.addEventListener('click', () => {
    setOpen(false);
  });

  jumpItems.forEach((item) => {
    item.addEventListener('click', (event) => {
      event.preventDefault();
      const targetId = item.dataset.targetId;
      if (!targetId) {
        return;
      }

      setOpen(false);
      scrollToTarget(targetId);
    });
  });

  document.addEventListener('click', (event) => {
    if (floatingNav.dataset.open !== 'true') {
      return;
    }

    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    if (!floatingNav.contains(target)) {
      setOpen(false);
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      setOpen(false);
    }
  });

  window.addEventListener('scroll', scheduleCurrentItemSync, { passive: true });
  window.addEventListener('resize', scheduleCurrentItemSync);

  window.addEventListener('hashchange', () => {
    const targetId = getHashTargetId();
    if (targetId) {
      scrollToTarget(targetId, { instant: true, updateHash: false });
      return;
    }

    setCurrentItem('');
    scheduleCurrentItemSync();
  });

  if (initialHashTargetId) {
    window.addEventListener(
      'load',
      () => {
        scrollToTarget(initialHashTargetId, { instant: true });
      },
      { once: true },
    );
  } else {
    scheduleCurrentItemSync();
  }

  setOpen(false);
}

const audio = new Audio();
audio.preload = 'none';
let activeButton = null;

const resetAudioState = () => {
  if (!activeButton) {
    return;
  }

  activeButton.classList.remove('is-playing');
  activeButton.textContent = '播放';
  activeButton = null;
};

audio.addEventListener('ended', resetAudioState);
audio.addEventListener('error', () => {
  if (!activeButton) {
    return;
  }

  const erroredButton = activeButton;
  erroredButton.classList.remove('is-playing');
  erroredButton.classList.add('is-error');
  erroredButton.textContent = '失败';
  activeButton = null;

  window.setTimeout(() => {
    erroredButton.classList.remove('is-error');
    erroredButton.textContent = '播放';
  }, 1200);
});

document.addEventListener('click', async (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }

  const button = target.closest('[data-audio]');
  if (!(button instanceof HTMLButtonElement)) {
    return;
  }

  const url = button.dataset.audio;
  if (!url) {
    return;
  }

  if (activeButton === button && !audio.paused) {
    audio.pause();
    audio.currentTime = 0;
    resetAudioState();
    return;
  }

  if (activeButton && activeButton !== button) {
    activeButton.classList.remove('is-playing');
    activeButton.textContent = '播放';
  }

  button.classList.remove('is-error');
  button.classList.add('is-playing');
  button.textContent = '播放中';
  activeButton = button;

  try {
    audio.pause();
    audio.src = url;
    audio.currentTime = 0;
    await audio.play();
  } catch {
    audio.dispatchEvent(new Event('error'));
  }
});
