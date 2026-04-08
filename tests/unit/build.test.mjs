import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';

import {
  TEXT,
  buildHomeHeroStats,
  getWordAnchorId,
  renderIndex,
  renderPage,
  sortPages,
  uniqueLevels,
} from '../../scripts/build.mjs';
import { loadAllPages, normalizeText } from '../helpers/pages.mjs';

const pages = loadAllPages();
const firstPage = pages[0] ?? null;
const secondPage = pages[1] ?? null;

if (!firstPage || !secondPage) {
  throw new Error(
    'Unit tests require at least two topic pages to validate ordering and sibling navigation.',
  );
}

describe('build helpers', () => {
  it('sorts root pages by homepage order', () => {
    const reversed = [...pages].reverse();

    expect(sortPages(reversed).map((page) => page.slug)).toEqual(pages.map((page) => page.slug));
  });

  it('builds homepage hero stats with exact topic, word, and level data', () => {
    const stats = buildHomeHeroStats(pages);
    const allWords = pages.flatMap((page) => page.words);
    const allLevels = uniqueLevels(allWords);

    expect(stats).toHaveLength(3);
    expect(stats.map((item) => item.label)).toEqual([
      TEXT.topicCount,
      TEXT.wordCount,
      TEXT.levelsCovered,
    ]);
    expect(allLevels.length).toBeGreaterThan(0);
    expect(stats.map((item) => item.value)).toEqual([
      String(pages.length),
      String(allWords.length),
      allLevels.join(' / '),
    ]);
    expect(stats[2].note).toContain(String(allLevels.length));
  });

  it('renders homepage family cards in order with expected compact content', () => {
    const dom = new JSDOM(renderIndex(pages));
    const document = dom.window.document;
    const heroItems = document.querySelectorAll('.hero-meta-item');
    const familyCards = Array.from(document.querySelectorAll('.family-card'));

    expect(heroItems).toHaveLength(3);
    expect(familyCards).toHaveLength(pages.length);
    expect(familyCards.map((card) => card.getAttribute('id'))).toEqual(
      pages.map((page) => `family-${page.slug}`),
    );

    familyCards.forEach((card, pageIndex) => {
      expect(card.getAttribute('data-topic-href')).toBe(`./${pages[pageIndex].slug}.html`);
      expect(card.getAttribute('role')).toBe('link');
      expect(card.getAttribute('tabindex')).toBe('0');
      const currentPage = pages[pageIndex];
      const wordLinks = Array.from(card.querySelectorAll('.word-link-chip'));
      const metaText = normalizeText(card.querySelector('.family-meta-list')?.textContent || '');
      const metaItems = card.querySelectorAll('.family-meta-list span');

      expect(normalizeText(card.querySelector('.family-mark')?.textContent || '')).toBe(
        currentPage.rootName,
      );
      expect(normalizeText(card.querySelector('h2')?.textContent || '')).toBe(currentPage.title);
      expect(normalizeText(card.querySelector('.family-subtitle')?.textContent || '')).toBe(
        currentPage.description || currentPage.rootTitle,
      );
      expect(metaItems).toHaveLength(2);
      expect(metaText).toContain(currentPage.rootTitle);
      expect(metaText).toContain(currentPage.coreMeaning || TEXT.uncategorized);
      expect(metaText).not.toContain(TEXT.wordCount);
      expect(metaText).not.toContain(TEXT.levelsCovered);
      expect(wordLinks).toHaveLength(currentPage.words.length);

      wordLinks.forEach((link, wordIndex) => {
        const currentWord = currentPage.words[wordIndex];
        const wordText = String(currentWord.word ?? '').trim();
        const expectedHref = `./${currentPage.slug}.html#${getWordAnchorId(wordText, wordIndex + 1)}`;
        const normalizedLevels = (currentWord.levels ?? [])
          .map((level) => String(level ?? '').trim())
          .filter(Boolean);
        const expectedLevelsText =
          normalizedLevels.length > 0 ? normalizedLevels.join(' / ') : TEXT.uncategorized;
        const expectedOrderLabel = `${wordIndex + 1}/${currentPage.words.length}`;
        const linkText = normalizeText(link.textContent || '');

        expect(link.getAttribute('href')).toBe(expectedHref);
        expect(normalizeText(link.querySelector('.word-link-index')?.textContent || '')).toBe(
          expectedOrderLabel,
        );
        expect(normalizeText(link.querySelector('.word-link-word')?.textContent || '')).toBe(wordText);
        expect(normalizeText(link.querySelector('.word-link-levels')?.textContent || '')).toBe(
          expectedLevelsText,
        );
        expect(linkText).toContain(expectedOrderLabel);
        expect(linkText).toContain(wordText);
        expect(linkText).toContain(expectedLevelsText);
      });
    });
  });

  it('renders previous and next topic links according to homepage order', () => {
    const firstPageDom = new JSDOM(
      renderPage(firstPage, {
        previousPage: null,
        nextPage: secondPage,
      }),
    );
    const firstPageLinks = firstPageDom.window.document.querySelectorAll('.page-sibling-link');
    const firstPageEmpty = firstPageDom.window.document.querySelector('.page-sibling-link-empty');

    expect(firstPageLinks).toHaveLength(1);
    expect(firstPageLinks[0]?.getAttribute('href')).toBe(`./${secondPage.slug}.html`);
    expect(normalizeText(firstPageLinks[0]?.textContent || '')).toContain(TEXT.nextTopic);
    expect(normalizeText(firstPageEmpty?.textContent || '')).toContain(TEXT.firstTopicHint);

    const lastPage = pages[pages.length - 1];
    const beforeLastPage = pages[pages.length - 2];
    const lastPageDom = new JSDOM(
      renderPage(lastPage, {
        previousPage: beforeLastPage,
        nextPage: null,
      }),
    );
    const lastPageLinks = lastPageDom.window.document.querySelectorAll('.page-sibling-link');
    const lastPageEmpty = lastPageDom.window.document.querySelector('.page-sibling-link-empty');

    expect(lastPageLinks).toHaveLength(1);
    expect(lastPageLinks[0]?.getAttribute('href')).toBe(`./${beforeLastPage.slug}.html`);
    expect(normalizeText(lastPageLinks[0]?.textContent || '')).toContain(TEXT.previousTopic);
    expect(normalizeText(lastPageEmpty?.textContent || '')).toContain(TEXT.lastTopicHint);
  });
});