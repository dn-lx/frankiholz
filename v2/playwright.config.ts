import { defineConfig,devices } from '@playwright/test';
export default defineConfig({
  testDir:'./tests',
  testMatch:'visual.spec.ts',
  timeout:45000,
  expect:{timeout:7000},
  retries:process.env.CI?1:0,
  use:{baseURL:'http://127.0.0.1:3042',trace:'retain-on-failure',screenshot:'only-on-failure'},
  projects:[
    {name:'chromium-desktop',use:{...devices['Desktop Chrome'],viewport:{width:1440,height:900}}},
    {name:'chromium-mobile',use:{...devices['iPhone 13'],defaultBrowserType:'chromium'}}
  ],
  webServer:{command:'npm run start -- -p 3042',port:3042,reuseExistingServer:!process.env.CI,timeout:120000}
});
