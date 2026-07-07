const assert = require("assert");
const fs = require("fs");
const path = require("path");
const {
  PRODUCT_NAME,
  coerceTimeout,
  findInstaller,
  installedAppPath,
  parseArgs
} = require("../scripts/installer-smoke");

const root = path.resolve(__dirname, "..");

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`not ok - ${name}`);
    throw error;
  }
}

test("Installer smoke parser accepts explicit paths and timeouts", () => {
  const options = parseArgs([
    "--installer",
    "dist/setup.exe",
    "--install-dir",
    ".tmp-tests/install",
    "--user-data-dir",
    ".tmp-tests/user-data",
    "--install-timeout-ms",
    "90000",
    "--wait-timeout-ms",
    "10000",
    "--smoke-timeout-ms",
    "15000"
  ]);

  assert.equal(options.installer, path.join(root, "dist/setup.exe"));
  assert.equal(options.installDir, path.join(root, ".tmp-tests/install"));
  assert.equal(options.userDataDir, path.join(root, ".tmp-tests/user-data"));
  assert.equal(options.installTimeoutMs, 90000);
  assert.equal(options.waitTimeoutMs, 10000);
  assert.equal(options.smokeTimeoutMs, 15000);
});

test("Installer smoke finds setup executable in dist directory", () => {
  const tmpRoot = path.join(root, ".tmp-tests");
  fs.mkdirSync(tmpRoot, { recursive: true });
  const dist = fs.mkdtempSync(path.join(tmpRoot, "installer-dist-"));
  fs.writeFileSync(path.join(dist, "notes.txt"), "");
  fs.writeFileSync(path.join(dist, "Nyilaszaro Ajanlatkeszito Setup 0.1.0.exe"), "");
  assert.equal(findInstaller(dist), path.join(dist, "Nyilaszaro Ajanlatkeszito Setup 0.1.0.exe"));
});

test("Installer smoke builds installed app path", () => {
  assert.equal(installedAppPath("C:\\Temp\\nyilaszaro"), path.join("C:\\Temp\\nyilaszaro", `${PRODUCT_NAME}.exe`));
});

test("Installer smoke timeout coercion rejects tiny values", () => {
  assert.equal(coerceTimeout("10", 120000), 120000);
  assert.equal(coerceTimeout("5000", 120000), 5000);
});
