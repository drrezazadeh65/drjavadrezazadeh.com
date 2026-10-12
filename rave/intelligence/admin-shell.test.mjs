import test from 'node:test';
import assert from 'node:assert/strict';
import {MODULES,visibleModules,createDashboardShell,validateDashboardWidget} from './admin-shell.mjs';
test('all requested engines have distinct tabs',()=>{assert.equal(MODULES.length,10);assert.equal(new Set(MODULES.map(x=>x.id)).size,10)});
test('unauthorized modules are hidden',()=>{assert.deepEqual(visibleModules([]),[]);assert.deepEqual(visibleModules(['seo.read']).map(x=>x.id),['seo'])});
test('Persian is RTL and English is LTR',()=>{assert.equal(createDashboardShell().dir,'rtl');assert.equal(createDashboardShell({locale:'en'}).dir,'ltr')});
test('widgets require source and freshness',()=>{assert.throws(()=>validateDashboardWidget({module:'rave',title:'Revenue',type:'number',freshness:'live'}),/source/);assert.equal(validateDashboardWidget({module:'rave',title:'Revenue',type:'number',freshness:'unavailable'}).freshness,'unavailable')});
test('widgets for forbidden engines are removed',()=>{const x=createDashboardShell({permissions:['seo.read'],widgets:[{module:'seo',title:'Indexation',type:'status',freshness:'unavailable'},{module:'crm',title:'Contacts',type:'number',freshness:'unavailable'}]});assert.equal(x.widgets.length,1);assert.equal(x.widgets[0].module,'seo')});
