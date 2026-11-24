import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath, pathToFileURL} from 'node:url';
const {Marked} = await import(process.env.MARKED_MODULE_PATH ? pathToFileURL(process.env.MARKED_MODULE_PATH).href : 'marked');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'dist');
const ignored = new Set(['assets', 'original-non-markdown', 'summaries', 'node_modules', 'dist', 'site', 'scripts', 'tests']);
const escape = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const url = s => s.split('/').map(encodeURIComponent).join('/');
const label = s => s.replace(/[-_]/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
const documents = [], folders = new Set();
const strip = s => s.replace(/<!--[\s\S]*?-->/g,'').replace(/!\[[^\]]*\]\([^)]*\)/g,'').replace(/\[([^\]]+)\]\([^)]*\)/g,'$1').replace(/<[^>]*>/g,'').replace(/\\([*_\[\]])/g,'$1').replace(/[#*`|]/g,'').replace(/\s+/g,' ').trim();
async function scan(relative='') {
  const entries = await fs.readdir(path.join(root,relative),{withFileTypes:true});
  for(const entry of entries.sort((a,b)=>a.name.localeCompare(b.name))) {
    if(entry.name.startsWith('.') || (entry.isDirectory() && ignored.has(entry.name))) continue;
    const file = path.posix.join(relative,entry.name);
    if(entry.isDirectory()) { folders.add(file); await scan(file); }
    else if(entry.isFile() && /\.md$/i.test(entry.name) && relative) {
      const markdown = await fs.readFile(path.join(root,file),'utf8');
      const filename = entry.name.replace(/\.md$/i,'');
      // The excerpts compilation contains multiple source titles; its filename is its library title.
      const title = filename==='Catholic Writings on Gender Excerpts' ? filename : ([...markdown.matchAll(/^# (.+)$/gm)].map(m=>m[1]).find(t=>!/^Stanford Encyclopedia|^of Philosophy$/.test(t)) || filename.replace(/_/g,' '));
      documents.push({file,folder:relative,title:strip(title),markdown,text:strip(markdown),url:url(file.replace(/\.md$/i,'.html'))});
    }
  }
}
await scan();
const assetFiles=['styles.css','search.js','fuzzy.mjs','highlights.mjs','article-search.mjs'];
const assetSources=new Map(await Promise.all(assetFiles.map(async file=>[file,await fs.readFile(path.join(root,'site',file),'utf8')])));
const digest=createHash('sha256');
for(const [file,source] of assetSources)digest.update(file).update(source);
digest.update(JSON.stringify(documents.map(({file,markdown})=>({file,markdown}))));
const assetVersion=digest.digest('hex').slice(0,16);
const versionedAsset=file=>file.replace(/(\.[^.]+)$/,`.${assetVersion}$1`);
const counts = folder => documents.filter(d=>d.folder===folder || d.folder.startsWith(folder+'/')).length;
function nav(prefix,active='') {
  return `<nav class="sidebar" aria-label="Library folders"><a class="nav-home" href="${prefix}index.html">All documents <span>${documents.length}</span></a><p class="eyebrow">COLLECTIONS</p>${[...folders].sort().map(f=>`<a ${active===f?'aria-current="page"':''} style="--depth:${f.split('/').length-1}" href="${prefix}${url(f)}/index.html">${escape(label(f.split('/').at(-1)))}<span>${counts(f)}</span></a>`).join('')}</nav>`;
}
function shell(title,content,relative='',active='') {
 const depth=relative?relative.split('/').length:0;
 const prefix='../'.repeat(depth);
 const crumb=relative?relative.split('/').map((s,i,a)=>`<a href="${prefix}${url(a.slice(0,i+1).join('/'))}/index.html">${escape(label(s))}</a>`).join('<span aria-hidden="true">/</span>'):'';
 return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="A searchable reading library on Catholicism, sex, gender, and conscience."><title>${escape(title)} · Catholicism &amp; Gender</title><link rel="stylesheet" href="${prefix}site-assets/${versionedAsset('styles.css')}"><script type="module" src="${prefix}site-assets/${versionedAsset('search.js')}"></script></head><body><a class="skip" href="#main">Skip to content</a><header class="masthead"><a class="brand" href="${prefix}index.html">Catholicism <span>&amp;</span> Gender</a><form class="search" role="search"><label for="search-input">Search the library</label><div class="search-control"><svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="10" cy="10" r="6"/><path d="m15 15 5 5"/></svg><input id="search-input" type="search" placeholder="Search titles, ideas, or passages…" autocomplete="off" aria-controls="search-results"><button type="button" id="clear-search" aria-label="Clear search" hidden>×</button></div></form></header><div class="search-panel" id="search-panel" hidden><div class="search-summary"><p id="search-status" role="status" aria-live="polite"></p><button id="close-search" type="button">Close search</button></div><ol id="search-results"></ol></div><div class="layout">${nav(prefix,active)}<main id="main">${crumb?'<div class="breadcrumbs">'+crumb+'</div>':''}${content}</main></div><footer>Collected readings and research · Catholicism &amp; Gender</footer></body></html>`;
}
function cards(list,prefix='') {
 return `<ul class="document-list">${list.map(d=>`<li><a href="${prefix}${d.url}"><span class="document-title">${escape(d.title)}</span><span class="document-description">${escape(d.text.replace(d.title,'').trim().slice(0,180))}…</span><span class="document-meta">${escape(label(d.folder))} · ${Math.max(1,Math.ceil(d.text.split(/\s+/).length/220))} min read</span></a></li>`).join('')}</ul>`;
}
await fs.mkdir(output,{recursive:true});
// Only generated output is replaced; source documents are never changed.
await fs.rm(output,{recursive:true,force:true});
await fs.mkdir(path.join(output,'site-assets'),{recursive:true});
for(const [file,original] of assetSources) {
 let source=original;
 if(/\.m?js$/.test(file)) {
  source=source.replace(/(['"])\.\/(fuzzy\.mjs|highlights\.mjs|article-search\.mjs)\1/g,(_,quote,name)=>`${quote}./${versionedAsset(name)}${quote}`);
  source=source.replace("new URL('search-index.json',root)",`new URL('search-index.json?v=${assetVersion}',root)`);
 }
 await fs.writeFile(path.join(output,'site-assets',versionedAsset(file)),source);
 // Keep legacy entry points for previously cached HTML while new pages use hashes.
 await fs.writeFile(path.join(output,'site-assets',file),source);
}
try { await fs.cp(path.join(root,'assets'),path.join(output,'assets'),{recursive:true}); } catch(e) { if(e.code!=='ENOENT') throw e; }
const topFolders=[...folders].filter(f=>!f.includes('/')).sort();
const descriptions={academic:'Scholarship and philosophical perspectives.',magisterial:'Church documents, declarations, and papal teaching.',popular:'Essays, conversations, and lived experience.'};
const home=`<section class="intro"><p class="lede">This is a personal project collecting primary sources and original articles exploring the topics of Catholicism and gender over time.</p><p class="library-count">${documents.length} documents across ${topFolders.length} collections</p></section><section aria-labelledby="collections-title"><h2 id="collections-title">Browse the collections</h2><div class="collections">${topFolders.map(f=>`<a class="collection" href="${url(f)}/index.html"><span class="eyebrow">${counts(f)} DOCUMENTS</span><h3>${escape(label(f))}</h3><p>${escape(descriptions[f]||'Explore the documents in this collection.')}</p><span class="collection-action">Open collection</span></a>`).join('')}</div></section><section class="all-documents"><h2>All documents</h2>${cards(documents)}</section>`;
await fs.writeFile(path.join(output,'index.html'),shell('Reading library',home));
for(const folder of folders) {
 const prefix='../'.repeat(folder.split('/').length);
 const children=[...folders].filter(f=>path.posix.dirname(f)===folder);
 const content=`<p class="eyebrow">COLLECTION</p><h1>${escape(label(folder.split('/').at(-1)))}</h1><p class="lede">${escape(descriptions[folder]||'Documents in this collection.')}</p>${children.length?`<ul>${children.map(f=>`<li><a href="${prefix}${url(f)}/index.html">${escape(label(f.split('/').at(-1)))}</a></li>`).join('')}</ul>`:''}${cards(documents.filter(d=>d.folder===folder),prefix)}`;
 await fs.mkdir(path.join(output,folder),{recursive:true});
 await fs.writeFile(path.join(output,folder,'index.html'),shell(label(folder),content,folder,folder));
}
for(const doc of documents) {
 const ids=new Map();
 const renderer=new Marked({gfm:true,renderer:{
  html({text}) { return /^(?:<br\s*\/?>|<!--[\s\S]*?-->)$/i.test(text.trim())?text:escape(text); },
  heading({tokens,depth,text}) { const base=strip(text).toLowerCase().replace(/[^\p{L}\p{N}]+/gu,'-').replace(/^-|-$/g,'') || 'section';const n=ids.get(base)||0;ids.set(base,n+1);return `<h${depth} id="${escape(base+(n?'-'+n:''))}">${this.parser.parseInline(tokens)}</h${depth}>\n`; },
  image({href,title,text}) {
   if(!/^(https?:|data:image\/|[^:]+$)/i.test(href)) return escape(text);
   if(!/^(https?:|data:)/i.test(href)) {
    let decoded=decodeURIComponent(href.split('#')[0]);
    const resolved=path.posix.normalize(path.posix.join(doc.folder,decoded));
    // Sources were moved into folders after conversion; resolve root asset links.
    if(decoded.startsWith('assets/')) decoded='../'.repeat(doc.folder.split('/').length)+decoded;
    else if(resolved.startsWith('../')) throw Error(`Image escapes site: ${href}`);
    href=decoded.split('/').map(encodeURIComponent).join('/');
   }
   return `<img src="${escape(href)}" alt="${escape(text)}" loading="lazy"${title?` title="${escape(title)}"`:''}>`;
  },
  link({href,title,tokens}) { const text=this.parser.parseInline(tokens); if(!/^(https?:|mailto:|#|[^:]+$)/i.test(href)) return text;
   if(!/^(https?:|mailto:|#)/i.test(href)) href=href.replace(/\.md(?=#|$)/i,'.html');
   return `<a href="${escape(href)}"${title?` title="${escape(title)}"`:''}>${text}</a>`;
  }
 }});
 // Convert DOCX-exported footnotes to linked notes, preserving their contents.
 const notes=[];
 let markdown=doc.markdown.replace(/^\[\^([^\]]+)\]: (.*(?:\n(?: {4}.*|\s*$))*)/gm,(_,id,text)=>{notes.push({id,text:text.replace(/^ {4}/gm,'')});return '';});
 markdown=markdown.replace(/\[\^([^\]]+)\]/g,(_,id)=>`[${escape(/^fn\d+$/.test(id)?String(Number(id.slice(2))+1):id)}](#note-${id})`);
 let html=await renderer.parse(markdown);
 if(notes.length) html+='<section class="footnotes"><h2>Notes</h2><ol>'+notes.map(n=>`<li id="note-${escape(n.id)}">${renderer.parse(n.text)}</li>`).join('')+'</ol></section>';
 const prefix='../'.repeat(doc.folder.split('/').length);
 const content=`<div class="reading-tools"><span>${Math.max(1,Math.ceil(doc.text.split(/\s+/).length/220))} min read</span><a href="${prefix}${url(doc.file)}" download>Download Markdown</a></div><article class="prose">${html}</article>`;
 await fs.writeFile(path.join(output,doc.file.replace(/\.md$/i,'.html')),shell(doc.title,content,doc.folder,doc.folder));
 await fs.copyFile(path.join(root,doc.file),path.join(output,doc.file));
}
await fs.writeFile(path.join(output,'search-index.json'),JSON.stringify(documents.map(({title,folder,text,url})=>({title,folder,text,url}))));
await fs.writeFile(path.join(output,'.nojekyll'),'');
console.log(`Built ${documents.length} documents and ${folders.size} folders in dist/.`);
