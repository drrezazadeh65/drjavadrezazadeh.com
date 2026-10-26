<?php
declare(strict_types=1);
// Source-stage regression for the fatal operations HTTP fixture failure of
// 2026-10-26. Self-contained, no SQL, network, API secrets or production.
if (!defined('BERTINA_API_BOOTSTRAPPED')) define('BERTINA_API_BOOTSTRAPPED',true);
$module=__DIR__.'/../api/jrei-python-owner-skills.php';
$source=(string)file_get_contents($module);
if (!str_contains($source,'function jrOwnerJreiPythonSkillDispatch('))
    throw new RuntimeException('python_optional_bridge_missing');
$dir=sys_get_temp_dir().'/jr-jrei-optional-'.bin2hex(random_bytes(6));
$api=$dir.'/api';
if (!mkdir($api,0700,true)) throw new RuntimeException('isolated_test_dir_failed');
try {
    if (!copy($module,$api.'/jrei-python-owner-skills.php'))
        throw new RuntimeException('optional_module_copy_failed');
    // Missing platform/jrei-python/ is intentional. The routes still boot.
    require $api.'/jrei-python-owner-skills.php';
    $result=jrOwnerJreiPythonSkillDispatch([],['action'=>'catalog']);
    if(($result['status']??null)!=='PRIVATE_PYTHON_NOT_ENABLED' ||
        ($result['privilegedExecutionAllowed']??null)!==false)
        throw new RuntimeException('disabled_python_did_not_fail_closed');
    $blocked=false;
    try {
        jrOwnerJreiPythonSkillDispatch([
            'jrei_python_internal_enabled'=>true
        ],['action'=>'catalog']);
    } catch (RuntimeException $e) {
        $blocked=$e->getMessage()==='JREI_PYTHON_PRIVATE_ADAPTER_NOT_INSTALLED';
    }
    if (!$blocked)
        throw new RuntimeException('enabled_missing_python_not_controlled');
    $unknown=false;
    try {
        jrOwnerJreiPythonSkillDispatch([],['action'=>'shell']);
    } catch (InvalidArgumentException $e) {
        $unknown=$e->getMessage()==='python_skill_action_invalid';
    }
    if (!$unknown)throw new RuntimeException('unknown_python_skill_allowed');
    echo "JREI optional Python adapter: disabled bootstrap and missing enabled adapter correctly fail closed.\n";
} finally {
    @unlink($api.'/jrei-python-owner-skills.php');
    @rmdir($api);
    @rmdir($dir);
}
