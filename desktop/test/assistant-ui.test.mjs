import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM, VirtualConsole} from 'jsdom';

const root=new URL('../../',import.meta.url);
const html=await readFile(new URL('index.html',root),'utf8');
const files=['data-model.js','desktop-context.js','copilot.js','writing-review.js','desktop-chatgpt.js'];
const scripts=await Promise.all(files.map(file=>readFile(new URL(file,root),'utf8')));
async function settle(condition){
  for(let i=0;i<100;i++){
    if(condition())return;
    await new Promise(resolve=>setImmediate(resolve));
  }
  assert.ok(condition(),'Expected interface state did not arrive');
}
async function fixture(native=true){
  const errors=[];
  const console=new VirtualConsole();console.on('jsdomError',error=>errors.push(error.message));
  const dom=new JSDOM(html,{url:'https://quire.test/',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:console});
  const w=dom.window;
  await new Promise(resolve=>w.addEventListener('load',resolve,{once:true}));
  Object.defineProperty(w.HTMLElement.prototype,'innerText',{get(){return this.textContent;},set(value){this.textContent=value;}});
  let notify=()=>{},delta=()=>{},pending;
  const requests=[];
  const state={session:{status:'disconnected',sharing:false},profiles:[],models:[],selectedModel:''};
  if(native)w.QuireDesktop={
    getState:async()=>structuredClone(state),onState:fn=>{notify=fn;},onDelta:fn=>{delta=fn;},
    signIn:async()=>{Object.assign(state,{session:{status:'connected',sharing:true,profileId:'synthetic'},profiles:[{id:'synthetic',label:'Test account'}],models:[{slug:'available',displayName:'Available model'}],selectedModel:'available'});notify(structuredClone(state));return structuredClone(state);},
    cancelSignIn:async()=>{},disconnect:async()=>{},selectProfile:async()=>structuredClone(state),setModel:async()=>structuredClone(state),manageUsage:async()=>{},
    request:async(id,payload)=>{
      requests.push(structuredClone(payload));
      if(payload.kind==='grounded')return {title:'Source result',claims:[{text:'The study reports an observed result.',context_ids:[payload.articleRequest.contexts[0].context_id]}]};
      delta({id,delta:'Partial suggestion'});
      if(w.__stall)return new Promise((_resolve,reject)=>{pending=reject;});
      return {text:'Suggested objective. <script>alert(1)</script>'};
    },
    cancelRequest:async()=>{if(pending){const error=new Error('Stopped');error.code='cancelled';pending(error);pending=undefined;}}
  };
  let article;
  w.QuirePdfReader={getCurrentArticleId:()=>article?.id,ensureTextIndex:async()=>({pages:[{pageNumber:4,text:'The study reports an observed result based on interviews. Participants discussed their experiences of care.'}]})};
  scripts.forEach((script,i)=>w.eval(script+'\n//# sourceURL='+files[i]));
  w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
  const project=w.QuireStore.getActiveProject()||w.QuireStore.createProject({title:'Test research'});
  article=w.QuireStore.addArticle({title:'Synthetic paper',authors:'Example author',year:2026},project.id);
  w.QuireStore.addNote({body:'Saved research note',articleId:article.id});
  w.QuireStore.addHighlight({articleId:article.id,pageNumber:4,highlightedText:'Exact page evidence'});
  await settle(()=>!native||w.document.querySelector('#chatgptConnectionMessage').textContent);
  return {dom,w,requests,errors,$:id=>w.document.getElementById(id)};
}

test('desktop workflow connects, supplies context, saves safe answers and cancels drafts',async t=>{
  const {dom,w,requests,errors,$}=await fixture();t.after(()=>dom.window.close());
  assert.equal($('chatgptSupportBtn').hidden,false);
  $('chatgptSupportBtn').click();$('chatgptAssistantSettings').click();$('chatgptSignIn').click();
  await settle(()=>$('chatgptPlanStatus').textContent==='Using ChatGPT plan');
  $('closeAiSettingsModal').click();$('chatgptSupportBtn').click();
  $('chatgptQuestion').value='Suggest an objective';
  $('chatgptAskForm').dispatchEvent(new w.Event('submit',{cancelable:true}));
  await settle(()=>$('chatgptAssistantStatus').textContent.startsWith('Answer saved'));
  assert.ok(requests[0].context.includes('Saved research note'));
  assert.ok(requests[0].context.includes('Exact page evidence'));
  assert.equal($('chatgptConversation').querySelectorAll('script').length,0);
  assert.ok($('chatgptConversation').textContent.includes('<script>'));
  const count=()=>w.QuireStore.getState().aiMessages.filter(m=>m.role==='assistant').length;
  const before=count();w.__stall=true;$('chatgptQuestion').value='Cancel';
  $('chatgptAskForm').dispatchEvent(new w.Event('submit',{cancelable:true}));
  await settle(()=>!$('chatgptStop').hidden);$('chatgptStop').click();
  await settle(()=>$('chatgptAssistantStatus').textContent.startsWith('Stopped'));
  assert.equal(count(),before);
  w.__stall=false;
  await w.QuireCopilot.analyse('summary');
  assert.ok($('aiResponse').querySelector('.claim-citation'));
  assert.equal(requests.at(-1).kind,'grounded');
  const original=JSON.stringify(w.QuireStore.getState().sections);
  w.QuireWritingReview.handleWritingCopilot({prompt:'Review my paragraph',selectedText:'My original argument.'});
  await settle(()=>$('chatgptAssistantStatus').textContent.startsWith('Answer saved'));
  assert.equal(JSON.stringify(w.QuireStore.getState().sections),original);
  assert.ok(requests.at(-1).context.includes('My original argument.'));
  const stored=JSON.parse(w.localStorage.getItem('quire:v1'));
  assert.ok(stored.aiMessages.some(m=>m.content.includes('Suggested objective')));
  assert.deepEqual(errors,[]);
});

test('the browser app leaves the native assistant hidden',async t=>{
  const {dom,w,$,errors}=await fixture(false);t.after(()=>dom.window.close());
  assert.equal($('chatgptSupportBtn').hidden,true);
  assert.equal(w.QuireChatGPT,undefined);
  assert.deepEqual(errors,[]);
});
