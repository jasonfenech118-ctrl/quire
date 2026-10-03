/* Quire Guided Project Launch — Step 24 */
(function(){
  let step=1;
  let templateTouched=false;

  let structureTouched=false;
  let structureEditor=null;

  const LAUNCH_LABELS={
    thesis:{eyebrow:'GUIDED THESIS SETUP',heading:'Build your thesis blueprint',approach:'What kind of thesis is this?',reqEyebrow:'UNIVERSITY REQUIREMENTS',reqHeading:'What rules does your thesis need to follow?',blueprint:'YOUR THESIS BLUEPRINT',finish:'Save thesis blueprint'},
    paper:{eyebrow:'GUIDED PAPER SETUP',heading:'Build your research paper blueprint',approach:'What kind of study does the paper report?',reqEyebrow:'JOURNAL & AUTHORSHIP',reqHeading:'Where is the paper going, and who is writing it?',blueprint:'YOUR PAPER BLUEPRINT',finish:'Save paper blueprint'},
    assignment:{eyebrow:'GUIDED ASSIGNMENT SETUP',heading:'Build your assignment blueprint',approach:'What kind of assignment is this?',reqEyebrow:'MODULE & BRIEF',reqHeading:'What does the assignment brief ask for?',blueprint:'YOUR ASSIGNMENT BLUEPRINT',finish:'Save assignment blueprint'}
  };

  // Per-type inputs for the shared word limit, deadline and referencing style.
  const LAUNCH_FIELDS={
    thesis:{words:'launchWordTarget',deadline:'launchFinalDeadline',style:'launchReferenceStyle'},
    paper:{words:'launchPaperWordLimit',deadline:'launchPaperDeadline',style:'launchPaperReferenceStyle'},
    assignment:{words:'launchAssignmentWordLimit',deadline:'launchAssignmentDeadline',style:'launchAssignmentReferenceStyle'}
  };
  function field(key){return el(LAUNCH_FIELDS[docType()][key]);}

  function templateSet(){return window.QuireStore?.documentTemplates?.[docType()]||{};}

  function el(id){return document.getElementById(id);}
  function escapeHtml(v){return String(v??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[s]));}

  function selectedStudyType(){
    return document.querySelector('input[name="launchStudyType"]:checked')?.value||'';
  }

  function docType(){
    const value=document.querySelector('input[name="launchDocType"]:checked')?.value;
    return LAUNCH_LABELS[value]?value:'thesis';
  }

  function articleTypeForStudy(){
    const study=selectedStudyType();
    return study==='meta'?'systematic_review':study==='qualitative'?'qualitative':'original';
  }

  function templateKey(){
    if(docType()==='paper')return el('launchArticleType')?.value||'original';
    if(docType()==='assignment')return el('launchAssignmentType')?.value||'essay';
    return selectedStudyType()==='meta'?'review':'empirical';
  }

  function resetStructure(){
    structureTouched=false;
    const list=templateSet()[templateKey()]||[];
    const unit=docType()==='thesis'?'Chapter':'Section';
    if(!structureEditor)structureEditor=window.QuireDocType?.structureEditor?.(el('launchStructurePreview'),{items:list,unit,onChange:()=>{structureTouched=true;updateSummary();}});
    else structureEditor.set(list,{unit});
  }

  function applyDocType(){
    const kind=docType();
    const labels=LAUNCH_LABELS[kind];
    document.querySelectorAll('#guidedLaunchModal [data-launch-label]').forEach(node=>{node.textContent=labels[node.dataset.launchLabel]||node.textContent;});
    document.querySelectorAll('#guidedLaunchModal [data-launch-only]').forEach(node=>{node.hidden=node.dataset.launchOnly!==kind;});
    document.querySelectorAll('#guidedLaunchModal [data-doc-ph-thesis]').forEach(node=>{
      node.setAttribute('placeholder',node.getAttribute('data-doc-ph-'+kind)??node.getAttribute('data-doc-ph-thesis'));
    });
    [['launchArticleType',window.QuireStore?.paperArticleTypes],['launchAssignmentType',window.QuireStore?.assignmentTypes]].forEach(([id,types])=>{
      const select=el(id);
      if(select&&!select.options.length)select.innerHTML=Object.keys(types||{}).map(key=>'<option value="'+key+'">'+escapeHtml(types[key])+'</option>').join('');
    });
  }

  function reset(){
    step=1;templateTouched=false;
    [
      'launchTitle','launchDegree','launchInstitution','launchSupervisor','launchQuestion','launchProblem','launchAim','launchRequirements',
      'launchObjective1','launchObjective2','launchObjective3','launchPopulation','launchSetting',
      'launchProposalDeadline','launchFinalDeadline','launchReferenceStyle',
      'launchTargetJournal','launchAuthors','launchCorresponding','launchKeywords','launchPaperWordLimit','launchAbstractLimit','launchPaperReferenceStyle','launchPaperDeadline',
      'launchModuleName','launchModuleCode','launchAssignmentProgramme','launchTutor','launchAssignmentWordLimit','launchAssignmentDeadline','launchAssignmentReferenceStyle','launchBrief','launchMarkingCriteria'
    ].forEach(id=>{if(el(id))el(id).value='';});
    const thesisRadio=document.querySelector('input[name="launchDocType"][value="thesis"]');
    if(thesisRadio)thesisRadio.checked=true;
    applyDocType();
    if(el('launchArticleType'))el('launchArticleType').value='original';
    if(el('launchAssignmentType'))el('launchAssignmentType').value='essay';
    if(el('launchWordTarget'))el('launchWordTarget').value='';
    document.querySelectorAll('input[name="launchStudyType"]').forEach(r=>r.checked=false);
    document.querySelector('input[name="launchStudyType"][value=""]')?.setAttribute('checked','checked');
    const undecided=document.querySelector('input[name="launchStudyType"][value=""]');
    if(undecided)undecided.checked=true;
    resetStructure();
    setMessage('');
    showStep(1);
  }

  function open(){
    reset();
    const modal=el('guidedLaunchModal');
    if(modal)modal.hidden=false;
    setTimeout(()=>document.querySelector('input[name="launchDocType"]:checked')?.focus(),0);
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
    step=Math.max(1,Math.min(6,next));
    document.querySelectorAll('[data-launch-step]').forEach(panel=>panel.hidden=Number(panel.dataset.launchStep)!==step);
    document.querySelectorAll('[data-launch-dot]').forEach(dot=>{
      const n=Number(dot.dataset.launchDot);
      dot.classList.toggle('active',n===step);
      dot.classList.toggle('done',n<step);
    });
    el('launchBackBtn').hidden=step===1;
    el('launchNextBtn').hidden=step===6;
    el('finishLaunchBtn').hidden=step!==6;
    setMessage('');
    updateSummary();
    el('launchStepLabel').textContent='Step '+step+' of 6';
  }

  function validateStep(){
    if(step===2&&!el('launchTitle').value.trim()){
      setMessage('Give the project a working title before continuing.');
      el('launchTitle').focus();
      return false;
    }
    return true;
  }

  function next(){
    if(!validateStep())return;
    if(step===4&&!structureTouched)resetStructure();
    showStep(step+1);
  }

  function back(){showStep(step-1);}

  function updateSummary(){
    if(step!==6)return;
    const kind=docType();
    const paper=kind==='paper',assignment=kind==='assignment';
    const title=el('launchTitle').value.trim()||'Untitled '+kind;
    const question=el('launchQuestion').value.trim()||'Research direction still open — the literature can refine it';
    const type=selectedStudyType();
    const typeLabel={
      qualitative:'Qualitative',
      quantitative:'Quantitative',
      mixed:'Mixed methods',
      meta:'Systematic review / meta-analysis',
      '':'Not decided yet'
    }[type]||'Not decided yet';
    const objectiveCount=['launchObjective1','launchObjective2','launchObjective3'].filter(id=>el(id).value.trim()).length;
    const deadline=field('deadline').value;
    const words=Number(field('words').value)||0;
    const parts=chapters();

    el('launchSummaryTitle').textContent=title;
    el('launchSummaryQuestion').textContent=question;
    el('launchSummaryType').textContent=paper?(window.QuireStore?.paperArticleTypes?.[el('launchArticleType')?.value]||'Research paper')+' · '+typeLabel
      :assignment?(window.QuireStore?.assignmentTypes?.[el('launchAssignmentType')?.value]||'Assignment')+' · '+typeLabel:typeLabel;
    el('launchSummaryObjectives').textContent=objectiveCount+' early line'+(objectiveCount===1?'':'s')+' of enquiry entered';
    const venue=(paper?el('launchTargetJournal'):assignment?el('launchModuleName'):null)?.value.trim();
    el('launchSummaryTimeline').textContent=words.toLocaleString()+' word '+(kind==='thesis'?'target':'limit')+(venue?' · '+venue:'')+(deadline?' · '+(assignment?'due ':'deadline ')+deadline:' · no deadline yet');
    if(el('launchSummaryStructure'))el('launchSummaryStructure').textContent=parts.length+(kind==='thesis'?' chapter thesis structure':' section '+kind+' structure');
    const next=el('launchNextStep');if(next)next.textContent=type?'Continue with your research plan':'Begin exploring the literature';
  }

  function chapters(){
    const rows=structureEditor?structureEditor.get():(templateSet()[templateKey()]||[]).map(title=>({title}));
    return rows.map((row,index)=>({number:String(index+1),title:row.title.trim()}));
  }

  function finish(){
    if(!el('launchTitle').value.trim()){
      showStep(2);setMessage('Give the project a working title before creating it.');return;
    }

    const objectives=['launchObjective1','launchObjective2','launchObjective3']
      .map(id=>el(id).value.trim()).filter(Boolean);

    const kind=docType();
    const paper=kind==='paper',assignment=kind==='assignment';
    if(!chapters().length){
      setMessage('Keep at least one '+(kind==='thesis'?'chapter':'section')+' in the structure.');return;
    }
    const input={
      projectType:docType(),
      paperDetails:paper?{
        articleType:el('launchArticleType')?.value||'original',
        targetJournal:el('launchTargetJournal').value.trim(),
        authors:el('launchAuthors').value.trim(),
        correspondingAuthor:el('launchCorresponding').value.trim(),
        keywords:el('launchKeywords').value.trim(),
        abstractWordLimit:Number(el('launchAbstractLimit').value)||null
      }:{},
      assignmentDetails:assignment?{
        assignmentType:el('launchAssignmentType')?.value||'essay',
        moduleName:el('launchModuleName').value.trim(),
        moduleCode:el('launchModuleCode').value.trim(),
        tutor:el('launchTutor').value.trim(),
        brief:el('launchBrief').value.trim(),
        markingCriteria:el('launchMarkingCriteria').value.trim()
      }:{},
      title:el('launchTitle').value.trim(),
      degreeName:(assignment?el('launchAssignmentProgramme'):el('launchDegree')).value.trim(),
      institutionName:el('launchInstitution').value.trim(),
      supervisorName:el('launchSupervisor').value.trim(),
      researchQuestion:el('launchQuestion').value.trim(),
      objectives,
      chapters:chapters(),
      themes:[],
      studyType:selectedStudyType(),
      population:el('launchPopulation').value.trim(),
      studySetting:el('launchSetting').value.trim(),
      wordTarget:Number(field('words').value)||null,
      researchStage:document.querySelector('input[name="launchStage"]:checked')?.value||'topic',
      researchProblem:el('launchProblem')?.value.trim()||'',
      researchAim:el('launchAim')?.value.trim()||'',
      referenceStyle:field('style')?.value||'',
      universityRequirements:el('launchRequirements')?.value.trim()||'',
      proposalDeadline:el('launchProposalDeadline').value||null,
      finalDeadline:field('deadline').value||null,
      startDate:new Date().toISOString().slice(0,10)
    };

    const activeId=window.QuireStore.getActiveProjectId?.();
    const project=window.QuireStore.isStarterProject?.(activeId)
      ? window.QuireStore.configureStarterProject?.(input,activeId)
      : window.QuireStore.createProject(input);

    if(!project){
      setMessage('Quire could not prepare the research project.');
      return;
    }

    window.QuireStore.setActiveProject(project.id);
    // The first idea goes into Ideas so it stays linked to the rest of the workflow.
    if(input.researchProblem){
      try{
        window.QuireStore.addAnalysisItem({projectId:project.id,kind:'idea',title:input.researchProblem,
          payload:{ideaStatus:'inbox',origin:'researcher',sourceLabel:'First idea · guided setup'}});
      }catch(e){}
    }
    window.dispatchEvent(new CustomEvent('quire:project-switched',{detail:{projectId:project.id}}));
    close();
    window.QuireProjects?.render?.();
    window.QuireProgress?.captureNow?.();
    renderReadiness();
    localStorage.setItem('quire:guided-setup:'+project.id,'complete');
    window.showView?.('dashboard');
    window.QuireResearchFoundation?.render?.();
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
    const paper=project.projectType==='paper';
    const assignment=project.projectType==='assignment';

    const essentials=[
      assignment?{
        key:'identity',label:'Assignment identity',
        detail:'Title, module and brief',
        done:Boolean(project.title&&project.assignmentDetails?.moduleName&&project.assignmentDetails?.brief),
        view:'setup'
      }:paper?{
        key:'identity',label:'Paper identity',
        detail:'Title, authors and target journal',
        done:Boolean(project.title&&project.paperDetails?.authors&&project.paperDetails?.targetJournal),
        view:'setup'
      }:{
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
        detail:assignment?'Word limit and due date':paper?'Word limit and planned submission date':'Word target and final deadline',
        done:Boolean(project.wordTarget&&project.finalDeadline),
        view:'setup'
      },
      {
        key:'structure',label:assignment?'Assignment structure':paper?'Paper structure':'Chapter structure',
        detail:assignment?'Sections that answer the brief':paper?'Manuscript sections (e.g. IMRaD)':'Initial thesis chapters',
        done:chapters.length>=(assignment||paper?3:4),
        view:assignment||paper?'setup':'chapters'
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
    if(!project)return {percent:0,complete:0,total:7,tasks:[]};

    const articles=(state.articles||[]).filter(x=>x.projectId===projectId);
    const reviewed=articles.filter(x=>x.readingStatus==='reviewed');
    const plan=(state.searchPlans||[]).find(x=>x.projectId===projectId)||{};
    const searchStarted=(plan.concepts||[]).some(c=>(c.terms||[]).length)||(plan.databases||[]).length>0||(state.searchRuns||[]).some(x=>x.projectId===projectId);
    const compared=articles.filter(article=>{
      const d=article.citationData?.synthesis||{};
      return ['design','sample','methods','findings','limitations','relevance'].some(key=>String(d[key]||'').trim());
    }).length;
    const gaps=(state.analysisItems||[]).filter(x=>x.projectId===projectId&&x.kind==='gap_signal');
    const viableGaps=gaps.filter(x=>!['set_aside','challenged'].includes(String(x.payload?.gapStatus||'emerging')));
    const hasTopic=Boolean(String(project.title||'').trim()&&!['untitled thesis','untitled paper','untitled assignment','research project'].includes(String(project.title||'').trim().toLowerCase()));

    const tasks=[
      {id:'topic',label:'Define the research area',done:hasTopic,target:'setup',hint:'Start with the broad area you want to explore.'},
      {id:'search',label:'Plan how to search the field',done:Boolean(searchStarted),target:'searchscreen',hint:'Develop concepts, keywords and sources before narrowing too early.'},
      {id:'sources',label:'Build the literature base',done:articles.length>0,target:'library',hint:'Collect relevant papers from across the field.'},
      {id:'reading',label:'Read across several papers',done:reviewed.length>=3,target:'library',hint:'Read broadly enough to compare findings, methods and limitations.'},
      {id:'compare',label:'Compare papers across the field',done:compared>=2,target:'synthesis',hint:'Look for recurring themes, disagreement and methodological limitations.'},
      {id:'gap',label:'Record and test possible gaps',done:gaps.length>0,target:'synthesis',hint:'Treat gaps as hypotheses to test with further searching.'},
      {id:'question',label:'Refine the working research question',done:Boolean(String(project.researchQuestion||'').trim()&&viableGaps.length>0),target:'setup',hint:'Refine the question after the literature starts revealing what is missing.'}
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
    el('openThesisSetupGuideBtn')?.addEventListener('click',open);
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
      if(docType()==='paper'&&!templateTouched&&el('launchArticleType'))el('launchArticleType').value=articleTypeForStudy();
      if(!structureTouched)resetStructure();
      updateSummary();
    }));
    document.querySelectorAll('input[name="launchDocType"]').forEach(r=>r.addEventListener('change',()=>{
      applyDocType();resetStructure();updateSummary();
    }));
    ['launchArticleType','launchAssignmentType'].forEach(id=>el(id)?.addEventListener('change',()=>{
      templateTouched=true;
      if(!structureTouched||confirm('Replace the current structure with the template for this type?'))resetStructure();
      updateSummary();
    }));

    [
      'launchTitle','launchQuestion','launchObjective1','launchObjective2','launchObjective3',
      'launchWordTarget','launchFinalDeadline','launchTargetJournal','launchPaperWordLimit','launchPaperDeadline',
      'launchModuleName','launchAssignmentWordLimit','launchAssignmentDeadline'
    ].forEach(id=>el(id)?.addEventListener('input',updateSummary));

    window.addEventListener('quire:project-switched',()=>{renderReadiness();renderGuide();renderThesisSetupGuide();});
    window.addEventListener('quire:store-changed',()=>{
      if(el('overview')?.classList.contains('active'))renderReadiness();
      renderGuide();renderThesisSetupGuide();
    });

    applyDocType();
    resetStructure();
    renderReadiness();
    renderThesisSetupGuide();
    renderGuide();
  }

  // An empty workspace opens straight into guided setup, once per browser session.
  function autoOpenForEmptyWorkspace(){
    const store=window.QuireStore;
    const projectId=store?.getActiveProjectId?.();
    if(!projectId||!store.isStarterProject?.(projectId))return;
    if(localStorage.getItem('quire:guided-setup:'+projectId)==='complete')return;
    try{if(sessionStorage.getItem('quire:guided-setup-shown'))return;sessionStorage.setItem('quire:guided-setup-shown','1');}catch(e){}
    open();
  }

  document.addEventListener('DOMContentLoaded',bind);
  document.addEventListener('DOMContentLoaded',()=>setTimeout(autoOpenForEmptyWorkspace,300));
  function renderThesisSetupGuide(){
    const store=window.QuireStore;if(!store)return;
    const pid=store.getActiveProjectId?.(),setup=store.getStudySetupData?.(pid)||{},project=store.getActiveProject?.()||{};
    const paper=project.projectType==='paper';
    const assignment=project.projectType==='assignment';
    const ad=project.assignmentDetails||{};
    const values=assignment
      ? [project.title&&project.title!=='Untitled assignment',ad.moduleName,ad.brief,ad.markingCriteria,project.wordTarget,project.finalDeadline]
      : paper
      ? [project.title&&project.title!=='Untitled paper',project.paperDetails?.authors,project.paperDetails?.targetJournal,project.researchQuestion,setup.studyType,project.wordTarget,project.abstract]
      : [project.title&&project.title!=='Untitled thesis',project.degreeName,project.institutionName,project.researchQuestion,setup.studyType,project.wordTarget,project.finalDeadline];
    const noun=assignment?'Assignment':paper?'Paper':'Thesis';
    const complete=values.filter(Boolean).length,pct=Math.round(complete/values.length*100);
    const bar=el('thesisSetupGuideBar');if(bar)bar.style.width=pct+'%';
    const status=el('thesisSetupGuideStatus');if(status)status.textContent=pct>=85?noun+' foundation is well defined':pct?noun+' setup is in progress':noun+' setup not completed';
    const meta=el('thesisSetupGuideMeta');if(meta)meta.textContent=complete+' of '+values.length+' core parameters currently defined.';
    const btn=el('openThesisSetupGuideBtn');if(btn)btn.textContent=pct?'Continue guided setup →':'Start guided setup →';
  }

  window.QuireGuidedLaunch={open,close,renderReadiness,readiness,projectReadiness,renderGuide,renderThesisSetupGuide};
  window.QuireLaunch={open,close,readiness:projectReadiness,renderGuide};
})();