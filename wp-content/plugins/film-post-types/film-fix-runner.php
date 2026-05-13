<?php
/**
 * Plugin Name: Film Fix Runner
 * Description: Small admin tool to run the Film CPT / ACF repair routine manually.
 * Version: 1.0
 * Author: Assistant
 */

add_action('admin_menu', function() {
    add_management_page('Fix Film CPTs (Runner)', 'Fix Film CPTs (Runner)', 'manage_options', 'film-fix-runner', 'ff_runner_page_callback');
});

function ff_runner_execute() {
    $res = array('notices'=>array());

    if (! function_exists('acf_get_field_groups') || ! function_exists('acf_update_field_group')) {
        $res['notices'][] = 'ACF non disponible.';
        return $res;
    }

    $post_types = array('film_film','film_pub','film_clip','film_theatre');
    $groups = acf_get_field_groups();
    $target = null;
    foreach ($groups as $g) if (! empty($g['title']) && stripos($g['title'],'film') !== false) { $target = $g; break; }

    if ($target) {
        $full = acf_get_field_group($target['key']);
        if ($full) {
            $locations = array(); foreach ($post_types as $pt) $locations[] = array(array('param'=>'post_type','operator'=>'==','value'=>$pt));
            $full['location'] = $locations;
            acf_update_field_group($full);
            $res['notices'][] = 'Field group ACF étendu aux 5 post types.';
        } else {
            $res['notices'][] = 'Impossible de récupérer le field group ACF.';
        }
    } else {
        $res['notices'][] = 'Aucun field group ACF contenant "film" trouvé.';
    }

    global $wpdb;
    $m = $wpdb->query("UPDATE {$wpdb->posts} SET post_type = 'film_film' WHERE post_type = 'film'");
    $res['notices'][] = 'Posts migrés: ' . intval($m);

    $deleted = $wpdb->query("DELETE FROM {$wpdb->posts} WHERE post_type = 'film_coursmetrage'");
    $res['notices'][] = 'Posts supprimés (film_coursmetrage): ' . intval($deleted);

    $defs = $wpdb->get_results("SELECT ID, post_content FROM {$wpdb->posts} WHERE post_type = 'acf-post-type'");
    $del = 0; if ($defs) foreach ($defs as $d) if (strpos($d->post_content,'"film"')!==false || strpos($d->post_content,'"films"')!==false) { wp_delete_post($d->ID,true); $del++; }
    $res['notices'][] = 'Definitions ACF supprimées: ' . intval($del);

    $wpdb->query("DELETE pm FROM {$wpdb->postmeta} pm LEFT JOIN {$wpdb->posts} p ON pm.post_id = p.ID WHERE p.ID IS NULL");
    $res['notices'][] = 'Nettoyage postmeta orphelins effectué.';

    update_option('film_fix_runner_last', time());
    return $res;
}

function ff_runner_page_callback() {
    if (! current_user_can('manage_options')) return;
    echo '<div class="wrap"><h1>Fix Film CPTs (Runner)</h1>';
    if (isset($_POST['ff_run'])) {
        check_admin_referer('ff_run_action');
        $r = ff_runner_execute();
        echo '<h2>Résultat</h2><ul>'; foreach ($r['notices'] as $n) echo '<li>'.esc_html($n).'</li>'; echo '</ul>';
    }
    echo '<form method="post">'; wp_nonce_field('ff_run_action'); echo '<p><input type="submit" name="ff_run" class="button button-primary" value="Run now"></p>'; echo '</form></div>';
}
