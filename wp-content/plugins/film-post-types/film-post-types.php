<?php
/**
 * Plugin Name: Film Post Types (Categorized)
 * Description: 4 post types séparés pour chaque catégorie de films
 * Version: 1.3
 * Author: Edgar Fichet
 */

// 1) Register CPTs
add_action('init', function() {
    $common_args = array(
        'public' => true,
        'show_ui' => true,
        'show_in_menu' => true,
        'show_in_rest' => true,
        'capability_type' => 'post',
        'hierarchical' => false,
        'has_archive' => true,
        'supports' => array('title','editor','thumbnail','page-attributes','custom-fields'),
    );

    register_post_type('film_film', array_merge($common_args, array('label'=>'Fiction','rest_base'=>'film_film','menu_icon'=>'dashicons-format-video','menu_position'=>11)));
    register_post_type('film_pub', array_merge($common_args, array('label'=>'Publicité','rest_base'=>'film_pub','menu_icon'=>'dashicons-format-image','menu_position'=>12)));
    register_post_type('film_clip', array_merge($common_args, array('label'=>'Clip','rest_base'=>'film_clip','menu_icon'=>'dashicons-music','menu_position'=>13)));
    register_post_type('film_theatre', array_merge($common_args, array('label'=>'Théâtre','rest_base'=>'film_theatre','menu_icon'=>'dashicons-masks','menu_position'=>14)));
}, 0);

// 2) Utility: ensure ACF admin is shown
add_filter('acf/settings/show_admin', function(){ return true; });

add_filter('acf/load_field/name=category', function($field) {
    if (!isset($field['choices']) || !is_array($field['choices'])) {
        return $field;
    }

    if (isset($field['choices']['Film'])) {
        $field['choices']['Film'] = 'Fiction';
    }

    unset($field['choices']['Cours-Metrage']);
    unset($field['choices']['Cours Metrage']);


    return $field;
});

// NOTE: repair routine and admin-runner logic consolidated elsewhere.

// 7) Drag-Drop - keep original admin UX features (sortable list + AJAX save)
add_action('admin_enqueue_scripts', function() {
    wp_enqueue_script('jquery-ui-sortable');
    $inline_script = <<<'JS'
(function($) {
    $(document).ready(function() {
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
                        $.ajax({
                            type: 'POST',
                            url: ajaxurl,
                            data: {
                                action: 'film_save_order',
                                post_id: postId,
                                order: order,
                                nonce: $('input[name="film_order_nonce"]').val()
                            }
                        });
                        order++;
                    });
                }
            });
            $('#the-list tr').css('cursor', 'grab');
        }
    });
})(jQuery);
JS;
    wp_add_inline_script('jquery-ui-sortable', $inline_script);
});

add_action('wp_ajax_film_save_order', function() {
    if (!isset($_POST['nonce']) || !wp_verify_nonce($_POST['nonce'], 'film_order_nonce')) wp_send_json_error('Security check failed');
    if (!current_user_can('manage_options')) wp_send_json_error('Permission denied');
    $post_id = intval($_POST['post_id']);
    $order = intval($_POST['order']);
    wp_update_post(array('ID' => $post_id,'menu_order' => $order));
    wp_send_json_success('Order saved');
});

add_action('manage_posts_extra_tablenav', function($which) {
    if ($which === 'top') {
        $post_type = isset($_GET['post_type']) ? sanitize_text_field($_GET['post_type']) : 'post';
        $film_types = array('film_film', 'film_pub', 'film_clip', 'film_theatre');
        if (in_array($post_type, $film_types)) echo '<input type="hidden" name="film_order_nonce" value="' . esc_attr(wp_create_nonce('film_order_nonce')) . '" />';
    }
});

// 8) REST mapping for frontend
$film_post_types = array('film_film', 'film_pub', 'film_clip', 'film_theatre');
foreach ($film_post_types as $post_type) {
    add_filter("rest_prepare_{$post_type}", function($response, $post) use ($post_type) {
        $mapped_fields = array(
            'title' => get_the_title($post->ID),
            'director' => get_field('realisateur', $post->ID),
            'role' => get_field('poste', $post->ID),
            'year' => get_field('annee', $post->ID),
            'poster' => get_field('image', $post->ID),
            'synopsis' => get_field('synopsis', $post->ID),
            'category' => get_field('category', $post->ID) ?: $post_type,
            'order' => get_post($post->ID)->menu_order ?: 0,
        );
        foreach ($mapped_fields as $key => $value) $response->data[$key] = $value;
        return $response;
    }, 10, 2);
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
        $film_types = array('film_film', 'film_pub', 'film_clip', 'film_theatre');
        
        if (in_array($post_type, $film_types)) {
            echo '<input type="hidden" name="film_order_nonce" value="' . esc_attr(wp_create_nonce('film_order_nonce')) . '" />';
        }
    }
});

// ==========================================
// Expose ACF Fields in REST API (Mapped for Frontend)
// ==========================================

$film_post_types = array('film_film', 'film_pub', 'film_clip', 'film_theatre');

foreach ($film_post_types as $post_type) {
    $hook_name = "rest_prepare_{$post_type}";
    
    add_filter($hook_name, function($response, $post) use ($post_type) {
        // Map ACF field names to frontend field names
        $mapped_fields = array(
            'title' => get_the_title($post->ID),
            'director' => get_field('realisateur', $post->ID),
            'role' => get_field('poste', $post->ID),
            'year' => get_field('annee', $post->ID),
            'poster' => get_field('image', $post->ID),
            'synopsis' => get_field('synopsis', $post->ID),
            'category' => get_field('category', $post->ID) ?: $post_type,
            'order' => get_post($post->ID)->menu_order ?: 0,
        );
        
        // Merge with response data
        foreach ($mapped_fields as $key => $value) {
            $response->data[$key] = $value;
        }
        
        return $response;
    }, 10, 2);
}

// ==========================================
// Admin trigger : exécuter la réparation manuellement et afficher le résultat
// ==========================================
// Encapsule la logique de réparation dans une fonction réutilisable
function film_fix_execute() {
    if (! (php_sapi_name() === 'cli' || current_user_can('manage_options'))) return array('notices'=>array('Permission denied'));

    $result = array('notices' => array());

    // 1) Vérifier si ACF est disponible
    if (! function_exists('acf_get_field_groups') || ! function_exists('acf_update_field_group')) {
        $result['notices'][] = 'ACF non disponible. Activez Advanced Custom Fields puis réessayez.';
        return $result;
    }

    // 2) Étendre le field group existant contenant "film" aux post types actifs
    $post_types = array('film_film','film_pub','film_clip','film_theatre');
    $groups = acf_get_field_groups();
    $target = null;
    foreach ($groups as $g) {
        if (! empty($g['title']) && stripos($g['title'], 'film') !== false) {
            $target = $g;
            break;
        }
    }
    if ($target) {
        $full = acf_get_field_group($target['key']);
        if ($full) {
            $locations = array();
            foreach ($post_types as $pt) {
                $locations[] = array(array('param'=>'post_type','operator'=>'==','value'=>$pt));
            }
            $full['location'] = $locations;
            acf_update_field_group($full);
            $result['notices'][] = 'Field group ACF étendu aux 4 post types actifs.';
        } else {
            $result['notices'][] = 'Impossible de récupérer le field group ACF complet.';
        }
    } else {
        $result['notices'][] = 'Aucun field group ACF contenant "film" trouvé.';
    }

    global $wpdb;

    // 3) Migrer posts post_type='film' vers 'film_film'
    $m1 = $wpdb->query("UPDATE {$wpdb->posts} SET post_type = 'film_film' WHERE post_type = 'film'");
    $result['notices'][] = "Posts migrés (film -> film_film) : " . intval($m1);

    // 3b) Supprimer complètement les posts de la catégorie retirée
    $deleted_coursmetrage = $wpdb->query("DELETE FROM {$wpdb->posts} WHERE post_type = 'film_coursmetrage'");
    $result['notices'][] = "Posts supprimés (film_coursmetrage) : " . intval($deleted_coursmetrage);

    // 4) Supprimer définitions acf-post-type obsolètes qui mentionnent film
    $defs = $wpdb->get_results("SELECT ID, post_content FROM {$wpdb->posts} WHERE post_type = 'acf-post-type'");
    $deleted = 0;
    foreach ($defs as $d) {
        if (strpos($d->post_content, '"film"') !== false || strpos($d->post_content, '"films"') !== false) {
            wp_delete_post($d->ID, true);
            $deleted++;
        }
    }
    $result['notices'][] = "Definitions ACF supprimées : {$deleted}";

    // 5) Nettoyer meta orphelins
    $wpdb->query("DELETE FROM {$wpdb->postmeta} WHERE post_id NOT IN (SELECT ID FROM {$wpdb->posts})");
    $result['notices'][] = 'Nettoyage postmeta orphelins effectué.';

    // Marquer l'heure de la dernière exécution
    update_option('film_fix_last_run', time());
    return $result;
}

// Exécution automatique une seule fois (si jamais l'option n'existe pas)
add_action('admin_init', function() {
    if (! current_user_can('manage_options')) return;
    global $wpdb;
    $has_coursmetrage = (int) $wpdb->get_var("SELECT COUNT(1) FROM {$wpdb->posts} WHERE post_type = 'film_coursmetrage'");
    if ( get_option('film_fix_last_run') && ! $has_coursmetrage ) return;
    $res = film_fix_execute();
    set_transient('film_fix_result', $res, 60);
});

// Page d'administration manuelle pour forcer l'exécution
add_action('admin_menu', function() {
    add_management_page('Fix Film CPTs', 'Fix Film CPTs', 'manage_options', 'film-fix', 'film_fix_page_callback');
});

function film_fix_page_callback() {
    if (! current_user_can('manage_options')) return;
    echo '<div class="wrap"><h1>Fix Film CPTs</h1>';
    if (isset($_POST['run_film_fix'])) {
        check_admin_referer('film_fix_run_action');
        $res = film_fix_execute();
        echo '<h2>Résultat</h2><ul>';
        foreach ($res['notices'] as $n) {
            echo '<li>' . esc_html($n) . '</li>';
        }
        echo '</ul>';
    }
    echo '<form method="post">';
    wp_nonce_field('film_fix_run_action');
    echo '<p><input type="submit" name="run_film_fix" class="button button-primary" value="Run Film Fix now"></p>';
    echo '</form></div>';
}

add_action('admin_notices', function(){
    if (! current_user_can('manage_options')) return;
    $res = get_transient('film_fix_result');
    if (! $res) return;
    echo '<div class="notice notice-success is-dismissible"><p><strong>Film fix:</strong></p><ul style="margin:0;padding-left:20px;">';
    foreach ($res['notices'] as $n) {
        echo '<li>' . esc_html($n) . '</li>';
    }
    echo '</ul></div>';
    delete_transient('film_fix_result');
});

