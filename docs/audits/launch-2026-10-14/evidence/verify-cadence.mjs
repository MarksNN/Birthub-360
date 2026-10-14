import fs from 'node:fs';
import assert from 'node:assert/strict';
const domain=fs.readFileSync('src/features/cadence/domain/cadence.ts','utf8');
const body=domain.split('export function validateSequence(sequence: CadenceSequenceDefinition): string[] {')[1].split('\nfunction touchesForOrder')[0].trim().replace(/}\s*$/,'').replace('const errors: string[]','const errors');
const validate=new Function('sequence',body);
for(const channel of ['email','whatsapp'])for(const templateRef of [undefined,'','   ','Olá']){
 const errors=validate({name:'test',touches:[{order:1,channel,templateRef}]});
 assert.equal(errors.length,templateRef==='Olá'?0:1);
}
assert.equal(validate({touches:[{order:1,channel:'voice'}]}).length,0);
const source=fs.readFileSync('src/features/cadence/infra/dispatchers/CadenceDispatchers.ts','utf8');
const AsyncFunction=Object.getPrototypeOf(async()=>{}).constructor;
for(const name of ['whatsAppCadenceDispatcher','emailCadenceDispatcher']){
 const part=source.split(`export const ${name}:`)[1].split('async dispatch(touch: CadenceTouch, run: CadenceRunState) {')[1];
 const body=part.split('\n    const contactId')[0].replace(/ as const/g,'');
 const check=new AsyncFunction('touch',body);
 for(const templateRef of [undefined,'','   '])assert.equal((await check({templateRef})).result,'failed');
 // Extracted guard exits before resolveLeadContactId/database/provider.
}
console.log('PASS: validateSequence email/WhatsApp válido,omitido,vazio,branco;voz preservada;guard dispatchers legado falha antes de DB/provider. Não executa transporte/browser.');
