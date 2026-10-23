import { defineConfig, devices } from '@playwright/test';
const webkit=process.env.PLAYWRIGHT_WEBKIT_EXECUTABLE_PATH ? {launchOptions:{executablePath:process.env.PLAYWRIGHT_WEBKIT_EXECUTABLE_PATH}} : {};
export default defineConfig({
  testDir:'./tests',
  testMatch:'**/*.spec.ts',
  timeout:30_000,
  expect:{timeout:7000},
  workers:process.env.CI?1:2,
  retries:0,
  reporter:process.env.CI?[['line'],['html',{open:'never'}]]:'list',
  use:{baseURL:'http://127.0.0.1:3042',trace:'retain-on-failure',screenshot:'only-on-failure'},
  projects:[
    {name:'chromium',use:{...devices['Desktop Chrome'],viewport:{width:1440,height:900}}},
    {name:'webkit',use:{...devices['Desktop Safari'],...webkit}},
    {name:'iphone-webkit',use:{...devices['iPhone 13'],...webkit}},
    {name:'ipad-webkit',use:{...devices['iPad Pro 11'],...webkit}},
  ],
  webServer:{command:'npm run start -- -p 3042',url:'http://127.0.0.1:3042',reuseExistingServer:false,timeout:60_000},
});
