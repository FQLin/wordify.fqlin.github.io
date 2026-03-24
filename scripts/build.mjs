import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { transform } from 'esbuild';
import { minify as minifyHtml } from 'html-minifier-terser';
import CleanCSS from 'clean-css';
import JSON5 from 'json5';
import nunjucks from 'nunjucks';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = dirname(SCRIPT_DIR);
const DATA_DIR = join(ROOT_DIR, 'data');
const SRC_ASSETS_DIR = join(ROOT_DIR, 'src', 'assets');
const TEMPLATES_DIR = join(ROOT_DIR, 'src', 'templates');
const DIST_DIR = join(ROOT_DIR, 'dist');
const DIST_ASSETS_DIR = join(DIST_DIR, 'assets');
const CONFIG_PATH = join(ROOT_DIR, 'site.config.json');
const UTF8_BOM = '\uFEFF';
const RELEASE_FLAG = '--release';
const BUILD_MODE = process.argv.includes(RELEASE_FLAG) ? 'release' : 'default';
const IS_RELEASE = BUILD_MODE === 'release';
const CSS_MINIFIER = new CleanCSS({ level: 1 });
const HTML_MINIFIER_OPTIONS = {
  collapseWhitespace: true,
  conservativeCollapse: true,
  removeComments: true,
  keepClosingSlash: true,
  removeRedundantAttributes: true,
  removeScriptTypeAttributes: true,
  removeStyleLinkTypeAttributes: true,
  minifyCSS: false,
  minifyJS: false,
};

const DEFAULT_CONFIG = {
  site: {
    name: 'Wordify',
    title: 'Wordify 词根词汇平台',
    baseUrl: 'https://wordify.fanqinglin.com',
    cname: 'wordify.fanqinglin.com',
    repoUrl: 'https://github.com/FQLin/wordify.fqlin.github.io',
    defaultTheme: 'sand',
    description:
      '以词根为线索系统整理英语词汇，提供音标、释义、等级、构词分析与例句，帮助在浏览中完成记忆与复习。',
    keywords: ['英语词根', '英语单词', '词根词缀', '背单词', '英语学习', '词汇整理'],
  },
  themes: {
    sand: {
      label: '纸页',
      themeColor: '#f4efe4',
      swatch: 'linear-gradient(135deg, #f7eedb, #b66a28)',
    },
    forest: {
      label: '松绿',
      themeColor: '#e5efe7',
      swatch: 'linear-gradient(135deg, #e5efe7, #3f6b4b)',
    },
    coast: {
      label: '海雾',
      themeColor: '#e8f1f5',
      swatch: 'linear-gradient(135deg, #e8f1f5, #46758d)',
    },
  },
};

const TEXT = {
  all: '全部',
  uk: '英音',
  us: '美音',
  play: '播放',
  pending: '待补充',
  translationPending: '释义待补充',
  translations: '释义',
  analysis: '词根分析',
  breakdown: '拆解',
  note: '说明',
  memoryTip: '记忆提示',
  examples: '例句',
  quickJump: '目录',
  backHome: '首页',
  backTop: '顶部',
  rootSeries: '词根专题',
  familyWords: '词族词条',
  searchLabel: '搜索单词 / 释义 / 等级',
  searchPlaceholder: '例如 inspect / 检查 / CET-4',
  emptyState: '没有找到符合当前筛选条件的词条。',
  currentVisible: '当前显示',
  itemsSuffix: '个词条',
  uncategorized: '未分类',
  coreMeaning: '核心含义',
  wordCount: '词条数量',
  averageWords: '平均每专题词条',
  maxWordsPerTopic: '单专题最高词条',
  multiLevelWords: '多等级词条',
  availableThemes: '可切换主题',
  rootForm: '词根形式',
  levelsCovered: '覆盖等级',
  overview: '词根概览',
  origin: '词源来历',
  extraNotes: '补充线索',
  siteKicker: '英语词根词汇库',
  siteHeadline: '以词根为线索，系统整理英语词汇',
  siteSubtitle:
    '围绕常见词根、词根变体与构词规律，把单词之间的来源关系、语义变化和等级信息放到同一页面里，方便先理解，再记忆，再回看。',
  topicCount: '专题数量',
  indexSectionKicker: '站点定位',
  indexSectionTitle: '先看词根关系，再记具体词义',
  indexSectionDescription:
    '这个站点不是按字母顺序平铺单词，而是把同一词根、同方向语义变化或常见构词变体放到一个专题里，帮助先建立来源关系。\n首页更适合总览专题体量、入口密度和重点词分布，专题页更适合连续浏览同一词根的派生链。',
  featureCollectionKicker: '页面内容',
  featureCollectionTitle: '页面里主要保留哪些信息',
  featureCollectionText:
    '专题页优先展示英音、美音、等级、词性释义和构词分析，让真正影响记忆的内容先出现在前面。\n例句、记忆提示和扩展说明作为辅助信息补充，不要求每个词条长度完全一致，但会尽量让重点词更完整。',
  featureBrowseKicker: '复习方式',
  featureBrowseTitle: '可以整组浏览，也可以按词条回看',
  featureBrowseText:
    '电脑端适合横向比较多个词条，手机端适合借助目录、搜索和直达入口做碎片复习。\n你可以先通读整个词根家族，再从首页卡片中的词条入口反复回看高频词、易混词和考试重点词。',
  featureReviewTitle: '使用场景',
  featureReviewText: '页面采用响应式布局，适合电脑端做系统整理，也适合手机端做碎片化复习。',
  familySectionKicker: '专题目录',
  familySectionTitle: '当前词根专题',
  familySectionDescription:
    '专题会按设定顺序展示。你既可以进入专题页整组浏览，也可以直接点击卡片中的词条入口回到某个具体位置；当词根系列逐渐增多时，首页右下角的悬浮目录也能帮助快速定位。',
  viewTopic: '查看专题',
  wordLinks: '直达词条',
  previousTopic: '上一专题',
  nextTopic: '下一专题',
  firstTopicHint: '已经是首页顺序中的第一个专题',
  lastTopicHint: '已经是首页顺序中的最后一个专题',
  pageNavigatorBoundary: '当前已经到达边界位置',
  breadcrumbHome: '首页',
  pronunciationLabelSuffix: '读音',
  themeSwitcherLabel: '颜色主题',
  notFoundDataDir: '未找到 data 目录',
  notFoundAssetsDir: '未找到 src/assets 目录',
  noBuildFiles: 'data 目录中没有可构建的 JSON 文件',
  wordsMustBeArray: 'words 必须是非空数组',
  rootNameRequired: 'root.name 不能为空',
};
function mergeConfig(defaults, overrides) {
  const mergedThemes = {};
  const themeKeys = new Set([
    ...Object.keys(defaults.themes ?? {}),
    ...Object.keys(overrides.themes ?? {}),
  ]);

  for (const key of themeKeys) {
    mergedThemes[key] = {
      ...(defaults.themes?.[key] ?? {}),
      ...(overrides.themes?.[key] ?? {}),
    };
  }

  return {
    ...defaults,
    ...overrides,
    site: {
      ...(defaults.site ?? {}),
      ...(overrides.site ?? {}),
    },
    themes: mergedThemes,
  };
}

function readJsonFile(filePath) {
  const rawText = readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
  return JSON5.parse(rawText);
}

const templateEnv = nunjucks.configure(TEMPLATES_DIR, {
  autoescape: false,
  noCache: true,
  trimBlocks: true,
  lstripBlocks: true,
});

function renderTemplate(templateName, bindings) {
  return templateEnv.render(templateName, bindings).replace(/^\uFEFF/, '');
}

function optimizeCss(content, filePath) {
  if (!IS_RELEASE) {
    return content;
  }

  const result = CSS_MINIFIER.minify(content);
  if (result.errors.length > 0) {
    throw new Error(`${filePath} CSS 压缩失败: ${result.errors.join('；')}`);
  }

  return result.styles;
}

async function optimizeJs(content, filePath) {
  if (!IS_RELEASE) {
    return content;
  }

  try {
    const result = await transform(content, {
      loader: 'js',
      minify: true,
      target: 'es2020',
      charset: 'utf8',
      legalComments: 'none',
    });
    return result.code;
  } catch (error) {
    throw new Error(`${filePath} JS 压缩失败: ${error.message}`);
  }
}

async function optimizeHtml(content, filePath) {
  if (!IS_RELEASE) {
    return content;
  }

  try {
    return await minifyHtml(content, HTML_MINIFIER_OPTIONS);
  } catch (error) {
    throw new Error(`${filePath} HTML 压缩失败: ${error.message}`);
  }
}

function loadConfig() {
  if (!existsSync(CONFIG_PATH)) {
    return DEFAULT_CONFIG;
  }

  const parsed = readJsonFile(CONFIG_PATH);
  const merged = mergeConfig(DEFAULT_CONFIG, parsed);
  const themeKeys = Object.keys(merged.themes);

  if (themeKeys.length === 0) {
    throw new Error('site.config.json 中至少需要一个主题配置');
  }

  if (!merged.themes[merged.site.defaultTheme]) {
    merged.site.defaultTheme = themeKeys[0];
  }

  return merged;
}

const CONFIG = loadConfig();
const THEME_ENTRIES = Object.entries(CONFIG.themes);
const DEFAULT_THEME = CONFIG.site.defaultTheme;
const LEVEL_CHIP_LIMIT = 3;
const SITE = {
  ...CONFIG.site,
  language: 'zh-CN',
  locale: 'zh_CN',
  themeColor: CONFIG.themes[DEFAULT_THEME].themeColor,
};
const DEFAULT_SOURCE_ITEMS = [
  { label: '等级信息', name: '有道词典', url: 'https://www.youdao.com/' },
  { label: '音标与释义', name: '有道词典', url: 'https://www.youdao.com/' },
  { label: '读音音频', name: '远程音频接口', url: '' },
  { label: '词根分析', name: '站点维护者整理', url: '' },
];
const SOURCE_ITEMS = normalizeSourceItems(CONFIG.site.sources);
const FOOTER_NOTE =
  typeof CONFIG.site.footerNote === 'string' && CONFIG.site.footerNote.trim()
    ? CONFIG.site.footerNote.trim()
    : '页面展示的数据来源会随词条整理逐步补充，若与你自定义的资料来源不同，请以你维护的 JSON 数据为准。';
const CNAME =
  typeof CONFIG.site.cname === 'string' && CONFIG.site.cname.trim() ? CONFIG.site.cname.trim() : '';

function normalizeSourceItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return DEFAULT_SOURCE_ITEMS;
  }

  const normalized = items
    .map((item) => {
      if (!item || typeof item !== 'object') {
        return null;
      }

      const label = String(item.label ?? '').trim();
      const name = String(item.name ?? '').trim();
      const url = String(item.url ?? '').trim();

      if (!label || !name) {
        return null;
      }

      return { label, name, url };
    })
    .filter(Boolean);

  return normalized.length > 0 ? normalized : DEFAULT_SOURCE_ITEMS;
}

function slugify(value, fallback = 'word-family') {
  const cleaned = String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^\w\u4E00-\u9FFF\s-]/g, '')
    .replace(/[-\s]+/g, '-')
    .replace(/^[-_]+|[-_]+$/g, '');

  return cleaned || fallback;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function ensureTrailingSlash(url) {
  return url.endsWith('/') ? url : `${url}/`;
}

function absoluteUrl(pathname = '/') {
  const normalized = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return new URL(normalized, ensureTrailingSlash(SITE.baseUrl)).toString();
}

function themeStylesheetHref(themeName) {
  return `./assets/themes/${encodeURIComponent(themeName)}.css`;
}

function stripHtml(value) {
  return String(value ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function sanitizeJsonForScript(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

function sentenceToParagraphs(text) {
  const parts = String(text ?? '')
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return '';
  }

  return parts.map((item) => `<p>${escapeHtml(item)}</p>`).join('');
}

function normalizeLevelToken(level) {
  return slugify(level, 'unknown');
}

function uniqueLevels(words) {
  const seen = new Set();
  const ordered = [];

  for (const word of words) {
    for (const level of word.levels ?? []) {
      const normalized = String(level ?? '').trim();
      if (normalized && !seen.has(normalized)) {
        seen.add(normalized);
        ordered.push(normalized);
      }
    }
  }

  return ordered;
}

function getWordAnchorId(wordText, index) {
  return `word-${slugify(wordText || `word-${index}`, `word-${index}`)}`;
}

function normalizeSearchText(parts) {
  const normalizedParts = [];

  for (const part of parts) {
    const value = String(part ?? '')
      .trim()
      .toLowerCase();
    if (value) {
      normalizedParts.push(value);
    }
  }

  return normalizedParts.join(' ').replace(/\s+/g, ' ').trim();
}

function joinSearchWordText(word) {
  return normalizeSearchText([word.word ?? '']);
}

function joinSearchMeaningText(word) {
  const pieces = [];

  for (const translation of word.translations ?? []) {
    pieces.push(translation.part_of_speech ?? '');
    pieces.push(translation.meaning ?? '');
  }

  return normalizeSearchText(pieces);
}

function joinSearchLevelText(levels) {
  const pieces = [];

  for (const level of levels ?? []) {
    const value = String(level ?? '').trim();
    if (!value) {
      continue;
    }

    const normalized = value.toLowerCase();
    const compact = normalized.replace(/[^a-z0-9]+/g, '');
    pieces.push(normalized);
    if (compact && compact !== normalized) {
      pieces.push(compact);
    }
  }

  return normalizeSearchText(pieces);
}

function renderThemeSwitcher() {
  return `
<div class="theme-switcher js-theme-switcher" aria-label="${TEXT.themeSwitcherLabel}">
  ${THEME_ENTRIES.map(
    ([themeName, theme]) => `
    <button
      class="theme-swatch"
      type="button"
      data-theme-choice="${escapeHtml(themeName)}"
      data-theme-href="${escapeHtml(themeStylesheetHref(themeName))}"
      data-theme-color="${escapeHtml(theme.themeColor)}"
      title="${escapeHtml(theme.label)}"
      aria-label="${escapeHtml(theme.label)}"
      style="--theme-swatch:${escapeHtml(theme.swatch)}"
    ></button>`,
  ).join('')}
</div>`;
}

function renderLevelChips(levels) {
  if (!levels?.length) {
    return `<span class="meta-chip meta-chip-muted">${TEXT.uncategorized}</span>`;
  }

  const visibleLevels = levels.slice(0, LEVEL_CHIP_LIMIT);
  const hiddenLevels = levels.slice(LEVEL_CHIP_LIMIT);
  const chips = visibleLevels.map((level) => `<span class="meta-chip">${escapeHtml(level)}</span>`);

  if (hiddenLevels.length > 0) {
    const allLevels = levels.join(' / ');
    const label = `还有 ${hiddenLevels.length} 个等级：${allLevels}`;
    chips.push(
      `<span class="meta-chip meta-chip-more" title="${escapeHtml(allLevels)}" aria-label="${escapeHtml(label)}">+${hiddenLevels.length}</span>`,
    );
  }

  return chips.join('');
}

function formatLevelSummary(levels, visibleCount = 2) {
  const normalizedLevels = (levels ?? [])
    .map((level) => String(level ?? '').trim())
    .filter(Boolean);

  if (normalizedLevels.length === 0) {
    return TEXT.uncategorized;
  }

  const visibleLevels = normalizedLevels.slice(0, visibleCount);
  const hiddenCount = normalizedLevels.length - visibleLevels.length;

  return hiddenCount > 0
    ? `${visibleLevels.join(' / ')} / +${hiddenCount}`
    : visibleLevels.join(' / ');
}

function renderPronunciation(label, pronunciation) {
  if (!pronunciation) {
    return '';
  }

  const ipa = String(pronunciation.ipa ?? '').trim();
  const audioUrl = String(pronunciation.audio_url ?? '').trim();

  if (!ipa && !audioUrl) {
    return '';
  }

  const audioButton = audioUrl
    ? `<button class="audio-button" type="button" data-audio="${escapeHtml(audioUrl)}" aria-label="${TEXT.play}${escapeHtml(label)}${TEXT.pronunciationLabelSuffix}">${TEXT.play}</button>`
    : '';

  return [
    '<div class="pron-item">',
    `<span class="pron-label">${escapeHtml(label)}</span>`,
    `<span class="pron-ipa">${escapeHtml(ipa || TEXT.pending)}</span>`,
    audioButton,
    '</div>',
  ].join('');
}

function renderTranslations(translations) {
  const entries = (translations ?? [])
    .map((item) => {
      const pos = String(item.part_of_speech ?? '').trim();
      const meaning = String(item.meaning ?? '').trim();
      if (!pos && !meaning) {
        return null;
      }

      return { pos, meaning: meaning || TEXT.translationPending };
    })
    .filter(Boolean);

  if (entries.length === 0) {
    return [
      '<section class="flow-block flow-block-translation">',
      `<span class="flow-kicker">${TEXT.translations}</span>`,
      `<p class="flow-text">${TEXT.translationPending}</p>`,
      '</section>',
    ].join('');
  }

  return entries
    .map((entry, index) => {
      const itemClass = entry.pos ? 'translation-item' : 'translation-item translation-item-no-pos';
      const prefix = entry.pos
        ? `<span class="translation-pos">${escapeHtml(entry.pos)}</span>`
        : '';

      return [
        '<section class="flow-block flow-block-translation">',
        index === 0 ? `<span class="flow-kicker">${TEXT.translations}</span>` : '',
        `<div class="${itemClass}">`,
        prefix,
        `<span class="flow-text">${escapeHtml(entry.meaning)}</span>`,
        '</div>',
        '</section>',
      ].join('');
    })
    .join('');
}

function renderExamples(examples) {
  const entries = (examples ?? [])
    .map((example) => {
      const en = String(example.en ?? '').trim();
      const zh = String(example.zh ?? '').trim();
      if (!en && !zh) {
        return null;
      }

      return { en, zh };
    })
    .filter(Boolean);

  if (entries.length === 0) {
    return '';
  }

  return entries
    .map((entry, index) =>
      [
        '<section class="flow-block example-item">',
        index === 0 ? `<span class="flow-kicker">${TEXT.examples}</span>` : '',
        entry.en ? `<p class="example-en">${escapeHtml(entry.en)}</p>` : '',
        entry.zh ? `<p class="example-zh">${escapeHtml(entry.zh)}</p>` : '',
        '</section>',
      ].join(''),
    )
    .join('');
}

function renderAnalysis(analysis) {
  if (!analysis) {
    return '';
  }

  const entries = [
    {
      label: TEXT.breakdown,
      text: String(analysis.breakdown ?? '').trim(),
    },
    {
      label: TEXT.note,
      text: String(analysis.note ?? '').trim(),
    },
  ].filter((item) => item.text);

  if (entries.length === 0) {
    return '';
  }

  return entries
    .map((entry, index) =>
      [
        '<section class="flow-block flow-block-analysis">',
        index === 0 ? `<span class="flow-kicker">${TEXT.analysis}</span>` : '',
        `<span class="analysis-label">${entry.label}</span>`,
        `<p class="flow-text">${escapeHtml(entry.text)}</p>`,
        '</section>',
      ].join(''),
    )
    .join('');
}

function renderMemoryTip(memoryTip) {
  const value = String(memoryTip ?? '').trim();
  if (!value) {
    return '';
  }

  return [
    '<section class="flow-block flow-block-memory">',
    `<span class="flow-kicker">${TEXT.memoryTip}</span>`,
    `<p class="flow-text">${escapeHtml(value)}</p>`,
    '</section>',
  ].join('');
}

function renderWordCard(word, index) {
  const wordText = String(word.word ?? '').trim() || `untitled-${index}`;
  const wordId = getWordAnchorId(wordText, index);
  const titleId = `${wordId}-title`;
  const levels = (word.levels ?? []).map((level) => String(level).trim()).filter(Boolean);
  const levelTokens = levels.map((level) => normalizeLevelToken(level)).join(' ');
  const searchWordText = joinSearchWordText(word);
  const searchMeaningText = joinSearchMeaningText(word);
  const searchLevelText = joinSearchLevelText(levels);

  const summaryBlock = renderTemplate('word-card-summary.njk', {
    wordIndex: String(index).padStart(2, '0'),
    titleId: escapeHtml(titleId),
    wordText: escapeHtml(wordText),
    levelChips: renderLevelChips(levels),
  });

  const flowItems = [
    summaryBlock,
    renderPronunciation(TEXT.uk, word.pronunciations?.uk),
    renderPronunciation(TEXT.us, word.pronunciations?.us),
    renderTranslations(word.translations),
    renderAnalysis(word.analysis),
    renderMemoryTip(word.memory_tip ?? word.memoryTip),
    renderExamples(word.examples),
  ]
    .filter(Boolean)
    .join('');

  return renderTemplate('word-card.njk', {
    wordId: escapeHtml(wordId),
    titleId: escapeHtml(titleId),
    levelTokens: escapeHtml(levelTokens),
    searchWordText: escapeHtml(searchWordText),
    searchMeaningText: escapeHtml(searchMeaningText),
    searchLevelText: escapeHtml(searchLevelText),
    flowItems,
  });
}

function renderFilterButtons(levels) {
  const buttons = [
    `<button class="filter-chip is-active" type="button" data-level="all">${TEXT.all}</button>`,
  ];

  for (const level of levels) {
    buttons.push(
      `<button class="filter-chip" type="button" data-level="${escapeHtml(normalizeLevelToken(level))}">${escapeHtml(level)}</button>`,
    );
  }

  return buttons.join('');
}

function renderRootNotes(notes) {
  if (!notes?.length) {
    return '';
  }

  const items = notes.map((note) => `<li>${escapeHtml(note)}</li>`).join('');
  return [
    '<section class="info-card">',
    `<h2 class="card-title">${TEXT.extraNotes}</h2>`,
    `<ul class="note-list">${items}</ul>`,
    '</section>',
  ].join('');
}

function renderPageNavigatorLink(label, page, emptyText) {
  if (!page) {
    return [
      '<div class="page-sibling-link page-sibling-link-empty" aria-disabled="true">',
      `<span class="page-sibling-direction">${escapeHtml(label)}</span>`,
      `<strong class="page-sibling-title">${escapeHtml(emptyText)}</strong>`,
      `<span class="page-sibling-meta">${TEXT.pageNavigatorBoundary}</span>`,
      '</div>',
    ].join('');
  }

  return [
    `<a class="page-sibling-link" href="./${escapeHtml(page.slug)}.html">`,
    `<span class="page-sibling-direction">${escapeHtml(label)}</span>`,
    `<strong class="page-sibling-title">${escapeHtml(page.title)}</strong>`,
    `<span class="page-sibling-meta">${escapeHtml(page.rootTitle)} · ${page.words.length} 个词条</span>`,
    '</a>',
  ].join('');
}

function renderPageNavigator(previousPage, nextPage) {
  if (!previousPage && !nextPage) {
    return '';
  }

  return [
    '<nav class="page-sibling-nav" aria-label="专题翻页导航">',
    renderPageNavigatorLink(TEXT.previousTopic, previousPage, TEXT.firstTopicHint),
    renderPageNavigatorLink(TEXT.nextTopic, nextPage, TEXT.lastTopicHint),
    '</nav>',
  ].join('');
}

function renderFloatingNav(page) {
  const items = page.words
    .map((word, index) => {
      const wordText = String(word.word ?? '').trim() || `Word ${index + 1}`;
      const wordId = getWordAnchorId(wordText, index + 1);
      return `
      <button class="floating-nav-item" type="button" data-target-id="${escapeHtml(wordId)}">
        <span class="floating-nav-number">${String(index + 1).padStart(2, '0')}</span>
        <strong>${escapeHtml(wordText)}</strong>
      </button>`;
    })
    .join('');

  return `
<div class="floating-nav js-floating-nav" data-open="false">
  <button class="floating-nav-toggle" type="button" aria-expanded="false" aria-controls="floating-nav-panel" aria-label="打开词条目录">${TEXT.quickJump}</button>
  <div class="floating-nav-panel" id="floating-nav-panel" hidden>
    <div class="floating-nav-actions">
      <a class="floating-nav-mini" href="./index.html" aria-label="返回首页">${TEXT.backHome}</a>
      <button class="floating-nav-mini" type="button" data-target-id="page-top" aria-label="回到顶部">${TEXT.backTop}</button>
      <button class="floating-nav-icon" type="button" data-nav-close aria-label="收起目录">×</button>
    </div>
    <div class="floating-nav-list">
      ${items}
    </div>
  </div>
</div>`;
}

function renderHomeFloatingNav(pages) {
  if (!pages.length) {
    return '';
  }

  const items = pages
    .map((page, index) => {
      const familyId = `family-${page.slug}`;
      const label = page.rootName || page.rootTitle || page.title;
      return `
      <button class="floating-nav-item" type="button" data-target-id="${escapeHtml(familyId)}">
        <span class="floating-nav-number">${String(index + 1).padStart(2, '0')}</span>
        <strong>${escapeHtml(label)}</strong>
      </button>`;
    })
    .join('');

  return `
<div class="floating-nav js-floating-nav" data-open="false">
  <button class="floating-nav-toggle" type="button" aria-expanded="false" aria-controls="floating-nav-panel" aria-label="打开专题目录">${TEXT.quickJump}</button>
  <div class="floating-nav-panel" id="floating-nav-panel" hidden>
    <div class="floating-nav-actions">
      <button class="floating-nav-mini" type="button" data-target-id="family-section" aria-label="定位到专题区">专题区</button>
      <button class="floating-nav-mini" type="button" data-target-id="page-top" aria-label="回到顶部">${TEXT.backTop}</button>
      <button class="floating-nav-icon" type="button" data-nav-close aria-label="收起目录">×</button>
    </div>
    <div class="floating-nav-list">
      ${items}
    </div>
  </div>
</div>`;
}

function buildPageDescription(page) {
  const levels = uniqueLevels(page.words);
  const levelText = levels.length > 0 ? `覆盖 ${levels.join('、')} 等等级标签` : '按词根专题整理';
  const summary = page.description || page.overview || page.coreMeaning;
  const sentence = summary
    ? stripHtml(summary).replace(/[。！？；，、\s]+$/u, '')
    : `${page.rootTitle} 相关英语词汇专题`;
  return `${sentence}。本页收录 ${page.words.length} 个词条，${levelText}，提供音标、释义、构词分析与例句。`;
}
function buildPageKeywords(page) {
  const keywords = new Set([...SITE.keywords, page.rootName, page.rootTitle, page.title]);
  uniqueLevels(page.words).forEach((level) => keywords.add(level));
  page.words.forEach((word) => {
    if (word.word) {
      keywords.add(String(word.word).trim());
    }
  });
  return Array.from(keywords).filter(Boolean).join(', ');
}

function buildIndexDescription(pages) {
  const allWords = pages.flatMap((page) => page.words);
  const levelCount = uniqueLevels(allWords).length;
  const levelText = levelCount > 0 ? `，覆盖 ${levelCount} 类等级标签` : '';
  return `${SITE.description} 当前共收录 ${pages.length} 个词根专题与 ${allWords.length} 个词条${levelText}。`;
}
function renderStructuredData(items) {
  return items
    .map((item) => `<script type="application/ld+json">${sanitizeJsonForScript(item)}</script>`)
    .join('\n');
}

function renderSiteFooter() {
  const sourceItems = SOURCE_ITEMS.map((item) => {
    const sourceName = item.url
      ? `<a href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.name)}</a>`
      : `<span>${escapeHtml(item.name)}</span>`;
    return `<li><span class="site-footer-key">${escapeHtml(item.label)}</span><span class="site-footer-value">${sourceName}</span></li>`;
  }).join('');

  return renderTemplate('site-footer.njk', {
    footerTitle: '数据来源说明',
    sourceItems,
    footerNote: escapeHtml(FOOTER_NOTE),
  });
}

function renderLayout({
  title,
  description,
  keywords,
  canonicalPath,
  bodyClass,
  body,
  structuredData,
}) {
  const canonicalUrl = absoluteUrl(canonicalPath);
  const fullTitle = title.includes(SITE.name) ? title : `${title} | ${SITE.title}`;
  const defaultThemeHref = themeStylesheetHref(DEFAULT_THEME);

  return renderTemplate('layout.njk', {
    language: escapeHtml(SITE.language),
    defaultTheme: escapeHtml(DEFAULT_THEME),
    fullTitle: escapeHtml(fullTitle),
    description: escapeHtml(description),
    keywords: escapeHtml(keywords),
    themeColor: escapeHtml(SITE.themeColor),
    canonicalUrl: escapeHtml(canonicalUrl),
    locale: escapeHtml(SITE.locale),
    siteTitle: escapeHtml(SITE.title),
    defaultThemeHref: escapeHtml(defaultThemeHref),
    structuredData: renderStructuredData(structuredData),
    bodyClass: escapeHtml(bodyClass),
    body,
    siteFooter: renderSiteFooter(),
  });
}

function renderPageStructuredData(page) {
  const pageUrl = absoluteUrl(`/${page.slug}.html`);
  const itemListId = `${pageUrl}#word-list`;
  const breadcrumbId = `${pageUrl}#breadcrumb`;

  return [
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      '@id': `${pageUrl}#webpage`,
      url: pageUrl,
      name: page.title,
      description: buildPageDescription(page),
      inLanguage: SITE.language,
      isPartOf: { '@id': `${absoluteUrl('/')}#website` },
      breadcrumb: { '@id': breadcrumbId },
      mainEntity: { '@id': itemListId },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      '@id': breadcrumbId,
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: TEXT.breadcrumbHome, item: absoluteUrl('/') },
        { '@type': 'ListItem', position: 2, name: page.title, item: pageUrl },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      '@id': itemListId,
      name: `${page.rootTitle} 词族词条`,
      numberOfItems: page.words.length,
      itemListElement: page.words.map((word, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: word.word,
        url: `${pageUrl}#${getWordAnchorId(word.word, index + 1)}`,
      })),
    },
  ];
}

function renderPage(page, siblings = {}) {
  const { previousPage = null, nextPage = null } = siblings;
  const levels = uniqueLevels(page.words);
  const wordCards = page.words.map((word, index) => renderWordCard(word, index + 1)).join('');
  const resultText = `${TEXT.currentVisible} ${page.words.length} / ${page.words.length} ${TEXT.itemsSuffix}`;

  const rootMeta = [];
  if (page.coreMeaning) {
    rootMeta.push(
      `<div class="hero-meta-item"><span>${TEXT.coreMeaning}</span><strong>${escapeHtml(page.coreMeaning)}</strong></div>`,
    );
  }
  rootMeta.push(
    `<div class="hero-meta-item"><span>${TEXT.wordCount}</span><strong>${page.words.length}</strong></div>`,
  );
  if (levels.length > 0) {
    rootMeta.push(
      `<div class="hero-meta-item"><span>${TEXT.levelsCovered}</span><strong>${escapeHtml(levels.join(' / '))}</strong></div>`,
    );
  }

  const introSections = [];
  if (page.overview) {
    introSections.push(
      [
        '<section class="info-card">',
        `<h2 class="card-title">${TEXT.overview}</h2>`,
        sentenceToParagraphs(page.overview),
        '</section>',
      ].join(''),
    );
  }
  if (page.origin) {
    introSections.push(
      [
        '<section class="info-card">',
        `<h2 class="card-title">${TEXT.origin}</h2>`,
        sentenceToParagraphs(page.origin),
        '</section>',
      ].join(''),
    );
  }
  const notesSection = renderRootNotes(page.notes);
  if (notesSection) {
    introSections.push(notesSection);
  }

  const body = renderTemplate('page.njk', {
    siteName: escapeHtml(SITE.name),
    themeSwitcher: renderThemeSwitcher(),
    breadcrumbHome: escapeHtml(TEXT.breadcrumbHome),
    pageTitle: escapeHtml(page.title),
    pageSubtitle: escapeHtml(page.description || page.rootTitle),
    rootSeries: escapeHtml(TEXT.rootSeries),
    rootTitle: escapeHtml(page.rootTitle),
    rootMeta: rootMeta.join(''),
    introSections: introSections.join(''),
    familyWords: escapeHtml(TEXT.familyWords),
    resultText: escapeHtml(resultText),
    searchLabel: escapeHtml(TEXT.searchLabel),
    searchPlaceholder: escapeHtml(TEXT.searchPlaceholder),
    clearSearchLabel: '清空搜索',
    clearSearchText: '清空',
    filterButtons: renderFilterButtons(levels),
    wordCards,
    emptyState: escapeHtml(TEXT.emptyState),
    pageNavigator: renderPageNavigator(previousPage, nextPage),
    floatingNav: renderFloatingNav(page),
  });

  return renderLayout({
    title: page.title,
    description: buildPageDescription(page),
    keywords: buildPageKeywords(page),
    canonicalPath: `/${page.slug}.html`,
    bodyClass: 'page-root',
    body,
    structuredData: renderPageStructuredData(page),
  });
}

function renderWordLinks(page) {
  return page.words
    .map((word, index) => {
      const wordText = String(word.word ?? '').trim() || `Word ${index + 1}`;
      const targetId = getWordAnchorId(wordText, index + 1);
      const levels = (word.levels ?? []).map((level) => String(level ?? '').trim()).filter(Boolean);
      const fullLevels = levels.length > 0 ? levels.join(' / ') : TEXT.uncategorized;
      const levelSummary = formatLevelSummary(levels, 2);

      return renderTemplate('word-link.njk', {
        slug: escapeHtml(page.slug),
        targetId: escapeHtml(targetId),
        title: escapeHtml(`${wordText} / ${fullLevels}`),
        wordText: escapeHtml(wordText),
        levelSummary: escapeHtml(levelSummary),
      });
    })
    .join('');
}

function renderIndexCard(page) {
  const coreMeaning = page.coreMeaning || TEXT.uncategorized;
  const subtitle = page.description || page.rootTitle;
  const familyLevels = uniqueLevels(page.words);
  const metaList = [
    `<span><strong>${TEXT.rootForm}</strong>${escapeHtml(page.rootTitle)}</span>`,
    `<span><strong>${TEXT.coreMeaning}</strong>${escapeHtml(coreMeaning)}</span>`,
    `<span><strong>${TEXT.wordCount}</strong>${page.words.length}</span>`,
    `<span><strong>${TEXT.levelsCovered}</strong>${escapeHtml(formatLevelSummary(familyLevels, 3))}</span>`,
  ].join('');

  return renderTemplate('index-card.njk', {
    slug: escapeHtml(page.slug),
    rootName: escapeHtml(page.rootName),
    title: escapeHtml(page.title),
    subtitle: escapeHtml(subtitle),
    metaList,
    wordLinksLabel: escapeHtml(TEXT.wordLinks),
    wordLinks: renderWordLinks(page),
    viewTopic: escapeHtml(TEXT.viewTopic),
  });
}

function buildHomeHeroStats(pages) {
  const allWords = pages.flatMap((page) => page.words);
  const allLevels = uniqueLevels(allWords);
  const levelList = allLevels.length > 0 ? allLevels.join(' / ') : '等级信息待补充';

  return [
    {
      label: escapeHtml(TEXT.topicCount),
      value: escapeHtml(String(pages.length)),
      note: '',
    },
    {
      label: escapeHtml(TEXT.wordCount),
      value: escapeHtml(String(allWords.length)),
      note: '',
    },
    {
      label: escapeHtml(TEXT.levelsCovered),
      value: escapeHtml(levelList),
      note: escapeHtml(allLevels.length > 0 ? `共 ${allLevels.length} 类等级标签` : ''),
    },
  ];
}

function buildHomeOverviewCards() {
  return [
    {
      kicker: escapeHtml(TEXT.indexSectionKicker),
      title: escapeHtml(TEXT.indexSectionTitle),
      body: sentenceToParagraphs(TEXT.indexSectionDescription),
    },
    {
      kicker: escapeHtml(TEXT.featureCollectionKicker),
      title: escapeHtml(TEXT.featureCollectionTitle),
      body: sentenceToParagraphs(TEXT.featureCollectionText),
    },
    {
      kicker: escapeHtml(TEXT.featureBrowseKicker),
      title: escapeHtml(TEXT.featureBrowseTitle),
      body: sentenceToParagraphs(TEXT.featureBrowseText),
    },
  ];
}

function renderHomeStructuredData(pages) {
  const siteUrl = absoluteUrl('/');
  const listId = `${siteUrl}#topic-list`;

  return [
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      '@id': `${siteUrl}#website`,
      url: siteUrl,
      name: SITE.title,
      description: SITE.description,
      inLanguage: SITE.language,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      '@id': `${siteUrl}#webpage`,
      url: siteUrl,
      name: SITE.title,
      description: buildIndexDescription(pages),
      inLanguage: SITE.language,
      isPartOf: { '@id': `${siteUrl}#website` },
      mainEntity: { '@id': listId },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      '@id': listId,
      name: TEXT.familySectionTitle,
      numberOfItems: pages.length,
      itemListElement: pages.map((page, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: page.title,
        url: absoluteUrl(`/${page.slug}.html`),
      })),
    },
  ];
}

function renderIndex(pages) {
  const body = renderTemplate('index.njk', {
    siteName: escapeHtml(SITE.name),
    themeSwitcher: renderThemeSwitcher(),
    siteKicker: escapeHtml(TEXT.siteKicker),
    siteHeadline: escapeHtml(TEXT.siteHeadline),
    siteSubtitle: escapeHtml(TEXT.siteSubtitle),
    heroStats: buildHomeHeroStats(pages),
    overviewCards: buildHomeOverviewCards(),
    familySectionKicker: escapeHtml(TEXT.familySectionKicker),
    familySectionTitle: escapeHtml(TEXT.familySectionTitle),
    familySectionDescription: escapeHtml(TEXT.familySectionDescription),
    familyCards: pages.map((page) => renderIndexCard(page)).join(''),
    floatingNav: renderHomeFloatingNav(pages),
  });

  return renderLayout({
    title: SITE.title,
    description: buildIndexDescription(pages),
    keywords: SITE.keywords.join(', '),
    canonicalPath: '/',
    bodyClass: 'page-home',
    body,
    structuredData: renderHomeStructuredData(pages),
  });
}

function parseOrder(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function loadPage(filePath) {
  const raw = readJsonFile(filePath);
  const root = raw.root ?? {};
  const page = raw.page ?? {};
  const words = raw.words ?? [];

  if (!Array.isArray(words) || words.length === 0) {
    throw new Error(`${filePath}: ${TEXT.wordsMustBeArray}`);
  }

  const rootName = String(root.name ?? '').trim();
  if (!rootName) {
    throw new Error(`${filePath}: ${TEXT.rootNameRequired}`);
  }

  const slugSource = String(root.slug ?? '').trim() || String(page.slug ?? '').trim() || rootName;

  return {
    slug: slugify(slugSource, 'word-family'),
    order: parseOrder(root.order ?? page.order),
    title: String(page.title ?? `词根 ${rootName} 词族`).trim(),
    description: String(page.description ?? '').trim(),
    rootName,
    rootTitle: String(root.title ?? rootName).trim(),
    coreMeaning: String(root.core_meaning ?? '').trim(),
    origin: String(root.origin ?? '').trim(),
    overview: String(root.overview ?? '').trim(),
    notes: Array.isArray(root.notes)
      ? root.notes.map((item) => String(item).trim()).filter(Boolean)
      : [],
    words,
    sourceFile: filePath.split(/[/\\]/).pop() ?? 'unknown.json',
  };
}

function sortPages(pages) {
  return [...pages].sort((left, right) => {
    const leftOrder = left.order ?? Number.MAX_SAFE_INTEGER;
    const rightOrder = right.order ?? Number.MAX_SAFE_INTEGER;
    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder;
    }
    return left.sourceFile.localeCompare(right.sourceFile, 'zh-CN');
  });
}

function getAssetOutputType(filePath) {
  if (filePath.endsWith('.css')) {
    return 'css';
  }

  if (filePath.endsWith('.js')) {
    return 'js';
  }

  return 'text';
}

function shouldSkipAsset(relativePath) {
  return relativePath === 'styles.css';
}

async function copyAssetDirectory(sourceDir, targetDir, relativeDir = '') {
  mkdirSync(targetDir, { recursive: true });

  for (const entry of readdirSync(sourceDir)) {
    const sourcePath = join(sourceDir, entry);
    const targetPath = join(targetDir, entry);
    const relativePath = relativeDir ? `${relativeDir}/${entry}` : entry;
    const stats = statSync(sourcePath);

    if (stats.isDirectory()) {
      await copyAssetDirectory(sourcePath, targetPath, relativePath);
      continue;
    }

    if (shouldSkipAsset(relativePath)) {
      continue;
    }

    const outputType = getAssetOutputType(relativePath);
    if (outputType === 'text') {
      copyFileSync(sourcePath, targetPath);
      continue;
    }

    const sourceText = readFileSync(sourcePath, 'utf8').replace(/^\uFEFF/, '');
    await writeTextFile(targetPath, sourceText, { type: outputType, bom: !IS_RELEASE });
  }
}

function cleanDistDirectory() {
  mkdirSync(DIST_DIR, { recursive: true });
  for (const entry of readdirSync(DIST_DIR)) {
    rmSync(join(DIST_DIR, entry), { recursive: true, force: true });
  }
}

async function writeTextFile(filePath, content, { bom = false, type = 'text' } = {}) {
  let output = String(content ?? '');

  if (type === 'css') {
    output = optimizeCss(output, filePath);
  } else if (type === 'js') {
    output = await optimizeJs(output, filePath);
  } else if (type === 'html') {
    output = await optimizeHtml(output, filePath);
  }

  writeFileSync(filePath, bom ? `${UTF8_BOM}${output}` : output, 'utf8');
}

function renderSitemap(pages, lastmod) {
  const urls = [
    { loc: absoluteUrl('/'), lastmod },
    ...pages.map((page) => ({ loc: absoluteUrl(`/${page.slug}.html`), lastmod })),
  ];

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((item) => `  <url>\n    <loc>${escapeHtml(item.loc)}</loc>\n    <lastmod>${item.lastmod}</lastmod>\n  </url>`).join('\n')}
</urlset>
`;
}

function renderRobotsTxt() {
  return `User-agent: *\nAllow: /\n\nSitemap: ${absoluteUrl('/sitemap.xml')}\n`;
}

function renderCname() {
  return `${CNAME}\n`;
}

async function build() {
  if (!existsSync(DATA_DIR)) {
    throw new Error(TEXT.notFoundDataDir);
  }
  if (!existsSync(SRC_ASSETS_DIR)) {
    throw new Error(TEXT.notFoundAssetsDir);
  }
  if (!existsSync(TEMPLATES_DIR)) {
    throw new Error('未找到 src/templates 目录');
  }

  cleanDistDirectory();
  await copyAssetDirectory(SRC_ASSETS_DIR, DIST_ASSETS_DIR);

  const pages = sortPages(
    readdirSync(DATA_DIR)
      .filter((name) => name.endsWith('.json') && !name.startsWith('_'))
      .map((name) => loadPage(join(DATA_DIR, name))),
  );

  if (pages.length === 0) {
    throw new Error(TEXT.noBuildFiles);
  }

  for (const [index, page] of pages.entries()) {
    await writeTextFile(
      join(DIST_DIR, `${page.slug}.html`),
      renderPage(page, {
        previousPage: pages[index - 1] ?? null,
        nextPage: pages[index + 1] ?? null,
      }),
      {
        bom: !IS_RELEASE,
        type: 'html',
      },
    );
  }

  const buildTime = new Date().toISOString();
  await writeTextFile(join(DIST_DIR, 'index.html'), renderIndex(pages), {
    bom: !IS_RELEASE,
    type: 'html',
  });
  await writeTextFile(join(DIST_DIR, 'sitemap.xml'), renderSitemap(pages, buildTime));
  await writeTextFile(join(DIST_DIR, 'robots.txt'), renderRobotsTxt());
  await writeTextFile(join(DIST_DIR, '.nojekyll'), '');
  if (CNAME) {
    await writeTextFile(join(DIST_DIR, 'CNAME'), renderCname());
  }

  console.log(`Build completed (${BUILD_MODE}).`);
  console.log(`Generated ${pages.length} root pages, 1 index page, sitemap.xml and robots.txt.`);
  console.log(
    IS_RELEASE
      ? 'Release assets were minified and unused output files were skipped.'
      : 'Default build kept HTML, CSS and JS readable for local inspection.',
  );
  console.log('Files:');
  console.log(' - index.html');
  for (const page of pages) {
    console.log(` - ${page.slug}.html`);
  }
  console.log(' - sitemap.xml');
  console.log(' - robots.txt');
  if (CNAME) {
    console.log(' - CNAME');
  }
}

build().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
