---
name: plugin-scaffold
description: Scaffold a WordPress plugin. Use this when the user asks to create a new WordPress plugin, start a plugin from scratch, or generate the plugin header and required files. Produces the main plugin file with a valid header, uninstall.php, an includes directory, and readme.txt.
argument-hint: "[plugin-slug]"
allowed-tools: Read Write Glob
---

# Scaffold a WordPress plugin

Create a minimal, production-ready plugin skeleton with a valid header, an ABSPATH guard, a class-based bootstrap, an uninstall hook, and a readme.txt that wordpress.org accepts.

## Inputs

`$ARGUMENTS` is the plugin slug. It must be lowercase, use hyphens, and match the final plugin directory name. Example: `acme-forms`.

If `$ARGUMENTS` is empty, ask for a slug before writing any files.

## Workflow

1. Confirm the target directory is `wp-content/plugins/<slug>/`. If the current working directory is not a WordPress install, ask the user where to scaffold the plugin.
2. Use Glob to check that the target directory does not already contain a file with the plugin header. If it does, stop and ask the user whether to overwrite.
3. Announce each file you are about to write.
4. Write the five files listed in the Output section.
5. After writing, print the activation command (`wp plugin activate <slug>`) and the admin alternative (Plugins > Installed Plugins > Activate).

## Naming convention

Given slug `acme-forms`:
- Directory: `acme-forms`
- Main file: `acme-forms.php`
- Text domain: `acme-forms`
- Prefix for functions, classes, constants: `acme_forms_` or `Acme_Forms_`

## Output

Write exactly these files relative to the plugin root.

### acme-forms.php

```php
<?php
/**
 * Plugin Name:       Acme Forms
 * Plugin URI:        https://example.com/acme-forms
 * Description:       Short description of what the plugin does.
 * Version:           0.1.0
 * Requires at least: 6.4
 * Requires PHP:      8.1
 * Author:            Your Name
 * Author URI:        https://example.com
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       acme-forms
 * Domain Path:       /languages
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

define( 'ACME_FORMS_VERSION', '0.1.0' );
define( 'ACME_FORMS_PATH', plugin_dir_path( __FILE__ ) );
define( 'ACME_FORMS_URL', plugin_dir_url( __FILE__ ) );

require_once ACME_FORMS_PATH . 'includes/class-acme-forms.php';

register_activation_hook( __FILE__, array( 'Acme_Forms', 'activate' ) );
register_deactivation_hook( __FILE__, array( 'Acme_Forms', 'deactivate' ) );

add_action( 'plugins_loaded', array( 'Acme_Forms', 'instance' ) );
```

### includes/class-acme-forms.php

```php
<?php
/**
 * Main plugin class.
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class Acme_Forms {

    private static $instance = null;

    public static function instance() {
        if ( null === self::$instance ) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    private function __construct() {
        add_action( 'init', array( $this, 'load_textdomain' ) );
    }

    public function load_textdomain() {
        load_plugin_textdomain( 'acme-forms', false, basename( ACME_FORMS_PATH ) . '/languages' );
    }

    public static function activate() {
        // Runs once on activation. Flush rewrite rules if the plugin adds custom post types.
        flush_rewrite_rules();
    }

    public static function deactivate() {
        // Runs on deactivation. Do not delete data here.
        flush_rewrite_rules();
    }
}
```

### uninstall.php

```php
<?php
/**
 * Runs only when the user deletes the plugin from the admin.
 * Delete options, custom tables, and scheduled events here.
 */

if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
    exit;
}

delete_option( 'acme_forms_settings' );
delete_option( 'acme_forms_version' );

// Example: drop a custom table if the plugin created one.
// global $wpdb;
// $table = $wpdb->prefix . 'acme_forms_submissions';
// $wpdb->query( "DROP TABLE IF EXISTS {$table}" );

// Example: clear scheduled cron.
// wp_clear_scheduled_hook( 'acme_forms_daily_cleanup' );
```

### readme.txt

```
=== Acme Forms ===
Contributors: yourname
Tags: forms, contact
Requires at least: 6.4
Tested up to: 6.5
Requires PHP: 8.1
Stable tag: 0.1.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

One-line description of the plugin.

== Description ==

A longer description of the plugin. Explain the problem it solves and the main features.

== Installation ==

1. Upload the plugin folder to `/wp-content/plugins/`.
2. Activate the plugin through the Plugins menu in WordPress.

== Frequently Asked Questions ==

= Does it work with classic themes? =

Yes.

== Changelog ==

= 0.1.0 =
* Initial release.
```

### .gitignore

```
vendor/
node_modules/
*.log
.DS_Store
.vscode/
.idea/
```

## Example

User runs `/wordpress-devkit:plugin-scaffold acme-forms`.

The skill writes these files:

```
wp-content/plugins/acme-forms/
  acme-forms.php
  uninstall.php
  readme.txt
  .gitignore
  includes/class-acme-forms.php
```

The user then activates with `wp plugin activate acme-forms`.

## Do not

- Do not leave an empty `index.php` as a security placeholder. Use the `ABSPATH` guard at the top of every PHP file instead.
- Do not delete user data in the deactivation hook. Deletion belongs in `uninstall.php`.
- Do not start at version `1.0.0`. Start at `0.1.0` and move up with real releases.
- Do not hardcode the slug in more than one place. Derive constants and text domains from a single prefix.
