import importlib.util,json,ssl,ftplib,unittest
from pathlib import Path
from unittest.mock import patch
FILE=Path(__file__).resolve().parents[1]/'scripts/bertina-ftps-readonly-audit.py'
spec=importlib.util.spec_from_file_location('audit',FILE);audit=importlib.util.module_from_spec(spec);spec.loader.exec_module(audit)
SECRET='NEVER_EMIT_THIS_PRIVATE_SECRET_12345678'
class FakeFTP:
 fail=None; instances=[]
 def __init__(self,context,timeout):
  assert context.check_hostname and context.verify_mode==ssl.CERT_REQUIRED and timeout==12
  self.commands=[];self.closed=False;FakeFTP.instances.append(self)
 def connect(self,h,p):assert(h,p)==(audit.HOST,21)
 def auth(self):pass
 def login(self,u,p):
  if self.fail:raise self.fail
 def prot_p(self):pass
 def cwd(self,p):self.commands.append('CWD')
 def retrbinary(self,command,callback,blocksize):
  self.commands.append(command);assert command[5:] in audit.FILES
  if command=='RETR sw.js':callback(b"const CACHE_VERSION='jr-site-bertina-"+b'a'*40+b"';")
  elif command.endswith('config.local.php'):
   callback(("<?php return ['jrei_news_site_gateway_enabled'=>false,'jrei_news_site_gateway_hmac_key'=>'"+SECRET+"'];").encode())
  else:callback(b'<?php // known public source')
 def close(self):self.closed=True

class Tests(unittest.TestCase):
 def setUp(self):FakeFTP.fail=None;FakeFTP.instances=[]
 def test_success_is_only_authenticated_read_not_cms_or_release(self):
  r=audit.audit({'FTP_USER':'test','FTP_PASSWORD':SECRET,'FTP_REMOTE_DIR':'public_html'},FakeFTP)
  self.assertEqual(r['state'],'FTPS_AUTHENTICATED_READ_VERIFIED');self.assertNotIn(SECRET,json.dumps(r))
  self.assertFalse(r['cms_authenticated_read_verified']);self.assertFalse(r['release_ready']);self.assertFalse(r['production_files_modified'])
  self.assertTrue(FakeFTP.instances[0].closed);self.assertEqual(len(FakeFTP.instances[0].commands),4)
 def test_missing_credentials_never_connect(self):
  self.assertEqual(audit.audit({},FakeFTP)['error_code'],'EXISTING_GITHUB_DEPLOYMENT_SECRET_MISSING');self.assertEqual(FakeFTP.instances,[])
 def test_server_error_is_sanitized_and_closed(self):
  FakeFTP.fail=ftplib.error_perm('530 '+SECRET)
  r=audit.audit({'FTP_USER':'test','FTP_PASSWORD':SECRET,'FTP_REMOTE_DIR':'public_html'},FakeFTP)
  self.assertNotIn(SECRET,json.dumps(r));self.assertEqual(r['ftp_status'],'530');self.assertTrue(FakeFTP.instances[0].closed)
 def test_comments_and_dynamic_values_cannot_become_activation_proof(self):
  raw=b"<?php /* 'jrei_news_site_gateway_enabled'=>true, */ return ['jrei_news_site_gateway_enabled'=>getenv('X'),'jrei_news_integrated_release_accepted'=>false || getenv('Y')];"
  r=audit.configuration_kinds(raw);self.assertEqual(r['jrei_news_site_gateway_enabled']['kind'],'dynamic_or_unresolved');self.assertEqual(r['jrei_news_integrated_release_accepted']['kind'],'dynamic_or_unresolved')
 def test_command_allowlist_rejects_all_writes_before_network(self):
  client=audit.ReadOnlyFTPS(context=ssl.create_default_context())
  for command in ('STOR x','DELE x','MKD x','RMD x','SITE CHMOD 777 x','RNFR x','RETR ../../secret'):
   with self.assertRaises(audit.ReadOnlyViolation):client.putcmd(command)
  client.close()
 def test_size_limit_does_not_accept_partial_read(self):
  class Large:
   def retrbinary(self,cmd,callback,blocksize):callback(b'x'*(audit.CAP+1))
  with self.assertRaises(audit.ReadOnlyViolation):audit.read_file(Large(),'sw.js')
 def test_certificate_failure_never_falls_back_to_insecure_tls(self):
  FakeFTP.fail=ssl.SSLCertVerificationError('test certificate failure')
  r=audit.audit({'FTP_USER':'test','FTP_PASSWORD':SECRET,'FTP_REMOTE_DIR':'public_html'},FakeFTP)
  self.assertEqual(r['error_code'],'TLS_CERTIFICATE_VERIFICATION_FAILED');self.assertFalse(r['authenticated_control_channel'])

if __name__=='__main__':unittest.main()
