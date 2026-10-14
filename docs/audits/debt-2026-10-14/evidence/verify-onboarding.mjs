// Reprodução de read-modify-write com corpo mutate original e repositório em memória.
// Nenhum import do app, banco, Redis ou serviço externo.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const root = process.argv[2] || process.cwd();
const source = fs.readFileSync(path.join(root,'src/features/organization-modules/services/organizationModules.service.ts'),'utf8');
const start = source.indexOf('    const current = (await this.repository.load(organizationId))');
const ending = '    return this.get(organizationId);';
const stop = source.indexOf(ending,start);
assert(start>=0 && stop>=0);
const body = source.slice(start,stop+ending.length).replace('const saved: OrganizationModulesStoredState =','const saved =');
const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
const mutate = new AsyncFunction('organizationId','userId','fn','ALWAYS_ACTIVE_KEYS','normalize',body);
const allKeys=['mandatory','optional-a','optional-b'];
const mandatory=['mandatory'];
const normalize=keys=>allKeys.filter(k=>new Set([...mandatory,...keys]).has(k));
let stored={enabledModules:['mandatory'],onboardingCompletedAt:null,updatedByUserId:null};
let reads=0;
let release;
const gate=new Promise(resolve=>{release=resolve;});
const repository={
 async load(){
  const snapshot=structuredClone(stored);
  reads++;
  if(reads<=2){ if(reads===2)release(); await gate; }
  return snapshot;
 },
 async save(_org,next){stored=structuredClone(next);}
};
const instance={repository,get:()=>repository.load()};
const enable=moduleKey=>mutate.call(instance,'synthetic-tenant','synthetic-user',s=>({...s,enabledModules:[...s.enabledModules,moduleKey]}),mandatory,normalize);
await Promise.all([enable('optional-a'),enable('optional-b')]);
const lost=['optional-a','optional-b'].filter(k=>!stored.enabledModules.includes(k));
assert.equal(lost.length,1,'Reprodução deveria demonstrar uma atualização perdida');
console.log(JSON.stringify({scenario:'dois enables simultâneos',finalModules:stored.enabledModules,lostModules:lost,scope:'corpo mutate original, repository em memória/barrier; banco e HTTP não executados'}));
