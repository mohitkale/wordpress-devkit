---
name: db-migration
description: Generate safe wp-cli search-replace commands for a WordPress URL migration. Use this when the user is moving a site between environments (staging to production, old domain to new domain), changing the site URL, or needs to rewrite URLs in the database. Produces a dry-run command first and a clear warning about serialized data.
argument-hint: "<old-url> <new-url>"
allowed-tools: Read Write
---

# Generate safe wp-cli search-replace commands

Produce the exact wp-cli commands the user should run to migrate URLs in a WordPress database. Always generate a dry-run first, a backup step, and then the real run. Serialized data is handled correctly by `wp search-replace` because it reserializes after replacement, so the tool must be used, not raw SQL.

## Inputs

`$ARGUMENTS` is two URLs: the old URL and the new URL.

Example: `https://staging.acme.com https://acme.com`.

If either URL is missing, ask for both. Confirm whether the source has `http://` or `https://` and whether the target has a trailing slash convention (WordPress stores it without trailing slash).

## Workflow

1. Confirm the environment. Ask which environment the commands will run against (staging, production, local). The commands should never be run on production without a confirmed backup.
2. Normalize both URLs: strip trailing slashes, confirm the scheme (`http` vs `https`).
3. Output the four-step plan: backup, dry-run, real run, flush caches. Write it to a file the user can inspect before running.
4. Print the serialized-data warning in plain language.
5. Remind the user to clear caches and rebuild permalinks after the real run.

## The four commands

### Step 1. Take a backup

Always run a backup first. The wp-cli export is portable and keeps the site recoverable.

```bash
wp db export pre-migration-$(date +%Y%m%d-%H%M%S).sql
```

If the site is very large, use `--add-drop-table` and compress:

```bash
wp db export pre-migration-$(date +%Y%m%d-%H%M%S).sql --add-drop-table
gzip pre-migration-*.sql
```

### Step 2. Dry-run the search-replace

Dry-run prints what would change without modifying anything. Always run this first.

```bash
wp search-replace 'https://staging.acme.com' 'https://acme.com' \
  --all-tables-with-prefix \
  --precise \
  --recurse-objects \
  --skip-columns=guid \
  --dry-run
```

Flag meanings:
- `--all-tables-with-prefix`: replace in every table that starts with the current table prefix, not just core.
- `--precise`: use PHP-side serialized-safe replacement. Slower but correct for every case.
- `--recurse-objects`: walk into serialized PHP objects, not just arrays.
- `--skip-columns=guid`: never rewrite the `guid` column. The GUID is a stable identifier for feed readers, not a URL.
- `--dry-run`: print changes, do not apply.

Read the output. The last line reports the number of replacements across each table. If the counts look reasonable, continue.

### Step 3. Run it for real

Remove `--dry-run`:

```bash
wp search-replace 'https://staging.acme.com' 'https://acme.com' \
  --all-tables-with-prefix \
  --precise \
  --recurse-objects \
  --skip-columns=guid
```

### Step 4. Post-migration tasks

```bash
wp cache flush
wp rewrite flush
```

`wp cache flush` clears whatever object cache is active, whether the built-in, Redis, or Memcached. If the site also uses a page cache plugin (WP Super Cache, W3 Total Cache, LiteSpeed Cache), clear that from its admin page.

## The serialized-data warning

This warning is important. Announce it before the user runs anything.

> **Warning.** WordPress stores many values as serialized PHP arrays or objects. A serialized string contains byte-length prefixes like `s:24:"https://staging.acme.com"`. A raw SQL statement like `UPDATE wp_options SET option_value = REPLACE(option_value, 'https://staging.acme.com', 'https://acme.com')` will replace the URL but not update the `s:24` length prefix, corrupting the serialized data. This breaks theme mods, widgets, plugin settings, and custom fields in ways that are hard to diagnose.
>
> Always use `wp search-replace`. It deserializes, replaces, and reserializes with correct length prefixes. Never run raw SQL to rewrite URLs.

## Multisite

If the site is a WordPress multisite, add `--network` and run per-site for any per-site tables:

```bash
wp search-replace 'https://staging.acme.com' 'https://acme.com' \
  --network \
  --all-tables-with-prefix \
  --precise \
  --recurse-objects \
  --skip-columns=guid \
  --dry-run
```

Also update `DOMAIN_CURRENT_SITE` in `wp-config.php` if the primary site URL changed.

## Output step

Announce the file write. Write a single file `migration-plan.sh` into the current working directory with the three commands and the post-migration tasks, commented with the steps. Example content:

```bash
#!/usr/bin/env bash
set -euo pipefail

# Step 1: backup
wp db export "pre-migration-$(date +%Y%m%d-%H%M%S).sql" --add-drop-table

# Step 2: dry-run
wp search-replace 'https://staging.acme.com' 'https://acme.com' \
  --all-tables-with-prefix \
  --precise \
  --recurse-objects \
  --skip-columns=guid \
  --dry-run

echo "Review the dry-run output above. Re-run this script without the --dry-run line to apply."

# Step 3: real run (comment out until dry-run has been reviewed)
# wp search-replace 'https://staging.acme.com' 'https://acme.com' \
#   --all-tables-with-prefix \
#   --precise \
#   --recurse-objects \
#   --skip-columns=guid

# Step 4: flush caches
# wp cache flush
# wp rewrite flush
```

Tell the user to review the plan before running, and to uncomment step 3 only after step 2 has been checked.

## Example

User runs `/wordpress-devkit:db-migration https://staging.acme.com https://acme.com`.

The skill:
1. Asks which environment the commands will run against.
2. Writes `migration-plan.sh` with the four steps above.
3. Prints the serialized-data warning.
4. Reminds the user to take the backup first and to review the dry-run output before the real run.

## Do not

- Do not run any migration command from this skill. Generate commands only. The user runs them.
- Do not use raw SQL like `UPDATE wp_options SET option_value = REPLACE(option_value, 'old', 'new')` anywhere. It corrupts serialized data.
- Do not rewrite the `guid` column. Always include `--skip-columns=guid`.
- Do not skip the backup step, even on staging. Backups are free insurance.
- Do not print database credentials, even if they appear in `wp-config.php`.
