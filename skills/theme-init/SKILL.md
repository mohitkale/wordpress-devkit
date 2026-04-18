---
name: theme-init
description: Scaffold a modern WordPress block theme. Use this when the user asks to create a new WordPress theme, start a block theme, or set up theme.json and the required files for full-site editing. Produces theme.json, style.css, functions.php, and a starter templates/index.html.
argument-hint: "[theme-slug]"
allowed-tools: Read Write Glob
---

# Scaffold a WordPress block theme

Create a minimal block theme that passes the Theme Check plugin and works with WordPress 6.4 or later. The theme is ready for full-site editing out of the box.

## Inputs

`$ARGUMENTS` is the theme slug. It must be lowercase, use hyphens, and match the final directory name. Example: `acme-blocks`.

If `$ARGUMENTS` is empty, ask for a slug before writing any files.

## Workflow

1. Confirm the target directory is `wp-content/themes/<slug>/`. If the current working directory is not a WordPress install, ask the user where to scaffold the theme.
2. Use Glob to check that the target directory does not already contain a `style.css`. If it does, stop and ask the user whether to overwrite.
3. Announce each file you are about to write.
4. Write the six files listed in the Output section.
5. After writing, print the three activation steps (copy into wp-content/themes, log in to /wp-admin, activate under Appearance > Themes).

## Output

Write exactly these files relative to the theme root.

### style.css

```css
/*
Theme Name: Acme Blocks
Theme URI: https://example.com/acme-blocks
Author: Your Name
Author URI: https://example.com
Description: A minimal WordPress block theme.
Requires at least: 6.4
Tested up to: 6.5
Requires PHP: 8.1
Version: 0.1.0
License: GPL-2.0-or-later
License URI: https://www.gnu.org/licenses/gpl-2.0.html
Text Domain: acme-blocks
*/
```

Replace `Acme Blocks`, `acme-blocks`, and the URIs with values derived from `$ARGUMENTS` and ask the user for the author name and URI if not known.

### theme.json

```json
{
  "$schema": "https://schemas.wp.org/trunk/theme.json",
  "version": 3,
  "settings": {
    "appearanceTools": true,
    "layout": {
      "contentSize": "720px",
      "wideSize": "1200px"
    },
    "color": {
      "palette": [
        { "slug": "base", "color": "#ffffff", "name": "Base" },
        { "slug": "contrast", "color": "#111111", "name": "Contrast" },
        { "slug": "accent", "color": "#2563eb", "name": "Accent" }
      ]
    },
    "typography": {
      "fontFamilies": [
        {
          "slug": "system",
          "name": "System",
          "fontFamily": "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif"
        }
      ],
      "fontSizes": [
        { "slug": "small", "size": "0.875rem", "name": "Small" },
        { "slug": "medium", "size": "1rem", "name": "Medium" },
        { "slug": "large", "size": "1.5rem", "name": "Large" }
      ]
    },
    "spacing": {
      "units": ["px", "rem", "%", "vh", "vw"],
      "spacingScale": { "steps": 6 }
    }
  },
  "styles": {
    "color": {
      "background": "var(--wp--preset--color--base)",
      "text": "var(--wp--preset--color--contrast)"
    },
    "typography": {
      "fontFamily": "var(--wp--preset--font-family--system)",
      "fontSize": "var(--wp--preset--font-size--medium)",
      "lineHeight": "1.6"
    }
  }
}
```

### functions.php

```php
<?php
/**
 * Theme bootstrap.
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

add_action( 'after_setup_theme', 'acme_blocks_setup' );
function acme_blocks_setup() {
    add_theme_support( 'wp-block-styles' );
    add_theme_support( 'editor-styles' );
    add_theme_support( 'responsive-embeds' );
    add_theme_support( 'html5', array( 'search-form', 'comment-form', 'comment-list', 'gallery', 'caption', 'style', 'script' ) );
    load_theme_textdomain( 'acme-blocks', get_template_directory() . '/languages' );
}

add_action( 'wp_enqueue_scripts', 'acme_blocks_enqueue_styles' );
function acme_blocks_enqueue_styles() {
    wp_enqueue_style(
        'acme-blocks-style',
        get_stylesheet_uri(),
        array(),
        wp_get_theme()->get( 'Version' )
    );
}
```

Replace the `acme_blocks_` prefix to match the slug (convert hyphens to underscores).

### templates/index.html

```html
<!-- wp:template-part {"slug":"header","tagName":"header"} /-->

<!-- wp:group {"tagName":"main","layout":{"type":"constrained"}} -->
<main class="wp-block-group">
  <!-- wp:query {"queryId":0,"query":{"perPage":10,"pages":0,"offset":0,"postType":"post","order":"desc","orderBy":"date","inherit":true}} -->
  <div class="wp-block-query">
    <!-- wp:post-template -->
      <!-- wp:post-title {"isLink":true,"level":2} /-->
      <!-- wp:post-excerpt /-->
    <!-- /wp:post-template -->
    <!-- wp:query-pagination -->
      <!-- wp:query-pagination-previous /-->
      <!-- wp:query-pagination-numbers /-->
      <!-- wp:query-pagination-next /-->
    <!-- /wp:query-pagination -->
  </div>
  <!-- /wp:query -->
</main>
<!-- /wp:group -->

<!-- wp:template-part {"slug":"footer","tagName":"footer"} /-->
```

### parts/header.html

```html
<!-- wp:group {"layout":{"type":"constrained"}} -->
<div class="wp-block-group">
  <!-- wp:site-title /-->
  <!-- wp:navigation /-->
</div>
<!-- /wp:group -->
```

### parts/footer.html

```html
<!-- wp:group {"layout":{"type":"constrained"}} -->
<div class="wp-block-group">
  <!-- wp:paragraph -->
  <p>Powered by WordPress.</p>
  <!-- /wp:paragraph -->
</div>
<!-- /wp:group -->
```

## Example

User runs `/wordpress-devkit:theme-init acme-blocks`.

The skill writes these files:

```
wp-content/themes/acme-blocks/
  style.css
  theme.json
  functions.php
  templates/index.html
  parts/header.html
  parts/footer.html
```

The user then activates the theme from Appearance > Themes in wp-admin.

## Do not

- Do not use `Version: 1.0` in style.css. Start at `0.1.0`.
- Do not hardcode the theme slug in more than one place. Derive the prefix once from the slug.
- Do not commit `wp-content/uploads/` or the theme's generated assets as part of the scaffold.
- Do not overwrite an existing theme directory without asking the user first.
