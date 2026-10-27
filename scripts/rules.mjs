import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import {canonicalJson,validateRules} from '../packages/game-core/src/common.ts';
const bytes=await fs.readFile('config/game_rules.v2.1.json');
const raw=JSON.parse(bytes);
const validated=validateRules(raw);if(!validated.ok)throw new Error(validated.errors.join(';'));
const sourceHash=crypto.createHash('sha256').update(bytes).digest('hex');
const canonicalBytes=canonicalJson(raw),rulesHash=crypto.createHash('sha256').update(canonicalBytes).digest('hex');
const metadata={rule_version:raw.rule_version,rules_hash:rulesHash,simulator_version:'sheep-core-2.2.0',client_version:'sheep-web-2.2.0'};
const build='// Generated from the immutable canonical rule release.\nexport const BUILD = '+JSON.stringify(metadata)+' as const;\n';
const target='rules/'+rulesHash+'.json';
if(process.argv.includes('--check')){if(await fs.readFile(target,'utf8')!==canonicalBytes||await fs.readFile('packages/game-core/src/build.ts','utf8')!==build)throw new Error('Rule release drift');}
else {await fs.mkdir('rules',{recursive:true});await fs.writeFile(target,canonicalBytes,{flag:'wx'}).catch(e=>{if(e.code!=='EEXIST')throw e});await fs.writeFile('packages/game-core/src/build.ts',build);}
console.log(JSON.stringify({source_sha256:sourceHash,...metadata}));
