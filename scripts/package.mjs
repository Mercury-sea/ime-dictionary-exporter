import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {zipSync} from 'fflate';
process.chdir(resolve(import.meta.dirname,'..'));
const {version}=JSON.parse(await readFile('package.json','utf8'));
await mkdir('release',{recursive:true});
const read=async path=>new Uint8Array(await readFile(path));
const source=Object.create(null);
for(const path of ['.gitignore','LICENSE','README.md','package.json','package-lock.json','tsconfig.json'])source[path]=await read(path);
async function collect(dir){
 const entries=(await readdir(dir,{withFileTypes:true})).sort((a,b)=>a.name<b.name?-1:a.name>b.name?1:0);
 for(const e of entries){
  if(e.name.startsWith('.')||e.name==='__pycache__'||e.name==='node_modules'||e.isSymbolicLink())continue;
  const path=dir+'/'+e.name;
  if(e.isDirectory()){await collect(path);continue;}
  if(!e.isFile())continue;
  if(!/\.(?:tsx?|json|css|svg|md|mjs|py|ya?ml|txt)$/.test(path)&&path!=='tests/fixtures/microsoft-original.dat')continue;
  source[path]=await read(path);
 }
}
for(const dir of ['.github/workflows','src','scripts','tests','docs','vendor'])await collect(dir);
const pages=Object.create(null);for(const file of ['index.html','.nojekyll','LICENSE','THIRD_PARTY_NOTICES.txt'])pages[file]=await read(join('dist',file));
const archives=[['offline',{'打开词库.html':pages['index.html']}],['source',source],['pages',pages]];
const sums=[];
for(const [name,files] of archives){
 const filename='ime-dictionary-exporter-'+name+'-'+version+'.zip';
 const bytes=zipSync(files,{level:9,mtime:new Date(2000,0,1)});
 await writeFile(join('release',filename),bytes);
 sums.push(createHash('sha256').update(bytes).digest('hex')+'  '+filename);console.log(filename,bytes.length+' bytes');
}
await writeFile('release/SHA256SUMS.txt',sums.join('\n')+'\n');
