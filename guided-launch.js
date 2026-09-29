/* Quire Guided Project Launch — Step 24 */
(function(){
  let step=1;
  let templateTouched=false;

  const templates={
    empirical:[
      'Introduction',
      'Literature Review',
      'Methodology',
      'Results / Findings',
      'Discussion',
      'Conclusion'
    ],
    review:[
      'Introduction',
      'Background / Literature Review',
      'Review Methods',
      'Results / Evidence Synthesis',
      'Discussion',
      'Conclusion'
    ],
    compact:[
      'Introduction',
      'Literature / Context',
      'Main Study / Analysis',
      'Discussion',
      'Conclusion'
    ]
  };

  function el(id){return document.getElementById(id);}
  function escapeHtml(v){return String(v??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[s]));}

  function selectedStudyType(){
    return document.querySelector('input[name="launchStudyType"]:checked')?.value||'';
  }

  function selectedTemplate(){
    return document.querySelector('input[name="launchTemplate"]:checked')?.value||'empirical';
  }

  function templateForStudy(){
    return selectedStudyType()==='meta'?'review':'empirical';
  }

  function setTemplate(value){
    const radio=document.querySelector('input[name="launchTemplate"][value="'+value+'"]');
    if(radio)radio.checked=true;
    renderStructurePreview();
  }

  function reset(){
    step=1;templateTouched=false;
    [
      'launchTitle','launchDegree','launchInstitution','launchSupervisor','launchQuestion',
      'launchObjective1','launchObjective2','launchObjective3','launchPopulation','launchSetting',
      'launchProposalDeadline','launchFinalDeadline'
    ].forEach(id=>{if(el(id))el(id).value='';});
    if(el('launchWordTarget'))el('launchWordTarget').value='20000';
    document.querySelectorAll('input[name="launchStudyType"]').forEach(r=>r.checked=false);
    document.querySelector('input[name="launchStudyType"][value=""]')?.setAttribute('checked','checked');
    const undecided=document.querySelector('input[name="launchStudyType"][value=""]');
    if(undecided)undecided.checked=true;
    setTemplate('empirical');
    setMessage('');
    showStep(1);
  }

  function open(){
    reset();
    const modal=el('guidedLaunchModal');
    if(modal)modal.hidden=false;
    setTimeout(()=>el('launchTitle')?.focus(),0);
  }

  function close(){
    const modal=el('guidedLaunchModal');
    if(modal)modal.hidden=true;
  }

  function setMessage(message){
    const node=el('launchMessage');
    if(node)node.textContent=message||'';
  }

  function showStep(next){
    step=Math.max(1,Math.min(5,next));
    document.querySelectorAll('[data-launch-step]').forEach(panel=>panel.hidden=Number(panel.dataset.launchStep)!==step);
    document.querySelectorAll('[data-launch-dot]').forEach(dot=>{
      const n=Number(dot.dataset.launchDot);
      dot.classList.toggle('active',n===step);
      dot.classList.toggle('done',n<step);
    });
    el('launchBackBtn').hidden=step===1;
    el('launchNextBtn').hidden=step===5;
    el('finishLaunchBtn').hidden=step!==5;
    setMessage('');
    updateSummary();
    el('launchStepLabel').textContent='Step '+step+' of 5';
  }

  function validateStep(){
    if(step===1&&!el('launchTitle').value.trim()){
      setMessage('Give the project a working title before continuing.');
      el('launchTitle').focus();
      return false;
    }
    return true;
  }

  function next(){
    if(!validateStep())return;
    if(step===3&&!templateTouched)setTemplate(templateForStudy());
    showStep(step+1);
  }

  function back(){showStep(step-1);}

  function renderStructurePreview(){
    const type=selectedTemplate();
    const chapters=templates[type]||templates.empirical;
    const mount=el('launchStructurePreview');
    if(mount){
      mount.innerHTML=chapters.map((title,index)=>
        '<div><span>'+(index+1)+'</span><strong>'+escapeHtml(title)+'</strong></div>'
      ).join('');
    }
  }

  function updateSummary(){
    if(step!==5)return;
    const title=el('launchTitle').value.trim()||'Untitled thesis';
    const question=el('launchQuestion').value.trim()||'Research question not yet defined';
    const type=selectedStudyType();
    const typeLabel={
      qualitative:'Qualitative',
      quantitative:'Quantitative',
      mixed:'Mixed methods',
      meta:'Systematic review / meta-analysis',
      '':'Not decided yet'
    }[type]||'Not decided yet';
    const objectiveCount=['launchObjective1','launchObjective2','launchObjective3'].filter(id=>el(id).value.trim()).length;
    const deadline=el('launchFinalDeadline').value;
    const chapters=templates[selectedTemplate()]||templates.empirical;

    el('launchSummaryTitle').textContent=title;
    el('launchSummaryQuestion').textContent=question;
    el('launchSummaryType').textContent=typeLabel;
    el('launchSummaryObjectives').textContent=objectiveCount+' objective'+(objectiveCount===1?'':'s')+' entered';
    el('launchSummaryTimeline').textContent=(Number(el('launchWordTarget').value)||0).toLocaleString()+' word target'+(deadline?' · deadline '+deadline:' · no final deadline yet');
    el('launchSummaryStructure').textContent=chapters.length+' chapter structure';
  }

  function chapters(){
    return (templates[selectedTemplate()]||templates.empirical).map((title,index)=>({
      number:String(index+1),title
    }));
  }

  function finish(){
    if(!el('launchTitle').value.trim()){
      showStep(1);setMessage('Give the project a working title before creating it.');return;
    }

    const objectives=['launchObjective1','launchObjective2','launchObjective3']
      .map(id=>el(id).value.trim()).filter(Boolean);

    const project=window.QuireStore.createProject({
      title:el('launchTitle').value.trim(),
      degreeName:el('launchDegree').value.trim(),
      institutionName:el('launchInstitution').value.trim(),
      supervisorName:el('launchSupervisor').value.trim(),
      researchQuestion:el('launchQuestion').value.trim(),
      objectives,
      chapters:chapters(),
      themes:[],
      studyType:selectedStudyType(),
      population:el('launchPopulation').value.trim(),
      studySetting:el('launchSetting').value.trim(),
      wordTarget:Number(el('launchWordTarget').value)||null,
      proposalDeadline:el('launchProposalDeadline').value||null,
      finalDeadline:el('launchFinalDeadline').value||null,
      startDate:new Date().toISOString().slice(0,10)
    });

    if(!project){
      setMessage('Quire could not create the project.');
      return;
    }

    window.QuireStore.setActiveProject(project.id);
    window.dispatchEvent(new CustomEvent('quire:project-switched',{detail:{projectId:project.id}}));
    close();
    window.QuireProjects?.render?.();
    window.QuireProgress?.captureNow?.();
    renderReadiness();
    window.showView?.('overview');
    window.dispatchEvent(new CustomEvent('quire:project-launched',{detail:{projectId:project.id}}));
  }

  function readiness(){
    const store=window.QuireStore;
    const state=store.getState();
    const projectId=store.getActiveProjectId();
    const project=state.projects.find(p=>p.id===projectId)||{};
    const setup=state.studySetups.find(s=>s.projectId===projectId)||{};
    const objectives=state.objectives.filter(o=>o.projectId===projectId&&o.status!=='archived');
    const chapters=state.chapters.filter(c=>c.projectId===projectId);
    const articles=state.articles.filter(a=>a.projectId===projectId);

    const essentials=[
      {
        key:'identity',label:'Project identity',
        detail:'Title, degree and institution',
        done:Boolean(project.title&&project.degreeName&&project.institutionName),
        view:'setup'
      },
      {
        key:'question',label:'Research question',
        detail:'A clear working question',
        done:Boolean(project.researchQuestion),
        view:'setup'
      },
      {
        key:'design',label:'Study design',
        detail:'Qualitative, quantitative, mixed or review',
        done:Boolean(setup.studyType),
        view:'setup'
      },
      {
        key:'objectives',label:'Research objectives',
        detail:'At least one project objective',
        done:objectives.length>0,
        view:'map'
      },
      {
        key:'targets',label:'Target & submission date',
        detail:'Word target and final deadline',
        done:Boolean(project.wordTarget&&project.finalDeadline),
        view:'setup'
      },
      {
        key:'structure',label:'Chapter structure',
        detail:'Initial thesis chapters',
        done:chapters.length>=4,
        view:'chapters'
      }
    ];

    return {project,setup,objectives,chapters,articles,essentials};
  }

  function renderReadiness(){
    const mount=el('projectLaunchReadiness');
    if(!mount||!window.QuireStore)return;
    const data=readiness();
    const complete=data.essentials.filter(x=>x.done).length;
    const pct=Math.round(complete/data.essentials.length*100);

    el('launchReadinessPercent').textContent=pct+'%';
    el('launchReadinessBar').style.width=pct+'%';
    el('launchReadinessLabel').textContent=complete===data.essentials.length
      ? 'Core project setup complete'
      : complete+' of '+data.essentials.length+' launch essentials complete';

    mount.innerHTML=data.essentials.map(item=>
      '<button type="button" class="launch-readiness-item '+(item.done?'done':'')+'" data-readiness-view="'+item.view+'">'+
        '<span>'+(item.done?'✓':'○')+'</span>'+
        '<div><strong>'+escapeHtml(item.label)+'</strong><small>'+escapeHtml(item.detail)+'</small></div>'+
        '<b>'+(item.done?'Ready':'Complete →')+'</b>'+
      '</button>'
    ).join('')+
    '<button type="button" class="launch-readiness-item next-action '+(data.articles.length?'done':'')+'" data-readiness-view="library">'+
      '<span>'+(data.articles.length?'✓':'＋')+'</span>'+
      '<div><strong>Start the research library</strong><small>'+(data.articles.length?data.articles.length+' source'+(data.articles.length===1?'':'s')+' added':'Add your first paper or reference')+'</small></div>'+
      '<b>'+(data.articles.length?'Started':'Next →')+'</b>'+
    '</button>';

    mount.querySelectorAll('[data-readiness-view]').forEach(btn=>btn.addEventListener('click',()=>window.showView?.(btn.dataset.readinessView)));
  }


  function projectReadiness(projectId){
    const state=window.QuireStore?.getState?.()||{};
    projectId=projectId||window.QuireStore?.getActiveProjectId?.();
    const project=(state.projects||[]).find(p=>p.id===projectId)||null;
    const setup=(state.studySetups||[]).find(s=>s.projectId===projectId)||null;
    if(!project)return {percent:0,complete:0,total:7,tasks:[]};

    const articles=(state.articles||[]).filter(x=>x.projectId===projectId);
    const sections=(state.sections||[]).filter(x=>x.projectId===projectId);
    const evidence=(state.evidenceLinks||[]).filter(x=>x.projectId===projectId);
    const objectives=(state.objectives||[]).filter(x=>x.projectId===projectId&&x.status!=='archived');

    const tasks=[
      {id:'question',label:'Define the research question',done:Boolean(String(project.researchQuestion||'').trim()),target:'setup',hint:'Clarify what the project is trying to answer.'},
      {id:'design',label:'Choose the study design',done:Boolean(setup?.studyType),target:'setup',hint:'Qualitative, quantitative, mixed methods or systematic review.'},
      {id:'objectives',label:'Define at least one objective',done:objectives.length>0,target:'map',hint:'Give the project a clear set of research objectives.'},
      {id:'target',label:'Set the thesis word target',done:Number(project.wordTarget)>0,target:'setup',hint:'Give progress calculations a meaningful target.'},
      {id:'deadline',label:'Set the final deadline',done:Boolean(project.finalDeadline),target:'setup',hint:'This unlocks timeline and pace calculations.'},
      {id:'source',label:'Add the first research source',done:articles.length>0,target:'library',hint:'Upload a PDF, add a DOI, or import references.'},
      {id:'evidence',label:'Connect evidence to the thesis',done:evidence.some(e=>e.sectionId||e.chapterId||e.objectiveId||e.themeId),target:'map',hint:'Link a source or highlight to where it will be used.'}
    ];
    const complete=tasks.filter(t=>t.done).length;
    return {percent:Math.round(complete/tasks.length*100),complete,total:tasks.length,tasks};
  }

  function renderGuide(){
    const guide=document.getElementById('projectLaunchGuide');
    if(!guide||!window.QuireStore)return;
    const projectId=window.QuireStore.getActiveProjectId();
    const status=projectReadiness(projectId);
    const dismissed=localStorage.getItem('quire:launch-dismissed:'+projectId)==='1';

    if(status.percent>=100||dismissed){
      guide.hidden=true;
      return;
    }

    guide.hidden=false;
    document.getElementById('launchGuidePercent').textContent=status.percent+'%';
    document.getElementById('launchGuideBar').style.width=status.percent+'%';
    document.getElementById('launchGuideCount').textContent=status.complete+' of '+status.total+' launch essentials complete';

    const mount=document.getElementById('launchGuideTasks');
    if(mount){
      mount.innerHTML=status.tasks.map(task=>
        '<button type="button" class="launch-guide-task '+(task.done?'done':'')+'" data-launch-target="'+escapeHtml(task.target)+'">'+
          '<span>'+(task.done?'✓':'○')+'</span>'+
          '<div><strong>'+escapeHtml(task.label)+'</strong><small>'+escapeHtml(task.done?'Complete':task.hint)+'</small></div>'+
          '<b>'+(task.done?'Done':'Open')+'</b>'+
        '</button>'
      ).join('');
      mount.querySelectorAll('[data-launch-target]').forEach(btn=>btn.addEventListener('click',()=>window.showView?.(btn.dataset.launchTarget)));
    }

    const nextTask=status.tasks.find(t=>!t.done);
    const next=document.getElementById('launchGuideNext');
    if(next&&nextTask){
      next.textContent='Continue: '+nextTask.label+' →';
      next.dataset.launchTarget=nextTask.target;
    }
  }

  function dismissGuide(){
    const projectId=window.QuireStore?.getActiveProjectId?.();
    if(!projectId)return;
    localStorage.setItem('quire:launch-dismissed:'+projectId,'1');
    renderGuide();
  }

  function bind(){
    el('closeGuidedLaunchModal')?.addEventListener('click',close);
    el('cancelGuidedLaunch')?.addEventListener('click',close);
    el('launchBackBtn')?.addEventListener('click',back);
    el('launchNextBtn')?.addEventListener('click',next);
    el('finishLaunchBtn')?.addEventListener('click',finish);
    el('guidedLaunchModal')?.addEventListener('click',e=>{if(e.target.id==='guidedLaunchModal')close();});
    el('newThesisProjectCard')?.addEventListener('click',()=>{
      el('modal').hidden=true;open();
    });
    document.querySelectorAll('[data-open-launch]').forEach(btn=>btn.addEventListener('click',e=>{
      e.preventDefault();
      const modal=el('modal');if(modal)modal.hidden=true;
      open();
    }));
    el('dismissLaunchGuide')?.addEventListener('click',dismissGuide);
    el('launchGuideNext')?.addEventListener('click',e=>{
      const target=e.currentTarget.dataset.launchTarget;
      if(target)window.showView?.(target);
    });

    document.querySelectorAll('input[name="launchStudyType"]').forEach(r=>r.addEventListener('change',()=>{
      if(!templateTouched)setTemplate(templateForStudy());
      updateSummary();
    }));
    document.querySelectorAll('input[name="launchTemplate"]').forEach(r=>r.addEventListener('change',()=>{
      templateTouched=true;renderStructurePreview();updateSummary();
    }));

    [
      'launchTitle','launchQuestion','launchObjective1','launchObjective2','launchObjective3',
      'launchWordTarget','launchFinalDeadline'
    ].forEach(id=>el(id)?.addEventListener('input',updateSummary));

    window.addEventListener('quire:project-switched',()=>{renderReadiness();renderGuide();});
    window.addEventListener('quire:store-changed',()=>{
      if(el('overview')?.classList.contains('active'))renderReadiness();
      renderGuide();
    });

    renderStructurePreview();
    renderReadiness();
    renderGuide();
  }

  document.addEventListener('DOMContentLoaded',bind);
  window.QuireGuidedLaunch={open,close,renderReadiness,readiness,projectReadiness,renderGuide};
  window.QuireLaunch={open,close,readiness:projectReadiness,renderGuide};
})();