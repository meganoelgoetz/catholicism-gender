import {prepare,search,normalize} from './fuzzy.mjs';
const input=document.querySelector('#search-input'),panel=document.querySelector('#search-panel'),results=document.querySelector('#search-results'),status=document.querySelector('#search-status'),clear=document.querySelector('#clear-search');
const root=new URL('../',import.meta.url);
let indexPromise,timer,request=0;
const load=()=>indexPromise ||= fetch(new URL('search-index.json',root)).then(r=>{if(!r.ok)throw Error('Index unavailable');return r.json();}).then(prepare).catch(e=>{indexPromise=null;throw e;});
function close(){panel.hidden=true;input.value='';clear.hidden=true;request++;}
document.querySelector('.search').addEventListener('submit',e=>{e.preventDefault();results.querySelector('a')?.focus();});
document.querySelector('#close-search').addEventListener('click',()=>{close();input.focus();});
clear.addEventListener('click',()=>{close();input.focus();});
document.addEventListener('keydown',e=>{if(e.key==='Escape')close();if(e.key==='/'&&!/INPUT|TEXTAREA/.test(document.activeElement.tagName)){e.preventDefault();input.focus();}});
input.addEventListener('input',()=>{clearTimeout(timer);const version=++request;clear.hidden=!input.value;if(!input.value.trim()){panel.hidden=true;return;}timer=setTimeout(()=>run(version),150);});
async function run(version){
 const query=input.value.trim();panel.hidden=false;status.textContent='Searching…';
 try {
  const docs=await load();if(version!==request)return;
  const matches=search(docs,query);results.replaceChildren();
  status.textContent=`${matches.length} ${matches.length===1?'document':'documents'} found for “${query}”`;
  for(const doc of matches){
   const li=document.createElement('li'),a=document.createElement('a'),title=document.createElement('strong'),meta=document.createElement('span'),snippet=document.createElement('p');
   a.href=new URL(doc.url,root).href;title.textContent=doc.title;meta.className='result-folder';meta.textContent=doc.folder.replaceAll('/',' / ');
   const position=doc.text.toLowerCase().indexOf(doc.matchedWord),start=Math.max(0,position-90);
   snippet.textContent=(start?'…':'')+doc.text.slice(start,start+260)+'…';a.append(meta,title,snippet);li.append(a);results.append(li);
  }
  if(!matches.length){const p=document.createElement('p');p.textContent='Try fewer words, another spelling, or a broader topic.';results.append(p);}
 }catch{if(version===request){results.replaceChildren();status.textContent='Search could not load. Please try again; you can still browse every collection.';}}
}
