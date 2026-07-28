---
description: Run the full WordPress hardening and security pass in one command. Chains doctor, security-audit across plugins and themes, file-permission checks, and debug.log sanity. Use after a plugin install, a migration, or before handing a site to a client.
argument-hint: "[site-root]"
allowed-tools: Bash(php --version *) Bash(wp --info *) Bash(wp core version *) Bash(wp plugin list *) Bash(wp theme list *) Bash(composer --version *) Read Glob Grep
---

# WordPress hardening check

Run the plugin's audit-flavored skills in sequence and produce one combined report. This is the "do everything" command. Use only when explicitly asked.

## Inputs

`$ARGUMENTS` takes an optional path to a WordPress site root. Defaults to cwd.

## Workflow

Run each step. If a step fails, note it and continue.

### Step 1: Environment check (from `doctor`)

Same as `/wordpress-devkit:doctor`. Report PHP, wp-cli, composer, WP_DEBUG state.

### Step 2: Enumerate plugins and themes

```bash
wp plugin list --status=active --format=csv 2>&1
wp theme list --status=active --format=csv 2>&1
```

Parse the output. Report active plugin and theme names for the audit scope.

### Step 3: Security audit on each active plugin (from `security-audit`)

For each active plugin in `wp-content/plugins/<slug>`, run the same flow as `/wordpress-devkit:security-audit ./wp-content/plugins/<slug>`. Report FAIL, WARN, and PASS counts per plugin.

Cross-reference findings against `reference/security-checklist.md` for the exact WordPress API to use in suggested fixes.

### Step 4: Security audit on the active theme (from `security-audit`)

Same as step 3 for the active theme at `wp-content/themes/<slug>`.

### Step 5: File permission sanity

Check for common misconfigurations:

```bash
ls -la wp-config.php 2>&1                        # should be 600 or 640
ls -ld wp-content 2>&1                           # should be 755
ls -la wp-content/uploads 2>&1 | head -5         # should be 755 dirs, 644 files
```

Flag:

- `wp-config.php` world-readable (permissions like 644 or 666)
- `wp-content` world-writable
- PHP files inside `wp-content/uploads/` (indicator of a breach)

### Step 6: debug.log sanity

If `wp-content/debug.log` exists:

- Read its size (bytes)
- Read the last 50 lines
- Flag repeated fatal errors or PHP errors

If it is missing and `WP_DEBUG_LOG` is true, that is fine; file is created on first log line.

## Output format

```
WordPress hardening check
=========================
Site root: /var/www/contoso-blog
WP core:   6.5.3
PHP:       8.2.15
wp-cli:    2.10.0

Active plugins (4)
------------------
- woocommerce (8.5.2)
- yoast-seo (22.0)
- acme-forms (1.0.1)
- security-pro (3.2.0)

Active theme: contoso-blocks (1.0.0)

Security audit
==============
acme-forms (FAIL):
- FAIL: unescaped echo of $_POST['name'] in forms-handler.php:42 (XSS)
- FAIL: unprepared SQL in submissions.php:78 (SQL injection)
- WARN: missing ABSPATH guard in helpers.php
- PASS: 9 files escape output, prepare queries, check nonces

contoso-blocks (WARN):
- WARN: raw $_SERVER['HTTP_REFERER'] used in template-parts/trackback.php
- PASS: all output escaped, no SQL

woocommerce, yoast-seo, security-pro: skipped (large third-party plugins, not audited by default)

File permissions
================
wp-config.php:    640 (ok)
wp-content:       755 (ok)
wp-content/uploads: 755 (ok)
PHP files in uploads: none found (good)

debug.log
=========
Path:           wp-content/debug.log
Size:           12 KB
Last 50 lines:  2 PHP notices (deprecation), 0 fatal errors

Environment
===========
WP_DEBUG:         true
WP_DEBUG_LOG:     true (wp-content/debug.log)
WP_DEBUG_DISPLAY: false (ok for production)

Suggested next steps
--------------------
1. Fix 2 FAIL findings in acme-forms. See reference/security-checklist.md rules 2, 4, 5.
2. Sanitize $_SERVER['HTTP_REFERER'] in contoso-blocks template-parts/trackback.php (use esc_url_raw).
3. Run /wordpress-devkit:security-audit against large third-party plugins separately if you distribute them.

Reference
---------
For the full 20-item security checklist and the exact WordPress API to use for each fix, see `reference/security-checklist.md`.
```

## Do not

- Do not attempt to fix any finding automatically. This is read-only. All fixes are suggestions.
- Do not run audits against third-party plugins without explicit user request (WooCommerce, Yoast SEO, Elementor, etc.). They are large and usually managed by their vendor.
- Do not read or print any database contents, any `$wpdb` query results, or any `wp_options` values.
- Do not print any value from `wp-config.php` (DB credentials, auth keys, salts).
- Do not include the full output of each skill. Keep the combined report under 100 lines.
