import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  testMatch: "auth-backend.spec.ts",
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:5174",
    channel: "msedge",
    headless: true,
    viewport: { width: 1440, height: 1000 },
    hasTouch: true,
  },
  webServer: [
    {
      command: "node e2e/serve-auth-backend.mjs",
      url: "http://127.0.0.1:8001/up",
      reuseExistingServer: false,
    },
    {
      command: "npm run dev -- --port 5174",
      url: "http://127.0.0.1:5174",
      reuseExistingServer: false,
      env: { CYBERLAW_API_PROXY: "http://127.0.0.1:8001" },
    },
  ],
});
