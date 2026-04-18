---
name: security-audit
description: Audit a WordPress theme or plugin PHP for common vulnerabilities. Use this when the user asks to review a plugin or theme for security, check for XSS, CSRF, or SQL injection risk, or prepare code for submission to wordpress.org. Flags unescaped output, missing nonces, unprepared SQL, missing ABSPATH guards, and raw superglobal usage. Produces a grouped pass, warn, and fail report.
argument-hint: "[path-to-theme-or-plugin]"
allowed-tools: Read Grep Glob
---

# Audit WordPress PHP for common vulnerabilities

Read every PHP file in the target directory and flag the five most common classes of WordPress security bug. The report is grouped into pass, warn, and fail so the user knows what to fix first.

## Inputs

`$ARGUMENTS` is the directory to audit. Typically `wp-content/themes/<slug>` or `wp-content/plugins/<slug>`.

If `$ARGUMENTS` is empty, ask for the path.

## Workflow

1. Use Glob with pattern `$ARGUMENTS/**/*.php` to list every PHP file in scope. Exclude `vendor/`, `node_modules/`, and build output.
2. For each rule below, run the described Grep pattern and collect the matches. Record the file path, line number, and the matching line.
3. Open any file with a hit to confirm the match is a real issue and not a false positive. A match inside a comment, a string literal used for a fixture, or a code block inside a `<pre>` example is not a real finding.
4. Group findings into pass, warn, and fail.
5. Print the grouped report. Put fails first.

## Rules

### Rule 1. ABSPATH guard at the top of every PHP file (fail if missing in any loadable file)

Grep for `defined.*ABSPATH` in each PHP file. Files without the guard are at risk of direct access. Exception: files that cannot be called via HTTP (for example, a PHPUnit test file inside `tests/`) are a pass.

Expected pattern at the top of every file:

```php
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}
```

### Rule 2. Output escaping (fail if any dynamic value is echoed unescaped)

Grep pattern: `echo\s+\$` or `<\?=\s*\$`.

For each hit, confirm the variable is not already wrapped in an escaping function. The escape chosen must match the context:

| Context | Escape function |
|---|---|
| HTML body text | `esc_html( $var )` |
| HTML attribute | `esc_attr( $var )` |
| URL in `href` or `src` | `esc_url( $var )` |
| Text passed to translators then output | `esc_html__( 'text', 'textdomain' )` |
| Rich HTML with a known tag allowlist | `wp_kses( $var, $allowed )` or `wp_kses_post( $var )` |
| JSON in a data attribute | `wp_json_encode( $var )` then `esc_attr` |

Unescaped output is a fail. Output that uses the wrong escape for the context is a warn.

### Rule 3. Nonce on every state-changing form or AJAX handler (fail if missing)

Grep for `$_POST` or `$_REQUEST` or `admin-ajax.php`.

Every handler that reads `$_POST`, writes to the database, or triggers a side effect must verify a nonce. Check for one of:

```php
check_admin_referer( 'acme_forms_save' );
check_ajax_referer( 'acme_forms_ajax', 'nonce' );
wp_verify_nonce( $_POST['_wpnonce'], 'acme_forms_save' );
```

Also check the form side. Every form must include:

```php
wp_nonce_field( 'acme_forms_save' );
```

Missing nonce on a state-changing handler is a fail. A read-only handler without a nonce is a warn if it reads user input, pass otherwise.

### Rule 4. Prepared SQL for any query with user input (fail if missing)

Grep for `$wpdb->query`, `$wpdb->get_results`, `$wpdb->get_var`, `$wpdb->get_row`.

For each hit, confirm that any dynamic value is passed through `$wpdb->prepare` with a placeholder (`%s`, `%d`, `%f`). String concatenation into SQL is always a fail.

Correct pattern:

```php
$user_id = absint( $_GET['user_id'] );
$row = $wpdb->get_row(
    $wpdb->prepare( "SELECT * FROM {$wpdb->users} WHERE ID = %d", $user_id )
);
```

Wrong pattern (fail):

```php
$row = $wpdb->get_row( "SELECT * FROM wp_users WHERE ID = " . $_GET['user_id'] );
```

Queries with only hardcoded values are a pass and do not need `prepare`.

### Rule 5. Capability check on admin actions (warn if missing)

Grep for functions that change state: `update_option`, `add_option`, `delete_option`, `wp_insert_post`, `wp_delete_post`, `$wpdb->insert`, `$wpdb->update`, `$wpdb->delete`.

Every state change triggered from a user request must be preceded by a capability check:

```php
if ( ! current_user_can( 'manage_options' ) ) {
    wp_die( esc_html__( 'Insufficient permissions.', 'acme-forms' ) );
}
```

Missing capability check on an admin action is a fail. Missing capability check on a public-facing, intentionally open endpoint is a warn with a recommendation to confirm the exposure.

## Report format

Print one grouped report. Use this structure:

```
Security audit: acme-forms
Files scanned: 14

FAIL (3)
  includes/save.php:22   Unescaped echo of $_POST['name']. Wrap with esc_html.
  includes/save.php:31   Nonce missing on state-changing POST handler.
  includes/list.php:44   SQL query concatenates $_GET['id'] directly. Use $wpdb->prepare with %d.

WARN (2)
  includes/render.php:12 esc_attr used in HTML body context. Use esc_html.
  admin/settings.php:77  update_option called without current_user_can('manage_options').

PASS (9)
  acme-forms.php             ABSPATH guard present.
  uninstall.php              WP_UNINSTALL_PLUGIN guard present.
  includes/class-main.php    ABSPATH guard present. No dynamic output.
  includes/forms.php         All echoed values escaped, nonce present, prepared SQL.
  includes/shortcodes.php    Output wrapped in wp_kses_post. Static SQL only.
  includes/helpers.php       No output, no SQL, no superglobal reads.
  includes/rest.php          permission_callback checks current_user_can.
  admin/menu.php             current_user_can('manage_options') check present.
  admin/assets.php           No dynamic output. wp_enqueue_script uses a fixed handle.
```

Keep file paths relative to the audited directory. Always include line numbers for fails and warns.

## Example

User runs `/wordpress-devkit:security-audit ./wp-content/plugins/acme-forms`.

The skill walks the tree, runs the five rules, and produces the grouped report. The report ends with a one-line summary:

```
Summary: 3 fail, 2 warn, 9 pass. Address fails before release.
```

## Reference

For the exact WordPress API to use when suggesting a fix, consult `reference/security-checklist.md` in the plugin root. It is a 20-item checklist covering ABSPATH guards, output escaping by context, input sanitization, SQL preparation, nonces, capability checks, file uploads, XSS, IDOR, CSRF, and more. Read on-demand only when a finding needs a concrete fix recommendation.

## Do not

- Do not auto-fix the findings. This skill reports only. The user fixes the code and re-runs the audit.
- Do not flag a file as a fail based on a single grep pattern without reading the surrounding lines. False positives destroy trust.
- Do not print secret values from the code, even if they appear to be hardcoded keys. Report the location and the finding, not the value.
- Do not skip the ABSPATH rule for small files. Every PHP file that can be loaded via HTTP needs the guard.
