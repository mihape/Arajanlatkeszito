const assert = require("assert");
const fs = require("fs");
const path = require("path");
const {
  PRODUCT_NAME,
  createWindowsValidationReport,
  installedAppCandidates,
  parseArgs,
  readExpectedChecksum
} = require("../scripts/windows-validate");

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

test("Windows validator parses command line options", () => {
  const options = parseArgs(["--installer", "setup.exe", "--checksums", "CHECKSUMS.txt", "--launch"]);
  assert.equal(options.installer, "setup.exe");
  assert.equal(options.checksums, "CHECKSUMS.txt");
  assert.equal(options.launch, true);
});

test("Windows validator reads matching checksum lines", () => {
  const tmpRoot = path.join(root, ".tmp-tests");
  fs.mkdirSync(tmpRoot, { recursive: true });
  const tmp = fs.mkdtempSync(path.join(tmpRoot, "nyilaszaro-checksum-"));
  const checksums = path.join(tmp, "CHECKSUMS.txt");
  fs.writeFileSync(checksums, "ABCDEF  Nyilaszaro Ajanlatkeszito Setup 0.1.0.exe\n");
  assert.equal(readExpectedChecksum(checksums, "Nyilaszaro Ajanlatkeszito Setup 0.1.0.exe"), "ABCDEF");
});

test("Windows validator builds installed app candidates from environment", () => {
  const candidates = installedAppCandidates({
    LOCALAPPDATA: "C:\\Users\\Demo\\AppData\\Local",
    PROGRAMFILES: "C:\\Program Files",
    "PROGRAMFILES(X86)": "C:\\Program Files (x86)"
  });

  assert(candidates.some((candidate) => candidate.includes(PRODUCT_NAME)));
  assert(candidates.some((candidate) => candidate.includes("Programs")));
});

test("Windows validation report marks missing installer as not ok", () => {
  const report = createWindowsValidationReport({ installer: "missing.exe" }, {});
  assert.equal(report.installer.exists, false);
  assert.equal(report.ok, false);
});
