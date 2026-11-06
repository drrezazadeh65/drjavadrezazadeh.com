"""Owner-triggered FTPS read-only diagnosis using existing deployment secrets.

Never execute downloaded PHP, print secrets, or send a modifying FTP command.
Private configuration remains in memory and only selected value kinds leave it.
"""
import argparse
import datetime
import ftplib
import hashlib
import io
import json
import os
from pathlib import Path
import re
import ssl
import signal

HOST = 'server388.bertina.biz'  # Existing successful, CA-verified deployment host.
FILES = ('sw.js', 'api/jrei-news-signed-gateway.php', 'api/config.local.php')
FLAGS = ('jrei_news_site_gateway_enabled', 'jrei_news_integrated_release_accepted',
         'jrei_news_standing_official_publishing_enabled', 'jrei_news_site_gateway_hmac_key')
CAP = 262144
TOKEN = re.compile(r'''(?P<comment>//[^\n]*|/\*.*?\*/|\#[^\n]*)|(?P<string>'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*")|(?P<arrow>=>)|(?P<word>[A-Za-z_]\w*)|(?P<other>\S)''', re.S)


class ReadOnlyViolation(RuntimeError):
    pass


class ReadOnlyFTPS(ftplib.FTP_TLS):
    def putcmd(self, command):
        verb = command.split(' ', 1)[0].upper()
        if verb not in {'AUTH','USER','PASS','ACCT','PBSZ','PROT','CWD','TYPE','PASV','EPSV','RETR','QUIT'}:
            raise ReadOnlyViolation('FTP_MUTATION_OR_UNREVIEWED_COMMAND_REFUSED')
        if verb == 'RETR' and command[5:] not in FILES:
            raise ReadOnlyViolation('FTP_READ_PATH_NOT_ALLOWLISTED')
        return super().putcmd(command)

    def ntransfercmd(self, cmd, rest=None):
        # Reuse the verified control TLS session for FTPS servers requiring
        # data-channel session binding. Never disable certificate validation.
        conn, size = ftplib.FTP.ntransfercmd(self, cmd, rest)
        if not self._prot_p:
            conn.close()
            raise ReadOnlyViolation('UNPROTECTED_FTP_DATA_REFUSED')
        try:
            conn = self.context.wrap_socket(conn, server_hostname=self.host,
                                           session=self.sock.session)
        except BaseException:
            conn.close()
            raise
        return conn, size


def configuration_kinds(raw):
    """Lex literals, never eval/require PHP; comments and dynamic values aren't proof."""
    tokens = [(m.lastgroup, m.group()) for m in TOKEN.finditer(raw.decode('utf-8-sig', errors='strict'))
              if m.lastgroup != 'comment']
    observed = {k: [] for k in FLAGS}
    for i in range(len(tokens)-3):
        kind, value = tokens[i]
        if kind != 'string' or value[1:-1] not in FLAGS or tokens[i+1][0] != 'arrow':
            continue
        key = value[1:-1]
        value_kind, literal = tokens[i+2]
        delimiter = tokens[i+3][1] in (',', ']', ')', ';')
        description = {'kind': 'dynamic_or_unresolved'}
        if delimiter and value_kind == 'word' and literal.lower() in ('true','false'):
            description = {'kind':'literal_boolean', 'value':literal.lower() == 'true'}
        elif delimiter and value_kind == 'string':
            inner = literal[1:-1]
            if '\\' not in inner and not (literal.startswith('"') and '$' in inner):
                description = {'kind':'literal_string', 'nonempty':bool(inner),
                               'minimum_32_utf8_bytes':len(inner.encode()) >= 32}
        observed[key].append(description)
    return {k: values[0] if len(values)==1 else
            {'kind':'multiple_assignments_unresolved' if values else 'not_observed'}
            for k,values in observed.items()}


def read_file(ftp, name):
    output = io.BytesIO()
    def consume(block):
        if output.tell()+len(block) > CAP:
            raise ReadOnlyViolation('REMOTE_READ_SIZE_LIMIT')
        output.write(block)
    ftp.retrbinary('RETR '+name,consume,blocksize=8192)
    return output.getvalue()


def audit(env, factory=ReadOnlyFTPS):
    result = {'schema':'jr.jrei.bertina-ftps-readonly-access.v1',
        'host':HOST,'observed_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),
        'state':'BLOCKED','authenticated_control_channel':False,'protected_data_read_verified':False,
        'production_files_modified':False,'cms_authenticated_read_verified':False,
        'effective_php_config_verified':False,'static_config_is_activation_acceptance':False,
        'credential_values_exposed':False,'release_ready':False}
    ftp = None
    try:
        user, password, remote = (env.get(n,'') for n in ('FTP_USER','FTP_PASSWORD','FTP_REMOTE_DIR'))
        if not user or not password or not remote:
            result['error_code']='EXISTING_GITHUB_DEPLOYMENT_SECRET_MISSING';return result
        if any(c in (user+password+remote) for c in ('\r','\n','\x00')) or '..' in remote.split('/'):
            result['error_code']='EXISTING_DEPLOYMENT_CONFIGURATION_INVALID';return result
        context=ssl.create_default_context()
        assert context.check_hostname and context.verify_mode == ssl.CERT_REQUIRED
        ftp=factory(context=context,timeout=12)
        ftp.connect(HOST,21);ftp.auth();ftp.login(user,password);ftp.prot_p()
        result['authenticated_control_channel']=True
        ftp.cwd(remote)
        sw=read_file(ftp,'sw.js')
        result['protected_data_read_verified']=True
        result['public_release_file_sha256']=hashlib.sha256(sw).hexdigest()
        match=re.search(rb"CACHE_VERSION='jr-site-bertina-([a-f0-9]{40})'",sw)
        result['observed_live_release_sha']=match[1].decode() if match else None
        for name in FILES[1:]:
            key='gateway_source' if name.endswith('gateway.php') else 'private_configuration'
            try:
                raw=read_file(ftp,name)
                if name.endswith('gateway.php'):
                    result[key]={'read':True,'git_blob_sha':hashlib.sha1(b'blob '+str(len(raw)).encode()+b'\0'+raw).hexdigest()}
                else:result[key]={'read':True,'static_selected_settings':configuration_kinds(raw)}
                del raw
            except ftplib.error_perm as exc:
                result[key]={'read':False,'error_code':'REMOTE_FILE_DENIED_OR_MISSING',
                             'ftp_status':str(exc)[:3] if str(exc)[:3].isdigit() else None}
        result['state']='FTPS_AUTHENTICATED_READ_VERIFIED'
    except ssl.SSLCertVerificationError:
        result['error_code']='TLS_CERTIFICATE_VERIFICATION_FAILED'
    except ftplib.error_perm as exc:
        result['error_code']='FTPS_AUTH_OR_PERMISSION_REJECTED'
        result['ftp_status']=str(exc)[:3] if str(exc)[:3].isdigit() else None
    except (TimeoutError, OSError):
        result['error_code']='FTPS_NETWORK_OR_DATA_CHANNEL_FAILED'
    except ReadOnlyViolation:
        result['error_code']='READ_ONLY_CONTRACT_REFUSED'
    except Exception:
        result['error_code']='READ_ONLY_AUDIT_FAILED'
    finally:
        if ftp is not None:ftp.close()
    return result


if __name__ == '__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--output',required=True);args=parser.parse_args()
    if hasattr(signal,'SIGALRM'):
        def deadline(_signal,_frame):raise TimeoutError('AUDIT_DEADLINE')
        signal.signal(signal.SIGALRM,deadline);signal.alarm(90)
    receipt=audit(os.environ)
    if hasattr(signal,'SIGALRM'):signal.alarm(0)
    raw=json.dumps(receipt,indent=2)+'\n'
    Path(args.output).write_text(raw,encoding='utf-8')
    print(raw,end='')
    raise SystemExit(0 if receipt['state']=='FTPS_AUTHENTICATED_READ_VERIFIED' else 1)
