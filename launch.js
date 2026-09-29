/* Quire Guided Project Launch — Step 24 */
(function(){
  let step=1;
  let studyType='';
  const totalSteps=4;

  const chapterTemplates={
    qualitative:[
      'Introduction','Literature Review','Methodology','Results / Findings','Discussion','Conclusion'
    ],
    quantitative:[
      'Introduction','Literature Review','Methodology','Results','Discussion','Conclusion'
    ],
    mixed:[
      'Introduction','Literature Review','Methodology','Results / Findings','Discussion','Conclusion'
    ],
    meta:[
      'Introduction','Background / Literature','Review Methodology','Results / Evidence Synthesis','Discussion','Conclusion'
    ]
  };

  function escapeHtml(v){
    return String(v??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[s]));
  }

  function activeProject(projectId){
    const state=window.QuireStore?.getState?.()||{};
    projectId=projectId||window.QuireStore?.getActiveProjectId?.();
    return {
      state,
      projectId,
      project:(state.projects||[]).find(p=>p.id===projectId)||null,
      setup:(state.studySetups||[]).find(s=>s.projectId===projectId)||null
    };
  }

  function readiness(projectId){
    const {state,project,setup}=activeProject(projectId);
    if(!project)return {percent:0,complete:0,total:7,tasks:[]};

    const articles=(state.articles||[]).filter(x=>x.projectId===project.id);
    const sections=(state.sections||[]).filter(x=>x.projectId===project.id);
    const evidence=(state.evidenceLinks||[]).filter(x=>x.projectId===project.id);

    const tasks=[
      {
        id:'question',label:'Define the research question',
        done:Boolean(String(project.researchQuestion||'').trim()),
        target:'setup',hint:'Clarify what the project is trying to answer.'
      },
      {
        id:'design',label:'Choose the study design',
        done:Boolean(setup?.studyType),
        target:'setup',hint:'Qualitative, quantitative, mixed methods or systematic review.'
      },
      {
        id:'target',label:'Set the thesis word target',
        done:Number(project.wordTarget)>0,
        target:'setup',hint:'Give progress calculations a meaningful target.'
      },
      {
        id:'deadline',label:'Set the final deadline',
        done:Boolean(project.finalDeadline),
        target:'setup',hint:'This unlocks timeline and pace calculations.'
      },
      {
        id:'source',label:'Add the first research source',
        done:articles.length>0,
        target:'library',hint:'Upload a PDF, add a DOI, or import references.'
      },
      {
        id:'writing',label:'Start the first thesis section',
        done:sections.some(s=>(Number(s.currentWordCount)||0)>0 || String(s.content||'').replace(/<[^>]+>/g,'').trim()),
        target:'chapters',hint:'Put the first real words into the manuscript.'
      },
      {
        id:'evidence',label:'Connect evidence to the thesis',
        done:evidence.some(e=>e.sectionId||e.chapterId||e.objectiveId||e.themeId),
        target:'library',hint:'Link a source or highlight to where it will be used.'
      }
    ];

    const complete=tasks.filter(t=>t.done).length;
    return {percent:Math.round(complete/tasks.length*100),complete,total:tasks.length,tasks};
  }

  function renderStep(){
    document.querySelectorAll('[data-launch-step-panel]').forEach(panel=>{
      panel.hidden=Number(panel.dataset.launchStepPanel)!==step;
    });
    document.querySelectorAll('[data-launch-step-indicator]').forEach(indicator=>{
      const n=Number(indicator.dataset.launchStepIndicator);
      indicator.classList.toggle('active',n===step);
      indicator.classList.toggle('done',n<step);
    });

    const back=document.getElementById('launchBackBtn');
    const next=document.getElementById('launchNextBtn');
    const create=document.getElementById('launchCreateBtn');
    if(back)back.hidden=step===1;
    if(next)next.hidden=step===totalSteps;
    if(create)create.hidden=step!==totalSteps;

    const progress=document.getElementById('launchProgressBar');
    if(progress)progress.style.width=((step/totalSteps)*100)+'%';

    if(step===3)renderChapterPreview();
    if(step===4)renderReview();
    setMessage('');
  }

  function setMessage(message){
    const node=document.getElementById('launchMessage');
    if(node)node.textContent=message||'';
  }

  function validateCurrent(){
    if(step===1){
      if(!document.getElementById('launchTitle')?.value.trim()){
        setMessage('Add a working project or thesis title.');
        document.getElementById('launchTitle')?.focus();
        return false;
      }
    }
    if(step===2 && !studyType){
      setMessage('Choose the study design that best matches this project.');
      return false;
    }
    return true;
  }

  function chooseStudyType(type){
    studyType=type;
    document.querySelectorAll('[data-launch-study-type]').forEach(btn=>{
      btn.classList.toggle('selected',btn.dataset.launchStudyType===type);
    });
    const ethics=document.getElementById('launchEthicsRequired');
    if(ethics && type==='meta') ethics.checked=false;
    renderChapterPreview();
  }

  function renderChapterPreview(){
    const mount=document.getElementById('launchChapterPreview');
    if(!mount)return;
    const titles=chapterTemplates[studyType]||chapterTemplates.qualitative;
    mount.innerHTML=titles.map((title,index)=>
      '<div><span>'+String(index+1).padStart(2,'0')+'</span><strong>'+escapeHtml(title)+'</strong></div>'
    ).join('');
    const note=document.getElementById('launchChapterNote');
    if(note){
      note.textContent=studyType==='meta'
        ? 'A review-oriented structure will be created. You can rename, add or reorder sections later.'
        : 'A standard empirical thesis structure will be created. You can refine it later.';
    }
  }

  function value(id){
    return document.getElementById(id)?.value?.trim?.()||'';
  }

  function renderReview(){
    const mount=document.getElementById('launchReviewSummary');
    if(!mount)return;
    const labels={
      qualitative:'Qualitative',
      quantitative:'Quantitative',
      mixed:'Mixed methods',
      meta:'Systematic review / meta-analysis'
    };
    const title=value('launchTitle')||'Untitled project';
    const question=value('launchQuestion')||'Research question not yet defined';
    const degree=value('launchDegree')||'Not specified';
    const institution=value('launchInstitution')||'Not specified';
    const target=Number(document.getElementById('launchWordTarget')?.value)||0;
    const deadline=value('launchDeadline')||'Not set';

    mount.innerHTML=
      '<div><span>Project</span><strong>'+escapeHtml(title)+'</strong></div>'+
      '<div><span>Study design</span><strong>'+escapeHtml(labels[studyType]||'Not selected')+'</strong></div>'+
      '<div><span>Degree / programme</span><strong>'+escapeHtml(degree)+'</strong></div>'+
      '<div><span>Institution</span><strong>'+escapeHtml(institution)+'</strong></div>'+
      '<div class="wide"><span>Research question</span><strong>'+escapeHtml(question)+'</strong></div>'+
      '<div><span>Word target</span><strong>'+(target?target.toLocaleString()+' words':'Not set')+'</strong></div>'+
      '<div><span>Final deadline</span><strong>'+escapeHtml(deadline)+'</strong></div>';
  }

  function reset(){
    step=1;studyType='';
    ['launchTitle','launchDegree','launchInstitution','launchSupervisor','launchQuestion','launchDeadline'].forEach(id=>{
      const node=document.getElementById(id);if(node)node.value='';
    });
    const words=document.getElementById('launchWordTarget');if(words)words.value='20000';
    const proposal=document.getElementById('launchProposalRequired');if(proposal)proposal.checked=true;
    const ethics=document.getElementById('launchEthicsRequired');if(ethics)ethics.checked=true;
    document.querySelectorAll('[data-launch-study-type]').forEach(btn=>btn.classList.remove('selected'));
    renderStep();
  }

  function open(){
    const modal=document.getElementById('projectLaunchModal');
    if(!modal)return;
    reset();
    modal.hidden=false;
    setTimeout(()=>document.getElementById('launchTitle')?.focus(),0);
  }

  function close(){
    const modal=document.getElementById('projectLaunchModal');
    if(modal)modal.hidden=true;
  }

  function next(){
    if(!validateCurrent())return;
    if(step<totalSteps){step++;renderStep();}
  }

  function back(){
    if(step>1){step--;renderStep();}
  }

  function create(){
    if(!validateCurrent())return;
    const chapters=(chapterTemplates[studyType]||chapterTemplates.qualitative).map((title,index)=>({
      number:String(index+1),title
    }));

    const project=window.QuireStore.createProject({
      title:value('launchTitle')||'Untitled thesis',
      degreeName:value('launchDegree'),
      institutionName:value('launchInstitution'),
      supervisorName:value('launchSupervisor'),
      researchQuestion:value('launchQuestion'),
      wordTarget:Number(document.getElementById('launchWordTarget')?.value)||null,
      finalDeadline:value('launchDeadline')||null,
      studyType,
      proposalRequired:Boolean(document.getElementById('launchProposalRequired')?.checked),
      ethicsRequired:Boolean(document.getElementById('launchEthicsRequired')?.checked),
      chapters
    });

    if(!project)return;
    close();
    window.QuireStore.setActiveProject(project.id);
    localStorage.removeItem('quire:launch-dismissed:'+project.id);
    window.dispatchEvent(new CustomEvent('quire:project-switched',{detail:{projectId:project.id}}));
    window.showView?.('dashboard');
    renderGuide();
    window.dispatchEvent(new CustomEvent('quire:project-launched',{detail:{projectId:project.id}}));
  }

  function renderGuide(){
    const guide=document.getElementById('projectLaunchGuide');
    if(!guide||!window.QuireStore)return;
    const projectId=window.QuireStore.getActiveProjectId();
    const status=readiness(projectId);
    const dismissed=localStorage.getItem('quire:launch-dismissed:'+projectId)==='1';

    if(status.percent>=100 || dismissed){
      guide.hidden=true;
      return;
    }

    guide.hidden=false;
    document.getElementById('launchGuidePercent').textContent=status.percent+'%';
    document.getElementById('launchGuideBar').style.width=status.percent+'%';
    document.getElementById('launchGuideCount').textContent=status.complete+' of '+status.total+' launch essentials complete';

    const mount=document.getElementById('launchGuideTasks');
    mount.innerHTML=status.tasks.map(task=>
      '<button type="button" class="launch-guide-task '+(task.done?'done':'')+'" data-launch-target="'+escapeHtml(task.target)+'">'+
        '<span>'+(task.done?'✓':'○')+'</span>'+
        '<div><strong>'+escapeHtml(task.label)+'</strong><small>'+escapeHtml(task.done?'Complete':task.hint)+'</small></div>'+
        '<b>'+(task.done?'Done':'Open')+'</b>'+
      '</button>'
    ).join('');

    mount.querySelectorAll('[data-launch-target]').forEach(btn=>btn.addEventListener('click',()=>{
      window.showView?.(btn.dataset.launchTarget);
    }));

    const nextTask=status.tasks.find(t=>!t.done);
    const next=document.getElementById('launchGuideNext');
    if(nextTask&&next){
      next.textContent='Continue: '+nextTask.label+' →';
      next.dataset.launchTarget=nextTask.target;
    }
  }

  function dismissGuide(){
    const id=window.QuireStore?.getActiveProjectId?.();
    if(!id)return;
    localStorage.setItem('quire:launch-dismissed:'+id,'1');
    renderGuide();
  }

  function bind(){
    document.querySelectorAll('[data-open-launch]').forEach(btn=>btn.addEventListener('click',e=>{
      e.preventDefault();
      document.getElementById('modal')?.setAttribute('hidden','');
      open();
    }));
    document.querySelectorAll('[data-launch-study-type]').forEach(btn=>btn.addEventListener('click',()=>chooseStudyType(btn.dataset.launchStudyType)));
    document.getElementById('launchNextBtn')?.addEventListener('click',next);
    document.getElementById('launchBackBtn')?.addEventListener('click',back);
    document.getElementById('launchCreateBtn')?.addEventListener('click',create);
    document.getElementById('closeProjectLaunchModal')?.addEventListener('click',close);
    document.getElementById('cancelProjectLaunchBtn')?.addEventListener('click',close);
    document.getElementById('projectLaunchModal')?.addEventListener('click',e=>{if(e.target.id==='projectLaunchModal')close();});

    document.getElementById('dismissLaunchGuide')?.addEventListener('click',dismissGuide);
    document.getElementById('launchGuideNext')?.addEventListener('click',e=>{
      const target=e.currentTarget.dataset.launchTarget;
      if(target)window.showView?.(target);
    });

    window.addEventListener('quire:project-switched',renderGuide);
    window.addEventListener('quire:store-changed',renderGuide);
    renderGuide();
  }

  document.addEventListener('DOMContentLoaded',bind);
  window.QuireLaunch={open,close,readiness,renderGuide};
})();