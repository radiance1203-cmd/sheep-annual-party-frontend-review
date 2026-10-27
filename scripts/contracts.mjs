import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import openapiTS,{astToString} from 'openapi-typescript';
import YAML from 'yaml';
const source=await fs.readFile('packages/contracts/openapi.yaml','utf8');
const sourceHash=crypto.createHash('sha256').update(source).digest('hex');
const doc=YAML.parse(source);
const generated='// GENERATED; DO NOT EDIT. openapi-typescript 7.13.0; source sha256 '+sourceHash+'\n'+astToString(await openapiTS(doc));
await fs.mkdir('packages/contracts/src/generated',{recursive:true});
const schemas='// GENERATED; DO NOT EDIT. source sha256 '+sourceHash+'\nexport const apiDocument = '+JSON.stringify(doc)+' as const;\n';
for(const [path,value] of [['packages/contracts/src/generated/api-types.ts',generated],['packages/contracts/src/generated/schemas.ts',schemas]]) {
 if(process.argv.includes('--check')) { if(await fs.readFile(path,'utf8')!==value)throw new Error('Contract drift: '+path); }
 else await fs.writeFile(path,value);
}
console.log('HTTP contract generated/checked',sourceHash);
