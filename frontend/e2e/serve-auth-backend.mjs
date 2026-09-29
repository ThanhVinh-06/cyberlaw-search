import { spawn, spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { randomBytes } from "node:crypto";

const root = resolve("../backend/api");
const isolated = resolve(root, "storage/framework/testing");
mkdirSync(resolve(isolated, "sessions"), { recursive: true });
// This fixed test path never references MySQL or a user-provided DB path.
const database = resolve(isolated, "auth-browser.sqlite");
writeFileSync(database, "");
const php = process.env.PHP_BINARY ?? "C:/xampp/php/php.exe";
const env = {
  ...process.env,
  APP_ENV: "local",
  APP_DEBUG: "false",
  APP_KEY: `base64:${randomBytes(32).toString("base64")}`,
  APP_CONFIG_CACHE: resolve(isolated, "no-config-cache.php"),
  APP_URL: "http://127.0.0.1:5174",
  DB_CONNECTION: "sqlite",
  DB_DATABASE: database,
  DB_URL: "",
  SESSION_DRIVER: "file",
  SESSION_COOKIE: "cyberlaw_browser_test",
  SESSION_DOMAIN: "null",
  SESSION_SECURE_COOKIE: "false",
  SESSION_FILES: resolve(isolated, "sessions"),
  CACHE_STORE: "file",
  FRONTEND_ORIGINS: "http://127.0.0.1:5174",
  BCRYPT_ROUNDS: "4",
  MAIL_MAILER: "smtp",
  MAIL_HOST: "127.0.0.1",
  MAIL_PORT: "1026",
  MAIL_SCHEME: "smtp",
  MAIL_URL: "null",
  MAIL_USERNAME: "null",
  MAIL_PASSWORD: "null",
  MAIL_FROM_ADDRESS: "cyberlaw@example.test",
  CACHE_FILES: resolve(isolated, `cache-${randomBytes(8).toString("hex")}`),
};
const setup = spawnSync(php, ["tests/prepare-browser.php"], {
  cwd: root,
  env,
  stdio: "inherit",
  windowsHide: true,
});
if (setup.status !== 0) process.exit(setup.status ?? 1);
// Separate local mailbox for synthetic accounts. No access to the developer's inbox or MySQL.
const mailbox = spawn(
  resolve("../tmp/tools/mailpit/mailpit.exe"),
  [
    "--listen",
    "127.0.0.1:8026",
    "--smtp",
    "127.0.0.1:1026",
    "--allowed-hosts",
    "127.0.0.1,localhost",
    "--smtp-allowed-recipients",
    "@example.test$",
    "--smtp-disable-rdns",
    "--disable-version-check",
    "--quiet",
    "--max",
    "100",
  ],
  { windowsHide: true, stdio: "inherit" },
);
mailbox.on("error", () => {
  console.error("Mailpit test binary unavailable; see backend email setup.");
  process.exit(1);
});
const server = spawn(
  php,
  [
    "-S",
    "127.0.0.1:8001",
    "../vendor/laravel/framework/src/Illuminate/Foundation/resources/server.php",
  ],
  {
    cwd: resolve(root, "public"),
    env,
    stdio: "inherit",
    windowsHide: true,
  },
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => {
    server.kill();
    mailbox.kill();
    process.exit();
  });
server.on("exit", (code) => {
  mailbox.kill();
  process.exit(code ?? 1);
});
