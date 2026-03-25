import { readdirSync } from 'node:fs';
import { join } from 'node:path';

import { DATA_DIR, loadPage, sortPages } from '../../scripts/build.mjs';

export function loadAllPages() {
  return sortPages(
    readdirSync(DATA_DIR)
      .filter((name) => name.endsWith('.json') && !name.startsWith('_'))
      .map((name) => loadPage(join(DATA_DIR, name))),
  );
}

export function normalizeText(value) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim();
}