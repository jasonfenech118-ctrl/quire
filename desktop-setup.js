/* The Windows app owns first-open setup; browser onboarding stays unchanged. */
(function(){
  const bridge=window.QuireDesktop;
  if(!bridge)return;
  const completedKey='quire:desktop-setup-complete:v1';
  const $=id=>document.getElementById(id);
  let step=1;
  let state={session:{status:'disconnected',sharing:false},models:[],accountBusy:false};
  let connecting=false;
  let importing=false;
  let waitingForProject=false;
  const ready=()=>Boolean(state.session.sharing&&state.models.length);
  function complete(){try{return localStorage.getItem(completedKey)==='1';}catch(_){return false;}}
  function project(){return window.QuireStore?.getActiveProject?.();}
  function hasResearch(){const current=project();return Boolean(current&&!window.QuireStore.isStarterProject?.(current.id));}
  function message(text){$('desktopSetupMessage').textContent=text||'';}
  function render(){
    document.querySelectorAll('[data-desktop-setup-step]').forEach(panel=>panel.hidden=Number(panel.dataset.desktopSetupStep)!==step);
    document.querySelectorAll('[data-desktop-setup-dot]').forEach(dot=>{
      const current=Number(dot.dataset.desktopSetupDot)===step;
      if(current)dot.setAttribute('aria-current','step');else dot.removeAttribute('aria-current');
    });
    $('desktopSetupStepLabel').textContent='Step '+step+' of 3';
    $('desktopSetupBack').hidden=step===1;
    $('desktopSetupConnect').disabled=connecting||Boolean(state.accountBusy);
    $('desktopSetupLater').disabled=connecting||Boolean(state.accountBusy);
    $('desktopSetupBack').disabled=connecting||importing||Boolean(state.accountBusy);
    $('desktopSetupCancelSignIn').hidden=!connecting&&!state.accountBusy;
    $('desktopSetupConnect').textContent=state.session.status==='connected'&&!state.session.sharing?'Allow ChatGPT plan usage':'Sign in with ChatGPT';
    $('desktopSetupConnection').textContent=ready()?'ChatGPT connected':connecting||state.accountBusy?'Finish signing in in your browser…':state.notice||state.session.error?.message||'Your browser will open for sign-in. Return here if Quire does not come to the front.';
    $('desktopSetupExisting').hidden=!hasResearch();
    $('desktopSetupProject').textContent=hasResearch()?'Current project: '+project().title:'Start a new project or bring your saved Quire research here.';
    $('desktopSetupImport').disabled=importing;
    $('desktopSetupNew').disabled=importing;
    $('desktopSetupExisting').disabled=importing;
    $('desktopSetupReadyProject').textContent=project()?.title||'Your research workspace';
    $('desktopSetupReadyConnection').textContent=ready()?'ChatGPT is connected. Choose an AI action or ask a question; Quire sends the request and saves the completed reply.':'Your workspace is ready. You can connect ChatGPT later from ChatGPT assistant → Connection & model.';
    $('desktopSetupAsk').hidden=!ready();
  }
  function showStep(next){
    step=Math.max(1,Math.min(3,next));message('');render();
    $('desktopSetupHeading'+step).focus();
  }
  function open(){
    waitingForProject=false;
    $('chatgptAssistantModal').hidden=true;
    $('aiSettingsModal').hidden=true;
    $('desktopSetupModal').hidden=false;
    showStep(ready()?2:1);
  }
  async function signIn(){
    if(connecting||state.accountBusy)return;
    connecting=true;message('');render();
    try{
      update(await bridge.signIn({reconsent:state.session.status==='connected'&&!state.session.sharing}));
      if(!ready())message(state.notice||'Sign-in has finished, but no model is available yet. Allow plan usage, reconnect, or continue without AI for now.');
    }catch(error){message(error.message||'Sign-in did not finish. Try again or continue without AI.');}
    finally{connecting=false;render();}
  }
  function update(next){
    state=next;render();
    if(!$('desktopSetupModal').hidden&&step===1&&ready())showStep(2);
  }
  function startProject(){
    if(!window.QuireGuidedLaunch?.open){message('Project setup is unavailable. Close Quire and try opening it again.');return;}
    waitingForProject=true;
    $('desktopSetupModal').hidden=true;
    window.QuireGuidedLaunch.open();
  }
  async function restore(file){
    if(!file||importing)return;
    importing=true;message('Checking your backup…');render();
    try{
      if(!window.QuirePolish?.restoreBackup)throw new Error('Backup import is unavailable. Close Quire and try opening it again.');
      const restored=await window.QuirePolish.restoreBackup(file);
      if(restored){showStep(3);message('Research imported. Attach your PDFs again; they are not included in a Quire backup.');}
      else message('Import cancelled. Your current workspace was kept.');
    }catch(error){message(error.message||'The backup could not be imported. Your current workspace was kept.');}
    finally{importing=false;$('desktopSetupBackupFile').value='';render();}
  }
  function finish(ask=false){
    try{localStorage.setItem(completedKey,'1');}catch(_){}
    $('desktopSetupModal').hidden=true;
    window.showView?.('dashboard');
    if(ask)window.QuireChatGPT?.openAssistant?.();
    else $('chatgptSupportBtn').focus();
  }
  function bind(){
    $('chatgptSetupGuide').addEventListener('click',open);
    $('desktopSetupConnect').addEventListener('click',()=>void signIn());
    $('desktopSetupCancelSignIn').addEventListener('click',()=>{void bridge.cancelSignIn().catch(error=>message(error.message));});
    $('desktopSetupLater').addEventListener('click',()=>showStep(2));
    $('desktopSetupBack').addEventListener('click',()=>showStep(step-1));
    $('desktopSetupExisting').addEventListener('click',()=>showStep(3));
    $('desktopSetupNew').addEventListener('click',startProject);
    $('desktopSetupImport').addEventListener('click',()=>{$('desktopSetupBackupFile').click();});
    $('desktopSetupBackupFile').addEventListener('change',e=>void restore(e.target.files?.[0]));
    $('desktopSetupFinish').addEventListener('click',()=>finish());
    $('desktopSetupAsk').addEventListener('click',()=>finish(true));
    $('desktopSetupClose').addEventListener('click',()=>{$('desktopSetupModal').hidden=true;});
    window.addEventListener('quire:project-launched',()=>{
      if(!waitingForProject)return;
      waitingForProject=false;$('desktopSetupModal').hidden=false;showStep(3);
    });
    const guided=$('guidedLaunchModal');
    new MutationObserver(()=>{
      if(waitingForProject&&guided.hidden){waitingForProject=false;$('desktopSetupModal').hidden=false;showStep(2);}
    }).observe(guided,{attributes:true,attributeFilter:['hidden']});
    window.addEventListener('quire:project-switched',render);
    bridge.onState(update);
    bridge.getState().then(next=>{update(next);if(!complete())open();}).catch(error=>{if(!complete())open();message(error.message);});
  }
  window.QuireDesktopSetup={open};
  document.addEventListener('DOMContentLoaded',bind);
})();
