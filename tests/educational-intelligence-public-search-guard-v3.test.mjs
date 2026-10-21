import test from 'node:test';
import assert from 'node:assert/strict';
import {isUnsafePublicCatalogueSearch as unsafe} from '../platform/educational-intelligence-public-search-guard-v3.mjs';
test('Persian, Arabic and fullwidth digits cannot hide a phone-sized number',()=>{
  for (const value of ['۰۹۱۲۳۴۵۶۷۸۹','٠٩١٢٣٤٥٦٧٨٩','０９１２３４５６７８９']) assert.equal(unsafe(value),true);
});
test('mixed punctuation and zero-width separators cannot evade identifier screening',()=>{
  for (const value of ['۰۹۱۲‌۳۴۵۶۷۸۹','۰۹۱۲-۳۴۵-۶۷۸۹','۰۹۱۲ ۳۴۵ ۶۷۸۹','۰۹۱۲.۳۴۵.۶۷۸۹','۰۹۱۲(۳۴۵)۶۷۸۹']) assert.equal(unsafe(value),true);
});
test('bidi controls, URLs and normalized email are unsuitable for public query URLs',()=>{
  for (const value of ['حقوق\u202e','www.example.org','https://example.org','user＠example.org','آزمون\u200f']) assert.equal(unsafe(value),true);
});
test('Persian ZWNJ terms, short programme codes and normal academic searches remain allowed',()=>{
  for (const value of ['رشته‌محل','حقوق','مهندسی کامپیوتر','۱۲۳۴۵','دانشگاه ۱۴۰۵ و ۱۴۰۶']) assert.equal(unsafe(value),false);
});
test('non-string inputs fail closed',()=>{
  for (const value of [null,{},[],12,undefined]) assert.equal(unsafe(value),true);
});
