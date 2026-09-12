import { build } from 'esbuild';
import postcss from 'postcss';
import tailwind from '@tailwindcss/postcss';
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { dirname, resolve, join } from 'node:path';
const root=resolve(import.meta.dirname,'..');process.chdir(root);
await mkdir('dist',{recursive:true});
const js=await build({entryPoints:['src/main.tsx'],bundle:true,write:false,minify:true,format:'iife',platform:'browser',target:['chrome100','firefox100','safari15.4'],jsx:'automatic',metafile:true,legalComments:'inline',define:{'process.env.NODE_ENV':'"production"'},tsconfig:'tsconfig.json'});
const css=await postcss([tailwind()]).process(await readFile('src/styles.css','utf8'),{from:resolve('src/styles.css'),map:false});
const favicon=await readFile('src/favicon.svg','utf8');
const script=js.outputFiles[0].text.replace(/<\/script/gi,'<\\/script');
const html=`<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'"><title>多平台输入法自定义词库导出器</title><link rel="icon" href="data:image/svg+xml,${encodeURIComponent(favicon)}"><style>${css.css.replace(/<\/style/gi,'<\\/style')}</style></head><body><div id="root"></div><noscript>请启用浏览器 JavaScript 后重新打开。本工具不需要联网。</noscript><script>${script}</script></body></html>`;
await writeFile('dist/index.html',html);
await writeFile('dist/.nojekyll','');
await writeFile('dist/LICENSE',await readFile('LICENSE'));
// Record licenses from bundled packages; the release also includes the vendored CSS license.
const packageDirs=new Set();
for(const input of Object.keys(js.metafile.inputs)){
 if(!input.includes('node_modules'))continue;
 let dir=dirname(resolve(input));
 while(dir!==root&&dir!==dirname(dir)){
  try{await readFile(join(dir,'package.json'));packageDirs.add(dir);break;}catch{dir=dirname(dir);}
 }
}
for(const name of ['tailwindcss','tw-animate-css'])packageDirs.add(resolve('node_modules',name));
let notices='第三方组件许可\n================\n';
for(const dir of [...packageDirs].sort()){
 const pkg=JSON.parse(await readFile(join(dir,'package.json'),'utf8'));notices+=`\n${pkg.name} ${pkg.version} (${pkg.license||'见下文'})\n----------------\n`;
 const files=(await readdir(dir)).filter(f=>/^(licen[cs]e|copying|notice)(\.|$)/i.test(f));
 for(const file of files){try{notices+=(await readFile(join(dir,file),'utf8'))+'\n';}catch{}}
 if(!files.length)notices+=`许可标识：${pkg.license||'未声明'}。源码仓库：${JSON.stringify(pkg.repository||'见包元数据')}\n`;
}
notices+='\n'+await readFile('vendor/shadcn-tailwind-4.13.0.LICENSE.md','utf8');
await writeFile('dist/THIRD_PARTY_NOTICES.txt',notices);
if(/<(script|link)[^>]+(?:src|href)=["']https?:/i.test(html)||/@import\s/.test(css.css))throw new Error('发现未内联的网络资源');
console.log(`单文件离线版已生成：dist/index.html (${Buffer.byteLength(html)} bytes)`);
