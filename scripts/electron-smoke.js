const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");
const electron = require("electron");

const root = path.resolve(__dirname, "..");

function main(argv = process.argv.slice(2), env = process.env) {
  const options = parseArgs(argv);
  if (options.help || !options.mode) {
    printUsage();
    return options.help ? 0 : 1;
  }

  const launch = resolveLaunchTarget(options);
  if (!launch.ok) {
    console.error(launch.error);
    return 1;
  }

  const userDataDir = options.userDataDir || fs.mkdtempSync(path.join(os.tmpdir(), `nyilaszaro-smoke-${options.mode}-`));
  const child = spawn(launch.command, launch.args, {
    cwd: root,
    stdio: "inherit",
    env: {
      ...env,
      NYILASZARO_APP_MODE: options.mode,
      NYILASZARO_SMOKE: "1",
      NYILASZARO_SMOKE_EXPECT: options.mode,
      NYILASZARO_SMOKE_TIMEOUT_MS: String(options.timeoutMs),
      NYILASZARO_USER_DATA_DIR: userDataDir,
      NYILASZARO_SMOKE_PDF_DIR: options.pdfDir,
      NYILASZARO_SMOKE_PDF_MODES: options.pdfModes,
      NYILASZARO_SMOKE_BACKUP_MODE: options.backupMode,
      NYILASZARO_SMOKE_SKIP_DATA_MODE_CHECK: options.skipDataModeCheck ? "1" : ""
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
    app: "",
    pdfDir: "",
    pdfModes: "customer,internal",
    backupMode: "",
    skipDataModeCheck: false,
    help: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "demo" || arg === "release") options.mode = arg;
    else if (arg === "--timeout-ms") options.timeoutMs = Number(argv[++index] || options.timeoutMs);
    else if (arg === "--user-data-dir") options.userDataDir = argv[++index] || "";
    else if (arg === "--app") options.app = argv[++index] || "";
    else if (arg === "--pdf-dir") options.pdfDir = path.resolve(root, argv[++index] || "");
    else if (arg === "--pdf-modes") options.pdfModes = argv[++index] || options.pdfModes;
    else if (arg === "--backup-mode") options.backupMode = normalizeBackupMode(argv[++index] || "");
    else if (arg === "--skip-data-mode-check") options.skipDataModeCheck = true;
    else if (arg === "--help") options.help = true;
  }

  if (!Number.isFinite(options.timeoutMs) || options.timeoutMs < 1000) options.timeoutMs = 20000;
  return options;
}

function normalizeBackupMode(value) {
  return value === "write" || value === "verify" ? value : "";
}

function resolveLaunchTarget(options) {
  if (!options.app) {
    return {
      ok: true,
      command: electron,
      args: ["."],
      type: "dev-electron"
    };
  }

  const appPath = path.resolve(root, options.app);
  if (!fs.existsSync(appPath)) {
    return {
      ok: false,
      error: `Packaged app was not found: ${appPath}`
    };
  }

  return {
    ok: true,
    command: appPath,
    args: [],
    type: "packaged-app"
  };
}

function printUsage() {
  console.log("Usage: node scripts/electron-smoke.js <release|demo> [--app <exe-path>] [--pdf-dir <path>] [--pdf-modes customer,internal] [--backup-mode write|verify] [--skip-data-mode-check] [--timeout-ms 20000] [--user-data-dir <path>]");
}

if (require.main === module) {
  const result = main();
  if (typeof result === "number") process.exit(result);
}

module.exports = {
  normalizeBackupMode,
  parseArgs,
  resolveLaunchTarget
};
