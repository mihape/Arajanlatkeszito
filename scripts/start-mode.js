const { spawn } = require("child_process");
const electron = require("electron");

const mode = process.argv[2];
if (mode !== "demo" && mode !== "release") {
  console.error("Usage: node scripts/start-mode.js <demo|release>");
  process.exit(1);
}

const child = spawn(electron, ["."], {
  stdio: "inherit",
  env: {
    ...process.env,
    NYILASZARO_APP_MODE: mode
  }
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
