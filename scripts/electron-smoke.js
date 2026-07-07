const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");
const electron = require("electron");

function main(argv = process.argv.slice(2), env = process.env) {
  const options = parseArgs(argv);
  if (options.help || !options.mode) {
    printUsage();
    return options.help ? 0 : 1;
  }

  const userDataDir = options.userDataDir || fs.mkdtempSync(path.join(os.tmpdir(), `nyilaszaro-smoke-${options.mode}-`));
  const child = spawn(electron, ["."], {
    cwd: path.resolve(__dirname, ".."),
    stdio: "inherit",
    shell: process.platform === "win32",
    env: {
      ...env,
      NYILASZARO_APP_MODE: options.mode,
      NYILASZARO_SMOKE: "1",
      NYILASZARO_SMOKE_EXPECT: options.mode,
      NYILASZARO_SMOKE_TIMEOUT_MS: String(options.timeoutMs),
      NYILASZARO_USER_DATA_DIR: userDataDir
    }
  });

  const timeout = setTimeout(() => {
    child.kill("SIGTERM");
    console.error(`Electron smoke timed out after ${options.timeoutMs} ms.`);
  }, options.timeoutMs + 5000);

  child.on("exit", (code, signal) => {
    clearTimeout(timeout);
    if (signal) {
      console.error(`Electron smoke exited by signal ${signal}.`);
      process.exit(1);
    }
    process.exit(code ?? 1);
  });

  child.on("error", (error) => {
    clearTimeout(timeout);
    console.error(error);
    process.exit(1);
  });

  return null;
}

function parseArgs(argv) {
  const options = {
    mode: "",
    timeoutMs: 20000,
    userDataDir: "",
    help: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "demo" || arg === "release") options.mode = arg;
    else if (arg === "--timeout-ms") options.timeoutMs = Number(argv[++index] || options.timeoutMs);
    else if (arg === "--user-data-dir") options.userDataDir = argv[++index] || "";
    else if (arg === "--help") options.help = true;
  }

  if (!Number.isFinite(options.timeoutMs) || options.timeoutMs < 1000) options.timeoutMs = 20000;
  return options;
}

function printUsage() {
  console.log("Usage: node scripts/electron-smoke.js <release|demo> [--timeout-ms 20000] [--user-data-dir <path>]");
}

if (require.main === module) {
  const result = main();
  if (typeof result === "number") process.exit(result);
}

module.exports = {
  parseArgs
};
