# Changelog

All notable changes to this plugin are documented here.

The format is based on Keep a Changelog, and this plugin uses semantic versioning.

## [1.0.0] - 2026-04-18

### Added

- Initial release.
- Skill `theme-init`: scaffold a WordPress block theme with theme.json, style.css, functions.php, and templates.
- Skill `plugin-scaffold`: scaffold a WordPress plugin with header, uninstall.php, includes, and readme.txt.
- Skill `wp-debug`: diagnose WordPress white screens and fatal errors using WP_DEBUG and debug.log.
- Skill `security-audit`: review theme or plugin PHP for common WordPress vulnerabilities.
- Skill `gutenberg-block`: generate a custom Gutenberg block with block.json and edit, save, or render sources.
- Skill `db-migration`: generate safe wp-cli search-replace commands for URL migrations.
- Agent `wp-forensics`: specialized WordPress white-screen and fatal-error diagnosis.
- Agent `block-author`: specialized Gutenberg block author.
- Command `doctor`: real toolchain check. Reports PHP version and extensions, wp-cli version, composer version, and the WP_DEBUG state from wp-config.php when present.
- Hook `session-start`: Node.js detector that inspects cwd for `wp-config.php`, a `wp-content/` directory, a `style.css` with a `Theme Name:` header, a PHP file with a `Plugin Name:` header, or a `composer.json` that mentions WordPress or wp-cli. Injects a one-line context note so Claude knows which skills apply.
- Command `flush`: clears rewrite rules, the object cache, expired transients, and opcache in one pass. Useful after a plugin or theme deploy when the site does not reflect the change.
- Hook `post-tool-use`: PostToolUse hook that reacts to `wp search-replace` (with and without --dry-run), `wp plugin activate/deactivate/update`, `wp core update`, and `composer install/update` with a short follow-up note.
- Tests: `tests/run.js` with fixture directories that invoke the SessionStart hook against synthetic cwds and assert expected output.
- CI: `.github/workflows/validate.yml` runs required-file checks, plugin.json parse, skill/agent/command frontmatter, hook script syntax, em-dash scan, and the hook fixture tests on every push and PR.
- Reference file `reference/security-checklist.md`: 20-item WordPress security checklist covering ABSPATH guards, output escaping by context, input sanitization, SQL preparation, nonces, capability checks, file uploads, XSS, IDOR, CSRF, redirects, serialized data, debug disclosure, and more, with the exact WordPress APIs to use for each. Read by `security-audit` on-demand only.
- Command `hardening-check`: opt-in workflow command that chains doctor, security-audit across all active plugins and themes, file permission sanity, and debug.log review into one combined report. Read-only.
- Agent `upgrade-planner`: opt-in specialist for multi-version WordPress core and PHP upgrade planning. Builds a compatibility matrix across plugins and themes, produces a staged plan with explicit rollback steps per stage, and calls out risks specific to the site. Invoked only on explicit upgrade-planning requests.
