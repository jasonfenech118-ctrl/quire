/* Quire AI Assistant — ChatGPT, Claude, Gemini and Copilot through the quire-ai Supabase function */
(function(){
  const PROVIDER_KEY='quire:ai-provider';
  const PROVIDER_LABELS={openai:'ChatGPT',anthropic:'Claude',gemini:'Gemini',azure:'Copilot'};
  const COMPARE='compare';
  let providersCache=null;
  let busy=false;
  // When opened from guided setup, saved suggestions fill the wizard fields instead of the project.
  let wizardTarget=null;

  function el(id){return document.getElementById(id);}
  function escapeHtml(v){return String(v??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[s]));}

  /* ---------- Connection ---------- */
  function functionUrl(){
    const c=window.QuireCloud?.getConfig?.()||{};
    return c.url?String(c.url).replace(/\/+$/,'')+'/functions/v1/quire-ai':'';
  }
  function connected(){return Boolean(functionUrl()&&window.QuireCloud?.getUser?.());}

  async function call(body){
    const url=functionUrl();
    if(!url)throw new Error('Connect Quire to Supabase first (Account & cloud).');
    const client=window.QuireCloud?.getClient?.();
    const session=client?(await client.auth.getSession()).data?.session:null;
    if(!session?.access_token)throw new Error('Sign in under Account & cloud to use the AI assistant.');
    const anonKey=window.QuireCloud.getConfig().anonKey||'';
    let res;
    try{
      res=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.access_token,apikey:anonKey},body:JSON.stringify(body)});
    }catch(e){throw new Error('Could not reach the quire-ai function. Has it been deployed? (See the AI setup guide.)');}
    let data={};
    try{data=await res.json();}catch(e){}
    if(res.status===404)throw new Error('The quire-ai function is not deployed in your Supabase project yet.');
    if(!res.ok)throw new Error(data.error||('AI request failed ('+res.status+').'));
    return data;
  }

  async function providers(force){
    if(providersCache&&!force)return providersCache;
    const data=await call({task:'providers'});
    providersCache=(data.providers||[]).map(p=>({...p,short:PROVIDER_LABELS[p.id]||p.label}));
    return providersCache;
  }
  async function configuredProviders(){return (await providers()).filter(p=>p.configured);}

  function preferredProvider(){try{return localStorage.getItem(PROVIDER_KEY)||'';}catch(e){return '';}}
  function setPreferredProvider(id){try{localStorage.setItem(PROVIDER_KEY,id);}catch(e){}}

  async function chat(provider,system,messages){
    return call({task:'chat',provider,system,messages});
  }
  async function article(payload,provider){
    const available=await configuredProviders();
    const chosen=available.find(p=>p.id===(provider||preferredProvider()))||available[0];
    if(!chosen)throw new Error('No AI provider is set up yet.');
    return call({task:'article',provider:chosen.id,payload});
  }

  /* ---------- Project context ---------- */
  function projectContext(){
    const store=window.QuireStore;
    const project=store?.getActiveProject?.()||{};
    const setup=store?.getStudySetupData?.()||{};
    const kind=project.projectType||'thesis';
    const lines=[
      'Document type: '+({thesis:'thesis / dissertation',paper:'research paper',assignment:'assignment'}[kind]||kind),
      'Working title: '+(project.title||'not set'),
      'Research question: '+(project.researchQuestion||'not set yet')
    ];
    const state=store?.getState?.()||{};
    const pid=store?.getActiveProjectId?.();
    const details=(state.studySetups||[]).find(s=>s.projectId===pid)?.designDetails||{};
    if(details.researchProblem)lines.push('First idea: '+details.researchProblem);
    if(details.researchAim)lines.push('Working aim: '+details.researchAim);
    if(setup.studyType)lines.push('Study design: '+setup.studyType);
    if(setup.population)lines.push('Population: '+setup.population);
    if(setup.studySetting)lines.push('Setting: '+setup.studySetting);
    const objectives=(store?.listObjectives?.()||[]).map(o=>o.title);
    if(objectives.length)lines.push('Objectives: '+objectives.join('; '));
    const ideas=(store?.listAnalysisItems?.({kind:'idea'})||[]).slice(0,8).map(i=>i.title);
    if(ideas.length)lines.push('Saved ideas: '+ideas.join(' | '));
    const articles=(state.articles||[]).filter(a=>a.projectId===pid);
    if(articles.length)lines.push('Papers in library: '+articles.slice(0,15).map(a=>a.title+(a.year?' ('+a.year+')':'')).join('; '));
    if(kind==='paper'){const p=project.paperDetails||{};lines.push('Article type: '+(p.articleType||'')+(p.targetJournal?'; target journal: '+p.targetJournal:''));}
    if(kind==='assignment'){const a=project.assignmentDetails||{};lines.push('Assignment type: '+(a.assignmentType||'')+(a.moduleName?'; module: '+a.moduleName:'')+(a.brief?'; brief: '+a.brief:'')+(a.markingCriteria?'; marking criteria: '+a.markingCriteria.replace(/\n/g,'; '):''));}
    if(wizardTarget){
      const draft=wizardTarget.read();
      lines.push('(The researcher is still in guided setup. Draft so far — title: '+(draft.title||'not set')+'; idea: '+(draft.idea||'not set')+'; question: '+(draft.question||'not set')+')');
    }
    return lines.join('\n');
  }

  function systemPrompt(){
    return [
      'You are Quire Assistant, a supportive academic research mentor inside Quire, a workspace for theses, research papers and assignments.',
      'Help the researcher develop their own thinking: ask one or two focused questions at a time, suggest options rather than decide for them, and keep their voice.',
      'When helping shape an idea, work towards: a clear topic, a researchable question (for example using PICO/PEO/SPIDER where it fits), an aim, and 2–4 objectives.',
      'Never invent references, statistics or findings. If evidence is needed, say what to search for instead of citing papers you have not been given.',
      'Treat research gaps as possibilities to test in the literature, not as confirmed facts.',
      'Use short paragraphs and bullet points. Use British English academic style.',
      '',
      'Current project:',
      projectContext()
    ].join('\n');
  }

  /* ---------- Conversation storage ---------- */
  function thread(){return window.QuireStore.getOrCreateProjectThread('assistant');}
  function history(){return window.QuireStore.listAiMessages(thread().id);}
  function providerOf(msg){return (msg.sourceRefs||[]).find(r=>r&&r.provider)?.provider||'';}

  function messagesFor(provider){
    // Each AI sees the user's messages plus its own earlier answers.
    return history().filter(m=>m.role==='user'||(m.role==='assistant'&&(!provider||providerOf(m)===provider)))
      .map(m=>({role:m.role,content:m.content}));
  }

  /* ---------- Rendering ---------- */
  function renderText(text){
    const lines=String(text||'').split(/\n/);
    let html='',list=false;
    lines.forEach(line=>{
      const bullet=line.match(/^\s*(?:[-*•]|\d+[.)])\s+(.*)$/);
      const fmt=s=>escapeHtml(s).replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/(^|\W)\*(?!\s)(.+?)\*(?=\W|$)/g,'$1<em>$2</em>').replace(/^#{1,4}\s*(.*)$/,'<strong>$1</strong>');
      if(bullet){if(!list){html+='<ul>';list=true;}html+='<li>'+fmt(bullet[1])+'</li>';return;}
      if(list){html+='</ul>';list=false;}
      if(line.trim())html+='<p>'+fmt(line)+'</p>';
    });
    if(list)html+='</ul>';
    return html;
  }

  const SAVE_ACTIONS=[
    {key:'idea',label:'Save as idea'},
    {key:'question',label:'Use as research question'},
    {key:'aim',label:'Use as aim'},
    {key:'objective',label:'Add as objective'}
  ];

  function renderMessages(){
    const mount=el('assistantMessages');
    if(!mount)return;
    const rows=history();
    if(!rows.length){
      mount.innerHTML='<div class="assistant-empty"><strong>Start with your idea in your own words.</strong><p>For example: “I want to study the behaviour of patients adapting to a stoma.” The assistant will ask questions and help you shape a research question, aim and objectives. Nothing is saved to your project unless you choose it.</p></div>';
      return;
    }
    mount.innerHTML=rows.map(m=>{
      if(m.role==='user')return '<div class="assistant-msg user"><div class="assistant-bubble">'+renderText(m.content)+'</div></div>';
      const provider=providerOf(m);
      return '<div class="assistant-msg ai" data-message-id="'+escapeHtml(m.id)+'">'+
        '<span class="assistant-who">'+escapeHtml(PROVIDER_LABELS[provider]||'AI')+'</span>'+
        '<div class="assistant-bubble">'+renderText(m.content)+'</div>'+
        '<div class="assistant-actions">'+SAVE_ACTIONS.map(a=>'<button type="button" data-assistant-save="'+a.key+'">'+a.label+'</button>').join('')+'</div>'+
        '<div class="assistant-save-box" hidden></div>'+
      '</div>';
    }).join('');
    mount.querySelectorAll('[data-assistant-save]').forEach(btn=>btn.addEventListener('click',()=>openSaveBox(btn)));
    mount.scrollTop=mount.scrollHeight;
  }

  function openSaveBox(btn){
    const wrap=btn.closest('.assistant-msg');
    const msg=history().find(m=>m.id===wrap.dataset.messageId);
    const box=wrap.querySelector('.assistant-save-box');
    const action=SAVE_ACTIONS.find(a=>a.key===btn.dataset.assistantSave);
    const selected=String(window.getSelection?.()||'').trim();
    box.hidden=false;
    box.innerHTML='<label><span>'+escapeHtml(action.label)+' — edit before saving</span><textarea rows="3"></textarea></label>'+
      '<div><button type="button" class="soft-btn" data-cancel>Cancel</button><button type="button" class="primary-btn" data-confirm>Save</button></div>';
    const area=box.querySelector('textarea');
    area.value=selected&&String(msg?.content||'').includes(selected)?selected:String(msg?.content||'').replace(/\*\*/g,'').trim();
    area.focus();
    box.querySelector('[data-cancel]').addEventListener('click',()=>{box.hidden=true;box.innerHTML='';});
    box.querySelector('[data-confirm]').addEventListener('click',()=>{
      const text=area.value.trim();
      if(!text)return;
      saveSuggestion(action.key,text,providerOf(msg));
      box.hidden=true;box.innerHTML='';
    });
  }

  function saveSuggestion(kind,text,provider){
    if(wizardTarget){
      wizardTarget.write(kind,text);
      setStatus('Added to guided setup.');
      return;
    }
    const store=window.QuireStore;
    const pid=store.getActiveProjectId();
    if(kind==='idea'){
      store.addAnalysisItem({kind:'idea',title:text,payload:{ideaStatus:'inbox',origin:'researcher',sourceLabel:'AI assistant · '+(PROVIDER_LABELS[provider]||'AI')}});
    }else if(kind==='question'){
      store.updateProject(pid,{researchQuestion:text});
    }else if(kind==='aim'){
      store.setResearchAim(text,pid);
    }else if(kind==='objective'){
      store.addObjective({title:text},pid);
    }
    window.dispatchEvent(new CustomEvent('quire:project-switched',{detail:{projectId:pid}}));
    setStatus({idea:'Saved to Ideas.',question:'Research question updated.',aim:'Aim saved.',objective:'Objective added.'}[kind]);
  }

  function setStatus(text,isError){const node=el('assistantStatus');if(node){node.textContent=text||'';node.classList.toggle('error',Boolean(isError));}}

  /* ---------- Sending ---------- */
  async function send(){
    if(busy)return;
    const input=el('assistantInput');
    const text=input.value.trim();
    if(!text)return;
    const choice=el('assistantProvider').value;
    const available=await configuredProviders().catch(err=>{setStatus(err.message,true);return [];});
    if(!available.length)return;
    const targets=choice===COMPARE?available:available.filter(p=>p.id===choice);
    if(!targets.length){setStatus('Choose an AI first.');return;}

    busy=true;input.value='';
    window.QuireStore.addAiMessage(thread().id,'user',text);
    renderMessages();
    setStatus((targets.length>1?'Asking '+targets.map(t=>t.short).join(', '):'Thinking with '+targets[0].short)+'…');
    el('assistantSend').disabled=true;
    const system=systemPrompt();
    const results=await Promise.all(targets.map(t=>chat(t.id,system,messagesFor(choice===COMPARE?t.id:null))
      .then(r=>({ok:true,provider:t.id,model:r.model,text:r.text}))
      .catch(err=>({ok:false,provider:t.id,error:err.message}))));
    const errors=[];
    results.forEach(r=>{
      if(r.ok&&r.text.trim())window.QuireStore.addAiMessage(thread().id,'assistant',r.text,[{provider:r.provider,model:r.model}]);
      else errors.push((PROVIDER_LABELS[r.provider]||r.provider)+': '+(r.error||'empty reply'));
    });
    busy=false;el('assistantSend').disabled=false;
    renderMessages();
    setStatus(errors.join(' · '),errors.length>0);
  }

  /* ---------- Modal ---------- */
  async function refreshProviders(){
    const select=el('assistantProvider');
    const setupBox=el('assistantSetup');
    if(!select)return;
    if(!connected()){
      setupBox.hidden=false;
      setupBox.innerHTML=setupHelp('Quire is not signed in to Supabase yet.');
      select.innerHTML='';
      return;
    }
    try{
      const available=await configuredProviders();
      if(!available.length){setupBox.hidden=false;setupBox.innerHTML=setupHelp('No AI keys have been added to Supabase yet.');select.innerHTML='';return;}
      setupBox.hidden=true;
      select.innerHTML=available.map(p=>'<option value="'+p.id+'">'+escapeHtml(p.short)+'</option>').join('')+
        (available.length>1?'<option value="'+COMPARE+'">Compare all ('+available.length+')</option>':'');
      const pref=preferredProvider();
      if([...select.options].some(o=>o.value===pref))select.value=pref;
    }catch(err){
      setupBox.hidden=false;setupBox.innerHTML=setupHelp(err.message);select.innerHTML='';
    }
  }

  function setupHelp(reason){
    return '<strong>AI is not connected yet.</strong><p>'+escapeHtml(reason)+'</p>'+
      '<ol><li>Connect Quire to Supabase and sign in (<em>Account &amp; cloud</em>).</li>'+
      '<li>Deploy the <code>quire-ai</code> function to Supabase.</li>'+
      '<li>Add at least one AI key (ChatGPT, Claude, Gemini or Copilot) as a Supabase secret.</li></ol>'+
      '<p><a href="https://github.com/jasonfenech118-ctrl/quire/blob/main/docs/ai-assistant.md" target="_blank" rel="noopener">Open the step-by-step setup guide</a></p>';
  }

  function open(options={}){
    wizardTarget=options.wizard||null;
    const modal=el('assistantModal');
    if(!modal)return;
    const settings=el('aiSettingsModal');if(settings)settings.hidden=true;
    modal.hidden=false;
    el('assistantContextLabel').textContent=wizardTarget?'Guided setup — suggestions you save go into the setup form':'Project: '+(window.QuireStore.getActiveProject()?.title||'Untitled');
    renderMessages();
    setStatus('');
    refreshProviders();
    if(options.prompt){el('assistantInput').value=options.prompt;}
    setTimeout(()=>el('assistantInput')?.focus(),0);
  }
  function close(){const modal=el('assistantModal');if(modal)modal.hidden=true;wizardTarget=null;}

  function clearConversation(){
    if(!confirm('Clear this assistant conversation? Saved ideas, questions and objectives stay in your project.'))return;
    window.QuireStore.clearAiThread(thread().id);
    renderMessages();
  }

  /* ---------- AI settings panel ---------- */
  async function renderSettings(force){
    const mount=el('aiProviderStatus'),select=el('aiDefaultProvider');
    if(!mount)return;
    if(!connected()){
      mount.innerHTML='<p class="ai-provider-off">Not connected — sign in under <em>Account &amp; cloud</em> first.</p>';
      if(select)select.innerHTML='';
      return;
    }
    mount.innerHTML='<p>Checking…</p>';
    try{
      const list=await providers(force);
      mount.innerHTML=list.map(p=>'<div class="ai-provider-row '+(p.configured?'on':'off')+'"><strong>'+escapeHtml(p.short)+'</strong><span>'+(p.configured?'Ready · '+escapeHtml(p.model||''):'No key added')+'</span></div>').join('');
      const ready=list.filter(p=>p.configured);
      if(select){
        select.innerHTML=ready.map(p=>'<option value="'+p.id+'">'+escapeHtml(p.short)+'</option>').join('')||'<option value="">No AI ready yet</option>';
        if(ready.some(p=>p.id===preferredProvider()))select.value=preferredProvider();
      }
    }catch(err){mount.innerHTML='<p class="ai-provider-off">'+escapeHtml(err.message)+'</p>';}
  }

  function bind(){
    el('aiCheckProviders')?.addEventListener('click',()=>renderSettings(true));
    el('aiDefaultProvider')?.addEventListener('change',e=>{if(e.target.value)setPreferredProvider(e.target.value);});
    el('assistantClose')?.addEventListener('click',close);
    el('assistantModal')?.addEventListener('click',e=>{if(e.target.id==='assistantModal')close();});
    el('assistantSend')?.addEventListener('click',send);
    el('assistantInput')?.addEventListener('keydown',e=>{if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)){e.preventDefault();send();}});
    el('assistantProvider')?.addEventListener('change',e=>setPreferredProvider(e.target.value));
    el('assistantClear')?.addEventListener('click',clearConversation);
    el('assistantRefresh')?.addEventListener('click',()=>{providersCache=null;refreshProviders();});
    document.querySelectorAll('[data-open-assistant]').forEach(btn=>btn.addEventListener('click',()=>open()));
    window.addEventListener('quire:project-switched',()=>{if(!el('assistantModal')?.hidden)renderMessages();});
  }

  document.addEventListener('DOMContentLoaded',bind);
  window.QuireAI={open,close,renderSettings,connected,providers,configuredProviders,chat,article,preferredProvider,setPreferredProvider,labels:PROVIDER_LABELS};
})();
