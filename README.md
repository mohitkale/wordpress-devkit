# WordPress DevKit

A Claude Code plugin that scaffolds WordPress themes and plugins, diagnoses white screens and fatal errors, audits PHP for common WordPress vulnerabilities, and generates Gutenberg blocks.

## What it does

- Scaffolds a modern WordPress block theme with theme.json, style.css, functions.php, and starter templates.
- Scaffolds a WordPress plugin with a proper main-file header, uninstall hook, includes directory, and readme.txt.
- Walks through WP_DEBUG, debug.log, and the common causes of the White Screen of Death.
- Audits theme or plugin PHP for unescaped output, missing nonces, unprepared SQL, missing ABSPATH guards, and raw superglobal usage.
- Generates a custom Gutenberg block (dynamic or static) with block.json, edit.js, save.js or render.php, and a style.scss.
- Generates safe wp-cli search-replace commands for URL migrations and explains the serialized-data risk.

## Example

```
> /wordpress-devkit:security-audit ./wp-content/plugins/acme-forms

Scanned 14 PHP files.
3 FAIL: unescaped echo of $_POST['name'] in forms-handler.php (XSS);
        unprepared SQL in submissions.php (SQL injection);
        missing wp_verify_nonce in admin-ajax.php.
2 WARN: raw $_SERVER['HTTP_REFERER'] in form.php;
        missing ABSPATH guard in helpers.php.
9 PASS: other files escape output, prepare queries, and check nonces.
```

## Installation

From the Anthropic plugin marketplace:

```
/plugin install wordpress-devkit
```

To install from a local directory for development:

```
claude --plugin-dir ./wordpress-devkit
```

## Commands

All commands are invoked from inside Claude Code with `/wordpress-devkit:<command>`.

| Command | What it does | Example |
|---|---|---|
| `/wordpress-devkit:doctor` | Check the local WordPress toolchain (PHP, wp-cli, composer, WP_DEBUG state). Runs real diagnostic commands, not a prompt. | `/wordpress-devkit:doctor` |
| `/wordpress-devkit:flush` | Clear rewrite rules, object cache, expired transients, and opcache in one pass. | `/wordpress-devkit:flush` |
| `/wordpress-devkit:hardening-check` | One-shot full hardening pass: doctor + security-audit across plugins and themes + file permission sanity + debug.log review (chained). Opt-in only. | `/wordpress-devkit:hardening-check` |
| `/wordpress-devkit:theme-init` | Scaffold a WordPress block theme. | `/wordpress-devkit:theme-init acme-blocks` |
| `/wordpress-devkit:plugin-scaffold` | Scaffold a WordPress plugin. | `/wordpress-devkit:plugin-scaffold acme-forms` |
| `/wordpress-devkit:wp-debug` | Diagnose a WordPress white screen or fatal error. | `/wordpress-devkit:wp-debug site is blank after plugin update` |
| `/wordpress-devkit:security-audit` | Audit theme or plugin PHP for common vulnerabilities. | `/wordpress-devkit:security-audit ./wp-content/plugins/acme-forms` |
| `/wordpress-devkit:gutenberg-block` | Generate a custom Gutenberg block. | `/wordpress-devkit:gutenberg-block testimonial dynamic` |
| `/wordpress-devkit:db-migration` | Generate wp-cli search-replace commands for URL migration. | `/wordpress-devkit:db-migration https://staging.acme.com https://acme.com` |

## Agents

The plugin ships with three subagents that Claude may delegate to automatically when the work fits:

- **wp-forensics**: deep WordPress white-screen and fatal-error diagnosis.
- **block-author**: specialized Gutenberg block author.
- **upgrade-planner**: opt-in specialist for multi-version WordPress core and PHP upgrade planning. Invoked only when the user explicitly asks to plan an upgrade that spans multiple major versions or changes PHP. Does not fire on routine requests.

You can also invoke an agent explicitly, for example:

```
Ask the wp-forensics agent to investigate why my site is returning a 500 after the last plugin update.
```

## Hooks

On session start, the plugin runs a small Node.js script that inspects the current working directory for WordPress artefacts. If it finds `wp-config.php`, a `wp-content/` directory, a `style.css` with a `Theme Name:` header, a PHP file with a `Plugin Name:` header, or a `composer.json` that mentions WordPress or wp-cli, it injects a one-line context note so Claude knows which skills apply without the user having to say so. The hook is silent if nothing matches.

A second hook fires **after every Bash tool call** (`PostToolUse`). It watches for `wp search-replace`, `wp plugin activate`, `wp core update`, and `composer install`, and injects a short follow-up note: what to verify, which skill to run for diagnosis.

Both hooks require Node.js on `PATH`. Without Node, they quietly no-op and every skill and command still works.

## Reference files

A `reference/` directory ships deeper knowledge that skills read only when they need it.

- `reference/security-checklist.md` is a comprehensive 20-item WordPress security checklist (ABSPATH guards, output escaping by context, input sanitization, SQL preparation, nonces, capability checks, file upload safety, XSS, IDOR, CSRF, redirect safety, serialized data, debug disclosure, and more). The `security-audit` skill reads this when it flags an issue and needs to suggest the exact WordPress API to use.

## Requirements

- Claude Code v2.0 or later.
- Node.js on `PATH` for SessionStart and PostToolUse hooks (any current LTS). If Node is missing, hooks no-op silently; skills and commands still work.
- WordPress 6.4 or later for block themes and modern Gutenberg features.
- PHP 8.1 or later recommended.
- For db-migration: `wp-cli` installed and on `PATH` on the server that runs the migration.
- For gutenberg-block: Node.js 20 or later if you plan to build the block with `@wordpress/scripts`.

## Safety

All commands follow these rules:

1. Destructive operations (dropping tables, deleting files, overwriting a live database) always require explicit user confirmation. They are never part of the default command workflow.
2. Read-only audits and scaffolding run without prompting because they are safe.
3. The plugin never prints secrets from `wp-config.php`, `.env`, or database dumps into the conversation.
4. File writes are announced before they happen so the user can stop them.
5. Database migrations are generated as wp-cli commands with a dry-run step first. No migration runs automatically.

## Known limitations

- `security-audit` is a static PHP scan. It will not catch vulnerabilities that only appear at runtime (for example, dynamic class loading or variable function names).
- `wp-debug` works from debug.log, PHP error logs, and the site URL. It cannot step through a bug with Xdebug.
- `plugin-scaffold` and `theme-init` generate a starter structure. Plugin logic, database tables, and block bindings are left to the user.
- `db-migration` produces wp-cli commands. The plugin never runs the migration itself.
- Version 1.0 does not cover WooCommerce-specific flows, Elementor or Divi builders, or multisite network administration beyond single-site scenarios.

## Development

To iterate locally on the plugin itself:

```
claude --plugin-dir ./wordpress-devkit
```

Validate the plugin structure:

```
claude plugin validate ./wordpress-devkit
```

## License

MIT. See `LICENSE`.
