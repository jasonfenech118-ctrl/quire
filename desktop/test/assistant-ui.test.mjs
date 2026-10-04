import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM, VirtualConsole} from 'jsdom';
import {IDBFactory} from 'fake-indexeddb';

const root=new URL('../../',import.meta.url);
const html=await readFile(new URL('index.html',root),'utf8');
const files=['data-model.js','document-type.js','guided-launch.js','pdf-reader.js','desktop-context.js','copilot.js','writing-review.js','product-polish.js','desktop-chatgpt.js','desktop-setup.js','desktop-library.js'];
const scripts=await Promise.all(files.map(file=>readFile(new URL(file,root),'utf8')));
async function settle(condition){
  for(let i=0;i<100;i++){
    if(condition())return;
    await new Promise(resolve=>setImmediate(resolve));
  }
  assert.ok(condition(),'Expected interface state did not arrive');
}
async function fixture(native=true,options={}){
  const errors=[];
  const console=new VirtualConsole();console.on('jsdomError',error=>errors.push(error.message));
  const dom=new JSDOM(html,{url:'https://quire.test/',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:console});
  const w=dom.window;
  await new Promise(resolve=>w.addEventListener('load',resolve,{once:true}));
  Object.defineProperty(w.HTMLElement.prototype,'innerText',{get(){return this.textContent;},set(value){this.textContent=value;}});
  w.Blob=globalThis.Blob;w.File=globalThis.File;w.indexedDB=new IDBFactory();w.pdfjsLib={GlobalWorkerOptions:{}};
  w.confirm=()=>true;
  if(options.storedState)w.localStorage.setItem('quire:v1',JSON.stringify(options.storedState));
  if(options.setupComplete)w.localStorage.setItem('quire:desktop-setup-complete:v1','1');
  const listeners=new Set();
  const notify=()=>{for(const fn of listeners)fn(structuredClone(state));};
  let delta=()=>{},pending;
  const requests=[];
  const pdfs=new Map();
  const state={session:{status:'disconnected',sharing:false},profiles:[],models:[],selectedModel:'',library:{primaryFolder:'C:\\Quire\\articles',copyFolder:null,pdfCount:0,copyAvailable:false,notice:'PDFs are saved on this PC.'}};
  if(native)w.QuireDesktop={
    getState:async()=>structuredClone(state),onState:fn=>{listeners.add(fn);return()=>listeners.delete(fn);},onDelta:fn=>{delta=fn;},
    signIn:async()=>{if(w.__signInError)throw new Error('Synthetic sign-in error');Object.assign(state,{session:{status:'connected',sharing:true,profileId:'synthetic'},profiles:[{id:'synthetic',label:'Test account'}],models:[{slug:'available',displayName:'Available model'}],selectedModel:'available'});notify();return structuredClone(state);},
    cancelSignIn:async()=>{},disconnect:async()=>{},selectProfile:async()=>structuredClone(state),setModel:async()=>structuredClone(state),manageUsage:async()=>{},
    getLibraryState:async()=>structuredClone(state.library),
    chooseLibraryFolder:async()=>{Object.assign(state.library,{copyFolder:'E:\\Quire-article-library',copyAvailable:true,notice:'Article folder copy is up to date.'});notify();return structuredClone(state.library);},
    syncLibrary:async()=>structuredClone(state.library),stopLibraryCopy:async()=>structuredClone(state.library),openLibraryFolder:async()=>'',
    savePdf:async(id,bytes,name)=>{pdfs.set(id,{bytes:new Uint8Array(bytes),name});state.library.pdfCount=pdfs.size;notify();return structuredClone(state.library);},
    getPdf:async id=>pdfs.get(id)||null,hasPdf:async id=>pdfs.has(id),removePdf:async id=>pdfs.delete(id),
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
  scripts.forEach((script,i)=>w.eval(script+'\n//# sourceURL='+files[i]));
  w.QuirePdfReader.getCurrentArticleId=()=>article?.id;
  w.QuirePdfReader.ensureTextIndex=async()=>({pages:[{page:4,text:'The study reports an observed result based on interviews. Participants discussed their experiences of care.'}]});
  w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
  const project=w.QuireStore.getActiveProject()||w.QuireStore.createProject({title:options.empty?'Untitled thesis':'Test research'});
  if(!options.empty){
    article=w.QuireStore.addArticle({title:'Synthetic paper',authors:'Example author',year:2026},project.id);
    w.QuireStore.addNote({body:'Saved research note',articleId:article.id});
    w.QuireStore.addHighlight({articleId:article.id,pageNumber:4,highlightedText:'Exact page evidence'});
  }
  await settle(()=>!native||w.document.querySelector('#chatgptConnectionMessage').textContent);
  return {dom,w,requests,errors,pdfs,$:id=>w.document.getElementById(id)};
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
  assert.equal($('desktopSetupModal').hidden,true);
  assert.equal($('articleStorageBtn').hidden,true);
  assert.equal(w.QuireChatGPT,undefined);
  assert.deepEqual(errors,[]);
});

test('Windows first-open guide advances after sign-in and stays finished on the next launch',async t=>{
  const {dom,w,$,errors}=await fixture();t.after(()=>dom.window.close());
  assert.equal($('desktopSetupModal').hidden,false);
  assert.equal($('desktopSetupStepLabel').textContent,'Step 1 of 3');
  $('desktopSetupConnect').click();
  await settle(()=>$('desktopSetupStepLabel').textContent==='Step 2 of 3');
  $('desktopSetupChooseFolder').click();
  await settle(()=>$('desktopSetupCopyInfo').textContent.includes('E:\\Quire-article-library'));
  $('desktopSetupExisting').click();assert.equal($('desktopSetupStepLabel').textContent,'Step 3 of 3');
  $('desktopSetupFinish').click();assert.equal($('desktopSetupModal').hidden,true);
  const next=await fixture(true,{storedState:w.QuireStore.getState(),setupComplete:true,empty:true});
  t.after(()=>next.dom.window.close());
  assert.equal(next.$('desktopSetupModal').hidden,true);
  next.$('chatgptSetupGuide').click();assert.equal(next.$('desktopSetupModal').hidden,false);
  assert.deepEqual(errors,[]);assert.deepEqual(next.errors,[]);
});

test('guided project setup returns to the Windows guide without duplicating the starter project',async t=>{
  const {dom,w,$,errors}=await fixture(true,{empty:true});t.after(()=>dom.window.close());
  $('desktopSetupLater').click();$('desktopSetupNew').click();
  assert.equal($('guidedLaunchModal').hidden,false);assert.equal($('desktopSetupModal').hidden,true);
  $('cancelGuidedLaunch').click();
  await settle(()=>!$('desktopSetupModal').hidden);
  assert.equal($('desktopSetupStepLabel').textContent,'Step 2 of 3');
  $('desktopSetupNew').click();$('launchNextBtn').click();$('launchTitle').value='My guided thesis';
  for(let i=0;i<4;i++)$('launchNextBtn').click();
  $('finishLaunchBtn').click();
  await settle(()=>$('desktopSetupStepLabel').textContent==='Step 3 of 3');
  assert.equal($('desktopSetupModal').hidden,false);
  assert.equal(w.QuireStore.getActiveProject().title,'My guided thesis');
  assert.equal(w.QuireStore.getState().projects.length,1);
  assert.deepEqual(errors,[]);
});

test('sign-in errors and a cancelled or invalid backup do not advance or replace research',async t=>{
  const {dom,w,$,errors}=await fixture();t.after(()=>dom.window.close());
  w.__signInError=true;$('desktopSetupConnect').click();
  await settle(()=>$('desktopSetupMessage').textContent==='Synthetic sign-in error');
  assert.equal($('desktopSetupStepLabel').textContent,'Step 1 of 3');
  $('desktopSetupLater').click();w.confirm=()=>false;
  const before=JSON.stringify(w.QuireStore.getState());
  const input=$('desktopSetupBackupFile');
  Object.defineProperty(input,'files',{configurable:true,value:[new w.File([before],'backup.json')]});
  input.dispatchEvent(new w.Event('change'));
  await settle(()=>$('desktopSetupMessage').textContent.includes('cancelled'));
  assert.equal(JSON.stringify(w.QuireStore.getState()),before);
  Object.defineProperty(input,'files',{configurable:true,value:[new w.File(['{invalid'],'bad.json')]});
  input.dispatchEvent(new w.Event('change'));
  await settle(()=>$('desktopSetupMessage').textContent.includes('not valid JSON'));
  assert.equal($('desktopSetupStepLabel').textContent,'Step 2 of 3');
  assert.equal(JSON.stringify(w.QuireStore.getState()),before);
  assert.deepEqual(errors,[]);
});

test('the guide restores a workspace backup and finishes with the imported research',async t=>{
  const {dom,w,$,errors}=await fixture();t.after(()=>dom.window.close());
  $('desktopSetupLater').click();
  const state=w.QuireStore.getState();state.projects[0].title='Imported research';
  const input=$('desktopSetupBackupFile');
  Object.defineProperty(input,'files',{value:[new w.File([JSON.stringify({format:'quire-workspace-backup',state})],'backup.json')]});
  input.dispatchEvent(new w.Event('change'));
  await settle(()=>$('desktopSetupStepLabel').textContent==='Step 3 of 3');
  assert.equal($('desktopSetupReadyProject').textContent,'Imported research');
  assert.ok($('desktopSetupMessage').textContent.includes('Attach your PDFs'));
  assert.deepEqual(errors,[]);
});

test('the PDF adapter uses native files and migrates old desktop PDFs without deleting the cache',async t=>{
  const {dom,w,pdfs,errors}=await fixture(true,{empty:true});t.after(()=>dom.window.close());
  const content='%PDF-1.7\nSynthetic article\n%%EOF';
  const bridge=w.QuireDesktop;w.QuireDesktop=undefined;
  await w.QuirePdfStore.save('legacy_article',new w.File([content],'Legacy.pdf',{type:'application/pdf'}));
  w.QuireDesktop=bridge;await w.QuirePdfStore.migrateLegacy();
  assert.ok(pdfs.has('legacy_article'));
  assert.equal(await (await w.QuirePdfStore.get('legacy_article')).blob.text(),content);
  await w.QuirePdfStore.save('native_article',new w.File([content],'Native.pdf',{type:'application/pdf'}));
  assert.ok(pdfs.has('native_article'));assert.equal(await w.QuirePdfStore.has('native_article'),true);
  w.QuireDesktop=undefined;assert.ok((await w.QuirePdfStore.get('legacy_article')).blob);w.QuireDesktop=bridge;
  assert.deepEqual(errors,[]);
});
