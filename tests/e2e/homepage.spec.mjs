import { expect, test } from '@playwright/test';

import { TEXT, buildHomeHeroStats, getWordAnchorId, uniqueLevels } from '../../scripts/build.mjs';
import { loadAllPages, normalizeText } from '../helpers/pages.mjs';

const topicPages = loadAllPages();

if (topicPages.length === 0) {
  throw new Error('Homepage E2E tests require at least one topic page.');
}

test.describe('homepage rendering', () => {
  test('shows correct homepage stats, topic order, content, and compact directory styling', async ({
    page,
  }) => {
    await page.goto('/');

    const expectedStats = buildHomeHeroStats(topicPages).map((item) => ({
      label: normalizeText(item.label),
      value: normalizeText(item.value),
      note: normalizeText(item.note),
    }));

    const actualStats = await page.locator('.hero-meta-item').evaluateAll((elements) =>
      elements.map((element) => ({
        label: (element.querySelector('span')?.textContent ?? '').replace(/\s+/g, ' ').trim(),
        value: (element.querySelector('strong')?.textContent ?? '').replace(/\s+/g, ' ').trim(),
        note: (element.querySelector('.hero-meta-note')?.textContent ?? '')
          .replace(/\s+/g, ' ')
          .trim(),
      })),
    );

    expect(actualStats).toEqual(expectedStats);
    expect(actualStats[2]?.value.includes('+')).toBe(false);

    const heroItems = page.locator('.hero-meta-item');
    await expect(heroItems).toHaveCount(3);
    const firstHeroBox = await heroItems.nth(0).boundingBox();
    const secondHeroBox = await heroItems.nth(1).boundingBox();
    const thirdHeroBox = await heroItems.nth(2).boundingBox();

    expect(firstHeroBox).not.toBeNull();
    expect(secondHeroBox).not.toBeNull();
    expect(thirdHeroBox).not.toBeNull();
    expect(Math.abs(firstHeroBox.y - secondHeroBox.y)).toBeLessThan(10);
    expect(Math.abs(firstHeroBox.y - thirdHeroBox.y)).toBeLessThan(10);
    expect(Math.abs(firstHeroBox.width - secondHeroBox.width)).toBeLessThan(8);
    expect(Math.abs(secondHeroBox.width - thirdHeroBox.width)).toBeLessThan(8);

    const familyCards = page.locator('.family-card');
    await expect(familyCards).toHaveCount(topicPages.length);
    const actualCardIds = await familyCards.evaluateAll((elements) =>
      elements.map((element) => element.id),
    );
    expect(actualCardIds).toEqual(topicPages.map((topicPage) => `family-${topicPage.slug}`));

    for (const [pageIndex, topicPage] of topicPages.entries()) {
      const card = familyCards.nth(pageIndex);
      const metaText = normalizeText(await card.locator('.family-meta-list').innerText());
      const metaItems = card.locator('.family-meta-list span');
      const wordLinks = card.locator('.word-link-chip');

      await expect(card.locator('.family-mark')).toHaveText(topicPage.rootName);
      await expect(card.locator('h2')).toHaveText(topicPage.title);
      await expect(card.locator('.family-subtitle')).toContainText(
        topicPage.description || topicPage.rootTitle,
      );
      await expect(metaItems).toHaveCount(2);

      expect(metaText).toContain(topicPage.rootTitle);
      expect(metaText).toContain(topicPage.coreMeaning || TEXT.uncategorized);
      expect(metaText).not.toContain(TEXT.wordCount);
      expect(metaText).not.toContain(TEXT.levelsCovered);

      await expect(wordLinks).toHaveCount(topicPage.words.length);
      for (const [wordIndex, word] of topicPage.words.entries()) {
        const wordLink = wordLinks.nth(wordIndex);
        const wordText = String(word.word ?? '').trim();
        const normalizedLevels = (word.levels ?? [])
          .map((level) => String(level ?? '').trim())
          .filter(Boolean);
        const expectedLevelsText =
          normalizedLevels.length > 0 ? normalizedLevels.join(' / ') : TEXT.uncategorized;
        const expectedOrderLabel = `${wordIndex + 1}/${topicPage.words.length}`;

        await expect(wordLink).toHaveAttribute(
          'href',
          `./${topicPage.slug}.html#${getWordAnchorId(wordText, wordIndex + 1)}`,
        );
        await expect(wordLink.locator('.word-link-index')).toHaveText(expectedOrderLabel);
        await expect(wordLink.locator('.word-link-word')).toHaveText(wordText);
        await expect(wordLink.locator('.word-link-levels')).toHaveText(expectedLevelsText);
      }
    }

    await expect(page.locator('.hero-meta-item').first()).toHaveCSS('display', 'grid');
    await expect(page.locator('.family-meta-list span').first()).toHaveCSS('display', 'flex');
    await expect(page.locator('.word-link-chip').first()).toHaveCSS('display', 'grid');
    await expect(page.locator('.word-link-list').first()).toHaveCSS('display', 'grid');

    const firstDirectoryLinks = familyCards.first().locator('.word-link-chip');
    const firstDirectoryLinkBox = await firstDirectoryLinks.nth(0).boundingBox();
    const secondDirectoryLinkBox = await firstDirectoryLinks.nth(1).boundingBox();
    expect(firstDirectoryLinkBox).not.toBeNull();
    expect(secondDirectoryLinkBox).not.toBeNull();
    expect(Math.abs(firstDirectoryLinkBox.y - secondDirectoryLinkBox.y)).toBeLessThan(6);
    expect(secondDirectoryLinkBox.x).toBeGreaterThan(firstDirectoryLinkBox.x + 20);

    const firstFamilyCard = familyCards.first();
    await expect(firstFamilyCard).toHaveCSS('position', 'relative');
    const firstCardStyle = await firstFamilyCard.evaluate((element) => {
      const style = window.getComputedStyle(element);
      return {
        boxShadow: style.boxShadow,
        backgroundColor: style.backgroundColor,
      };
    });
    expect(firstCardStyle.boxShadow).not.toBe('none');
    expect(firstCardStyle.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');

    if (topicPages.length > 1) {
      const firstBox = await familyCards.nth(0).boundingBox();
      const secondBox = await familyCards.nth(1).boundingBox();

      expect(firstBox).not.toBeNull();
      expect(secondBox).not.toBeNull();
      expect(Math.abs(firstBox.x - secondBox.x)).toBeLessThan(4);
      expect(Math.abs(firstBox.width - secondBox.width)).toBeLessThan(4);
      expect(secondBox.y).toBeGreaterThan(firstBox.y + firstBox.height - 1);
    }
  });

  test('opens the topic page when clicking the card container itself', async ({ page }) => {
    await page.goto('/');

    const targetTopic = topicPages[0];
    const targetCard = page.locator(`#family-${targetTopic.slug}`);

    await targetCard.click({ position: { x: 24, y: 24 } });

    await expect(page).toHaveURL(new RegExp(`${targetTopic.slug}\\.html$`));
  });

  test('shows a card hover effect and lets the inner action link take over on hover', async ({
    page,
  }) => {
    await page.goto('/');

    const firstCard = page.locator('.family-card').first();
    await page.waitForTimeout(720);
    const actionLink = firstCard.locator('.family-link');

    const readCardStyle = async () =>
      firstCard.evaluate((element) => {
        const style = window.getComputedStyle(element);
        return {
          boxShadow: style.boxShadow,
          borderColor: style.borderColor,
        };
      });

    const readLinkStyle = async () =>
      actionLink.evaluate((element) => {
        const style = window.getComputedStyle(element);
        return {
          boxShadow: style.boxShadow,
          backgroundColor: style.backgroundColor,
          borderColor: style.borderColor,
        };
      });

    const baseCardStyle = await readCardStyle();
    const baseLinkStyle = await readLinkStyle();

    await firstCard.hover({ position: { x: 18, y: 18 } });
    await page.waitForTimeout(220);

    const hoveredCardStyle = await readCardStyle();
    expect(hoveredCardStyle.boxShadow).not.toBe(baseCardStyle.boxShadow);
    expect(hoveredCardStyle.borderColor).not.toBe(baseCardStyle.borderColor);

    await actionLink.hover();
    await page.waitForTimeout(220);

    const linkHoveredCardStyle = await readCardStyle();
    const hoveredLinkStyle = await readLinkStyle();

    expect(linkHoveredCardStyle.borderColor).toBe(baseCardStyle.borderColor);
    expect(linkHoveredCardStyle.boxShadow).toBe(baseCardStyle.boxShadow);
    expect(hoveredLinkStyle.boxShadow).not.toBe(baseLinkStyle.boxShadow);
    expect(hoveredLinkStyle.backgroundColor).not.toBe(baseLinkStyle.backgroundColor);
    expect(hoveredLinkStyle.borderColor).not.toBe(baseLinkStyle.borderColor);
  });

  test('switches theme and keeps the last selected theme after reload', async ({ page }) => {
    await page.goto('/');

    const targetTheme = await page.evaluate(() => {
      const currentTheme = document.documentElement.dataset.theme || '';
      const buttons = Array.from(document.querySelectorAll('[data-theme-choice]'));
      const chosen =
        buttons.find((button) => button.dataset.themeChoice !== currentTheme) || buttons[0];

      return {
        name: chosen?.getAttribute('data-theme-choice') || '',
        href: chosen?.getAttribute('data-theme-href') || '',
        color: chosen?.getAttribute('data-theme-color') || '',
      };
    });

    expect(targetTheme.name).not.toBe('');

    await page.locator(`[data-theme-choice="${targetTheme.name}"]`).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', targetTheme.name);
    await expect(page.locator('.theme-swatch.is-active')).toHaveAttribute(
      'data-theme-choice',
      targetTheme.name,
    );
    await expect(page.locator('#theme-stylesheet')).toHaveAttribute('href', targetTheme.href);
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute(
      'content',
      targetTheme.color,
    );
    await expect.poll(() => page.evaluate(() => window.localStorage.getItem('wordify-theme'))).toBe(
      targetTheme.name,
    );

    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', targetTheme.name);
    await expect(page.locator('.theme-swatch.is-active')).toHaveAttribute(
      'data-theme-choice',
      targetTheme.name,
    );
    await expect(page.locator('#theme-stylesheet')).toHaveAttribute('href', targetTheme.href);
  });
});