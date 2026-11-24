import {prepare,search} from './fuzzy.mjs';
import {matchRanges} from './highlights.mjs';
export function setupArticleSearch({root,onQueryChange}) {
  const article=document.querySelector('article.prose');
  if(!article) return null;
  const toolbar=document.createElement('section');toolbar.className='article-find';toolbar.setAttribute('aria-label','Find in this article');
  const label=document.createElement('label');label.htmlFor='article-query';label.textContent='Find in this article';
  const field=document.createElement('input');field.type='search';field.id='article-query';field.placeholder='Find words…';
  const count=document.createElement('span');count.className='hit-count';count.setAttribute('role','status');count.setAttribute('aria-live','polite');
  const previous=document.createElement('button');previous.type='button';previous.textContent='Previous';previous.setAttribute('aria-label','Previous match');
  const next=document.createElement('button');next.type='button';next.textContent='Next';next.setAttribute('aria-label','Next match');
  const clear=document.createElement('button');clear.type='button';clear.textContent='Clear';clear.setAttribute('aria-label','Clear article search');
  const back=document.createElement('a');back.textContent='Back to search results';
  const help=document.createElement('small');help.textContent='Enter: next match · Tab / Shift+Tab from a highlight: next / previous · Esc: return to find';
  const row=document.createElement('div');row.className='article-find-controls';row.append(field,count,previous,next,clear);
  toolbar.append(label,row,back,help);article.before(toolbar);
  let hits=[],current=-1,query='',timer;
  function syncUrl() {
    const url=new URL(location.href);
    if(query) url.searchParams.set('q',query);else url.searchParams.delete('q');
    if(current>=0) url.searchParams.set('hit',String(current+1));else url.searchParams.delete('hit');
    history.replaceState(history.state,'',url);
    const resultsUrl=new URL('index.html',root);if(query)resultsUrl.searchParams.set('q',query);back.href=resultsUrl.href;
  }
  function updateCount() {
    count.textContent=hits.length?`${current+1} of ${hits.length} matches`:query?'0 matches':'No search active';
    previous.disabled=next.disabled=hits.length===0;clear.disabled=!query;
  }
  function go(index,focus=true) {
    if(!hits.length) return;
    if(current>=0)for(const mark of hits[current]){mark.classList.remove('current-hit');mark.removeAttribute('aria-current');}
    current=(index+hits.length)%hits.length;
    for(const mark of hits[current]){mark.classList.add('current-hit');mark.setAttribute('aria-current','true');}
    updateCount();syncUrl();
    if(focus){hits[current][0].scrollIntoView({block:'center',behavior:'instant'});hits[current][0].focus({preventScroll:true});}
  }
  function removeHighlights() {
    for(const mark of article.querySelectorAll('mark.article-hit'))mark.replaceWith(document.createTextNode(mark.textContent));
    article.normalize();hits=[];current=-1;
  }
  function apply(value,{jump=false,hit=1}={}) {
    clearTimeout(timer);timer=null;query=value.trim();field.value=value;removeHighlights();
    if(query) {
      const walker=document.createTreeWalker(article,NodeFilter.SHOW_TEXT,{acceptNode(node){return node.parentElement.closest('script,style,button')?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT;}});
      const entries=[];let node,text='',lastBlock;
      while((node=walker.nextNode())) {
        const block=node.parentElement.closest('p,h1,h2,h3,h4,h5,h6,li,td,th,pre,blockquote');
        if(lastBlock && block!==lastBlock)text+='\n';
        entries.push({node,start:text.length,end:text.length+node.data.length});text+=node.data;lastBlock=block;
      }
      const documentInfo=prepare([{title:document.title.split(' · ')[0],folder:document.querySelector('.breadcrumbs')?.textContent||'',text,url:''}]);
      const terms=search(documentInfo,query)[0]?.matchedTerms||[];
      const ranges=matchRanges(text,terms);hits=ranges.map(()=>[]);
      let firstRange=0;
      for(const entry of entries) {
        while(firstRange<ranges.length && ranges[firstRange].end<=entry.start)firstRange++;
        const segments=[];
        for(let i=firstRange;i<ranges.length && ranges[i].start<entry.end;i++){
          const start=Math.max(ranges[i].start,entry.start)-entry.start,end=Math.min(ranges[i].end,entry.end)-entry.start;
          if(end>start)segments.push({start,end,index:i});
        }
        if(!segments.length)continue;
        const fragment=document.createDocumentFragment();let offset=0;
        for(const segment of segments){
          fragment.append(document.createTextNode(entry.node.data.slice(offset,segment.start)));
          const mark=document.createElement('mark');mark.className='article-hit';mark.tabIndex=-1;mark.dataset.hit=String(segment.index);mark.title=`Match ${segment.index+1} of ${ranges.length}`;mark.textContent=entry.node.data.slice(segment.start,segment.end);
          hits[segment.index].push(mark);fragment.append(mark);offset=segment.end;
        }
        fragment.append(document.createTextNode(entry.node.data.slice(offset)));entry.node.replaceWith(fragment);
      }
      if(hits.length)go(Math.min(Math.max(1,hit),hits.length)-1,jump);
    }
    updateCount();syncUrl();
  }
  function edit(){onQueryChange(field.value);clearTimeout(timer);timer=setTimeout(()=>apply(field.value),180);}
  field.addEventListener('input',edit);
  field.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();if(timer){apply(field.value);go(0);}else go(current+(event.shiftKey?-1:1));}});
  previous.addEventListener('click',()=>go(current-1));next.addEventListener('click',()=>go(current+1));
  clear.addEventListener('click',()=>{apply('');onQueryChange('');field.focus();});
  article.addEventListener('keydown',event=>{
    if(event.target.matches('mark.article-hit') && event.key==='Tab'){event.preventDefault();go(current+(event.shiftKey?-1:1));}
    if(event.target.matches('mark.article-hit') && event.key==='Escape'){event.preventDefault();event.stopPropagation();field.focus();}
  });
  article.addEventListener('click',event=>{const mark=event.target.closest('mark.article-hit');if(mark)go(Number(mark.dataset.hit),false);});
  const initial=new URL(location.href).searchParams;
  apply(initial.get('q')||'',{jump:!!initial.get('q')&&!location.hash,hit:Number(initial.get('hit'))||1});
  return {apply,focus:()=>field.focus()};
}
