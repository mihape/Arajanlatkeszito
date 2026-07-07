const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");

const PRODUCT_NAME = "Nyilaszaro Ajanlatkeszito";
const root = path.resolve(__dirname, "..");

async function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  if (options.help) {
    printUsage();
    return 0;
  }

  const installer = options.installer || findInstaller(options.distDir);
  if (!installer) {
    console.error(`Installer was not found under ${path.resolve(root, options.distDir)}.`);
    return 1;
  }

  const installDir = options.installDir || fs.mkdtempSync(path.join(os.tmpdir(), "nyilaszaro-installed-"));
  const userDataDir = options.userDataDir || fs.mkdtempSync(path.join(os.tmpdir(), "nyilaszaro-installed-userdata-"));
  const pdfDir = options.pdfDir || "";
  const installedApp = installedAppPath(installDir);

  console.log(`# Installer smoke\n`);
  console.log(`- Installer: ${installer}`);
  console.log(`- Install dir: ${installDir}`);
  console.log(`- Expected app: ${installedApp}`);

  const installCode = await runCommand(installer, ["/S", `/D=${installDir}`], options.installTimeoutMs);
  if (installCode !== 0) {
    console.error(`Installer exited with code ${installCode}.`);
    return installCode || 1;
  }

  const exists = await waitForFile(installedApp, options.waitTimeoutMs);
  if (!exists) {
    console.error(`Installed app did not appear before timeout: ${installedApp}`);
    return 1;
  }

  const smokeCode = await runCommand(process.execPath, [
    path.join(root, "scripts/electron-smoke.js"),
    options.mode,
    "--app",
    installedApp,
    "--user-data-dir",
    userDataDir,
    "--timeout-ms",
    String(options.smokeTimeoutMs),
    ...(pdfDir ? ["--pdf-dir", pdfDir, "--pdf-modes", options.pdfModes] : [])
  ], options.smokeTimeoutMs + 5000);

  if (smokeCode !== 0) return smokeCode || 1;

  console.log(`# Installer smoke result\n`);
  console.log(`- Installed app launched successfully from: ${installedApp}`);
  return 0;
}

function parseArgs(argv) {
  const options = {
    distDir: "dist",
    mode: "release",
    installer: "",
    installDir: "",
    userDataDir: "",
    pdfDir: "",
    pdfModes: "customer,internal",
    installTimeoutMs: 120000,
    waitTimeoutMs: 30000,
    smokeTimeoutMs: 20000,
    help: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--dist") options.distDir = argv[++index] || options.distDir;
    else if (arg === "--mode") options.mode = normalizeMode(argv[++index], options.mode);
    else if (arg === "--installer") options.installer = path.resolve(root, argv[++index] || "");
    else if (arg === "--install-dir") options.installDir = path.resolve(root, argv[++index] || "");
    else if (arg === "--user-data-dir") options.userDataDir = path.resolve(root, argv[++index] || "");
    else if (arg === "--pdf-dir") options.pdfDir = path.resolve(root, argv[++index] || "");
    else if (arg === "--pdf-modes") options.pdfModes = argv[++index] || options.pdfModes;
    else if (arg === "--install-timeout-ms") options.installTimeoutMs = coerceTimeout(argv[++index], options.installTimeoutMs);
    else if (arg === "--wait-timeout-ms") options.waitTimeoutMs = coerceTimeout(argv[++index], options.waitTimeoutMs);
    else if (arg === "--smoke-timeout-ms") options.smokeTimeoutMs = coerceTimeout(argv[++index], options.smokeTimeoutMs);
    else if (arg === "--help") options.help = true;
  }

  return options;
}

function normalizeMode(value, fallback) {
  return value === "demo" || value === "release" ? value : fallback;
}

function findInstaller(distDir = "dist") {
  const absoluteDist = path.resolve(root, distDir);
  if (!fs.existsSync(absoluteDist)) return "";

  const installers = fs.readdirSync(absoluteDist)
    .filter((file) => file.toLowerCase().endsWith(".exe"))
    .filter((file) => file.toLowerCase().includes("setup"))
    .map((file) => path.join(absoluteDist, file))
    .sort();

  return installers[0] || "";
}

function installedAppPath(installDir) {
  return path.join(installDir, `${PRODUCT_NAME}.exe`);
}

function coerceTimeout(value, fallback) {
  const timeout = Number(value);
  return Number.isFinite(timeout) && timeout >= 1000 ? timeout : fallback;
}

function runCommand(command, args, timeoutMs) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: root,
      stdio: "inherit"
    });

    const timeout = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error(`Command timed out after ${timeoutMs} ms: ${command}`));
    }, timeoutMs);

    child.on("exit", (code, signal) => {
      clearTimeout(timeout);
      if (signal) {
        reject(new Error(`Command exited by signal ${signal}: ${command}`));
        return;
      }
      resolve(code ?? 1);
    });

    child.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}

async function waitForFile(filePath, timeoutMs) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (fs.existsSync(filePath)) return true;
    await delay(500);
  }
  return false;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function printUsage() {
  console.log("Usage: node scripts/installer-smoke.js [--mode release|demo] [--installer <setup.exe>] [--install-dir <path>] [--user-data-dir <path>] [--pdf-dir <path>]");
}

if (require.main === module) {
  main().then((code) => {
    process.exit(code);
  }).catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = {
  PRODUCT_NAME,
  parseArgs,
  findInstaller,
  installedAppPath,
  coerceTimeout,
  normalizeMode
};
