import fs from 'node:fs';
import assert from 'node:assert/strict';
const source = fs.readFileSync('src/features/intelligence/components/EliteCommercialAgentWorkspace.tsx','utf8');
const AsyncFunction=Object.getPrototypeOf(async()=>{}).constructor;
const body=source.split('const handleExecuteAction = async () => {')[1].split('\n  };')[0];
for (const scenario of ['ok','http-error','network-error']) {
 let success=null,error=null,busy=false;
 const run=new AsyncFunction('overview','SoundFX','setExecutingAction','setActionSuccessMessage','setActionErrorMessage','fetch','setTimeout',body);
 await run({nextBestAction:{actionId:'test',contactName:'Teste'}},{play(){}},v=>busy=v,v=>success=v,v=>error=v,async()=>{if(scenario==='network-error')throw new Error('offline');return {ok:scenario==='ok',json:async()=>({success:scenario==='ok',error:'rejeitado'})};},()=>{});
 assert.equal(busy,false);
 if(scenario==='ok'){assert.match(success,/não foi confirmada/);assert.equal(error,null);}else{assert.equal(success,null);assert.ok(error);}
}
assert.ok(!source.includes('if (loading || !overview)'));
assert.ok(!source.includes('Discando para'));
assert.ok(source.includes('role="alert"'));
console.log('PASS: handler real extraído: HTTP sucesso, erro HTTP e rede; loading e feedback acessível por asserção de fonte. UI/browser não executado.');
const feedbackBody=source.split("const handleFeedbackAction = async (decision: 'POSTPONED' | 'REJECTED') => {")[1].split('\n  };')[0];
for(const scenario of ['ok','http-error','network-error']) {
 let success=null,error=null;
 const run=new AsyncFunction('decision','overview','SoundFX','setActionSuccessMessage','setActionErrorMessage','fetch','setTimeout',feedbackBody);
 await run('POSTPONED',{nextBestAction:{actionId:'test'}},{play(){}},v=>success=v,v=>error=v,async()=>{if(scenario==='network-error')throw new Error('offline');return {ok:scenario==='ok',json:async()=>({success:scenario==='ok',error:'rejeitado'})};},()=>{});
 if(scenario==='ok'){assert.match(success,/não foi confirmada/);assert.equal(error,null);}else{assert.equal(success,null);assert.ok(error);}
}
console.log('PASS: feedback real extraído: HTTP sucesso, erro HTTP e rede.');
