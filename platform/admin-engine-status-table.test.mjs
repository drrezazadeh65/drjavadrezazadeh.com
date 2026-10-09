import test from 'node:test';
import assert from 'node:assert/strict';
import {renderEngineStatusTable} from './admin-engine-status-table.mjs';
function node(tag){return {tag,children:[],dataset:{},attrs:{},textContent:'',append(...children){this.children.push(...children)},replaceChildren(...children){this.children=children},setAttribute(k,v){this.attrs[k]=v}}}
const doc={createElement:node};
test('renders trusted status table as text nodes, never raw markup',()=>{
 const container=node('div'),now=new Date('2026-10-09T20:00:00Z');
 const output=renderEngineStatusTable({document:doc,container,now,payload:{as_of:now.toISOString(),engines:[{id:'crm',owner_module:'<script>evil</script>',status:'ACTIVE',last_verified_at:now.toISOString(),metrics:{requests_24h:5,errors_24h:0}}]}});
 assert.equal(output.totals.ACTIVE,1);
 const table=container.children[0];assert.equal(table.tag,'table');
 const cells=table.children[1].children[0].children;
 assert.equal(cells[1].textContent,'<script>evil</script>');
 assert.equal(cells[2].textContent,'فعال');
});
test('unverified engines show unavailable counts, not fabricated zeroes',()=>{
 const container=node('div'),now=new Date('2026-10-09T20:00:00Z');
 renderEngineStatusTable({document:doc,container,now,payload:{as_of:now.toISOString(),engines:[{id:'crm',status:'UNVERIFIED'}]}});
 const cells=container.children[0].children[1].children[0].children;
 assert.equal(cells[4].textContent,'—');assert.equal(cells[5].textContent,'—');
});
