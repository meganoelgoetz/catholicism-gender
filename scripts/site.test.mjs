import test from 'node:test';
import assert from 'node:assert/strict';
import {prepare,search,distance} from '../site/fuzzy.mjs';
const docs=prepare([
 {title:'Human Dignity',folder:'magisterial',text:'The inviolable dignity of every person. Conscience and anthropology.',url:'one.html'},
 {title:'Feminist Perspectives',folder:'academic',text:'Gender and the Catholic intellectual tradition.',url:'two.html'}
]);
test('finds misspellings and transposed letters',()=>{
 assert.equal(search(docs,'digniy')[0].url,'one.html');
 assert.equal(search(docs,'conscince')[0].url,'one.html');
 assert.equal(search(docs,'feminsit')[0].url,'two.html');
 assert.equal(distance('gender','gne der'.replace(' ','')),1);
});
test('searches body text and folder names and requires all terms',()=>{
 assert.equal(search(docs,'anthropology')[0].url,'one.html');
 assert.equal(search(docs,'academic gender')[0].url,'two.html');
 assert.equal(search(docs,'dignity feminist').length,0);
 assert.equal(search(docs,'').length,0);
 assert.equal(search(docs,'zzzzzzzzz').length,0);
});
