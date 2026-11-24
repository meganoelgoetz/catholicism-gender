// Map normalized search positions back to the original text, including accents
// and Unicode characters whose normalized form contains several code points.
export function normalizedText(text) {
  let value='',starts=[],ends=[],offset=0;
  for(const character of text) {
    const end=offset+character.length;
    for(const part of character.normalize('NFKD')) {
      if(/\p{M}/u.test(part)){if(ends.length)ends[ends.length-1]=end;continue;}
      const normalized=/[\p{L}\p{N}]/u.test(part)?part.toLowerCase():' ';
      if(normalized===' ' && value.endsWith(' ')) {ends[ends.length-1]=end;continue;}
      for(const unit of normalized) {
        value+=unit;
        // String.indexOf uses UTF-16 offsets, so map both halves of astral letters.
        for(let i=0;i<unit.length;i++){starts.push(offset);ends.push(end);}
      }
    }
    offset=end;
  }
  return {value,starts,ends};
}
export function matchRanges(text,terms) {
  const {value,starts,ends}=normalizedText(text),ranges=[];
  for(const term of new Set(terms.filter(Boolean))) {
    let from=0,index;
    while((index=value.indexOf(term,from))!==-1) {
      ranges.push({start:starts[index],end:ends[index+term.length-1]});
      from=index+Math.max(1,term.length);
    }
  }
  ranges.sort((a,b)=>a.start-b.start||a.end-b.end);
  const merged=[];
  for(const range of ranges) {
    const last=merged.at(-1);
    if(last && range.start<last.end) last.end=Math.max(last.end,range.end);
    else merged.push({...range});
  }
  return merged;
}
export function highlightText(element,text,terms) {
  let offset=0;
  for(const {start,end} of matchRanges(text,terms)) {
    element.append(document.createTextNode(text.slice(offset,start)));
    const mark=document.createElement('mark');mark.textContent=text.slice(start,end);element.append(mark);offset=end;
  }
  element.append(document.createTextNode(text.slice(offset)));
}
