import test from 'node:test';
import assert from 'node:assert/strict';
import {auditLaunchArticleImages} from '../scripts/article-image-alt-policy.mjs';

const labelledIcon='<a class="launch-offer" href="/fa/hamkari-sazmani/"><img src="/assets/images/services/teacher_dev_90.svg" width="60" height="60" alt="" loading="lazy"><span><strong>خدمات همکاری با مدارس</strong><small>توسعه حرفه‌ای</small></span></a>';
const hero='<figure><img src="/assets/images/knowledge/hero.webp" alt="معلمان در گفت‌وگو درباره توسعه حرفه‌ای" width="1600" height="900"></figure>';
const shop='<section><img src="/assets/images/bookstore.webp" alt="کتاب‌های آموزشی در فروشگاه علمی" width="1200" height="600"></section>';

test('valid article: two informative images and redundant labelled-link icon',()=>{
 const a=auditLaunchArticleImages(hero+labelledIcon+shop);
 assert.deepEqual({images:a.images,informative:a.informative,decorative:a.decorative,missing:a.missing},{images:3,informative:2,decorative:1,missing:0});
 assert.deepEqual(a.issues,[]);
});
test('omitted alt is an error even if surrounding text exists',()=>{
 const a=auditLaunchArticleImages('<img src="/asset.webp">');
 assert.equal(a.missing,1);
 assert.match(a.issues.join(' '),/missing alt attribute/);
});
test('empty alt is not acceptable for informative standalone image',()=>{
 const a=auditLaunchArticleImages('<figure><img src="/figure.webp" alt=""></figure>');
 assert.match(a.issues.join(' '),/unjustified empty alt/);
});
test('redundant service icon with empty alt requires readable link text',()=>{
 const a=auditLaunchArticleImages('<a class="launch-offer" href="/fa/"><img src="/icon.svg" alt=""><span><strong></strong></span></a>');
 assert.match(a.issues.join(' '),/lacks independent readable link text/);
});
test('unlabelled decorative image in a non-service link is flagged',()=>{
 const a=auditLaunchArticleImages('<a href="/fa/"><img src="/icon.svg" alt=""><strong>متن پیوند</strong></a>');
 assert.match(a.issues.join(' '),/lacks independent readable link text/);
});
test('short informative descriptions are flagged for editorial review',()=>{
 const a=auditLaunchArticleImages('<img src="/hero.webp" alt="photo">');
 assert.match(a.issues.join(' '),/too short/);
});
