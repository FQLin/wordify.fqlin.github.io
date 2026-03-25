import { existsSync } from 'node:fs';

import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;
const SYSTEM_CHROME_PATHS = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  `${process.env.LOCALAPPDATA || ''}/Google/Chrome/Application/chrome.exe`,
].filter(Boolean);

const hasSystemChrome = SYSTEM_CHROME_PATHS.some((chromePath) => existsSync(chromePath));
const requestedProject = process.env.PLAYWRIGHT_PROJECT || '';

function createProject(name) {
  if (name === 'chrome') {
    return {
      name: 'chrome',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome',
      },
    };
  }

  return {
    name: 'chromium',
    use: {
      ...devices['Desktop Chrome'],
    },
  };
}

const defaultProjectName = hasSystemChrome ? 'chrome' : 'chromium';
const activeProjectName = requestedProject || defaultProjectName;

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  expect: {
    timeout: 5000,
  },
  reporter: 'list',
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'node scripts/serve-dist.mjs',
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: !process.env.CI,
    env: {
      PORT: String(PORT),
    },
  },
  projects: [createProject(activeProjectName)],
});