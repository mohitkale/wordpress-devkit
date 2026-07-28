#!/usr/bin/env node
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const HOOK = path.join(__dirname, "..", "hooks", "session-start.js");
const POST_HOOK = path.join(__dirname, "..", "hooks", "post-tool-use.js");
const FIXTURES = path.join(__dirname, "fixtures");

const names = fs.readdirSync(FIXTURES).filter(n => {
  const fixture = path.join(FIXTURES, n);
  return fs.statSync(fixture).isDirectory() && fs.existsSync(path.join(fixture, ".expected-context"));
});

let pass = 0, fail = 0;
for (const name of names) {
  const cwd = path.join(FIXTURES, name);
  const expPath = path.join(cwd, ".expected-context");
  const expected = fs.existsSync(expPath) ? fs.readFileSync(expPath, "utf8").trim() : null;

  let out = "";
  try {
    out = execSync(`node "${HOOK}"`, { cwd, encoding: "utf8" });
  } catch (e) {
    console.log(`FAIL ${name}: hook crashed: ${e.message}`);
    fail++;
    continue;
  }

  const trimmed = out.trim();

  if (expected === "none") {
    if (trimmed === "") {
      console.log(`PASS ${name} (silent)`);
      pass++;
    } else {
      console.log(`FAIL ${name}: expected silent, got: ${trimmed.slice(0, 80)}`);
      fail++;
    }
    continue;
  }

  if (trimmed === "") {
    console.log(`FAIL ${name}: hook was silent but expected context`);
    fail++;
    continue;
  }

  try {
    const parsed = JSON.parse(trimmed);
    const ctx = parsed.hookSpecificOutput && parsed.hookSpecificOutput.additionalContext;
    if (!ctx) {
      console.log(`FAIL ${name}: missing additionalContext`);
      fail++;
      continue;
    }
    if (expected && !ctx.includes(expected)) {
      console.log(`FAIL ${name}: expected context to contain "${expected}"`);
      console.log(`  actual: ${ctx.slice(0, 160)}`);
      fail++;
      continue;
    }
    console.log(`PASS ${name}`);
    pass++;
  } catch (e) {
    console.log(`FAIL ${name}: invalid JSON: ${e.message}`);
    fail++;
  }
}

const postCases = [
  {
    name: "post-hook search-replace dry run",
    input: { tool_name: "Bash", tool_input: { command: "wp search-replace old new --dry-run" } },
    expected: "Dry-run complete"
  },
  {
    name: "post-hook plugin activation",
    input: { tool_name: "Bash", tool_input: { command: "wp plugin activate acme-forms" } },
    expected: "Plugin state changed"
  },
  {
    name: "post-hook ignores non-Bash tools",
    input: { tool_name: "Read", tool_input: { file_path: "wp-config.php" } },
    expected: null
  }
];

for (const testCase of postCases) {
  const result = require("child_process").spawnSync("node", [POST_HOOK], {
    input: JSON.stringify(testCase.input),
    encoding: "utf8"
  });
  const output = result.stdout.trim();
  if (result.status !== 0 || (testCase.expected && !output.includes(testCase.expected)) || (!testCase.expected && output)) {
    console.log(`FAIL ${testCase.name}`);
    fail++;
  } else {
    console.log(`PASS ${testCase.name}`);
    pass++;
  }
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
