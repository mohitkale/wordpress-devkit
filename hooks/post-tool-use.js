#!/usr/bin/env node
let input = "";
process.stdin.on("data", c => input += c);
process.stdin.on("end", () => {
  try {
    const data = JSON.parse(input);
    if (data.tool_name !== "Bash") return process.exit(0);
    const cmd = (data.tool_input && data.tool_input.command) || "";
    const stderr = (data.tool_response && data.tool_response.stderr) || "";
    const stdout = (data.tool_response && data.tool_response.stdout) || "";
    const notes = [];

    if (/\bwp\s+search-replace\b/.test(cmd) && !/--dry-run/.test(cmd)) {
      notes.push("Real `wp search-replace` run (no --dry-run flag). If this touched the database, confirm with a backup was taken. For URL migrations, `/wordpress-devkit:db-migration <old> <new>` always generates the `--dry-run` step first.");
    }
    if (/\bwp\s+search-replace\b/.test(cmd) && /--dry-run/.test(cmd)) {
      notes.push("Dry-run complete. Review the replacement count in the output. If it looks right, repeat without `--dry-run`. Remember serialized data: `--precise` handles PHP serialization; `--recurse-objects` handles nested arrays.");
    }
    if (/\bwp\s+plugin\s+(activate|deactivate|update)\b/.test(cmd)) {
      notes.push("Plugin state changed. Tail `wp-content/debug.log` and your PHP error log for 30-60 seconds. If a white screen or fatal error appears, `/wordpress-devkit:wp-debug` runs the full diagnostic.");
    }
    if (/\bwp\s+core\s+(update|update-db)\b/.test(cmd)) {
      notes.push("WordPress core updated. After a core update, run `wp plugin list --status=active` and verify each active plugin is compatible with the new core version. Check `debug.log` for deprecation notices.");
    }
    if (/\bcomposer\s+(install|update)\b/.test(cmd) && /(bedrock|wordpress|wp-cli)/i.test(stdout + cmd)) {
      notes.push("Composer finished on what looks like a Bedrock or WordPress-adjacent project. WordPress core itself often needs a separate `wp core install` step; composer only handles dependencies.");
    }

    if (notes.length > 0) {
      process.stdout.write(JSON.stringify({
        hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext: notes.join("\n") }
      }));
    }
  } catch (e) {}
  process.exit(0);
});
