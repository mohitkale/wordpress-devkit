#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const cwd = process.cwd();

function has(rel) {
  try { return fs.existsSync(path.join(cwd, rel)); } catch { return false; }
}
function isDir(rel) {
  try { return fs.statSync(path.join(cwd, rel)).isDirectory(); } catch { return false; }
}

const findings = [];

if (has("wp-config.php") || has("wp-config-sample.php")) {
  findings.push("- WordPress install root detected (wp-config.php). Use `/wordpress-devkit:wp-debug` to diagnose white screens or `/wordpress-devkit:db-migration <old> <new>` for a URL migration.");
}

if (isDir("wp-content")) {
  findings.push("- wp-content directory detected. Use `/wordpress-devkit:security-audit ./wp-content/plugins/<name>` or `./wp-content/themes/<name>` to scan PHP for common vulnerabilities.");
}

if (has("style.css")) {
  try {
    const css = fs.readFileSync(path.join(cwd, "style.css"), "utf8").slice(0, 2000);
    if (/Theme Name:/i.test(css)) {
      findings.push("- WordPress theme root detected (style.css has Theme Name header). Use `/wordpress-devkit:security-audit ./` to audit theme PHP, or `/wordpress-devkit:gutenberg-block <name>` to add a block.");
    }
  } catch {}
}

try {
  const phpFiles = (fs.readdirSync(cwd) || []).filter(f => f.endsWith(".php"));
  for (const f of phpFiles) {
    try {
      const head = fs.readFileSync(path.join(cwd, f), "utf8").slice(0, 1500);
      if (/Plugin Name:/i.test(head)) {
        findings.push("- WordPress plugin root detected (" + f + " has Plugin Name header). Use `/wordpress-devkit:security-audit ./` to scan for nonce, escaping, and SQL issues.");
        break;
      }
    } catch {}
  }
} catch {}

if (has("composer.json")) {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(cwd, "composer.json"), "utf8"));
    const deps = Object.assign({}, pkg.require || {}, pkg["require-dev"] || {});
    if (Object.keys(deps).some(k => /wordpress|wp-cli|roots\/bedrock/i.test(k))) {
      findings.push("- Composer dependencies mention WordPress or wp-cli. The plugin's skills work inside Bedrock or classic layouts.");
    }
  } catch {}
}

if (findings.length > 0) {
  const text = [
    "WordPress DevKit plugin is active. Detected in " + cwd + ":",
    findings.join("\n"),
    "Run `/wordpress-devkit:doctor` to check PHP, wp-cli, and composer availability."
  ].join("\n\n");
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "SessionStart",
      additionalContext: text
    }
  }));
}
process.exit(0);
