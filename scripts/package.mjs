import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { zipSync, strToU8 } from 'fflate';
import { createHash } from 'node:crypto';
process.chdir(resolve(import.meta.dirname,'..'));
const {version}=JSON.parse(await readFile('package.json','utf8'));await mkdir('release',{recursive:true});
const offline={};const base=`ime-dictionary-exporter-offline-${version}/`;
offline[base+'打开词库.html']=new Uint8Array(await readFile('dist/index.html'));
const source={};async function collect(path=''){
 for(const item of await readdir(path||'.',{withFileTypes:true})){
  if(['node_modules','dist','release','.git','.test-build'].includes(item.name))continue;
  if(item.name==='.env'||item.name.startsWith('.env.'))continue;
  const next=join(path,item.name);
  if(item.isDirectory())await collect(next);else if(item.isFile())source[`ime-dictionary-exporter-source-${version}/${next.replaceAll('\\','/')}`]=new Uint8Array(await readFile(next));
 }
}
await collect();
const pages={};
for(const file of ['index.html','.nojekyll','LICENSE','THIRD_PARTY_NOTICES.txt'])pages[`ime-dictionary-exporter-pages-${version}/${file}`]=new Uint8Array(await readFile('dist/'+file));
const sums=[];
for(const [filename,files] of [[`ime-dictionary-exporter-offline-${version}.zip`,offline],[`ime-dictionary-exporter-source-${version}.zip`,source],[`ime-dictionary-exporter-pages-${version}.zip`,pages]]){
 const bytes=zipSync(files,{level:9});await writeFile('release/'+filename,bytes);sums.push(createHash('sha256').update(bytes).digest('hex')+'  '+filename);console.log(filename,bytes.length+' bytes');
}
await writeFile('release/SHA256SUMS.txt',sums.join('\n')+'\n');
