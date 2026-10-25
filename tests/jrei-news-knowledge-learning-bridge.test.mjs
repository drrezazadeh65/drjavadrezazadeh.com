import test from 'node:test';
import assert from 'node:assert/strict';
import {proposeJreiNewsKnowledge} from '../platform/news-intelligence/jrei-knowledge-learning-bridge.mjs';
const sha='f'.repeat(64);
const item={source:{originalDigest:sha,rightsEvidenceDigest:sha,
   publisherStatus:'CURRENT_VERIFIED',licensedForArticleUse:true,
   issuerName:'Official Education Source',publishedDate:'2026-10-25'},
 review:{currentFactsIndependentlyVerified:true,claimsCitationReviewed:true,
   contradictionPending:false,verifiedEvidenceDigest:sha},
 cms:{originalCmsPublicationVerified:true,
   publishedContentDigest:sha,originalReceiptDigest:sha,
   publishedAtUtc:'2026-10-25T10:00:00Z'},
 language:'fa',publicUrl:'https://drjavadrezazadeh.com/fa/akhbar/verified-news/'};
test('reviewed official news becomes a proposed time-sensitive JREI knowledge item, not training',()=>{
 const x=proposeJreiNewsKnowledge(item);
 assert.equal(x.admissible,true);
 assert.equal(x.status,'PROPOSED_NOT_INDEXED');
 assert.equal(x.trainingApproved,false);
 assert.equal(x.webPublicationTriggered,false);
 assert.equal(x.liveJreiRetrievalConnected,false);
 assert.equal(x.userChatLogsCaptured,false);
});
test('cannot learn from model-only rumours, fake publication or disputed official notices',()=>{
 assert.equal(proposeJreiNewsKnowledge({...item,
   review:{...item.review,contradictionPending:true}}).admissible,false);
 assert.equal(proposeJreiNewsKnowledge({...item,
   cms:{...item.cms,originalCmsPublicationVerified:false}}).admissible,false);
 assert.equal(proposeJreiNewsKnowledge({...item,
   source:{...item.source,licensedForArticleUse:false}}).admissible,false);
});
test('fake external URL, language path mismatch or URL tracking is not trusted',()=>{
 assert.equal(proposeJreiNewsKnowledge({...item,publicUrl:'https://attacker.test/fa/akhbar/a/'}).admissible,false);
 assert.equal(proposeJreiNewsKnowledge({...item,language:'en'}).admissible,false);
 assert.equal(proposeJreiNewsKnowledge({...item,publicUrl:item.publicUrl+'?key=abc'}).admissible,false);
});
