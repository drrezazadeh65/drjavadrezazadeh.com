"""Synthetic source/restorer row-content checks; no database, Docker, or network."""
import hashlib
import importlib.util
import json
from pathlib import Path
import unittest
from unittest import mock


SCRIPT = Path(__file__).resolve().parents[1] / 'scripts' / 'bertina-private-backup-restore.py'
SPEC = importlib.util.spec_from_file_location('private_backup_restore', SCRIPT)
RESTORE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(RESTORE)


class LocalDatabaseFixture:
    """Returns only local fixture metadata and a streamed sequence of hex cells."""
    def __init__(self, rows, columns, generated=(), primary=(), maximum=None, effective_sort=None):
        self.fixture_rows = rows
        self.columns, self.generated, self.primary = columns, generated, primary
        self.maximum = maximum if maximum is not None else max(
            (len(value) // 2 for row in rows for value in row.values() if isinstance(value, str)), default=0)
        self.effective_sort = effective_sort if effective_sort is not None else max(4, 2 * self.maximum)
        self.sql = []
        self.stream_closed = False

    def rows(self, sql, schema=None):
        self.sql.append(sql)
        if 'information_schema.COLUMNS' in sql:
            return [{'COLUMN_NAME': name, 'EXTRA': 'STORED GENERATED' if name in self.generated else ''}
                    for name in self.columns]
        if 'information_schema.STATISTICS' in sql:
            return [{'COLUMN_NAME': name} for name in self.primary]
        raise AssertionError('Unexpected metadata query in local fixture: ' + sql)

    def one(self, sql, schema=None):
        self.sql.append(sql)
        if ' AS maximumValueBytes' in sql:
            # One-column/zero-row tables still require a valid two-argument GREATEST.
            self.assert_greatest_arity(sql)
            return {'maximumValueBytes': str(self.maximum)}
        if ' AS sortMaxLength' in sql:
            return {'sortMaxLength': str(self.effective_sort)}
        if ' AS rowCount' in sql:
            return {'rowCount': str(len(self.fixture_rows))}
        raise AssertionError('Unexpected scalar query in local fixture: ' + sql)

    @staticmethod
    def assert_greatest_arity(sql):
        if 'GREATEST(' not in sql:
            raise AssertionError('Missing bounded maximum-value aggregate')
        start = sql.index('GREATEST(') + len('GREATEST(')
        depth, separators = 0, 0
        for char in sql[start:]:
            if char == '(':
                depth += 1
            elif char == ')':
                if depth == 0:
                    break
                depth -= 1
            elif char == ',' and depth == 0:
                separators += 1
        if separators < 1:
            raise AssertionError('GREATEST requires at least two arguments')

    def iter_rows(self, sql, schema=None):
        self.sql.append(sql)
        try:
            yield from self.fixture_rows
        finally:
            self.stream_closed = True


class RowContentTests(unittest.TestCase):
    context = {'sqlMode': 'STRICT_TRANS_TABLES,NO_ENGINE_SUBSTITUTION'}

    def setUp(self):
        for target in ('subprocess.run', 'subprocess.Popen', 'socket.create_connection'):
            patch = mock.patch(target, side_effect=AssertionError('external_io_forbidden_in_row_fixtures'))
            patch.start()
            self.addCleanup(patch.stop)

    def fixture(self, values=None, columns=None, generated=None, primary=None):
        columns = columns if columns is not None else ['id', 'payload', 'nullable', 'computed']
        generated = generated if generated is not None else ['computed']
        primary = primary if primary is not None else ['id']
        values = values if values is not None else [
            ['31', '00FF', None, 'D8B3D984D8A7D985'],
            ['32', '', '30', 'F09F9880']]
        rows = [{f'cb_hex_{i}': cell for i, cell in enumerate(row)} for row in values]
        # This is the public format's independent reference encoding, not verifier output.
        encoded = b''.join((json.dumps(row, separators=(',', ':')) + '\n').encode('ascii') for row in values)
        maximum = max((len(cell) // 2 for row in values for cell in row if cell is not None), default=0)
        content = {'columnNames': columns, 'insertColumnNames': [name for name in columns if name not in generated],
                   'generatedColumnNames': generated, 'primaryKeyColumns': primary,
                   'orderStrategy': 'primary_key' if primary else 'binary_hex_null_first',
                   'canonicalization': 'ordered-hex-json-lines-v1', 'rowCount': len(values),
                   'sha256': hashlib.sha256(encoded).hexdigest(),
                   'maximumValueBytes': None if primary else maximum,
                   'sortMaxLength': None if primary else max(4, 2 * maximum)}
        return LocalDatabaseFixture(rows, columns, generated, primary, maximum), content

    def verify(self, db, content):
        return RESTORE.verify_table_content(db, 'fixture', 'rows', content, self.context)

    def test_exact_row_bytes_and_generated_column_hash_match(self):
        db, content = self.fixture()
        got = self.verify(db, content)
        self.assertEqual(got, {'rowCount': content['rowCount'], 'sha256': content['sha256']})
        self.assertTrue(db.stream_closed)
        query = next(sql for sql in db.sql if ' AS cb_hex_3' in sql)
        self.assertIn('`computed` AS BINARY', query)
        self.assertIn("SET SESSION time_zone='+00:00'", query)
        self.assertIn("SET SESSION sql_mode='STRICT_TRANS_TABLES,NO_ENGINE_SUBSTITUTION'", query)

    def test_one_corrupted_cell_fails_with_identical_counts_and_schema(self):
        db, content = self.fixture()
        original_columns, original_primary = list(db.columns), list(db.primary)
        db.fixture_rows[1]['cb_hex_1'] = '00'
        self.assertEqual(len(db.fixture_rows), content['rowCount'])
        self.assertEqual((db.columns, db.primary), (original_columns, original_primary))
        with self.assertRaisesRegex(RESTORE.CheckFailed, '^database_row_content_hash_mismatch$'):
            self.verify(db, content)
        self.assertTrue(db.stream_closed)

    def test_generated_cell_corruption_is_detected(self):
        db, content = self.fixture()
        db.fixture_rows[0]['cb_hex_3'] = 'D8B3D984D8A7D984'
        with self.assertRaisesRegex(RESTORE.CheckFailed, '^database_row_content_hash_mismatch$'):
            self.verify(db, content)

    def test_manifest_cannot_omit_generated_or_other_actual_columns(self):
        for omitted in ('computed', 'payload'):
            with self.subTest(omitted=omitted):
                db, content = self.fixture()
                content['columnNames'] = [name for name in content['columnNames'] if name != omitted]
                content['insertColumnNames'] = [name for name in content['insertColumnNames'] if name != omitted]
                content['generatedColumnNames'] = [name for name in content['generatedColumnNames'] if name != omitted]
                with self.assertRaisesRegex(RESTORE.CheckFailed, '^database_row_content_column_metadata_mismatch$'):
                    self.verify(db, content)
                self.assertFalse(db.stream_closed)

    def test_actual_generated_column_designation_must_match(self):
        db, content = self.fixture()
        content['insertColumnNames'] = list(content['columnNames'])
        content['generatedColumnNames'] = []
        with self.assertRaisesRegex(RESTORE.CheckFailed, '^database_row_content_column_metadata_mismatch$'):
            self.verify(db, content)

    def test_manifest_primary_key_must_match_full_declared_order(self):
        for primary in (['payload', 'id'], ['id'], []):
            with self.subTest(primary=primary):
                db, content = self.fixture(primary=['id', 'payload'])
                content['primaryKeyColumns'] = primary
                with self.assertRaisesRegex(RESTORE.CheckFailed, '^database_row_content_primary_key_mismatch$'):
                    self.verify(db, content)

    def test_null_empty_nul_and_numeric_zero_are_distinct(self):
        db, content = self.fixture([[None], [''], ['00'], ['30']], ['cell'], [], [])
        self.verify(db, content)
        for changed in ['', '00', '30']:
            db, content = self.fixture([[None], [''], ['00'], ['30']], ['cell'], [], [])
            db.fixture_rows[0]['cb_hex_0'] = changed
            with self.subTest(changed=changed), self.assertRaisesRegex(
                    RESTORE.CheckFailed, '^database_row_content_hash_mismatch$'):
                self.verify(db, content)

    def test_empty_table_hash_and_single_column_sort_query(self):
        for values in ([], [['414243']]):
            with self.subTest(rows=len(values)):
                db, content = self.fixture(values, ['only'], [], [])
                self.assertEqual(self.verify(db, content)['rowCount'], len(values))
                self.assertTrue(db.stream_closed)
                if not values:
                    self.assertEqual(content['sha256'], hashlib.sha256(b'').hexdigest())

    def test_duplicate_row_multiplicity_is_retained(self):
        values = [['00', None], ['00', None]]
        db, content = self.fixture(values, ['bytes', 'nullable'], [], [])
        self.verify(db, content)
        db.fixture_rows[1]['cb_hex_0'] = '01'
        with self.assertRaisesRegex(RESTORE.CheckFailed, '^database_row_content_hash_mismatch$'):
            self.verify(db, content)
        db, content = self.fixture(values, ['bytes', 'nullable'], [], [])
        db.fixture_rows.pop()
        with self.assertRaisesRegex(RESTORE.CheckFailed, '^database_row_content_count_mismatch$'):
            self.verify(db, content)

    def test_primary_key_named_like_output_alias_is_qualified(self):
        db, content = self.fixture([['4141', '31'], ['4141', '32']], ['payload', 'cb_hex_0'], [], ['cb_hex_0'])
        self.verify(db, content)
        query = next(sql for sql in db.sql if ' AS cb_hex_0' in sql)
        order = query.split(' ORDER BY ', 1)[1]
        self.assertRegex(order, r'\.`cb_hex_0` ASC$')

    def test_no_primary_key_full_value_sort_bound_is_verified(self):
        prefix = '41' * 2049
        db, content = self.fixture([[prefix + '42'], [prefix + '43']], ['large'], [], [])
        self.verify(db, content)
        self.assertEqual(content['maximumValueBytes'], 2050)
        self.assertTrue(any('max_sort_length=4100' in sql for sql in db.sql))
        query = next(sql for sql in db.sql if ' AS cb_hex_0' in sql)
        self.assertIn(' IS NULL) DESC', query)
        self.assertIn(' AS BINARY) ASC', query)
        db.effective_sort = 1024
        with self.assertRaisesRegex(RESTORE.CheckFailed, '^database_row_content_sort_bound_unavailable$'):
            self.verify(db, content)

    def test_no_primary_key_actual_maximum_must_match_manifest(self):
        db, content = self.fixture([['414243']], ['cell'], [], [])
        db.maximum = 4
        with self.assertRaisesRegex(RESTORE.CheckFailed, '^database_row_content_maximum_value_mismatch$'):
            self.verify(db, content)

    def test_row_aliases_and_hex_encodings_fail_closed(self):
        for row, code in [({}, 'database_row_content_header_mismatch'),
                          ({'cb_hex_0': '00', 'extra': 'FF'}, 'database_row_content_header_mismatch'),
                          ({'cb_hex_0': False}, 'database_row_content_value_invalid'),
                          ({'cb_hex_0': '0'}, 'database_row_content_value_invalid'),
                          ({'cb_hex_0': '00\n'}, 'database_row_content_value_invalid'),
                          ({'cb_hex_0': 'GG'}, 'database_row_content_value_invalid')]:
            with self.subTest(row=row):
                db, content = self.fixture([['00']], ['cell'], [], ['cell'])
                db.fixture_rows = [row]
                with self.assertRaisesRegex(RESTORE.CheckFailed, '^' + code + '$'):
                    self.verify(db, content)
                self.assertTrue(db.stream_closed)


if __name__ == '__main__':
    unittest.main(verbosity=2)
