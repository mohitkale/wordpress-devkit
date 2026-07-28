---
name: wp-debug
description: Diagnose a WordPress white screen, 500 error, or fatal error. Use this when the user says the site is blank, returns HTTP 500, shows "There has been a critical error on this website", or is broken after a plugin, theme, or core update. Walks through WP_DEBUG setup, debug.log interpretation, and the most common root causes.
argument-hint: "[short description of the symptom]"
allowed-tools: Read Grep Glob
---

# Diagnose a WordPress white screen or fatal error

Guide the user from "site is broken" to a specific root cause in under ten minutes. Most failures fit one of five patterns: plugin conflict, theme fatal, PHP memory limit, PHP version mismatch, or a missing or corrupt core file.

## Inputs

`$ARGUMENTS` is an optional one-line description of the symptom. Examples: `site is blank after updating WooCommerce`, `500 error only on /wp-admin`, `critical error email from WordPress`.

Use the description to prioritize which branch of the workflow to start from.

## Workflow

### Step 1. Enable WP_DEBUG safely

If `wp-config.php` is available, read it and look for existing `WP_DEBUG` constants. Ask the user to add or update these three lines above the `/* That's all, stop editing! */` line:

```php
define( 'WP_DEBUG', true );
define( 'WP_DEBUG_LOG', true );
define( 'WP_DEBUG_DISPLAY', false );
@ini_set( 'display_errors', 0 );
```

Explanations:
- `WP_DEBUG_LOG = true` writes errors to `wp-content/debug.log` instead of the screen.
- `WP_DEBUG_DISPLAY = false` and `display_errors = 0` keep errors out of the HTML response, which matters on a production site.

Reload the broken page once to trigger the error, then read the log.

### Step 2. Read debug.log

Use Read to open `wp-content/debug.log`. Use Grep with the pattern `PHP Fatal error|PHP Parse error|Uncaught|Allowed memory size` on the log to get the relevant lines fast. The newest errors are at the bottom.

Each fatal line follows this shape:

```
[17-Apr-2026 12:04:11 UTC] PHP Fatal error:  Uncaught Error: Class "Acme\Foo" not found in /var/www/html/wp-content/plugins/acme-forms/includes/bootstrap.php:42
```

Extract:
- The error class (Fatal, Parse, Uncaught TypeError, Allowed memory size).
- The file path. The path tells you whether the fault is in a plugin, a theme, `wp-includes`, or custom code.
- The line number.

### Step 3. Map the error to one of the five root causes

| Signal in debug.log | Root cause | Fix |
|---|---|---|
| `Allowed memory size of N bytes exhausted` | PHP memory limit | Raise `WP_MEMORY_LIMIT` in `wp-config.php` to `256M` and, if still failing, `php_value memory_limit` in `.htaccess` or `php.ini`. |
| Error path contains `wp-content/plugins/<slug>/` | Plugin fatal or plugin conflict | Rename the plugin folder over SFTP or run `wp plugin deactivate <slug>` to confirm. If the site recovers, the plugin is the cause. |
| Error path contains `wp-content/themes/<slug>/` | Theme fatal | Switch to a default theme with `wp theme activate twentytwentyfour`. If the site recovers, the theme is the cause. |
| `syntax error` or `Parse error` in any path | Bad PHP edit | Revert the last change to that file. Parse errors always point to a specific line. |
| `requires PHP version X or higher` or `cannot redeclare` on a core function | PHP version mismatch | Check the hosting PHP version. Plugins often require PHP 8.0 or 8.1. Downgrade the plugin or upgrade PHP. |
| Path contains `wp-includes/` with `Call to undefined function` | Missing or corrupt core file | Reinstall core with `wp core download --force --skip-content`. |

### Step 4. Confirm the fix

After the suggested change, ask the user to reload the page. If the page recovers, revert `WP_DEBUG_DISPLAY` back to whatever it was (most production sites leave it unset or false). Keep `WP_DEBUG_LOG` on if the user wants continued visibility.

If the site is still broken, re-read the log. A second error often surfaces only after the first one is fixed.

## Example

User: `/wordpress-devkit:wp-debug site is blank after plugin update`

Skill:
1. Reads `wp-config.php` and confirms `WP_DEBUG` is already on.
2. Greps `wp-content/debug.log` for `PHP Fatal error`, finds:
   ```
   PHP Fatal error:  Uncaught Error: Call to undefined function WC() in /var/www/html/wp-content/plugins/acme-addon/src/hooks.php:18
   ```
3. Reports: the plugin `acme-addon` assumes WooCommerce is active. Either WooCommerce was deactivated or it failed to load. Fix options:
   - Deactivate `acme-addon` with `wp plugin deactivate acme-addon`.
   - Or reactivate WooCommerce with `wp plugin activate woocommerce`.
   - Or guard the call in `acme-addon/src/hooks.php:18` so it only runs when WooCommerce is loaded:
     ```php
     if ( function_exists( 'WC' ) ) {
         $cart = WC()->cart;
     }
     ```
4. Suggests reloading the page to confirm.

## Do not

- Do not ask the user to set `WP_DEBUG_DISPLAY = true` on a production site. It leaks file paths and stack traces to visitors.
- Do not delete `debug.log`. Read it. Deleting the log loses history that is often needed to confirm the fix.
- Do not run `wp db repair` or modify the database as a first step. WSOD is almost always PHP, not SQL.
- Do not edit plugin or theme code to swallow the error. Fix the cause, not the symptom.
