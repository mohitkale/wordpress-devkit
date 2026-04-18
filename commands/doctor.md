---
description: Check the local WordPress toolchain. Reports PHP version, wp-cli version and whether it can reach a WordPress install in cwd, composer version, and WP_DEBUG state from wp-config.php when present. Use before running a security audit or db migration to confirm the environment is ready.
allowed-tools: Bash(php --version *) Bash(php -m *) Bash(wp --info *) Bash(wp cli version *) Bash(wp core version *) Bash(composer --version *) Read
---

# WordPress environment check

Run a fixed diagnostic of the local WordPress toolchain.

## Steps

1. PHP version and extensions:

```bash
php --version 2>&1
```

Require PHP 8.1 or later. If PHP is missing, nothing else in this plugin will run.

```bash
php -m 2>&1
```

Parse the output and confirm these are enabled: `mysqli` or `mysqlnd`, `json`, `mbstring`, `curl`, `zip`, `gd` or `imagick`, `openssl`.

2. wp-cli:

```bash
wp --info 2>&1
```

Report the wp-cli version, PHP binary it uses, and the WP-CLI config path. If wp-cli is missing, report that and suggest `curl -O https://raw.githubusercontent.com/wp-cli/builds/gh-pages/phar/wp-cli.phar && chmod +x wp-cli.phar && sudo mv wp-cli.phar /usr/local/bin/wp`.

3. If cwd looks like a WordPress root (Read checks for `wp-config.php`):
   - Report the WP core version:
     ```bash
     wp core version 2>&1
     ```
   - Read `wp-config.php` and report:
     - WP_DEBUG value (true, false, or not set)
     - WP_DEBUG_LOG value
     - WP_DEBUG_DISPLAY value
     - WP_ENVIRONMENT_TYPE value if set
   - Do not print any `DB_*` or `AUTH_KEY` values.

4. Composer (optional, only report if present):

```bash
composer --version 2>&1
```

## Output format

```
WordPress environment
---------------------
PHP:              8.2.15 with mysqli, mbstring, curl, gd, openssl, zip
wp-cli:           2.10.0 using /usr/bin/php
WP core (cwd):    6.5.3
WP_DEBUG:         true, log to wp-content/debug.log, no display
Composer:         2.7.6 (optional)

Next steps: environment looks healthy. Try:
- /wordpress-devkit:security-audit ./wp-content/plugins/<name>
- /wordpress-devkit:wp-debug "site returns 500 after plugin update"
- /wordpress-devkit:db-migration <old-url> <new-url>
```

If something is missing, print the exact error and a one-line fix hint.

## Do not

- Do not print `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `AUTH_KEY`, `SECURE_AUTH_KEY`, `LOGGED_IN_KEY`, or any secret constants from `wp-config.php`.
- Do not run `wp db export`, `wp db reset`, `wp search-replace` without explicit user approval. This command is read-only.
- Do not install or upgrade PHP, wp-cli, or composer automatically. Report what is missing and the install command.
