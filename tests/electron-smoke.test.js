const assert = require("assert");
const { parseArgs, resolveLaunchTarget } = require("../scripts/electron-smoke");

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`not ok - ${name}`);
    throw error;
  }
}

test("Electron smoke parser accepts release mode and custom timeout", () => {
  const options = parseArgs(["release", "--timeout-ms", "30000", "--user-data-dir", "C:\\Temp\\nyilaszaro"]);
  assert.equal(options.mode, "release");
  assert.equal(options.timeoutMs, 30000);
  assert.equal(options.userDataDir, "C:\\Temp\\nyilaszaro");
});

test("Electron smoke parser accepts packaged app path", () => {
  const options = parseArgs(["release", "--app", "dist\\win-unpacked\\Nyilaszaro Ajanlatkeszito.exe"]);
  assert.equal(options.mode, "release");
  assert.equal(options.app, "dist\\win-unpacked\\Nyilaszaro Ajanlatkeszito.exe");
});

test("Electron smoke parser accepts demo mode", () => {
  const options = parseArgs(["demo"]);
  assert.equal(options.mode, "demo");
  assert.equal(options.timeoutMs, 20000);
});

test("Electron smoke parser falls back from invalid timeout", () => {
  const options = parseArgs(["release", "--timeout-ms", "10"]);
  assert.equal(options.timeoutMs, 20000);
});

test("Electron smoke launch target rejects missing packaged app", () => {
  const target = resolveLaunchTarget({ app: "dist/missing.exe" });
  assert.equal(target.ok, false);
  assert(target.error.includes("Packaged app was not found"));
});
