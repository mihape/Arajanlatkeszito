const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");

const PRODUCT_NAME = "Nyilaszaro Ajanlatkeszito";
const SQLITE_FILE = "app-state.sqlite";

function main(argv = process.argv.slice(2), env = process.env) {
  const options = parseArgs(argv);
  const report = createWindowsValidationReport(options, env);
  printReport(report);
  if (options.launch && report.installedApp.exists) launchInstalledApp(report.installedApp.path);
  return report.ok ? 0 : 1;
}

function parseArgs(argv) {
  const options = { launch: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--installer") options.installer = argv[++index];
    else if (arg === "--checksums") options.checksums = argv[++index];
    else if (arg === "--launch") options.launch = true;
    else if (arg === "--help") options.help = true;
  }
  return options;
}

function createWindowsValidationReport(options = {}, env = process.env) {
  const installer = inspectInstaller(options.installer, options.checksums);
  const installedApp = inspectInstalledApp(env);
  const sqlite = inspectSqlite(env);
  const platform = {
    platform: process.platform,
    release: os.release(),
    arch: process.arch,
    isWindows: process.platform === "win32"
  };

  return {
    ok: installer.ok && platform.isWindows,
    platform,
    installer,
    installedApp,
    sqlite,
    manualChecks: [
      "Installed app window opens without blank screen or crash dialog.",
      "Release mode starts without Demo Partner Kft. or AJ-2026-0001.",
      "Customer PDF saves and opens without purchase/internal cost data.",
      "Internal PDF saves and opens with purchase, margin and fedezet data.",
      "JSON backup export/import restores data after app restart."
    ]
  };
}

function inspectInstaller(installerPath, checksumsPath) {
  if (!installerPath) return { ok: false, path: "", exists: false, note: "No --installer path was provided." };
  const exists = fs.existsSync(installerPath);
  if (!exists) return { ok: false, path: installerPath, exists: false, note: "Installer file was not found." };

  const sha256 = hashFile(installerPath);
  const expected = checksumsPath && fs.existsSync(checksumsPath)
    ? readExpectedChecksum(checksumsPath, path.basename(installerPath))
    : "";
  return {
    ok: expected ? sha256.toLowerCase() === expected.toLowerCase() : true,
    path: installerPath,
    exists: true,
    sha256,
    expectedSha256: expected,
    checksumMatched: expected ? sha256.toLowerCase() === expected.toLowerCase() : null
  };
}

function inspectInstalledApp(env = process.env) {
  const candidates = installedAppCandidates(env);
  const found = candidates.find((candidate) => fs.existsSync(candidate));
  return {
    exists: Boolean(found),
    path: found || candidates[0],
    candidates
  };
}

function inspectSqlite(env = process.env) {
  const appData = env.APPDATA || "";
  const sqlitePath = appData ? path.join(appData, PRODUCT_NAME, SQLITE_FILE) : "";
  return {
    exists: Boolean(sqlitePath && fs.existsSync(sqlitePath)),
    path: sqlitePath
  };
}

function installedAppCandidates(env = process.env) {
  return [
    env.LOCALAPPDATA ? path.join(env.LOCALAPPDATA, "Programs", PRODUCT_NAME, `${PRODUCT_NAME}.exe`) : "",
    env.PROGRAMFILES ? path.join(env.PROGRAMFILES, PRODUCT_NAME, `${PRODUCT_NAME}.exe`) : "",
    env["PROGRAMFILES(X86)"] ? path.join(env["PROGRAMFILES(X86)"], PRODUCT_NAME, `${PRODUCT_NAME}.exe`) : ""
  ].filter(Boolean);
}

function hashFile(filePath) {
  const hash = crypto.createHash("sha256");
  hash.update(fs.readFileSync(filePath));
  return hash.digest("hex");
}

function readExpectedChecksum(checksumsPath, installerName) {
  const lines = fs.readFileSync(checksumsPath, "utf8").split(/\r?\n/);
  const normalizedInstaller = installerName.toLowerCase();
  const line = lines.find((item) => item.toLowerCase().includes(normalizedInstaller));
  return line ? line.trim().split(/\s+/)[0] : "";
}

function launchInstalledApp(appPath) {
  const child = spawn(appPath, [], { detached: true, stdio: "ignore" });
  child.unref();
  console.log(`\nLaunched installed app. PID: ${child.pid}`);
  console.log("Observe the window manually, then complete the PDF/backup checklist.");
}

function printReport(report) {
  console.log("# Windows validation report\n");
  console.log(`- Platform: ${report.platform.platform} ${report.platform.release} ${report.platform.arch}`);
  console.log(`- Running on Windows: ${report.platform.isWindows ? "yes" : "no"}`);
  console.log(`- Installer exists: ${report.installer.exists ? "yes" : "no"}`);
  if (report.installer.sha256) console.log(`- Installer SHA256: ${report.installer.sha256}`);
  if (report.installer.expectedSha256) console.log(`- Checksum matched: ${report.installer.checksumMatched ? "yes" : "no"}`);
  console.log(`- Installed app found: ${report.installedApp.exists ? "yes" : "no"}`);
  console.log(`- Installed app path: ${report.installedApp.path || "-"}`);
  console.log(`- SQLite file exists: ${report.sqlite.exists ? "yes" : "no"}`);
  console.log(`- SQLite path: ${report.sqlite.path || "-"}`);
  console.log("\nManual checks still required:");
  report.manualChecks.forEach((item) => console.log(`- ${item}`));
}

if (require.main === module) {
  if (process.argv.includes("--help")) {
    console.log("Usage: node scripts/windows-validate.js --installer <setup.exe> --checksums <CHECKSUMS.txt> [--launch]");
    process.exit(0);
  }
  process.exit(main());
}

module.exports = {
  PRODUCT_NAME,
  SQLITE_FILE,
  parseArgs,
  createWindowsValidationReport,
  installedAppCandidates,
  readExpectedChecksum
};
