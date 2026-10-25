<?php
/**
 * Plugin Name: Aspyre SEO Agents
 * Description: Permet aux agents SEO d'Aspyre de lire et d'écrire le titre SEO, la méta-description et le mot-clé principal des articles (Yoast SEO ou Rank Math) via l'API REST.
 * Version: 1.0.0
 * Author: Aspyre
 * Requires at least: 6.0
 * Requires PHP: 7.4
 */

if (!defined('ABSPATH')) {
	exit;
}

/** Clés de métadonnées utilisées par chaque extension SEO. */
function aspyre_seo_agents_keys() {
	if (defined('WPSEO_VERSION')) {
		return ['plugin' => 'yoast', 'keys' => ['_yoast_wpseo_title', '_yoast_wpseo_metadesc', '_yoast_wpseo_focuskw']];
	}
	if (defined('RANK_MATH_VERSION')) {
		return ['plugin' => 'rankmath', 'keys' => ['rank_math_title', 'rank_math_description', 'rank_math_focus_keyword']];
	}
	return ['plugin' => null, 'keys' => []];
}

add_action('init', function () {
	foreach (aspyre_seo_agents_keys()['keys'] as $key) {
		register_post_meta('post', $key, [
			'type' => 'string',
			'single' => true,
			'show_in_rest' => true,
			'sanitize_callback' => 'sanitize_text_field',
			'auth_callback' => function ($allowed, $meta_key, $post_id) {
				return current_user_can('edit_post', $post_id);
			},
		]);
	}
});

add_action('rest_api_init', function () {
	register_rest_route('aspyre-seo/v1', '/status', [
		'methods' => 'GET',
		'permission_callback' => function () {
			return current_user_can('edit_posts');
		},
		'callback' => function () {
			$seo = aspyre_seo_agents_keys();
			return [
				'installed' => true,
				'seoPlugin' => $seo['plugin'] ?? 'aucune extension SEO détectée (installe Yoast SEO ou Rank Math)',
				'metaKeys' => $seo['keys'],
			];
		},
	]);
});
