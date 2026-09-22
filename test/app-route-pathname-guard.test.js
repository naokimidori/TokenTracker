const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");
const { transform } = require("esbuild");

const repoRoot = path.join(__dirname, "..");

async function parseDashboardFile(relativePath) {
  const absolutePath = path.join(repoRoot, relativePath);
  const source = fs.readFileSync(absolutePath, "utf8");
  await transform(source, {
    loader: "jsx",
    sourcefile: relativePath,
  });
}

test("App.jsx parses without duplicate identifier errors", async () => {
  await assert.doesNotReject(parseDashboardFile("dashboard/src/App.jsx"));
});

test("App.jsx keeps menu bar configuration inside /widgets", () => {
  const appPath = path.join(repoRoot, "dashboard/src/App.jsx");
  const source = fs.readFileSync(appPath, "utf8");
  assert.equal(source.includes('"/widgets"'), true, "/widgets route should exist");
  assert.equal(source.includes("WidgetsPage"), true, "WidgetsPage should be referenced");
  assert.equal(source.includes('"/menubar"'), false, "/menubar should not be a separate route");
  assert.equal(source.includes("MenuBarPage"), false, "MenuBarPage should not be referenced");
});
