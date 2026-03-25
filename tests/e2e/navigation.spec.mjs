import { expect, test } from '@playwright/test';

import { getWordAnchorId } from '../../scripts/build.mjs';
import { loadAllPages } from '../helpers/pages.mjs';

const topicPages = loadAllPages();
const firstPage = topicPages[0] ?? null;
const secondPage = topicPages[1] ?? null;
const multiWordPage = topicPages.find((page) => page.words.length >= 2) ?? null;

if (!firstPage || !secondPage || !multiWordPage) {
  throw new Error(
    'E2E navigation tests require at least two topic pages and one page containing two or more words.',
  );
}

const deepLinkWordIndex = 1;
const deepLinkWord = String(multiWordPage.words[deepLinkWordIndex].word ?? '').trim();
const switchedWordIndex = 0;
const switchedWord = String(multiWordPage.words[switchedWordIndex].word ?? '').trim();
const deepLinkWordId = getWordAnchorId(deepLinkWord, deepLinkWordIndex + 1);
const switchedWordId = getWordAnchorId(switchedWord, switchedWordIndex + 1);
const exactSearchWord = String(firstPage.words[0]?.word ?? '').trim();

async function expectCurrentWord(page, targetId, wordText) {
  await expect(page.locator('.word-card.is-current-card')).toHaveAttribute('id', targetId);
  await expect(page.locator('.floating-nav-item.is-current')).toContainText(wordText);
}

test.describe('topic navigation', () => {
  test('updates current word highlight after homepage deep link and floating navigation', async ({
    page,
  }) => {
    await page.goto('/');

    await page
      .locator(`#family-${multiWordPage.slug} .word-link-chip`)
      .nth(deepLinkWordIndex)
      .click();

    await expect(page).toHaveURL(new RegExp(`${multiWordPage.slug}\\.html#${deepLinkWordId}$`));
    await expect(page.locator('.word-card.is-current-card')).toHaveAttribute('id', deepLinkWordId);

    await page.locator('.floating-nav-toggle').click();
    await expect(page.locator('.floating-nav-panel')).toBeVisible();
    await page.locator('.floating-nav-item', { hasText: switchedWord }).click();

    await expect(page).toHaveURL(new RegExp(`${multiWordPage.slug}\\.html#${switchedWordId}$`));
    await expectCurrentWord(page, switchedWordId, switchedWord);
  });

  test('supports word search and previous/next topic navigation', async ({ page }) => {
    await page.goto(`/${firstPage.slug}.html`);

    await page.locator('.word-search').fill(exactSearchWord.toLowerCase());
    await expect(page.locator('.word-card:not(.is-hidden)')).toHaveCount(1);
    await expect(page.locator('.word-card:not(.is-hidden)').first()).toHaveAttribute(
      'id',
      getWordAnchorId(exactSearchWord, 1),
    );

    await page.locator('.page-sibling-link').first().click();
    await expect(page).toHaveURL(new RegExp(`${secondPage.slug}\\.html$`));

    await page.locator('.page-sibling-link').first().click();
    await expect(page).toHaveURL(new RegExp(`${firstPage.slug}\\.html$`));
  });
});

test.describe('mobile topic interactions', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('keeps mobile layout compact and floating navigation usable', async ({ page }) => {
    await page.goto(`/${multiWordPage.slug}.html`);

    const cards = page.locator('.word-card');
    const firstCardBox = await cards.nth(0).boundingBox();
    const secondCardBox = await cards.nth(1).boundingBox();
    const wordFlowColumnCount = await cards
      .nth(0)
      .locator('.word-card-flow')
      .evaluate((element) => window.getComputedStyle(element).columnCount);

    expect(firstCardBox).not.toBeNull();
    expect(secondCardBox).not.toBeNull();
    expect(Math.abs(secondCardBox.x - firstCardBox.x)).toBeLessThan(4);
    expect(secondCardBox.y).toBeGreaterThan(firstCardBox.y + firstCardBox.height - 1);
    expect(Number(wordFlowColumnCount)).toBe(1);

    await expect(page.locator('.floating-nav')).toHaveCSS('position', 'fixed');
    await expect(page.locator('.floating-nav-toggle')).toHaveCSS('min-height', '38px');
    await expect(page.locator('.floating-nav-panel')).toBeHidden();

    await page.locator('.floating-nav-toggle').click();
    await expect(page.locator('.floating-nav-toggle')).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('.floating-nav-panel')).toBeVisible();

    await page.locator('.floating-nav-item', { hasText: switchedWord }).click();
    await expect(page).toHaveURL(new RegExp(`#${switchedWordId}$`));
    await expectCurrentWord(page, switchedWordId, switchedWord);
    await expect(page.locator('.floating-nav-panel')).toBeHidden();

    await page.locator('.floating-nav-toggle').click();
    await expect(page.locator('.floating-nav-panel')).toBeVisible();
    await page.locator('[data-nav-close]').click();
    await expect(page.locator('.floating-nav-toggle')).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('.floating-nav-panel')).toBeHidden();
  });
});