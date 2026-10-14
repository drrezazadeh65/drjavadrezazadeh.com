#!/usr/bin/env python3
"""Pure fixture tests for CLI-only OJS installer readiness: no production contact."""
import json,os,subprocess,tempfile
from pathlib import Path
script=Path(__file__).resolve().parents[1]/'scripts/jhela-ojs-installer-check.php'
required=['index.php','config.TEMPLATE.inc.php','lib/pkp/includes/bootstrap.php',
'lib/pkp/lib/vendor/autoload.php','dbscripts/xml/version.xml','lib/pkp/templates/install/install.tpl']
def probe(ojs,site,files):
 env={**os.environ,'JHELA_OJS_DOCROOT':str(ojs),'JHELA_MAIN_PUBLIC_ROOT':str(site),'JHELA_OJS_PRIVATE_DIR':str(files)}
 run=subprocess.run(['php','-d','upload_max_filesize=32M','-d','post_max_size=32M',str(script),'--installer-check'],
 env=env,text=True,capture_output=True,check=False)
 assert run.stdout,run.stderr
 data=json.loads(run.stdout)
 assert data['scope']=='READ_ONLY_CLI_NOT_LIVE_EVIDENCE'
 assert all(str(p) not in run.stdout for p in (ojs,site,files)),'Private absolute paths leaked'
 return run.returncode,{x['id']:x['pass'] for x in data['checks']}
with tempfile.TemporaryDirectory() as tmp:
 home=Path(tmp);ojs=home/'ojs';site=home/'public_html';private=home/'private_manuscripts'
 for p in (ojs,site,private):p.mkdir()
 for f in required:
  p=ojs/f;p.parent.mkdir(parents=True,exist_ok=True);p.write_text('fixture')
 code,checks=probe(ojs,site,private)
 assert all(checks[k] for k in ['native_pkp_bootstrap','native_pkp_vendor_autoload','native_db_version_xml',
 'native_install_template','dedicated_journal_docroot','manuscripts_outside_all_webroots'])
 assert code in (0,1) # local CI PHP extensions may differ
 (ojs/'lib/pkp/includes/bootstrap.php').unlink()
 code,checks=probe(ojs,site,private)
 assert code==1 and checks['native_pkp_bootstrap'] is False
 (ojs/'lib/pkp/includes/bootstrap.php').write_text('fixture')
 exposed=site/'files';exposed.mkdir()
 code,checks=probe(ojs,site,exposed)
 assert code==1 and checks['manuscripts_outside_all_webroots'] is False
 nested=site/'journals';nested.mkdir()
 for f in required:
  p=nested/f;p.parent.mkdir(parents=True,exist_ok=True);p.write_text('fixture')
 code,checks=probe(nested,site,private)
 assert code==1 and checks['dedicated_journal_docroot'] is False
 (nested/'dbscripts/xml/version.xml').unlink()
 code,checks=probe(nested,site,private)
 assert code==1 and checks['native_db_version_xml'] is False
print('PASS: read-only OJS pre-install native layout, private uploads and independent document roots; production untouched')
