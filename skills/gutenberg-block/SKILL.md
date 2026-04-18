---
name: gutenberg-block
description: Generate a custom Gutenberg block. Use this when the user asks to create a block, add a Gutenberg block to a plugin or theme, or scaffold block.json with edit, save, or render sources. Ask dynamic vs static first. Produces block.json, edit.js, save.js or render.php, style.scss, and a view script when needed.
argument-hint: "[block-name] [dynamic|static]"
allowed-tools: Read Write Glob
---

# Generate a custom Gutenberg block

Create a custom block registered with `block.json` and placed inside a plugin or theme `blocks/` directory. The block works with `@wordpress/scripts` version 30.x for the build step.

## Inputs

`$ARGUMENTS` is the block name and an optional type: `testimonial`, `testimonial dynamic`, `pricing static`.

Block names are lowercase, hyphen-separated, and are prefixed with the plugin or theme namespace to produce the final block name, for example `acme/testimonial`.

## Workflow

1. If the block type (dynamic or static) is not given, ask the user which to use. Explain the difference in one line:
   - **Static**: HTML is saved into post content at publish time. Fast, no PHP at render. Cannot reflect later data changes.
   - **Dynamic**: HTML is produced at render time by a PHP callback. Slower but always reflects current data. Required for query-based or user-specific output.
2. Decide the namespace. If inside a plugin, use the plugin slug. If inside a theme, use the theme slug. Ask if ambiguous.
3. Choose a directory: `blocks/<block-name>/` inside the plugin or theme.
4. Announce each file you are about to write.
5. Write `block.json`, `edit.js`, the right save target (`save.js` for static or `render.php` for dynamic), and `style.scss`.
6. Print the build command and the registration snippet.

## Files for a static block

### blocks/testimonial/block.json

```json
{
  "$schema": "https://schemas.wp.org/trunk/block.json",
  "apiVersion": 3,
  "name": "acme/testimonial",
  "title": "Testimonial",
  "category": "widgets",
  "icon": "format-quote",
  "description": "A customer testimonial with a quote and an attribution.",
  "textdomain": "acme-forms",
  "attributes": {
    "quote": { "type": "string", "default": "" },
    "attribution": { "type": "string", "default": "" }
  },
  "supports": {
    "html": false,
    "anchor": true,
    "align": ["wide", "full"]
  },
  "editorScript": "file:./index.js",
  "style": "file:./style-index.css"
}
```

Declare `editorStyle` in `block.json` only if the block also imports an editor-only stylesheet. Adding `editorStyle` without a matching build output leaves WordPress enqueuing a 404 in the editor.

### blocks/testimonial/edit.js

```js
import { __ } from '@wordpress/i18n';
import { useBlockProps, RichText } from '@wordpress/block-editor';

export default function Edit( { attributes, setAttributes } ) {
    const { quote, attribution } = attributes;
    const blockProps = useBlockProps();

    return (
        <blockquote { ...blockProps }>
            <RichText
                tagName="p"
                value={ quote }
                onChange={ ( value ) => setAttributes( { quote: value } ) }
                placeholder={ __( 'Quote text...', 'acme-forms' ) }
            />
            <RichText
                tagName="cite"
                value={ attribution }
                onChange={ ( value ) => setAttributes( { attribution: value } ) }
                placeholder={ __( 'Attribution', 'acme-forms' ) }
            />
        </blockquote>
    );
}
```

### blocks/testimonial/save.js

```js
import { useBlockProps, RichText } from '@wordpress/block-editor';

export default function save( { attributes } ) {
    const { quote, attribution } = attributes;
    const blockProps = useBlockProps.save();

    return (
        <blockquote { ...blockProps }>
            <RichText.Content tagName="p" value={ quote } />
            <RichText.Content tagName="cite" value={ attribution } />
        </blockquote>
    );
}
```

### blocks/testimonial/index.js

```js
import { registerBlockType } from '@wordpress/blocks';
import metadata from './block.json';
import Edit from './edit';
import save from './save';
import './style.scss';

registerBlockType( metadata.name, {
    edit: Edit,
    save,
} );
```

### blocks/testimonial/style.scss

```scss
.wp-block-acme-testimonial {
    border-left: 4px solid var(--wp--preset--color--accent, #2563eb);
    padding: 1rem 1.5rem;
    margin: 1.5rem 0;

    p {
        font-size: 1.125rem;
        line-height: 1.5;
        margin: 0 0 0.5rem;
    }

    cite {
        font-style: normal;
        font-weight: 600;
    }
}
```

## Files for a dynamic block

The difference is that `save` returns `null` and the block declares `render` in `block.json`.

### blocks/latest-post/block.json

```json
{
  "$schema": "https://schemas.wp.org/trunk/block.json",
  "apiVersion": 3,
  "name": "acme/latest-post",
  "title": "Latest Post",
  "category": "widgets",
  "icon": "admin-post",
  "description": "Renders the most recent post from the site at view time.",
  "textdomain": "acme-forms",
  "attributes": {
    "postType": { "type": "string", "default": "post" }
  },
  "supports": { "html": false, "anchor": true },
  "editorScript": "file:./index.js",
  "style": "file:./style-index.css",
  "render": "file:./render.php"
}
```

### blocks/latest-post/index.js

```js
import { registerBlockType } from '@wordpress/blocks';
import metadata from './block.json';
import Edit from './edit';
import './style.scss';

registerBlockType( metadata.name, {
    edit: Edit,
    save: () => null,
} );
```

### blocks/latest-post/edit.js

```js
import { __ } from '@wordpress/i18n';
import { useBlockProps } from '@wordpress/block-editor';
import ServerSideRender from '@wordpress/server-side-render';

export default function Edit() {
    const blockProps = useBlockProps();
    return (
        <div { ...blockProps }>
            <ServerSideRender
                block="acme/latest-post"
                EmptyResponsePlaceholder={ () => <p>{ __( 'No posts found.', 'acme-forms' ) }</p> }
            />
        </div>
    );
}
```

### blocks/latest-post/render.php

```php
<?php
/**
 * Dynamic render for acme/latest-post.
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Inner content.
 * @var WP_Block $block      Block instance.
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

$post_type = isset( $attributes['postType'] ) ? sanitize_key( $attributes['postType'] ) : 'post';

$query = new WP_Query( array(
    'post_type'      => $post_type,
    'posts_per_page' => 1,
    'no_found_rows'  => true,
) );

if ( ! $query->have_posts() ) {
    return;
}

$query->the_post();
$title = get_the_title();
$link  = get_permalink();
wp_reset_postdata();

$wrapper = get_block_wrapper_attributes();

printf(
    '<div %1$s><a href="%2$s">%3$s</a></div>',
    $wrapper,
    esc_url( $link ),
    esc_html( $title )
);
```

## Registration snippet

The plugin or theme must register the block directory from PHP. Add this once and point it at the build output:

```php
add_action( 'init', 'acme_forms_register_blocks' );
function acme_forms_register_blocks() {
    register_block_type( __DIR__ . '/build/testimonial' );
    register_block_type( __DIR__ . '/build/latest-post' );
}
```

## Build

Install and build with `@wordpress/scripts` pinned to a known-good version:

```bash
npm init -y
npm install --save-dev @wordpress/scripts@30.26.2
npx wp-scripts build --webpack-src-dir=blocks --output-path=build
```

For local development with watch mode:

```bash
npx wp-scripts start --webpack-src-dir=blocks --output-path=build
```

## Example

User runs `/wordpress-devkit:gutenberg-block testimonial static`.

The skill writes these files:

```
blocks/testimonial/
  block.json
  index.js
  edit.js
  save.js
  style.scss
```

It then prints the registration snippet and the two build commands.

## Do not

- Do not use `apiVersion 2`. New blocks must use `apiVersion 3`.
- Do not mix dynamic and static output. A dynamic block's `save` returns `null`. A static block has no `render.php`.
- Do not hand-write `build/` output. Let `@wordpress/scripts` produce it.
- Do not echo attributes directly in `render.php`. Always escape with `esc_html`, `esc_attr`, `esc_url`, or `wp_kses_post` based on the context.
