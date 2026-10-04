/* Quire Windows: direct ChatGPT plan requests; no credentials in the renderer. */
(function(){
  const bridge=window.QuireDesktop;
  if(!bridge)return;
  let state={session:{status:'disconnected',sharing:false},profiles:[],models:[],selectedModel:''};
  let detail={};
  let activeId=null;
  let draft='';
  let lastSelection='';
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const ready=()=>state.session.sharing&&state.models.length>0;
  function announce(message){if($('chatgptAssistantStatus'))$('chatgptAssistantStatus').textContent=message;}
  function statusLabel(){return state.session.sharing?'Using ChatGPT plan':state.session.status==='connecting'?'Waiting for sign-in…':'Connect ChatGPT';}
  function renderState(next){
    state=next;
    $('chatgptPlanStatus').textContent=statusLabel();
    $('chatgptConnectionState').textContent=state.session.identity?.email||state.session.profileLabel||'Connect the ChatGPT account you already use.';
    $('chatgptConnectionMessage').textContent=state.notice||state.session.error?.message||(state.session.sharing?'Quire will use your ChatGPT plan for eligible AI requests.':state.session.status==='connected'?'Signed in. Allow ChatGPT plan usage to enable the assistant.':'Sign in in your browser, then return to Quire.');
    $('chatgptSignIn').textContent=state.session.status==='connected'&&!state.session.sharing?'Enable ChatGPT plan usage':'Continue with ChatGPT';
    $('chatgptSignIn').disabled=Boolean(state.accountBusy);
    $('chatgptCancelSignIn').hidden=!state.accountBusy;
    $('chatgptDisconnect').hidden=state.session.status==='disconnected';
    $('chatgptDisconnect').disabled=Boolean(state.accountBusy);
    $('chatgptAddAccount').disabled=Boolean(state.accountBusy);
    const profiles=$('chatgptProfiles');
    profiles.innerHTML=state.profiles.map(p=>'<option value="'+esc(p.id)+'">'+esc((p.identity?.email||p.label)+' · '+p.label)+'</option>').join('');
    profiles.value=state.session.profileId||'';
    profiles.disabled=Boolean(state.accountBusy);
    $('chatgptProfilesField').hidden=!state.profiles.length;
    const models=$('chatgptModels');
    models.innerHTML=state.models.map(m=>'<option value="'+esc(m.slug)+'">'+esc(m.displayName)+'</option>').join('');
    models.value=state.selectedModel||'';
    $('chatgptModelsField').hidden=!state.models.length;
    models.disabled=Boolean(activeId||state.accountBusy);
    $('chatgptAsk').disabled=Boolean(activeId)||!ready();
    const label=$('copilotStatusLabel');
    if(label&&!$('copilotStatus')?.classList.contains('working'))label.textContent=statusLabel();
  }
  async function accountAction(fn){
    try{renderState(await fn());}
    catch(error){$('chatgptConnectionMessage').textContent=error.message;}
  }
  function openSettings(){ $('chatgptAssistantModal').hidden=true; $('aiSettingsModal').hidden=false; }
  function currentDetail(){
    const sectionId=window.QuireChapterEditor?.getActive?.().sectionId;
    const section=(window.QuireStore?.getState?.().sections||[]).find(s=>s.id===sectionId);
    return {selectedText:lastSelection||window.QuireWritingCompanion?.currentParagraph?.()||'',sectionId,sectionTitle:section?.title||''};
  }
  function thread(){return window.QuireStore.getOrCreateProjectThread('chatgpt-support');}
  function renderHistory(){
    let messages=[];
    try{messages=window.QuireStore.listAiMessages(thread().id).slice(-20);}catch(_){}
    const box=$('chatgptConversation');
    box.innerHTML=messages.length?messages.map(m=>'<article class="chatgpt-message '+(m.role==='user'?'user':'assistant')+'"><strong>'+esc(m.role==='user'?'You':'Quire · ChatGPT')+'</strong><p>'+esc(m.content)+'</p></article>').join(''):'<div class="chatgpt-empty">Ask about your research area, objectives, saved evidence or current writing. Completed answers are saved with this project.</div>';
    box.scrollTop=box.scrollHeight;
  }
  function openAssistant(nextDetail){
    detail=nextDetail||currentDetail();
    $('chatgptAssistantModal').hidden=false;
    $('chatgptAssistantContext').textContent=detail.selectedText?'Current project and selected text':'Current project';
    renderHistory();
    announce(ready()?'Ready · '+statusLabel():'Connect ChatGPT to start.');
    $('chatgptQuestion').focus();
  }
  function showDraft(){
    let box=$('chatgptDraft');
    if(!box){box=document.createElement('article');box.id='chatgptDraft';box.className='chatgpt-message assistant';$('chatgptConversation').appendChild(box);}
    box.textContent=draft||'ChatGPT is preparing your answer…';
    $('chatgptConversation').scrollTop=$('chatgptConversation').scrollHeight;
  }
  async function ask(){
    const question=$('chatgptQuestion').value.trim();
    if(!question||activeId)return;
    if(!ready()){openSettings();return;}
    const source=window.QuireStore.getProjectBundle();
    if(!source){announce('Create or open a research project first.');return;}
    const currentThread=thread();
    const history=window.QuireStore.listAiMessages(currentThread.id).slice(-10).map(m=>({role:m.role,content:m.content.slice(0,12000)}));
    const context=window.QuireChatGPTContext.build(source,window.QuireStore.getStudySetupData(),detail,$('chatgptIncludeNotes').checked);
    const id=crypto.randomUUID(); activeId=id; draft='';
    $('chatgptAsk').disabled=true; $('chatgptStop').hidden=false;
    $('chatgptQuestion').value='';
    window.QuireStore.addAiMessage(currentThread.id,'user',question,[]);
    renderHistory();showDraft();announce('Asking ChatGPT…');
    try{
      const result=await bridge.request(id,{kind:'assistant',question,context:JSON.stringify(context),history});
      if(activeId!==id)return;
      window.QuireStore.addAiMessage(currentThread.id,'assistant',result.text,[]);
      renderHistory();announce('Answer saved · Using ChatGPT plan');
    }catch(error){
      if(activeId===id){renderHistory();announce(error.code==='cancelled'?'Stopped. The unfinished answer was not saved.':error.message);}
    }finally{
      if(activeId===id){activeId=null;draft='';$('chatgptStop').hidden=true;$('chatgptAsk').disabled=!ready();$('chatgptModels').disabled=false;}
    }
  }
  async function grounded(articleRequest){
    if(!ready()){openSettings();throw new Error('Connect your ChatGPT account and choose an available model first.');}
    return bridge.request(crypto.randomUUID(),{kind:'grounded',articleRequest});
  }
  function reviewWriting(next={}){
    openAssistant({...next,selectedText:next.selectedText||next.paragraph||currentDetail().selectedText});
    $('chatgptQuestion').value=next.prompt||'Review this paragraph and suggest improvements that preserve my meaning.';
    if(ready())void ask();
    else announce('Connect ChatGPT, then press Ask to review this text.');
  }
  function bind(){
    $('chatgptSupportBtn').hidden=false;
    $('chatgptDesktopConnection').hidden=false;
    $('aiEndpointSection').hidden=true;
    $('aiLocalModeCard').hidden=true;
    $('chatgptSupportBtn').addEventListener('click',()=>openAssistant());
    $('chatgptSignIn').addEventListener('click',()=>accountAction(()=>bridge.signIn({reconsent:state.session.status==='connected'&&!state.session.sharing})));
    $('chatgptAddAccount').addEventListener('click',()=>accountAction(()=>bridge.signIn({newProfile:true})));
    $('chatgptCancelSignIn').addEventListener('click',()=>bridge.cancelSignIn());
    $('chatgptDisconnect').addEventListener('click',()=>accountAction(()=>bridge.disconnect()));
    $('chatgptProfiles').addEventListener('change',e=>accountAction(()=>bridge.selectProfile(e.target.value)));
    $('chatgptModels').addEventListener('change',e=>accountAction(()=>bridge.setModel(e.target.value)));
    $('chatgptManageUsage').addEventListener('click',()=>bridge.manageUsage());
    $('chatgptAssistantSettings').addEventListener('click',openSettings);
    $('closeChatgptAssistant').addEventListener('click',()=>{$('chatgptAssistantModal').hidden=true;});
    $('chatgptAssistantModal').addEventListener('click',e=>{if(e.target===$('chatgptAssistantModal'))$('chatgptAssistantModal').hidden=true;});
    $('chatgptAskForm').addEventListener('submit',e=>{e.preventDefault();void ask();});
    $('chatgptStop').addEventListener('click',()=>{if(activeId)void bridge.cancelRequest(activeId);});
    document.addEventListener('selectionchange',()=>{
      const selection=window.getSelection();
      const selected=selection?.toString().trim();
      const node=selection?.anchorNode?.nodeType===3?selection.anchorNode.parentElement:selection?.anchorNode;
      if(selected&&node?.closest?.('#liveSectionEditor,#pdfTextLayer'))lastSelection=selected.slice(0,18000);
    });
    bridge.onState(renderState);
    bridge.onDelta(({id,delta})=>{if(activeId===id){draft+=delta;showDraft();}});
    bridge.getState().then(renderState).catch(error=>announce(error.message));
    window.addEventListener('quire:project-switched',()=>{
      if(activeId)void bridge.cancelRequest(activeId);
      activeId=null;draft='';detail={};lastSelection='';
      $('chatgptStop').hidden=true;$('chatgptAsk').disabled=!ready();
      if(!$('chatgptAssistantModal').hidden)renderHistory();
    });
  }
  window.QuireChatGPT={available:true,grounded,reviewWriting,openAssistant,statusLabel};
  document.addEventListener('DOMContentLoaded',bind);
})();
