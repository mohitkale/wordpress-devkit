<?php
/**
 * Plugin Name: DevKit Smoke
 * Description: Fixture proving the WordPress DevKit plugin and block instructions against WordPress.
 * Version: 0.1.0
 * Requires at least: 6.6
 * Requires PHP: 8.1
 * Text Domain: devkit-smoke
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

add_action(
    'init',
    static function () {
        register_block_type( __DIR__ . '/blocks/smoke' );
    }
);
