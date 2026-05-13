<?php
// One-shot mu-plugin to include the runner and execute it once.
if (defined('WP_INSTALLING') && WP_INSTALLING) return;
if (get_option('ff_mu_run_done')) return;
$runner = ABSPATH . 'wp-content/plugins/film-post-types/film-fix-runner.php';
if (file_exists($runner)) {
    require $runner;
    if (function_exists('ff_runner_execute')) {
        $res = ff_runner_execute();
        update_option('ff_mu_run_done', time());
        update_option('ff_mu_run_result', $res);
    }
}
