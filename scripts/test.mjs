import { build } from 'esbuild';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
process.chdir(resolve(import.meta.dirname,'..'));await mkdir('.test-build',{recursive:true});
for(const name of ['export','storage','relations','female-component']){
 const file=`.test-build/${name}.mjs`;
 await build({entryPoints:[`tests/${name}.test.ts`],outfile:file,bundle:true,platform:'node',format:'esm',packages:'external',tsconfig:'tsconfig.json'});
 const result=spawnSync(process.execPath,[file],{stdio:'inherit'});if(result.status!==0)process.exit(result.status||1);
}
