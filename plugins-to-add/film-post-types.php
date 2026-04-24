<?php
/**
 * Plugin Name: Film Post Types (Categorized)
 * Description: 5 post types séparés pour chaque catégorie de films
 * Version: 1.0
 * Author: Edgar Fichet
 */

// ==========================================
// Enregistrer les 5 post types
// ==========================================

add_action('init', function() {
    // Configuration commune
    $common_args = array(
        'public' => true,
        'show_ui' => true,
        'show_in_menu' => true,
        'show_in_nav_menus' => true,
        'show_in_rest' => true,
        'capability_type' => 'post',
        'hierarchical' => false,
        'has_archive' => true,
        'supports' => array(
            'title',
            'editor',
            'thumbnail',
            'page-attributes',  // menu_order pour drag-drop
            'custom-fields',
            'revisions'
        ),
    );

    // 1. FILM
    register_post_type('film_film', array_merge($common_args, array(
        'label' => 'Film',
        'singular_name' => 'Film',
        'rest_base' => 'film_film',
        'menu_icon' => 'dashicons-format-video',
        'menu_position' => 11,
    )));

    // 2. PUBLICITÉ
    register_post_type('film_pub', array_merge($common_args, array(
        'label' => 'Publicité',
        'singular_name' => 'Publicité',
        'rest_base' => 'film_pub',
        'menu_icon' => 'dashicons-format-image',
        'menu_position' => 12,
    )));

    // 3. CLIP
    register_post_type('film_clip', array_merge($common_args, array(
        'label' => 'Clip',
        'singular_name' => 'Clip',
        'rest_base' => 'film_clip',
        'menu_icon' => 'dashicons-music',
        'menu_position' => 13,
    )));

    // 4. THÉÂTRE
    register_post_type('film_theatre', array_merge($common_args, array(
        'label' => 'Théâtre',
        'singular_name' => 'Théâtre',
        'rest_base' => 'film_theatre',
        'menu_icon' => 'dashicons-masks',
        'menu_position' => 14,
    )));

    // 5. COURS-MÉTRAGE
    register_post_type('film_coursmetrage', array_merge($common_args, array(
        'label' => 'Cours-Métrage',
        'singular_name' => 'Cours-Métrage',
        'rest_base' => 'film_coursmetrage',
        'menu_icon' => 'dashicons-filmstrip',
        'menu_position' => 15,
    )));

}, 0);

// ==========================================
// Trier par menu_order dans l'admin
// ==========================================

add_filter('pre_get_posts', function($query) {
    if (!is_admin() || !$query->is_main_query()) {
        return $query;
    }

    $post_types = array('film_film', 'film_pub', 'film_clip', 'film_theatre', 'film_coursmetrage');
    $current_post_type = $query->get('post_type');

    if (in_array($current_post_type, $post_types)) {
        $query->set('orderby', 'menu_order');
        $query->set('order', 'ASC');
    }

    return $query;
});

// ==========================================
// Afficher la colonne "Ordre" dans la liste admin
// ==========================================

add_filter('manage_film_film_posts_columns', 'add_order_column');
add_filter('manage_film_pub_posts_columns', 'add_order_column');
add_filter('manage_film_clip_posts_columns', 'add_order_column');
add_filter('manage_film_theatre_posts_columns', 'add_order_column');
add_filter('manage_film_coursmetrage_posts_columns', 'add_order_column');

function add_order_column($columns) {
    $columns['menu_order'] = '📍 Ordre';
    return $columns;
}

add_action('manage_film_film_posts_custom_column', 'display_order_column', 10, 2);
add_action('manage_film_pub_posts_custom_column', 'display_order_column', 10, 2);
add_action('manage_film_clip_posts_custom_column', 'display_order_column', 10, 2);
add_action('manage_film_theatre_posts_custom_column', 'display_order_column', 10, 2);
add_action('manage_film_coursmetrage_posts_custom_column', 'display_order_column', 10, 2);

function display_order_column($column, $post_id) {
    if ($column === 'menu_order') {
        $order = get_post($post_id)->menu_order;
        echo $order > 0 ? $order : '—';
    }
}

// ==========================================
// Rendre la colonne sortable
// ==========================================

add_filter('manage_edit-film_film_sortable_columns', 'make_order_sortable');
add_filter('manage_edit-film_pub_sortable_columns', 'make_order_sortable');
add_filter('manage_edit-film_clip_sortable_columns', 'make_order_sortable');
add_filter('manage_edit-film_theatre_sortable_columns', 'make_order_sortable');
add_filter('manage_edit-film_coursmetrage_sortable_columns', 'make_order_sortable');

function make_order_sortable($sortable) {
    $sortable['menu_order'] = 'menu_order';
    return $sortable;
}

// ==========================================
// Supporter ACF sur tous les post types
// ==========================================

add_filter('acf/settings/show_admin', function() {
    return true;
});

// ==========================================
// Drag-Drop Functionality in Admin Lists
// ==========================================

add_action('admin_enqueue_scripts', function() {
    // Enqueue jQuery UI Sortable (already in WordPress)
    wp_enqueue_script('jquery-ui-sortable');
    
    // Add inline script for drag-drop
    $inline_script = <<<'JS'
(function($) {
    $(document).ready(function() {
        // Enable drag-drop on post list tbody
        var tbody = $('#the-list');
        if (tbody.length) {
            tbody.sortable({
                items: '> tr',
                cursor: 'grab',
                placeholder: 'ui-sortable-placeholder',
                opacity: 0.8,
                update: function(event, ui) {
                    var order = 1;
                    $('#the-list tr').each(function() {
                        var postId = $(this).attr('id').replace('post-', '');
                        $(this).find('.menu_order span').text(order);
                        
                        // Save via AJAX
                        $.ajax({
                            type: 'POST',
                            url: ajaxurl,
                            data: {
                                action: 'film_save_order',
                                post_id: postId,
                                order: order,
                                nonce: $('input[name="film_order_nonce"]').val()
                            },
                            success: function(response) {
                                console.log('Film ' + postId + ' updated to order ' + order);
                            }
                        });
                        
                        order++;
                    });
                }
            });
            
            // Add grab cursor on hover
            $('#the-list tr').css('cursor', 'grab');
        }
    });
})(jQuery);
JS;
    
    wp_add_inline_script('jquery-ui-sortable', $inline_script);
});

// AJAX handler to save order
add_action('wp_ajax_film_save_order', function() {
    if (!isset($_POST['nonce']) || !wp_verify_nonce($_POST['nonce'], 'film_order_nonce')) {
        wp_send_json_error('Security check failed');
    }
    
    if (!current_user_can('manage_options')) {
        wp_send_json_error('Permission denied');
    }
    
    $post_id = intval($_POST['post_id']);
    $order = intval($_POST['order']);
    
    // Update the post's menu_order
    wp_update_post(array(
        'ID' => $post_id,
        'menu_order' => $order,
    ));
    
    wp_send_json_success('Order saved');
});

// Add nonce field to the post list
add_action('manage_posts_extra_tablenav', function($which) {
    if ($which === 'top') {
        $post_type = isset($_GET['post_type']) ? sanitize_text_field($_GET['post_type']) : 'post';
        $film_types = array('film_film', 'film_pub', 'film_clip', 'film_theatre', 'film_coursmetrage');
        
        if (in_array($post_type, $film_types)) {
            echo '<input type="hidden" name="film_order_nonce" value="' . esc_attr(wp_create_nonce('film_order_nonce')) . '" />';
        }
    }
});

// ==========================================
// Expose ACF Fields in REST API
// ==========================================

$film_post_types = array('film_film', 'film_pub', 'film_clip', 'film_theatre', 'film_coursmetrage');

foreach ($film_post_types as $post_type) {
    $hook_name = "rest_prepare_{$post_type}";
    
    add_filter($hook_name, function($response, $post) {
        $acf_fields = array(
            'realisateur' => get_field('realisateur', $post->ID),
            'poste' => get_field('poste', $post->ID),
            'annee' => get_field('annee', $post->ID),
            'image' => get_field('image', $post->ID),
            'synopsis' => get_field('synopsis', $post->ID),
            'category' => get_field('category', $post->ID),
            'order' => get_post($post->ID)->menu_order,
        );
        
        $response->data['acf'] = $acf_fields;
        $response->data['featured_media'] = get_field('image', $post->ID) ?: 0;
        
        return $response;
    }, 10, 2);
}

