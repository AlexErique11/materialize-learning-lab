import { defineConfig } from '@playwright/test';
import config from './playwright.config';

// Verify the already-built Pages artifact at the actual repository URL prefix.
const baseURL = 'http://127.0.0.1:4174/materialize-learning-lab/';
export default defineConfig({
  ...config,
  testMatch: '**/pages-deployment.spec.ts',
  use: { ...config.use, baseURL },
  projects: config.projects?.map(project => ({ ...project, testMatch: '**/pages-deployment.spec.ts' })),
  webServer: {
    command: 'npm run preview -- --host 127.0.0.1 --port 4174 --strictPort',
    env: { GITHUB_PAGES: 'true' },
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
