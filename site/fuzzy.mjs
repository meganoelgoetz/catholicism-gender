export const normalize = s => s.normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
export function distance(a,b,limit=2) {
 if(Math.abs(a.length-b.length)>limit) return limit+1;
 let before=Array.from({length:b.length+1},(_,i)=>i),twoBack;
 for(let i=1;i<=a.length;i++) {
  const row=[i];
  for(let j=1;j<=b.length;j++) {
   row[j]=Math.min(row[j-1]+1,before[j]+1,before[j-1]+(a[i-1]===b[j-1]?0:1));
   if(i>1 && j>1 && a[i-1]===b[j-2] && a[i-2]===b[j-1]) row[j]=Math.min(row[j],twoBack[j-2]+1);
  }
  twoBack=before;before=row;
 }
 return before[b.length];
}
export function prepare(documents) {
 return documents.map(doc=>({...doc,normalizedTitle:normalize(doc.title),normalizedFolder:normalize(doc.folder),normalizedText:normalize(doc.text),words:[...new Set(normalize(doc.text+' '+doc.title+' '+doc.folder).split(' '))]}));
}
export function search(documents,query) {
 const terms=normalize(query).split(' ').filter(Boolean);
 if(!terms.length) return [];
 return documents.map(doc=>{
  let score=0,matchedWord='';
  for(const term of terms) {
   if(doc.normalizedTitle.includes(term)) {score+=12;matchedWord ||= term;continue;}
   if(doc.normalizedFolder.includes(term)) {score+=8;matchedWord ||= term;continue;}
   if(doc.normalizedText.includes(term)) {score+=5;matchedWord ||= term;continue;}
   const limit=term.length<4?0:term.length<8?1:2;
   let best=limit+1,word='';
   for(const candidate of doc.words) {
    if(Math.abs(candidate.length-term.length)>limit) continue;
    const d=distance(candidate,term,limit);
    if(d<best) {best=d;word=candidate;}
    if(best===0) break;
   }
   if(best>limit) return null;
   score+=3-best;matchedWord ||= word;
  }
  return {...doc,score,matchedWord};
 }).filter(Boolean).sort((a,b)=>b.score-a.score||a.title.localeCompare(b.title));
}
