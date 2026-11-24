import {prepare,search} from './fuzzy.mjs';
import {highlightText,matchRanges} from './highlights.mjs';
import {setupArticleSearch} from './article-search.mjs';
const input=document.querySelector('#search-input'),panel=document.querySelector('#search-panel'),results=document.querySelector('#search-results'),status=document.querySelector('#search-status'),clear=document.querySelector('#clear-search');
const root=new URL('../',import.meta.url);
let indexPromise,timer,request=0;
const load=()=>indexPromise ||= fetch(new URL('search-index.json',root)).then(r=>{if(!r.ok)throw Error('Index unavailable');return r.json();}).then(prepare).catch(e=>{indexPromise=null;throw e;});
function saveQuery(value){const url=new URL(location.href);if(value.trim())url.searchParams.set('q',value.trim());else url.searchParams.delete('q');history.replaceState(history.state,'',url);}
function syncInput(value){clearTimeout(timer);input.value=value;clear.hidden=!value;panel.hidden=true;request++;saveQuery(value);}
const initialQuery=new URL(location.href).searchParams.get('q')||'';input.value=initialQuery;clear.hidden=!initialQuery;
const articleSearch=setupArticleSearch({root,onQueryChange:syncInput});
function close(){clearTimeout(timer);panel.hidden=true;request++;}
function clearAll(){close();input.value='';clear.hidden=true;saveQuery('');articleSearch?.apply('');}
document.querySelector('.search').addEventListener('submit',e=>{e.preventDefault();results.querySelector('a')?.focus();});
document.querySelector('#close-search').addEventListener('click',()=>{close();input.focus();});
clear.addEventListener('click',()=>{clearAll();input.focus();});
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'){close();if(document.activeElement.closest('.article-find'))input.focus();}
  if(e.key==='/'&&!/INPUT|TEXTAREA/.test(document.activeElement.tagName)){e.preventDefault();input.focus();}
  if(e.key==='F3'&&articleSearch){e.preventDefault();document.querySelector(e.shiftKey?'.article-find button[aria-label="Previous match"]':'.article-find button[aria-label="Next match"]').click();}
});
input.addEventListener('input',()=>{
  clearTimeout(timer);const version=++request;clear.hidden=!input.value;saveQuery(input.value);
  if(!input.value.trim()){panel.hidden=true;articleSearch?.apply('');return;}
  timer=setTimeout(()=>{articleSearch?.apply(input.value);run(version);},180);
});
async function run(version){
 if(version!==request)return;
 const query=input.value.trim();panel.hidden=false;status.textContent='Searching…';
 try {
  const docs=await load();if(version!==request)return;
  const matches=search(docs,query);results.replaceChildren();
  status.textContent=`${matches.length} ${matches.length===1?'document':'documents'} found for “${query}”`;
  for(const doc of matches){
   const li=document.createElement('li'),a=document.createElement('a'),title=document.createElement('strong'),meta=document.createElement('span'),snippet=document.createElement('p');
   const destination=new URL(doc.url,root);destination.searchParams.set('q',query);a.href=destination.href;
   highlightText(title,doc.title,doc.matchedTerms);meta.className='result-folder';highlightText(meta,doc.folder.replaceAll('/',' / '),doc.matchedTerms);
   const position=matchRanges(doc.text,doc.matchedTerms)[0]?.start||0,start=Math.max(0,position-90),end=Math.min(doc.text.length,start+280);
   highlightText(snippet,(start?'…':'')+doc.text.slice(start,end)+(end<doc.text.length?'…':''),doc.matchedTerms);
   a.append(meta,title,snippet);li.append(a);results.append(li);
  }
  if(!matches.length){const li=document.createElement('li');li.className='empty-results';li.textContent='Try fewer words, another spelling, or a broader topic.';results.append(li);}
 }catch{if(version===request){results.replaceChildren();status.textContent='Search could not load. Please try again; you can still browse every collection.';}}
}
if(initialQuery&&!articleSearch)run(++request);
