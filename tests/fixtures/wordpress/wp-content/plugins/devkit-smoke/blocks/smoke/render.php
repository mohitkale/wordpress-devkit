<?php
/**
 * Render the smoke-test block.
 *
 * @var array $attributes Block attributes.
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

$wrapper = get_block_wrapper_attributes();

printf(
    '<section %1$s><p>%2$s</p></section>',
    $wrapper,
    esc_html__( 'WordPress DevKit smoke block is active.', 'devkit-smoke' )
);
