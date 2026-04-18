---
description: Clear WordPress caches in one pass. Runs rewrite-rules flush, object-cache flush, transient delete, and opcache reset when wp-cli is available. Use after deploying a plugin or theme update when the site does not reflect the change.
allowed-tools: Bash(wp rewrite *) Bash(wp cache *) Bash(wp transient *) Bash(wp eval *) Bash(wp --info *) Read
---

# Flush WordPress caches

Clear the four most common caching layers in a WordPress install, in order. Stop and report if wp-cli is not available or the cwd is not a WordPress install.

## Pre-flight

1. Confirm wp-cli is installed and can find the install:

```bash
wp --info 2>&1 | head -5
```

If this fails, stop and tell the user to install wp-cli or to run this command from inside the WordPress root.

2. Confirm cwd is a WordPress install. Read `wp-config.php` (existence only, not contents). If missing, stop.

## Workflow

Run each step, and report success or failure separately. Do not halt on the first failure; continue and report at the end.

1. Flush rewrite rules (fixes "page not found" after permalink or post-type changes):

```bash
wp rewrite flush --hard 2>&1
```

2. Flush the object cache (fixes stale data when Redis, Memcached, or the built-in cache is in use):

```bash
wp cache flush 2>&1
```

3. Delete expired transients:

```bash
wp transient delete --expired 2>&1
```

If the site uses an external object cache, `transient delete` may be a no-op because transients live in the object cache. Still safe to run.

4. Reset opcache if PHP opcache is enabled (fixes stale bytecode after a file change):

```bash
wp eval 'if (function_exists("opcache_reset")) { opcache_reset(); echo "opcache reset"; } else { echo "opcache not enabled"; }' 2>&1
```

## Output format

```
WordPress cache flush
---------------------
Rewrite rules:     flushed (hard)
Object cache:      flushed
Expired transients: 3 deleted
opcache:           reset

Next: reload the affected page in a fresh browser to verify the change is live.
If the issue persists, check:
- Page caching plugin (WP Super Cache, W3 Total Cache, LiteSpeed): flush from plugin settings.
- CDN (Cloudflare, Fastly): purge at the CDN edge.
- Browser cache: hard reload with Ctrl+Shift+R.
```

If any step fails (for example, `wp rewrite flush` returns "Error: .htaccess file is not writable"), print the exact error line and a one-line fix hint.

## Do not

- Do not run `wp cache flush` on a busy production site without warning. It is fast but can momentarily increase database load when the cache rebuilds.
- Do not run `wp transient delete --all`. Only expired transients are deleted by default. `--all` would invalidate intentionally long-lived transients.
- Do not touch the page-cache plugin's cache automatically. Different plugins have different commands (`wp super-cache flush`, `wp w3-total-cache flush`); tell the user which command to run for their specific setup.
