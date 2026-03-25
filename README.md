# Wordify

一个面向“按词根整理单词、按页面持续复习”的静态 HTML 项目。

- 在线地址：[wordify.fanqinglin.com](https://wordify.fanqinglin.com)
- GitHub 仓库：[FQLin/wordify.fqlin.github.io](https://github.com/FQLin/wordify.fqlin.github.io)

你把同一词根下的一组单词整理到 `data/*.json`，执行一次构建命令后，项目会自动生成：

- 总览页：`dist/index.html`
- 多个词根页：`dist/<slug>.html`
- 共享静态资源：`dist/assets/*`
- 搜索引擎辅助文件：`dist/sitemap.xml`、`dist/robots.txt`、`dist/.nojekyll`

项目适合这类场景：

- 你想把同源词、近义变化词、前后缀派生词放到一起背
- 你希望数据长期放在 JSON 中，页面由构建脚本自动生成
- 你想部署到 GitHub Pages 或其他静态托管平台
- 你希望最终产物尽量只是纯静态 HTML、CSS、JS 文件

## 核心能力

- 一个 JSON 对应一个词根专题页面
- 每个单词支持英音、美音、词性释义、等级标签
- 支持远程音频播放链接
- 支持词根分析、记忆提示、例句等可选字段
- 首页支持专题浏览，也支持直接跳转到专题中的具体单词
- 词条页支持等级筛选、关键词搜索、悬浮目录、回到顶部
- 支持多主题切换，并可在构建时指定默认主题
- 支持 `root.order` 控制专题顺序
- 自动输出 SEO 所需的 meta、canonical、JSON-LD、sitemap、robots
- 默认构建保持源码可读；发布构建会压缩 HTML、CSS、JS

## 目录结构

```text
.
├─ data/                 # 词根 JSON 数据
├─ scripts/build.mjs     # Node.js 构建脚本
├─ src/assets/           # 样式与前端交互脚本
│  ├─ base.css           # 通用样式
│  ├─ app.js             # 前端交互逻辑
│  └─ themes/            # 各个主题的独立 CSS 文件
├─ src/templates/        # Nunjucks 页面模板
├─ site.config.json      # 站点配置（默认主题、站点地址、页脚来源等）
├─ dist/                 # 构建产物
└─ README.md             # 使用说明
```

## 环境要求

- Node.js：建议使用 `24.x`
- npm：建议使用和当前 Node 对应的版本
- 系统：Windows / macOS / Linux 都可以，只要能运行 Node.js

如果你使用 `nvm` 一类的版本管理工具，建议先切到你想使用的版本，再运行构建命令。

## 安装依赖

```bash
npm install
```

当前构建阶段使用到的包：

- `nunjucks`：负责模板渲染
- `strip-json-comments`：让 `site.config.json` 和 `data/*.json` 可以写注释
- `esbuild`：用于发布版压缩 JS
- `html-minifier-terser`：用于发布版压缩 HTML
- `clean-css`：用于发布版压缩 CSS

这些包只在构建阶段使用，不会被带到浏览器端运行。

## 代码格式化

项目现在已经接入 `Prettier`，用于统一 JS、CSS、Markdown、构建脚本以及带注释的 JSON 数据文件格式。

为了兼容这类带注释的数据文件，项目现在约定 `site.config.json` 和 `data/*.json` 使用“JSONC 风格写法”：保留 `.json` 文件名，但内容使用双引号，并允许写注释。构建阶段继续由 JSON5 解析这些文件；同时仓库内置了 [`.vscode/settings.json`](./.vscode/settings.json)，会把这些文件在 VSCode 中按 `jsonc` 打开，避免满屏红线。

常用命令：

```bash
npm run format
```

用于直接写回格式化结果。

```bash
npm run format:check
```

用于只检查格式是否符合规则，不修改文件。

当前没有额外引入 `ESLint`。这是有意保留的：

- 你这次主要需要的是统一代码风格，`Prettier` 已经足够
- `ESLint` 更适合后续再加“潜在错误检查、未使用变量、代码规范规则”这一层

## 测试命令

项目现在已经接入三层测试：

- `Vitest`：测试构建逻辑与页面渲染结果
- `Ajv`：校验 `data/*.json` 和 `site.config.json` 一类数据结构
- `Playwright`：测试真实浏览器里的页面交互

常用命令：

```bash
npm run test:unit
```

运行 `Vitest + Ajv`，适合日常快速校验。

```bash
npm run test:e2e
```

先执行构建，再运行 `Playwright` 浏览器测试。当前配置会优先使用开发电脑上已安装的 Google Chrome；如果没有检测到系统 Chrome，再回退到 Playwright 自带的 Chromium。

```bash
npm run test:e2e:chrome
```

强制使用系统 Chrome 跑 E2E。

```bash
npm run test:e2e:chromium
```

强制使用 Playwright 管理的 Chromium 跑 E2E。

```bash
npm run test
```

顺序跑完单元测试和 E2E 测试。

```bash
npm run test:install-browsers
```

只有在你明确要跑 `chromium` 项目时，才需要先安装 Playwright 的 Chromium。若直接使用系统 Chrome，这一步可以不做。

```bash
npm run test:uninstall-browsers
```

如果你已经装过 Playwright Chromium，后面又决定长期只用系统 Chrome，可以执行这条命令把 Playwright 下载的 Chromium 删除掉，减少本机额外占用。

需要注意：Playwright 下载的浏览器二进制默认不在项目仓库里，而是在当前用户目录下的浏览器缓存位置，例如 Windows 常见的是 `C:\Users\<用户名>\AppData\Local\ms-playwright`。所以它影响的是开发电脑本地磁盘占用，不会让仓库里的源码或 `dist/` 产物变大。

当前测试覆盖的重点包括：

- 首页首屏统计是否按预期生成
- 词根专题排序是否和首页顺序一致
- 上一页 / 下一页导航是否正确
- JSON 数据结构是否符合词根页面生成要求
- 首页直达词条后，专题页目录切换是否会同步更新当前高亮词条
- 搜索与专题翻页是否可正常工作

## 构建命令

### 1. 默认构建

```bash
npm run build
```

默认构建的特点：

- 生成可直接部署的静态文件
- `dist` 中的 HTML、CSS、JS 保持相对可读，便于本地检查
- 适合开发、调样式、查页面结构时使用

### 2. 发布构建

```bash
npm run build:release
```

发布构建的特点：

- 压缩 `dist` 中的 HTML、CSS、JS
- 更适合正式部署或提交到公开站点
- 不会影响 `src/` 中的源码可读性

建议使用方式：

- 日常开发、看页面结构：`npm run build`
- 真正准备发布：`npm run build:release`

## 构建结果说明

构建完成后，主要输出：

- `dist/index.html`：首页
- `dist/<slug>.html`：每个词根专题页
- `dist/assets/base.css`：通用样式
- `dist/assets/app.js`：前端交互脚本
- `dist/assets/themes/*.css`：主题样式
- `dist/sitemap.xml`：站点地图
- `dist/robots.txt`：搜索引擎抓取规则
- `dist/.nojekyll`：GitHub Pages 兼容文件
- `dist/CNAME`：GitHub Pages 自定义域名文件

直接打开 `dist/index.html` 就可以本地预览。

## 日常使用流程

推荐的维护流程如下：

1. 在 `data/` 下新增或修改一个词根 JSON 文件。
2. 执行 `npm run build`。
3. 打开 `dist/index.html` 检查首页、专题页、直达词条是否正常。
4. 如果要正式发布，再执行 `npm run build:release`。
5. 将 `dist/` 部署到 GitHub Pages 或其他静态托管平台。
6. 如果你使用当前仓库的 GitHub Pages，自定义域名会自动写成 `wordify.fanqinglin.com`。

## 数据文件怎么写

最推荐的参考顺序：

- [data/\_template.root.json](./data/_template.root.json)
- [data/spect.json](./data/spect.json)
- [data/struct.json](./data/struct.json)

### 一个专题的基本结构

```json
{
  "root": {},
  "page": {},
  "words": []
}
```

### `root` 字段

`root` 主要决定“这个专题是什么、怎么显示、怎么排序”：

- `root.slug`：输出页面文件名，最终生成 `<slug>.html`
- `root.order`：专题排序，数字越小越靠前
- `root.name`：词根本体，必填
- `root.title`：词根展示标题，可以写成 `spect / spic` 这种形式
- `root.core_meaning`：词根核心含义
- `root.origin`：词源、原始含义、来源说明
- `root.overview`：页面开头的整体介绍
- `root.notes`：可选补充说明，数组形式

### `page` 字段

`page` 主要决定当前专题页的标题与描述：

- `page.title`：浏览器标题和页面标题
- `page.description`：页面副标题、SEO 描述补充

### `words[]` 字段

`words[]` 是整个专题真正的词条内容。

一个词条常用字段如下：

- `word`：单词本体，必填
- `pronunciations.uk.ipa`：英音音标
- `pronunciations.uk.audio_url`：英音远程音频地址
- `pronunciations.us.ipa`：美音音标
- `pronunciations.us.audio_url`：美音远程音频地址
- `translations[]`：释义数组
- `levels[]`：等级数组
- `analysis.breakdown`：构词拆解
- `analysis.note`：词根分析说明
- `memory_tip`：记忆提示
- `examples[]`：例句数组

### 释义怎么写

如果一个单词有多个词性，就继续追加对象：

```json
"translations": [
  { "part_of_speech": "n.", "meaning": "尊重；方面" },
  { "part_of_speech": "v.", "meaning": "尊重；遵守" }
]
```

### 等级怎么写

等级直接写成数组即可，可以写很多个：

```json
"levels": ["CET-4", "IELTS", "BEC", "TEM-8"]
```

页面上的显示规则：

- 词条卡片默认显示前 3 个等级
- 多余的等级会显示成 `+N`
- 首页词条入口会显示等级摘要
- 首页首屏还会统计覆盖等级数量

### 哪些字段可以省略

下面这些字段是可选的，没有可以不写：

- `pronunciations.*.audio_url`
- `analysis`
- `memory_tip`
- `examples`
- `root.notes`

如果某个字段没有内容，页面会自动按“缺失可选信息”处理，不需要手动补占位文本。

## JSON 中可以写注释

`site.config.json` 和 `data/*.json` 都支持注释，但为了让 VSCode 不报错，建议按 **JSONC 风格** 来写：

- 文件名仍然保持 `.json`
- 键名和值使用双引号 `""`
- 可以写 `//` 或 `/* */` 注释
- 不要再使用单引号包裹键名或字符串

项目已经自带了 [`.vscode/settings.json`](./.vscode/settings.json)，会把下面这些文件按 `jsonc` 打开：

- `site.config.json`
- `data/*.json`

所以在当前仓库里，用 VSCode 打开这些文件时，正常情况下不会再出现整页红色报错。

例如：

```jsonc
{
  // 这是单行注释
  "root": {
    "name": "spect"
  }
}
```

以及：

```jsonc
{
  /* 这是多行注释 */
  "page": {
    "title": "词根 spect 词族"
  }
}
```

如果你已经打开了旧文件但 VSCode 还没立即刷新语言模式，可以：

1. 关闭后重新打开这个文件。
2. 或者重新打开整个工作区。
3. 如果仍未生效，检查右下角语言模式是否为 `JSON with Comments`。

构建脚本会继续自动忽略这些注释，所以不影响 `npm run build` 和测试。

## 首页怎么使用

首页主要承担两类任务：

- 总览整个站点的专题规模与内容分布
- 快速进入某个专题或某个具体单词

首页上你会看到：

- 首屏统计信息：专题数、词条数、等级覆盖等概览
- 三张说明卡：站点定位、页面内容、复习方式
- 专题卡片列表：每张卡片对应一个词根专题
- 专题悬浮目录：当专题越来越多时，可快速跳转到对应卡片

首页每张专题卡片里一般有这些入口：

- `查看专题`：进入整个词根专题页
- 词条链接：直接进入专题页里的某个单词位置
- 等级摘要：帮助快速判断这个词适合什么考试或场景

## 专题页怎么使用

专题页的使用顺序，推荐如下：

1. 先看页面顶部的词根介绍。
2. 再看专题包含的等级范围、词条总数、核心含义。
3. 如有需要，用搜索或等级筛选先缩小范围。
4. 再顺着词条卡片连续浏览整个词族。
5. 如果只想回看某个词，用右下角目录快速定位。

专题页当前支持的交互：

- 搜索单词
- 按等级筛选词条
- 播放远程音频
- 右下角悬浮目录跳转词条
- 回到顶部
- 返回首页
- 手机端与电脑端自适应布局

### 搜索规则

当前搜索范围是：

- 单词本体
- 释义
- 等级

不会搜索：

- 例句
- 记忆提示
- 词根分析说明中的额外句子

具体规则：

- 英文或等级搜索时，1 到 2 个字符优先按前缀匹配
- 中文搜索时，会按释义中的中文内容匹配
- 等级也可以直接搜索，例如 `CET-4`、`IELTS`

### 目录与当前词条高亮

专题页右下角目录支持：

- 打开 / 收起目录
- 返回首页
- 回到顶部
- 快速跳到某个词条

当你从首页直接跳到某个词条，再在专题页目录里切换到其他词条时：

- 目录中的当前项会跟着切换
- 当前词条卡片的高亮样式也会同步切换
- 不会一直停留在首次进入时那个词条上

## 主题怎么使用

### 构建时指定默认主题

在 [site.config.json](./site.config.json) 里修改：

```json
{
  "site": {
    "defaultTheme": "sand"
  }
}
```

可选主题名称要和下面这些文件名对应：

- [sand.css](./src/assets/themes/sand.css)
- [forest.css](./src/assets/themes/forest.css)
- [coast.css](./src/assets/themes/coast.css)

### 用户在页面上切换主题

用户进入页面后，可以通过右上角主题按钮切换主题。

切换后的主题会保存在浏览器本地，因此：

- 同一个浏览器下再次打开页面，会继续沿用上次选择的主题
- 默认主题只影响“首次访问时”的初始效果

## 专题排序规则

专题排序优先级如下：

1. 先按 `root.order` 从小到大排序
2. 如果 `root.order` 相同或没写，再按源文件名排序

因此你完全可以手动控制专题顺序。

例如：

- `spect.json` 的 `root.order` 设成 `10`
- `struct.json` 的 `root.order` 设成 `20`

那么首页就会先显示 `spect`，再显示 `struct`。

## 数据来源说明怎么配置

如果你想手动修改“首页最底部的数据来源说明”，请直接编辑 [site.config.json](./site.config.json)。

需要改的就是这两个字段：

- `site.sources`：控制数据来源列表本身
- `site.footerNote`：控制列表下面那段补充说明文字

这两个字段不只影响首页，也会同时影响各个专题页底部，因为站点页脚是共用的。

### 最常见的手动修改位置

在 [site.config.json](./site.config.json) 中，重点看这里：

```jsonc
{
  "site": {
    "sources": [
      { "label": "等级信息", "name": "有道词典", "url": "https://www.youdao.com/" },
      { "label": "音标与释义", "name": "有道词典", "url": "https://www.youdao.com/" },
      { "label": "读音音频", "name": "远程音频接口", "url": "" },
      { "label": "词根分析", "name": "站点维护者整理", "url": "" }
    ],
    "footerNote": "页面展示的数据来源会随词条整理逐步补充，若与你自定义的资料来源不同，请以你维护的 JSON 数据为准。"
  }
}
```

### `site.sources` 每个字段是什么意思

`site.sources` 是一个数组，数组里每一项对应页脚中的一条来源信息。

每一项有 3 个常用字段：

- `label`：左侧分类名，比如“等级信息”“音标与释义”
- `name`：右侧显示名称，比如“有道词典”“站点维护者整理”
- `url`：可选链接；如果填了，会把 `name` 渲染成可点击链接；如果留空字符串，就只显示文字

例如：

```jsonc
{ "label": "等级信息", "name": "有道词典", "url": "https://www.youdao.com/" }
```

表示页脚里会显示一条“等级信息 / 有道词典”，并且“有道词典”可以点击跳转。

### 你手动更新时最常做的几件事

1. 想新增一条来源：就在 `site.sources` 里继续追加一个对象。
2. 想修改显示顺序：直接调整 `site.sources` 数组里的顺序。
3. 想改来源名称或链接：直接改对应项的 `name` 或 `url`。
4. 想写一段说明文字：改 `site.footerNote`。
5. 想暂时保留来源但不让它跳转：把 `url` 改成空字符串 `""`。

### 改完之后要做什么

修改完 [site.config.json](./site.config.json) 后，重新执行：

```bash
npm run build
```

如果你准备直接发布，再执行：

```bash
npm run build:release
```

这样新的数据来源说明就会写进 `dist/index.html` 和各个专题页。

### 补充说明

- `site.sources` 的数组顺序，就是页面上的显示顺序。
- 如果 `url` 留空，页面只显示名称，不生成链接。
- 如果你以后只想改这块信息，不需要动 `data/*.json`，直接改 [site.config.json](./site.config.json) 就可以。

## SEO 相关说明

构建时会自动生成并写入：

- `title`
- `description`
- `keywords`
- canonical
- Open Graph 基本信息
- JSON-LD 结构化数据
- `sitemap.xml`
- `robots.txt`

当前项目使用的正式地址是 [wordify.fanqinglin.com](https://wordify.fanqinglin.com)。如果你以后再次更换域名，最需要优先改的是：

- [site.config.json](./site.config.json) 中的 `site.baseUrl`
- [site.config.json](./site.config.json) 中的 `site.cname`

否则 sitemap、canonical、结构化数据和 `dist/CNAME` 都会继续使用旧地址。

## 模板与主题文件说明

项目现在使用“模板文件 + 数据替换”的方式，而不是大段 HTML 字符串拼接。

常用模板：

- [layout.njk](./src/templates/layout.njk)：公共布局
- [index.njk](./src/templates/index.njk)：首页
- [page.njk](./src/templates/page.njk)：专题页
- [index-card.njk](./src/templates/index-card.njk)：首页专题卡片
- [word-card.njk](./src/templates/word-card.njk)：词条卡片

样式文件分工：

- [base.css](./src/assets/base.css)：所有主题共用的结构样式
- `src/assets/themes/*.css`：只放各个主题的颜色变量和外观差异

这意味着：

- 你改布局，大多数时候改 `base.css`
- 你改配色或主题名，主要改 `themes/*.css`
- 你改页面结构，主要改 `src/templates/*.njk`

## 常见修改入口

如果你后续经常要改项目，最常碰到的文件一般是：

- [site.config.json](./site.config.json)：站点名称、默认主题、底部来源、SEO 基础信息
- [data/\_template.root.json](./data/_template.root.json)：新增词根时先复制这份模板
- `data/*.json`：真正维护词条内容
- [src/templates/index.njk](./src/templates/index.njk)：首页结构
- [src/templates/page.njk](./src/templates/page.njk)：专题页结构
- [src/assets/base.css](./src/assets/base.css)：通用布局样式
- [src/assets/app.js](./src/assets/app.js)：前端交互
- [scripts/build.mjs](./scripts/build.mjs)：构建逻辑

## 常见问题

### 1. 我改了 JSON，但是页面没变化

先确认这几件事：

- 是否重新执行了 `npm run build`
- 是否打开的是 `dist/index.html`，而不是旧文件
- 浏览器是否缓存了旧的 CSS / JS

如果页面行为没更新，先试一次硬刷新。

### 2. 我用了 nvm，但这里找不到 node 或 npm

先在你自己的终端里切换 Node 版本，例如：

```bash
nvm use 24.14.0
```

然后再执行：

```bash
npm run build
```

### 3. 页面里中文显示异常

建议源码文件统一保存为 UTF-8。当前项目中常编辑的中文文件已经处理成适合当前 Windows PowerShell 直接查看的编码形式。

### 4. 发布版和默认版有什么区别

区别主要在 `dist`：

- 默认版更适合检查页面和排错
- 发布版更适合部署，体积更小

如果你不确定当前该用哪一个，就先用默认版。

## 一份最小可行操作清单

如果你只想最短路径跑起来，可以按这个顺序：

1. 复制 [data/\_template.root.json](./data/_template.root.json) 新建一个专题 JSON。
2. 填好 `root`、`page`、`words`。
3. 执行 `npm run build`。
4. 打开 `dist/index.html`。
5. 检查首页、专题页、单词直达、搜索、目录是否正常。
6. 准备正式发布时执行 `npm run build:release`。

这样就能完成从数据维护到页面输出的整套流程。

## 当前项目真实地址

当前项目已经按真实地址配置为：

- 站点域名：[wordify.fanqinglin.com](https://wordify.fanqinglin.com)
- 仓库地址：[https://github.com/FQLin/wordify.fqlin.github.io](https://github.com/FQLin/wordify.fqlin.github.io)

如果你后面要迁移仓库或域名，优先修改：

- `site.config.json` 中的 `site.baseUrl`
- `site.config.json` 中的 `site.cname`
- `package.json` 中的 `homepage`
- `package.json` 中的 `repository.url`
