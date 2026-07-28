# WordPress security audit checklist

A comprehensive reference the `security-audit` skill reads on-demand when it needs to justify a finding or suggest the exact WordPress API to use. Treat each entry as a self-contained rule: title, what to look for, why it matters, and the fix with the correct WordPress function.

## 1. ABSPATH guard on every PHP entry file

**Look for**: top of every `.php` file under `wp-content/` that could be accessed directly via URL.

**Fix**:

```php
if (!defined('ABSPATH')) exit;
```

Add this line right after the file's header comment (for plugins) or right after `<?php`. Prevents direct-URL PHP execution and information disclosure.

## 2. Escape all output

**Look for**: `echo`, `print`, inline `<?= ... ?>`, or concatenation into HTML without escaping.

**Functions, by context**:

- `esc_html($str)` for text between HTML tags
- `esc_attr($str)` for HTML attribute values (including `class`, `id`, `data-*`)
- `esc_url($url)` for URLs in `href`, `src`, `action`
- `esc_js($str)` for inline JavaScript strings (rare; prefer data attributes)
- `esc_textarea($str)` for content inside `<textarea>`
- `wp_kses_post($html)` for rich content that must allow HTML; strips dangerous tags
- `wp_kses($html, $allowed_tags)` for fine-grained tag allowlists

**Anti-pattern**: `echo $user_input;` anywhere. Always wrap with the right `esc_*`.

**Exception**: content already run through `the_content` filter (which applies `wp_kses_post`-like filtering) when rendered via template tags like `the_content()` and `the_excerpt()`. Do not re-escape these.

## 3. Sanitize on input

**Look for**: direct use of `$_GET`, `$_POST`, `$_REQUEST`, `$_COOKIE`, `$_SERVER` anywhere in the plugin.

**Functions, by data type**:

- `sanitize_text_field($str)` for short plain-text strings (removes tags, newlines, extra whitespace)
- `sanitize_textarea_field($str)` for multi-line text
- `sanitize_email($str)` for email addresses
- `sanitize_title($str)` for URL slugs
- `sanitize_key($str)` for short alphanumeric keys (plugin handles, option names)
- `absint($int)` for integers that must be zero or positive (e.g., post IDs)
- `intval($int)` for signed integers
- `sanitize_meta('post', $key, $value)` for post meta values
- `sanitize_hex_color($color)` for color codes
- `sanitize_file_name($name)` for filenames (strips slashes, special chars)

**Anti-pattern**: `$name = $_POST['name'];` followed by any use of `$name`. Always sanitize at the boundary.

## 4. Prepare all SQL

**Look for**: `$wpdb->query`, `$wpdb->get_results`, `$wpdb->get_var`, `$wpdb->get_row`, `$wpdb->get_col` with a variable in the query string.

**Fix**: always use `$wpdb->prepare`:

```php
$results = $wpdb->get_results(
  $wpdb->prepare(
    "SELECT * FROM {$wpdb->prefix}orders WHERE user_id = %d AND status = %s",
    $user_id,
    $status
  )
);
```

Placeholder types:

- `%d` integer
- `%f` float
- `%s` string (quoted automatically)
- `%i` identifier (table or column name, WordPress 6.2+)

**Anti-pattern**: `"SELECT * FROM wp_users WHERE login = '$login'"`. String concatenation is a SQL injection waiting to happen.

## 5. Verify nonces on every state-changing request

**Look for**: `admin-ajax.php` handlers, form POST handlers, REST endpoints that modify data.

**Pattern for admin-ajax**:

```php
add_action('wp_ajax_my_save', 'my_save_handler');
function my_save_handler() {
  check_ajax_referer('my_save_nonce', '_wpnonce');
  // ...
}
```

Client side creates nonce with `wp_create_nonce('my_save_nonce')` and posts it as `_wpnonce`.

**Pattern for forms**:

```php
// In form render:
wp_nonce_field('my_form_action', '_wpnonce');

// In form handler:
if (!isset($_POST['_wpnonce']) || !wp_verify_nonce(sanitize_key($_POST['_wpnonce']), 'my_form_action')) {
  wp_die('Invalid nonce');
}
```

**Pattern for REST**:

Use `permission_callback` on `register_rest_route`. WP REST handles the `X-WP-Nonce` header automatically for logged-in users.

## 6. Capability checks before privileged actions

**Look for**: any action that modifies data, changes settings, deletes posts, uploads files, etc.

**Functions**:

- `current_user_can('manage_options')` for site-level settings
- `current_user_can('edit_post', $post_id)` for per-post edits
- `current_user_can('upload_files')` for media uploads
- `current_user_can('delete_post', $post_id)` for delete ops
- `current_user_can('edit_users')` for user management

**Pattern**:

```php
if (!current_user_can('manage_options')) {
  wp_die(__('Insufficient permissions.', 'textdomain'), 403);
}
```

Check capabilities, not roles. `current_user_can('administrator')` works but is wrong practice; capabilities can be remapped.

## 7. File upload safety

**Look for**: `$_FILES` handling, `move_uploaded_file`, `copy` into `uploads/`.

**Use the WP helper**:

```php
$upload = wp_handle_upload($_FILES['file'], ['test_form' => false]);
if (isset($upload['error'])) {
  wp_die($upload['error']);
}
// $upload['file'] is the absolute path; $upload['url'] is the public URL
```

`wp_handle_upload` enforces the allowed MIME type allowlist and size limits from WP settings.

**Anti-pattern**: directly using `move_uploaded_file($_FILES['file']['tmp_name'], ABSPATH . $_FILES['file']['name'])`. Trusts the client's filename and MIME.

## 8. XSS in options and metadata

**Look for**: `get_option`, `get_post_meta`, `get_user_meta` output rendered into HTML.

**Rule**: escape on output, not on save. Even trusted admin-saved data can become unsafe if the admin account is compromised.

```php
$my_setting = get_option('my_setting');
echo '<p>' . esc_html($my_setting) . '</p>';
```

## 9. Direct object reference (IDOR)

**Look for**: endpoints that take a post ID, user ID, or comment ID from `$_GET` or `$_POST` and return data without a capability check.

**Fix**: always check `current_user_can('edit_post', $post_id)` or a custom meta check before returning post data.

## 10. CSRF on forms outside admin

**Rule**: nonces apply to front-end forms too, not just admin.

Any form that creates, updates, or deletes data on behalf of a logged-in user needs a nonce.

## 11. Redirect safety

**Look for**: `wp_redirect($_GET['redirect'])` or similar open redirects.

**Fix**: use `wp_safe_redirect`, which only allows redirects to the current host and allowed hosts (configurable via the `allowed_redirect_hosts` filter).

```php
wp_safe_redirect(sanitize_url($_GET['redirect']));
exit;
```

Note the `exit` after redirect. Omitting it is a common bug; code after `wp_redirect` still runs.

## 12. Serialized data in the database

**Look for**: `search-replace` or `UPDATE` queries that touch serialized data (common in migrations).

**Fix**: use `wp-cli search-replace` with appropriate flags. PHP serialization encodes length prefixes; a naive string replace breaks the data.

```bash
wp search-replace 'oldurl.com' 'newurl.com' --all-tables --precise --recurse-objects --dry-run
```

The `db-migration` skill generates these commands correctly.

## 13. Exposed debug information

**Look for**:

- `WP_DEBUG_DISPLAY = true` in production
- `ini_set('display_errors', 1)` anywhere
- `var_dump`, `print_r`, `error_log` with sensitive data

**Fix**: in production `wp-config.php`:

```php
define('WP_DEBUG', true);              // optional; keep logs
define('WP_DEBUG_LOG', true);          // logs to wp-content/debug.log
define('WP_DEBUG_DISPLAY', false);     // do not render errors in page
@ini_set('display_errors', 0);
```

## 14. Plugin file inclusion

**Look for**: `include $_GET['file']`, `require $_POST['path']`. This is remote code execution.

**Fix**: never include a path derived from user input. Maintain an allowlist and key user input to it.

## 15. XML-RPC

**Look for**: plugins that do not explicitly disable `xmlrpc.php`.

**Context**: XML-RPC is not a vulnerability by itself, but is the most common brute-force target. Disable it unless the site specifically needs it (Jetpack, the WP mobile app).

**Fix** (in `functions.php`):

```php
add_filter('xmlrpc_enabled', '__return_false');
```

## 16. Secrets in code

**Look for**: API keys, passwords, salts hardcoded in plugin source.

**Fix**: use `wp-config.php` constants for secrets, or use Options API for user-configurable ones. For CI/CD, use environment variables and read via `getenv()`.

## 17. Shortcode output escaping

Shortcodes render inside `the_content`. If a shortcode outputs user input, it must escape:

```php
function my_shortcode($atts) {
  $atts = shortcode_atts(['name' => ''], $atts);
  return '<span>' . esc_html($atts['name']) . '</span>';
}
```

## 18. REST API input validation

`register_rest_route` supports `args` with `validate_callback` and `sanitize_callback`. Use them instead of doing validation inline:

```php
register_rest_route('my/v1', '/post/(?P<id>\d+)', [
  'methods' => 'GET',
  'args' => [
    'id' => [
      'required' => true,
      'validate_callback' => fn($value) => is_numeric($value) && (int)$value > 0,
      'sanitize_callback' => 'absint',
    ],
  ],
  'permission_callback' => fn() => current_user_can('read'),
  'callback' => 'my_get_post',
]);
```

## 19. Deprecated functions

WordPress functions marked deprecated may remain available but are not maintained. Security audits should flag:

- `mysql_*` (use `$wpdb`)
- `serialize()` / `unserialize()` on user data (use `maybe_unserialize` or `wp_json_encode`)
- `wp_hash_password` with manual verify (use `wp_check_password`)

## 20. Plugin activation and uninstall

**Activation hook**: `register_activation_hook` is for schema setup. Avoid putting data-modifying code that runs on every plugin update there.

**Uninstall**: prefer `uninstall.php` (runs on Delete, not on Deactivate) over `register_uninstall_hook` when there is anything to clean up.

**Rule**: uninstall should delete options, tables, and user meta the plugin created. A plugin that leaves data behind is a slow-growing liability.
