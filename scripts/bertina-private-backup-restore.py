#!/usr/bin/env python3
"""Verify an actual private backup in a new disposable, offline local MySQL container.

Requires an already-local MySQL image and a PHP CLI with ZipArchive AES256 support.
Never reads a recipient private key or contacts the production host. All SQL is sent
through docker exec to the newly created container's local Unix socket.
"""
import argparse
import hashlib
import json
import os
import re
import secrets
import shutil
import stat
import subprocess
import sys
import tempfile
import threading
import time
from pathlib import Path


class CheckFailed(Exception):
    pass


def require(condition, code):
    if not condition:
        raise CheckFailed(code)


def unique_pairs(pairs):
    result = {}
    for key, value in pairs:
        require(key not in result, 'json_duplicate_key')
        result[key] = value
    return result


def read_json(path):
    return json.loads(Path(path).read_bytes(), object_pairs_hook=unique_pairs)


def private_file(path):
    path = Path(path).absolute()
    info = path.lstat()
    require(stat.S_ISREG(info.st_mode) and info.st_uid == os.geteuid() and not info.st_mode & 0o077,
            'private_input_permissions_invalid')
    return path


def private_directory(path):
    path = Path(path).absolute()
    path.mkdir(mode=0o700, parents=True, exist_ok=True)
    info = path.lstat()
    require(stat.S_ISDIR(info.st_mode) and info.st_uid == os.geteuid() and not info.st_mode & 0o077,
            'private_directory_permissions_invalid')
    require(path.resolve() == path, 'private_directory_symlink')
    return path


def file_hash(path):
    digest = hashlib.sha256()
    with Path(path).open('rb') as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b''):
            digest.update(chunk)
    return digest.hexdigest()


def run(command, code, *, data=None, stdin=None, timeout=120):
    result = subprocess.run(command, input=data, stdin=stdin, stdout=subprocess.PIPE,
                            stderr=subprocess.PIPE, timeout=timeout, check=False)
    require(result.returncode == 0, code)
    return result.stdout


def sql_identifier(name):
    require(isinstance(name, str) and name and '\x00' not in name, 'database_identifier_invalid')
    return '`' + name.replace('`', '``') + '`'


def sql_string(value):
    # Hex literals avoid dependence on NO_BACKSLASH_ESCAPES and connection escaping.
    return "CONVERT(X'" + str(value).encode('utf-8').hex() + "' USING utf8mb4)"


def account_literal(value):
    require(isinstance(value, str) and '\x00' not in value, 'database_definer_invalid')
    # Callers set NO_BACKSLASH_ESCAPES before account statements.
    return "'" + value.replace("'", "''") + "'"


def unescape_mysql(field):
    chars = {'0': '\x00', 'b': '\b', 'n': '\n', 'r': '\r', 't': '\t', 'Z': '\x1a', '\\': '\\'}
    out = []
    i = 0
    while i < len(field):
        if field[i] == '\\' and i + 1 < len(field):
            require(field[i + 1] in chars, 'mysql_result_encoding_invalid')
            out.append(chars[field[i + 1]])
            i += 2
        else:
            out.append(field[i])
            i += 1
    return ''.join(out)


class Database:
    def __init__(self, docker, container, timeout=600):
        self.docker = docker
        self.container = container
        self.timeout = timeout

    def command(self, schema=None):
        command = [self.docker, 'exec', '-i', self.container, 'mysql', '--protocol=socket',
                   '--user=root', '--default-character-set=utf8mb4', '--batch', '--column-names',
                   '--binary-mode', '--max-allowed-packet=1073741824']
        if schema:
            command += ['--database=' + schema]
        return command

    def rows(self, sql, schema=None):
        raw = run(self.command(schema), 'isolated_database_query_failed',
                  data=("SET SESSION time_zone='+00:00'; " + sql + ';\n').encode())
        lines = raw.decode('utf-8').rstrip('\n').split('\n')
        require(bool(lines), 'isolated_database_result_missing')
        header = lines[0].split('\t')
        rows = []
        for line in lines[1:]:
            fields = line.split('\t')
            require(len(fields) == len(header), 'isolated_database_result_invalid')
            rows.append({name: None if value == 'NULL' else unescape_mysql(value)
                         for name, value in zip(header, fields)})
        return rows

    def one(self, sql, schema=None):
        rows = self.rows(sql, schema)
        require(len(rows) == 1, 'isolated_database_result_invalid')
        return rows[0]

    def execute(self, sql, schema=None):
        run(self.command(schema), 'isolated_database_statement_failed', data=(sql + ';\n').encode())

    def iter_rows(self, sql, schema=None):
        """Stream mysql --quick output one record at a time; never buffer a table."""
        process = subprocess.Popen(self.command(schema) + ['--quick'], stdin=subprocess.PIPE,
                                   stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
        expired = threading.Event()

        def expire():
            expired.set()
            try:
                process.kill()
            except ProcessLookupError:
                pass

        timer = threading.Timer(self.timeout, expire)
        timer.daemon = True
        timer.start()
        try:
            process.stdin.write((sql + ';\n').encode('utf-8'))
            process.stdin.close()
            header_line = process.stdout.readline(1048576)
            require(not expired.is_set(), 'database_row_content_timeout')
            require(header_line.endswith(b'\n'), 'database_row_content_header_invalid')
            header = header_line[:-1].decode('ascii').split('\t')
            require(len(header) == len(set(header)), 'database_row_content_header_invalid')
            for line in process.stdout:
                require(line.endswith(b'\n'), 'database_row_content_result_invalid')
                fields = line[:-1].decode('ascii').split('\t')
                require(len(fields) == len(header), 'database_row_content_result_invalid')
                yield {name: None if value == 'NULL' else value for name, value in zip(header, fields)}
            returncode = process.wait()
            require(not expired.is_set(), 'database_row_content_timeout')
            require(returncode == 0, 'database_row_content_query_failed')
        finally:
            timer.cancel()
            if process.poll() is None:
                process.kill()
            process.wait(timeout=10)
            process.stdout.close()
            if not process.stdin.closed:
                process.stdin.close()


def version_family(version):
    require(isinstance(version, str), 'database_version_invalid')
    match = re.match(r'(\d+)\.(\d+)', version)
    require(bool(match), 'database_version_invalid')
    return ('mariadb' if 'mariadb' in version.lower() else 'mysql', int(match[1]), int(match[2]))


def verify_timezone(db, context):
    require(isinstance(context, dict) and isinstance(context.get('samples'), list)
            and len(context['samples']) == 132, 'system_timezone_context_invalid')
    require(context.get('sampleScope') == 'monthly_2020_through_2030', 'system_timezone_context_invalid')
    for sample in context['samples']:
        wall = sample.get('wallTime')
        require(isinstance(wall, str) and re.fullmatch(r'20(?:2\d|30)-\d\d-\d\d \d\d:\d\d:\d\d', wall),
                'system_timezone_context_invalid')
        got = db.one("SET SESSION time_zone='SYSTEM'; SELECT UNIX_TIMESTAMP(" + sql_string(wall) + ') AS unixTimestamp')
        require(str(got['unixTimestamp']) == str(sample.get('unixTimestamp')), 'system_timezone_samples_mismatch')


def object_definition(db, schema, source):
    kind, name = source['kind'], source['name']
    require(kind in ('table', 'view', 'trigger', 'procedure', 'function', 'event'), 'database_object_kind_invalid')
    row = db.one('SHOW CREATE ' + kind.upper() + ' ' + sql_identifier(schema) + '.' + sql_identifier(name), schema)
    create_columns = {'table': 'Create Table', 'view': 'Create View', 'trigger': 'SQL Original Statement',
                      'procedure': 'Create Procedure', 'function': 'Create Function', 'event': 'Create Event'}
    require(row.get(create_columns[kind]) == source.get('ddl'), 'database_definitions_mismatch')
    require((row.get('character_set_client') or '') == source.get('characterSetClient', '')
            and (row.get('collation_connection') or '') == source.get('collationConnection', ''),
            'database_creation_charset_mismatch')
    if kind not in ('table', 'view'):
        require((row.get('sql_mode') or '') == source.get('sqlMode', ''), 'database_creation_sql_mode_mismatch')
        if 'databaseCollation' in source:
            actual = row.get('Database Collation', row.get('Database collation', ''))
            require(actual == source['databaseCollation'], 'database_creation_collation_mismatch')
    if kind == 'event':
        require(row.get('time_zone') == source.get('timeZone'), 'database_event_timezone_mismatch')
    if kind == 'view':
        columns = db.rows('SELECT COLUMN_NAME,ORDINAL_POSITION,COLUMN_TYPE,IS_NULLABLE,COLLATION_NAME,CHARACTER_SET_NAME '
                          'FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=' + sql_string(schema)
                          + ' AND TABLE_NAME=' + sql_string(name) + ' ORDER BY ORDINAL_POSITION')
        expected = source.get('viewColumns')
        require(isinstance(expected, list), 'view_column_metadata_missing')
        for values in columns:
            values['ORDINAL_POSITION'] = int(values['ORDINAL_POSITION'])
        normalized = [dict(row, ORDINAL_POSITION=int(row['ORDINAL_POSITION'])) for row in expected]
        require(columns == normalized, 'view_column_metadata_mismatch')


def prepare_definer_context(db, schema, objects):
    principals = set()
    pattern = re.compile(r'^CREATE\s+(?:ALGORITHM=\S+\s+)?DEFINER=`((?:[^`]|``)*)`@`((?:[^`]|``)*)`\s', re.IGNORECASE)
    for source in objects:
        if source['kind'] == 'table':
            continue
        match = pattern.match(source['ddl'])
        require(bool(match), 'database_definer_context_unavailable')
        principals.add(tuple(part.replace('``', '`') for part in match.groups()))
    created = 0
    for user, host in sorted(principals):
        existing = db.rows('SELECT User,Host FROM mysql.user WHERE User=' + sql_string(user)
                           + ' AND Host=' + sql_string(host))
        principal = account_literal(user) + '@' + account_literal(host)
        if not existing:
            # No source password or global grant is copied. Locked local principals
            # only let the unchanged stored definitions resolve their app schema.
            password = secrets.token_hex(32)
            db.execute("SET SESSION sql_mode='NO_BACKSLASH_ESCAPES'; CREATE USER " + principal
                       + ' IDENTIFIED BY ' + account_literal(password) + ' ACCOUNT LOCK')
            created += 1
        db.execute("SET SESSION sql_mode='NO_BACKSLASH_ESCAPES'; GRANT ALL PRIVILEGES ON "
                   + sql_identifier(schema) + '.* TO ' + principal)
    return created


def verify_database(db, manifest):
    source = manifest['database']
    schema = source['schema']
    context = source['creationContext']
    version = db.one('SELECT @@version AS serverVersion,@@GLOBAL.event_scheduler AS eventScheduler')
    require(version_family(version['serverVersion']) == version_family(context['serverVersion']),
            'database_version_family_mismatch')
    require(version['eventScheduler'] == 'OFF', 'isolated_event_scheduler_enabled')
    verify_timezone(db, source['systemTimeZoneContext'])
    require(schema not in ('mysql', 'information_schema', 'performance_schema', 'sys'),
            'application_schema_invalid')
    existing = db.rows("SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME NOT IN "
                       "('mysql','information_schema','performance_schema','sys')")
    require(not existing, 'isolated_database_not_empty')
    ddl = source['schemaCreateSql']
    require(isinstance(ddl, str) and re.match(r'^CREATE DATABASE\b', ddl, flags=re.IGNORECASE),
            'database_schema_definition_invalid')
    # The source's original schema name, qualified references, and definers are retained.
    db.execute(ddl)
    created = db.one('SHOW CREATE DATABASE ' + sql_identifier(schema))
    require(created.get('Create Database') == ddl, 'database_schema_definition_mismatch')
    defaults = db.one('SELECT @@character_set_database AS databaseCharacterSet,@@collation_database AS databaseCollation', schema)
    require(defaults['databaseCharacterSet'] == context['databaseCharacterSet']
            and defaults['databaseCollation'] == context['databaseCollation'], 'database_schema_charset_mismatch')
    return schema, version['serverVersion']


def restored_inventory(db, schema):
    result = set()
    tables = db.rows('SELECT TABLE_NAME,TABLE_TYPE FROM information_schema.TABLES WHERE TABLE_SCHEMA=' + sql_string(schema))
    for row in tables:
        require(row['TABLE_TYPE'] in ('BASE TABLE', 'VIEW'), 'database_object_kind_invalid')
        result.add(('table' if row['TABLE_TYPE'] == 'BASE TABLE' else 'view', row['TABLE_NAME']))
    for kind, table, name_col, schema_col in (
            ('trigger', 'TRIGGERS', 'TRIGGER_NAME', 'TRIGGER_SCHEMA'),
            ('event', 'EVENTS', 'EVENT_NAME', 'EVENT_SCHEMA')):
        for row in db.rows('SELECT ' + name_col + ' AS object_name FROM information_schema.' + table
                           + ' WHERE ' + schema_col + '=' + sql_string(schema)):
            result.add((kind, row['object_name']))
    for row in db.rows('SELECT ROUTINE_NAME,ROUTINE_TYPE FROM information_schema.ROUTINES WHERE ROUTINE_SCHEMA=' + sql_string(schema)):
        result.add((row['ROUTINE_TYPE'].lower(), row['ROUTINE_NAME']))
    return result


def verify_table_content(db, schema, table, content, context):
    require(isinstance(content, dict) and content.get('canonicalization') == 'ordered-hex-json-lines-v1',
            'database_row_content_metadata_invalid')
    columns = content.get('columnNames')
    insert_columns = content.get('insertColumnNames')
    generated_columns = content.get('generatedColumnNames')
    primary = content.get('primaryKeyColumns')
    require(isinstance(columns, list) and columns and all(isinstance(name, str) and name for name in columns)
            and len(columns) == len(set(columns)) and isinstance(primary, list)
            and all(name in columns for name in primary) and len(primary) == len(set(primary))
            and isinstance(insert_columns, list) and isinstance(generated_columns, list),
            'database_row_content_columns_invalid')
    require(insert_columns == [name for name in columns if name not in generated_columns]
            and generated_columns == [name for name in columns if name not in insert_columns],
            'database_row_content_columns_invalid')
    actual_columns = db.rows('SELECT COLUMN_NAME,EXTRA FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='
                             + sql_string(schema) + ' AND TABLE_NAME=' + sql_string(table)
                             + ' ORDER BY ORDINAL_POSITION', schema)
    actual_names = [row['COLUMN_NAME'] for row in actual_columns]
    actual_generated = [row['COLUMN_NAME'] for row in actual_columns
                        if re.search(r'(?:VIRTUAL|STORED) GENERATED', row.get('EXTRA') or '', re.IGNORECASE)]
    actual_insert = [name for name in actual_names if name not in actual_generated]
    require(actual_names == columns and actual_generated == generated_columns and actual_insert == insert_columns,
            'database_row_content_column_metadata_mismatch')
    actual_primary = db.rows('SELECT COLUMN_NAME FROM information_schema.STATISTICS WHERE TABLE_SCHEMA='
                             + sql_string(schema) + ' AND TABLE_NAME=' + sql_string(table)
                             + " AND INDEX_NAME='PRIMARY' ORDER BY SEQ_IN_INDEX", schema)
    require([row['COLUMN_NAME'] for row in actual_primary] == primary, 'database_row_content_primary_key_mismatch')
    mode = context.get('sqlMode')
    require(isinstance(mode, str) and re.fullmatch(r'[A-Z0-9_,]*', mode), 'database_row_content_sql_mode_invalid')
    prefix = "SET NAMES utf8mb4; SET SESSION time_zone='+00:00'; SET SESSION sql_mode='" + mode + "'; "
    quoted = ['`cb_t`.' + sql_identifier(name) for name in columns]
    from_table = sql_identifier(schema) + '.' + sql_identifier(table) + ' AS `cb_t`'
    select = ','.join('HEX(CAST(' + name + ' AS BINARY)) AS cb_hex_' + str(i)
                      for i, name in enumerate(quoted))
    strategy = content.get('orderStrategy')
    if primary:
        require(strategy == 'primary_key', 'database_row_content_order_invalid')
        order = ','.join('`cb_t`.' + sql_identifier(name) + ' ASC' for name in primary)
    else:
        require(strategy == 'binary_hex_null_first', 'database_row_content_order_invalid')
        maximum = content.get('maximumValueBytes')
        requested_sort = content.get('sortMaxLength')
        require(isinstance(maximum, int) and not isinstance(maximum, bool) and 0 <= maximum <= 4194304
                and isinstance(requested_sort, int) and not isinstance(requested_sort, bool)
                and requested_sort == max(4, 2 * maximum), 'database_row_content_sort_bound_invalid')
        max_expression = ','.join('COALESCE(MAX(OCTET_LENGTH(CAST(' + name + ' AS BINARY))),0)' for name in quoted)
        actual = db.one(prefix + 'SELECT GREATEST(0,' + max_expression + ') AS maximumValueBytes FROM '
                        + from_table, schema)
        require(int(actual['maximumValueBytes']) == maximum, 'database_row_content_maximum_value_mismatch')
        effective = db.one(prefix + 'SET SESSION max_sort_length=' + str(requested_sort)
                           + '; SELECT @@SESSION.max_sort_length AS sortMaxLength', schema)
        require(int(effective['sortMaxLength']) >= requested_sort, 'database_row_content_sort_bound_unavailable')
        prefix += 'SET SESSION max_sort_length=' + str(requested_sort) + '; '
        order = ','.join('(' + name + ' IS NULL) DESC,CAST(HEX(CAST(' + name + ' AS BINARY)) AS BINARY) ASC'
                         for name in quoted)
    expected_count = content.get('rowCount')
    expected_hash = content.get('sha256')
    require(isinstance(expected_count, int) and not isinstance(expected_count, bool) and expected_count >= 0
            and isinstance(expected_hash, str) and re.fullmatch(r'[a-f0-9]{64}', expected_hash),
            'database_row_content_metadata_invalid')
    sql = prefix + 'SELECT ' + select + ' FROM ' + from_table
    sql += ' ORDER BY ' + order
    digest = hashlib.sha256()
    count = 0
    aliases = ['cb_hex_' + str(i) for i in range(len(columns))]
    stream = db.iter_rows(sql, schema)
    try:
        for row in stream:
            require(list(row) == aliases, 'database_row_content_header_mismatch')
            values = [row[name] for name in aliases]
            for value in values:
                require(value is None or (isinstance(value, str) and len(value) % 2 == 0
                        and re.fullmatch(r'[0-9A-Fa-f]*', value)), 'database_row_content_value_invalid')
                if not primary and value is not None:
                    require(len(value) // 2 <= maximum, 'database_row_content_sort_bound_exceeded')
            canonical_values = [value.upper() if value is not None else None for value in values]
            digest.update(json.dumps(canonical_values, separators=(',', ':')).encode('ascii') + b'\n')
            count += 1
            require(count <= expected_count, 'database_row_content_count_mismatch')
    finally:
        close = getattr(stream, 'close', None)
        if close:
            close()
    require(count == expected_count, 'database_row_content_count_mismatch')
    require(secrets.compare_digest(digest.hexdigest(), expected_hash), 'database_row_content_hash_mismatch')
    return {'rowCount': count, 'sha256': digest.hexdigest()}


def verify_files(extracted, manifest):
    expected = manifest['siteFiles']
    actual = {str(path.relative_to(extracted / 'site')) for path in (extracted / 'site').rglob('*') if path.is_file()}
    require(actual == set(expected), 'restored_site_file_set_mismatch')
    for relative, entry in expected.items():
        path = extracted / 'site' / relative
        require(not path.is_symlink() and path.stat().st_size == entry['size']
                and file_hash(path) == entry['sha256'], 'restored_site_file_hash_mismatch')
    directories = manifest.get('siteDirectories')
    require(isinstance(directories, dict), 'restored_site_directories_missing')
    for relative in directories:
        parts = Path(relative).parts
        require(relative and not Path(relative).is_absolute() and all(part not in ('.', '..') for part in parts)
                and '\\' not in relative, 'restored_site_directory_invalid')
        (extracted / 'site' / relative).mkdir(mode=0o700, parents=True, exist_ok=True)
    actual_dirs = {str(path.relative_to(extracted / 'site')) for path in (extracted / 'site').rglob('*') if path.is_dir()}
    require(actual_dirs == set(directories), 'restored_site_directory_set_mismatch')


def publish_receipt(path, receipt):
    temporary = path.with_name('.restore-receipt-' + secrets.token_hex(8) + '.tmp')
    fd = os.open(temporary, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600)
    try:
        with os.fdopen(fd, 'wb') as stream:
            stream.write((json.dumps(receipt, indent=2) + '\n').encode())
            stream.flush()
            os.fsync(stream.fileno())
        # Hard linking publishes without replacing existing successful evidence.
        os.link(temporary, path, follow_symlinks=False)
    finally:
        temporary.unlink(missing_ok=True)


def main(args):
    os.umask(0o077)
    archive = private_file(args.archive)
    password = private_file(args.password_file)
    envelope_path = private_file(args.envelope)
    evidence = private_directory(args.evidence_directory)
    receipt_path = evidence / 'isolated-restore-receipt.json'
    require(not receipt_path.exists() and not receipt_path.is_symlink(), 'restore_receipt_already_exists')
    envelope = read_json(envelope_path)
    require(envelope.get('ok') is True and envelope.get('schema') == 'bertina-private-backup-metadata-v1'
            and envelope.get('metadataComplete') is True and envelope.get('consistentSnapshot') is True,
            'backup_metadata_invalid')
    require(isinstance(envelope.get('id'), str) and re.fullmatch(r'[a-f0-9]{32}', envelope['id'])
            and isinstance(envelope.get('sourceReleaseSha'), str)
            and re.fullmatch(r'[a-f0-9]{40}', envelope['sourceReleaseSha']), 'backup_metadata_invalid')
    require(re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9_./:@-]*', args.mysql_image), 'local_mysql_image_invalid')
    require(re.fullmatch(r'[A-Za-z0-9_+:/.-]+', args.system_tz), 'system_timezone_invalid')
    require(archive.stat().st_size == envelope.get('archiveBytes')
            and archive.stat().st_size <= 2 * 1024 ** 3
            and file_hash(archive) == envelope.get('archiveSha256'), 'archive_envelope_mismatch')
    run([args.docker, 'image', 'inspect', args.mysql_image], 'local_mysql_image_required')
    workspace = Path(tempfile.mkdtemp(prefix='.restore-', dir=evidence))
    extracted = workspace / 'extracted'
    extracted.mkdir(mode=0o700)
    container = 'codex-private-restore-' + secrets.token_hex(12)
    launched = False
    checks_passed = False
    cleanup_passed = False
    receipt = None
    try:
        helper = Path(__file__).with_name('bertina-private-backup-extract.php')
        extracted_result = run([args.php, *args.php_arg, str(helper), str(archive), str(password),
                                str(envelope_path), str(extracted)], 'encrypted_archive_verification_failed', timeout=args.timeout)
        extract_checks = json.loads(extracted_result)
        require(extract_checks.get('ok') is True, 'encrypted_archive_verification_failed')
        manifest = read_json(extracted / 'manifest.json')
        require(manifest.get('id') == envelope.get('id'), 'backup_id_mismatch')
        verify_files(extracted, manifest)
        require(manifest['siteFiles'].get('sw.js', {}).get('sha256') == envelope.get('sourceServiceWorkerSha256'),
                'source_service_worker_hash_mismatch')
        launched = True
        run([args.docker, 'run', '--detach', '--pull=never', '--network=none',
                       '--name=' + container, '--label=codex.private-backup.restore=v1',
                       '--security-opt=no-new-privileges', '--pids-limit=512', '--mount=type=volume,target=/var/lib/mysql',
                       '--env=MYSQL_ALLOW_EMPTY_PASSWORD=yes', '--env=TZ=' + args.system_tz,
                       args.mysql_image, '--event-scheduler=OFF', '--local-infile=OFF', '--skip-log-bin'],
                      'isolated_database_start_failed', timeout=args.timeout)
        inspected = json.loads(run([args.docker, 'inspect', container], 'isolated_container_inspection_failed'))[0]
        require(inspected['HostConfig']['NetworkMode'] == 'none'
                and not inspected['HostConfig'].get('Privileged')
                and not inspected['HostConfig'].get('Binds')
                and all(mount.get('Type') == 'volume' for mount in inspected.get('Mounts', [])),
                'database_container_isolation_invalid')
        image_id = inspected['Image']
        db = Database(args.docker, container, args.timeout)
        deadline = time.monotonic() + args.timeout
        while True:
            try:
                db.one('SELECT 1 AS ready')
                break
            except CheckFailed:
                require(time.monotonic() < deadline, 'isolated_database_ready_timeout')
                time.sleep(1)
        schema, restored_version = verify_database(db, manifest)
        synthetic_definers = prepare_definer_context(db, schema, manifest['database']['objects'])
        with (extracted / 'database/database.sql').open('rb') as stream:
            run(db.command(schema), 'isolated_database_restore_failed', stdin=stream, timeout=args.timeout)
        source_objects = manifest['database']['objects']
        expected_objects = {(o['kind'], o['name']) for o in source_objects}
        require(len(expected_objects) == len(source_objects)
                and restored_inventory(db, schema) == expected_objects, 'database_object_set_mismatch')
        for source in source_objects:
            object_definition(db, schema, source)
        row_counts = manifest['database']['rowCounts']
        require(set(row_counts) == {name for kind, name in expected_objects if kind == 'table'}, 'database_table_count_mismatch')
        for table, count in row_counts.items():
            actual = db.one('SELECT COUNT(*) AS rowCount FROM ' + sql_identifier(schema) + '.' + sql_identifier(table), schema)
            require(isinstance(count, int) and int(actual['rowCount']) == count, 'database_row_count_mismatch')
        contents = manifest['database'].get('tableContents')
        require(isinstance(contents, dict) and set(contents) == set(row_counts), 'database_row_content_tables_mismatch')
        verified_contents = {}
        for table, content in contents.items():
            require(content.get('rowCount') == row_counts[table], 'database_row_content_count_mismatch')
            verified_contents[table] = verify_table_content(db, schema, table, content,
                                                          manifest['database']['creationContext'])
        require(db.one('SELECT @@GLOBAL.event_scheduler AS value')['value'] == 'OFF', 'isolated_event_scheduler_enabled')
        final_defaults = db.one('SELECT @@character_set_database AS databaseCharacterSet,@@collation_database AS databaseCollation', schema)
        require(final_defaults['databaseCharacterSet'] == manifest['database']['creationContext']['databaseCharacterSet']
                and final_defaults['databaseCollation'] == manifest['database']['creationContext']['databaseCollation'],
                'database_final_schema_charset_mismatch')
        verify_files(extracted, manifest)
        require(file_hash(archive) == envelope['archiveSha256'], 'archive_changed_during_restore')
        receipt = {
            'schema': 'bertina-private-backup-local-restore-v1', 'backupId': envelope['id'],
            'verifiedAtEpoch': int(time.time()), 'archiveSha256': envelope['archiveSha256'],
            'archiveBytes': envelope['archiveBytes'], 'contentManifestSha256': envelope['contentManifestSha256'],
            'databaseDefinitionSha256': envelope['databaseDefinitionSha256'],
            'sourceReleaseSha': envelope['sourceReleaseSha'], 'sourceServiceWorkerSha256': envelope['sourceServiceWorkerSha256'],
            'fileCount': envelope['fileCount'], 'tableCount': envelope['tableCount'], 'objectCount': envelope['objectCount'],
            'localMySqlImageId': image_id, 'sourceServerVersion': manifest['database']['creationContext']['serverVersion'],
            'restoredServerVersion': restored_version, 'systemTz': args.system_tz,
            'archiveChecks': {'allEntriesAes256': True, 'allEntryHashesMatch': True},
            'rowContent': {'canonicalization': 'ordered-hex-json-lines-v1',
                           'tableCount': len(verified_contents), 'allGeneratedColumnsIncluded': True},
            'definerContext': {'lockedPlaceholderPrincipalsCreated': synthetic_definers,
                              'scope': 'configured_application_schema_only',
                              'sourceServerAccountsAndGrantsRestored': False},
            'checks': {key: True for key in ('databaseDefinitionsMatch', 'allRowCountsMatch', 'allRowContentHashesMatch',
                'allFileHashesMatch', 'viewColumnMetadataMatch', 'eventSchedulerDisabled', 'networkDisabled',
                'databaseRestoreIsolated', 'systemTimeZoneCompatible')},
        }
        checks_passed = True
    finally:
        # Only resources created by this invocation are removed. Never contact production.
        container_removed = True
        try:
            if launched:
                try:
                    removed = subprocess.run([args.docker, 'rm', '--force', '--volumes', container],
                                             stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=120, check=False)
                    container_removed = removed.returncode == 0
                except Exception:
                    container_removed = False
        finally:
            shutil.rmtree(workspace)
        cleanup_passed = container_removed
    require(checks_passed and cleanup_passed, 'isolated_restore_cleanup_failed')
    receipt['disposableContainerRemoved'] = True
    receipt['plaintextWorkingFilesRemoved'] = True
    publish_receipt(receipt_path, receipt)
    print(json.dumps({'ok': True, 'actualIsolatedRestorePassed': True,
                      'archiveSha256': envelope['archiveSha256'], 'receipt': str(receipt_path)}))


def cli():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--archive', required=True)
    parser.add_argument('--password-file', required=True)
    parser.add_argument('--envelope', required=True)
    parser.add_argument('--evidence-directory', required=True)
    parser.add_argument('--mysql-image', required=True, help='Already-local image. Pulling is never allowed.')
    parser.add_argument('--system-tz', default='UTC', help='Container TZ; source monthly SYSTEM samples must match.')
    parser.add_argument('--docker', default='docker')
    parser.add_argument('--php', default='php')
    parser.add_argument('--php-arg', action='append', default=[], help='Repeat to pass extension flags to PHP.')
    parser.add_argument('--timeout', type=int, default=600)
    args = parser.parse_args()
    try:
        main(args)
    except Exception as error:
        code = str(error) if isinstance(error, CheckFailed) else 'isolated_restore_failed'
        print(json.dumps({'ok': False, 'error': code}), file=sys.stderr)
        raise SystemExit(1)


if __name__ == '__main__':
    cli()
