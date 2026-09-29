/* Quire Data Model v1
 * Canonical client-side project store.
 * This mirrors the relational schema in /supabase/schema.sql so the app can
 * migrate to cloud persistence without changing its conceptual model.
 */
(function(){
  const STORE_KEY = 'quire:v1';
  const LEGACY_SETUP_KEY = 'quireStudySetup';
  const LEGACY_PROGRESS_KEY = 'quireProjectProgress';

  const nowIso = () => new Date().toISOString();
  const uid = (prefix='id') => {
    const raw = (globalThis.crypto && crypto.randomUUID)
      ? crypto.randomUUID()
      : Date.now().toString(36) + Math.random().toString(36).slice(2);
    return prefix + '_' + raw;
  };

  const clone = value => JSON.parse(JSON.stringify(value));

  const emptyState = () => ({
    version: 1,
    activeProjectId: null,
    projects: [],
    studySetups: [],
    objectives: [],
    chapters: [],
    sections: [],
    articles: [],
    highlights: [],
    notes: [],
    themes: [],
    articleThemes: [],
    evidenceLinks: [],
    milestones: [],
    progressSnapshots: [],
    aiThreads: [],
    aiMessages: [],
    reviewRounds: [],
    feedbackItems: [],
    sectionVersions: [],
    searchPlans: [],
    searchRuns: [],
    screeningRecords: []
  });

  function readJson(key, fallback=null){
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch(e) {
      return fallback;
    }
  }

  function writeState(state, options={}){
    state.version = 1;
    localStorage.setItem(STORE_KEY, JSON.stringify(state));
    if(!options.silent){
      window.dispatchEvent(new CustomEvent('quire:store-changed',{detail:{activeProjectId:state.activeProjectId}}));
    }
    return state;
  }

  function replaceState(nextState, options={}){
    if(!nextState || !Array.isArray(nextState.projects)) throw new Error('Invalid Quire state.');
    return clone(writeState(clone(nextState), options));
  }

  function defaultChapters(projectId){
    const titles = [
      ['1','Introduction'],
      ['2','Literature Review'],
      ['3','Methodology'],
      ['4','Results / Findings'],
      ['5','Discussion'],
      ['6','Conclusion']
    ];
    return titles.map(([number,title],index)=>({
      id: uid('chapter'),
      projectId,
      number,
      title,
      orderIndex:index+1,
      targetWordCount:null,
      currentWordCount:0,
      status:index < 2 ? 'in_progress' : 'not_started',
      createdAt:nowIso(),
      updatedAt:nowIso()
    }));
  }

  function defaultObjectives(projectId){
    return [
      {id:uid('objective'),projectId,orderIndex:1,title:'Explore educational needs',description:'',status:'active',createdAt:nowIso(),updatedAt:nowIso()},
      {id:uid('objective'),projectId,orderIndex:2,title:'Identify barriers to self-management',description:'',status:'active',createdAt:nowIso(),updatedAt:nowIso()},
      {id:uid('objective'),projectId,orderIndex:3,title:'Evaluate specialist support',description:'',status:'active',createdAt:nowIso(),updatedAt:nowIso()}
    ];
  }

  function defaultThemes(projectId){
    return ['Patient education','Confidence','Follow-up','Quality of life'].map(name=>({
      id:uid('theme'),projectId,name,description:'',createdAt:nowIso(),updatedAt:nowIso()
    }));
  }

  function normalizeProgress(input={}){
    return {
      currentWords:Number(input.currentWords ?? input.current_words ?? 0) || 0,
      wordsPerWeek:Number(input.wordsPerWeek ?? input.words_per_week ?? 0) || 0,
      articlesTotal:Number(input.articlesTotal ?? input.articles_total ?? 0) || 0,
      articlesReviewed:Number(input.articlesReviewed ?? input.articles_reviewed ?? 0) || 0,
      chaptersTotal:Number(input.chaptersTotal ?? input.chapters_total ?? 0) || 0,
      chaptersDeveloped:Number(input.chaptersDeveloped ?? input.chapters_developed ?? 0) || 0,
      milestonesTotal:Number(input.milestonesTotal ?? input.milestones_total ?? 0) || 0,
      milestonesComplete:Number(input.milestonesComplete ?? input.milestones_complete ?? 0) || 0,
      highlights:Number(input.highlights ?? 0) || 0,
      notes:Number(input.notes ?? 0) || 0,
      evidenceLinks:Number(input.evidenceLinks ?? input.evidence_links ?? 0) || 0,
      sectionsTotal:Number(input.sectionsTotal ?? input.sections_total ?? 0) || 0,
      sectionsWithEvidence:Number(input.sectionsWithEvidence ?? input.sections_with_evidence ?? 0) || 0,
      overallProgress:Number(input.overallProgress ?? input.overall_progress ?? 0) || 0,
      source:input.source || 'legacy'
    };
  }

  function createInitialState(){
    const state = emptyState();
    const legacySetup = readJson(LEGACY_SETUP_KEY,{}) || {};
    const legacyProgress = normalizeProgress(readJson(LEGACY_PROGRESS_KEY,{}) || {});
    const projectId = uid('project');
    const ts = nowIso();

    state.activeProjectId = projectId;
    state.projects.push({
      id:projectId,
      title:legacySetup.thesisTitle || 'Patient education and stoma self-management',
      degreeName:legacySetup.degreeName || '',
      institutionName:legacySetup.institutionName || '',
      supervisorName:'',
      researchQuestion:legacySetup.researchQuestion || 'How can patient education support self-management after stoma formation?',
      abstract:'',
      wordTarget:Number(legacySetup.wordCount) || null,
      proposalWordTarget:Number(legacySetup.proposalWordCount) || null,
      startDate:null,
      finalDeadline:legacySetup.finalDeadline || null,
      status:'active',
      createdAt:ts,
      updatedAt:ts
    });

    state.studySetups.push({
      id:uid('setup'),
      projectId,
      studyType:legacySetup.studyType || '',
      population:legacySetup.population || '',
      studySetting:legacySetup.studySetting || '',
      methodNotes:legacySetup.methodNotes || '',
      analysis:Array.isArray(legacySetup.analysis) ? legacySetup.analysis : [],
      analysisSoftware:legacySetup.analysisSoftware || '',
      analysisRule:legacySetup.analysisRule || '',
      analysisNotes:legacySetup.analysisNotes || '',
      proposalRequired:legacySetup.proposalRequired ?? true,
      ethicsRequired:legacySetup.ethicsRequired ?? true,
      dataManagementRequired:legacySetup.dataManagementRequired ?? false,
      protocolRegistration:legacySetup.protocolRegistration ?? false,
      proposalRequirements:legacySetup.proposalRequirements || '',
      proposalDeadline:legacySetup.proposalDeadline || '',
      ethicsDeadline:legacySetup.ethicsDeadline || '',
      dataStart:legacySetup.dataStart || '',
      dataEnd:legacySetup.dataEnd || '',
      draftDeadline:legacySetup.draftDeadline || '',
      aiTailorMethod:legacySetup.aiTailorMethod ?? true,
      aiMethodChecks:legacySetup.aiMethodChecks ?? true,
      aiProtectVoice:legacySetup.aiProtectVoice ?? true,
      aiEvidenceLinks:legacySetup.aiEvidenceLinks ?? true,
      designDetails:{
        qualDesign:legacySetup.qualDesign || '',
        qualSampling:legacySetup.qualSampling || '',
        qualCollection:legacySetup.qualCollection || '',
        qualSampleSize:legacySetup.qualSampleSize || '',
        quantDesign:legacySetup.quantDesign || '',
        quantSampling:legacySetup.quantSampling || '',
        quantCollection:legacySetup.quantCollection || '',
        quantSampleSize:legacySetup.quantSampleSize || '',
        mixedDesign:legacySetup.mixedDesign || '',
        mixedPriority:legacySetup.mixedPriority || '',
        mixedIntegration:legacySetup.mixedIntegration || '',
        reviewType:legacySetup.reviewType || '',
        reportingFramework:legacySetup.reportingFramework || '',
        databases:legacySetup.databases || '',
        eligibilityFramework:legacySetup.eligibilityFramework || ''
      },
      createdAt:ts,
      updatedAt:ts
    });

    state.objectives.push(...defaultObjectives(projectId));
    state.chapters.push(...defaultChapters(projectId));
    state.themes.push(...defaultThemes(projectId));

    // Seed only the papers currently represented in the prototype.
    const articleSeeds = [
      ['Living with a stoma: self-management needs and educational priorities','Andersson, P.; Clarke, M.; Patel, R.','Journal of Clinical Nursing',2025,'reviewed'],
      ['Supporting adaptation following ostomy surgery: a qualitative synthesis','Reed, J. et al.','International Journal of Nursing Studies',2024,'reviewed'],
      ['Quality of life outcomes in adults after stoma formation','Bianchi, L. et al.','Colorectal Disease',2023,'unread']
    ];
    articleSeeds.forEach(([title,authors,journal,year,status])=>{
      state.articles.push({
        id:uid('article'),projectId,title,authors,journal,year,doi:'',abstract:'',
        pdfPath:'',readingStatus:status,aiProcessed:false,citationData:{},
        createdAt:ts,updatedAt:ts
      });
    });

    state.progressSnapshots.push({
      id:uid('progress'),
      projectId,
      snapshotDate:ts.slice(0,10),
      ...legacyProgress,
      source:'legacy',
      createdAt:ts
    });

    syncMilestonesFromSetup(state, projectId);
    return writeState(state);
  }

  function normalizeStateShape(state){
    const collections=[
      'projects','studySetups','objectives','chapters','sections','articles','highlights','notes','themes',
      'articleThemes','evidenceLinks','milestones','progressSnapshots','aiThreads','aiMessages',
      'reviewRounds','feedbackItems','sectionVersions','searchPlans','searchRuns','screeningRecords'
    ];
    collections.forEach(key=>{if(!Array.isArray(state[key])) state[key]=[];});
    return state;
  }

  function getState(){
    const existing = readJson(STORE_KEY,null);
    if(existing && existing.version === 1) return normalizeStateShape(existing);
    return normalizeStateShape(createInitialState());
  }

  function getActiveProjectId(state=getState()){
    return state.activeProjectId || state.projects[0]?.id || null;
  }

  function getActiveProject(){
    const state=getState();
    const id=getActiveProjectId(state);
    return clone(state.projects.find(p=>p.id===id) || null);
  }

  function createProject(input={}){
    const state=getState();
    const id=uid('project');
    const ts=nowIso();
    state.projects.push({
      id,
      title:input.title || 'Untitled thesis',
      degreeName:input.degreeName || '',
      institutionName:input.institutionName || '',
      supervisorName:input.supervisorName || '',
      researchQuestion:input.researchQuestion || '',
      abstract:'',
      wordTarget:Number(input.wordTarget) || null,
      proposalWordTarget:Number(input.proposalWordTarget) || null,
      startDate:input.startDate || null,
      finalDeadline:input.finalDeadline || null,
      status:'active',
      createdAt:ts,
      updatedAt:ts
    });
    state.studySetups.push({
      id:uid('setup'),projectId:id,
      studyType:input.studyType || '',
      population:input.population || '',
      studySetting:input.studySetting || '',
      methodNotes:input.methodNotes || '',
      analysis:[],analysisSoftware:'',analysisRule:'',analysisNotes:'',
      proposalRequired:input.proposalRequired ?? true,
      ethicsRequired:input.ethicsRequired ?? true,
      dataManagementRequired:false,protocolRegistration:false,
      proposalRequirements:'',
      proposalDeadline:input.proposalDeadline || '',
      ethicsDeadline:'',dataStart:'',dataEnd:'',draftDeadline:'',
      aiTailorMethod:true,aiMethodChecks:true,aiProtectVoice:true,aiEvidenceLinks:true,
      designDetails:{},createdAt:ts,updatedAt:ts
    });

    const objectiveTitles=Array.isArray(input.objectives)
      ? input.objectives.map(x=>String(x||'').trim()).filter(Boolean)
      : [];
    state.objectives.push(...objectiveTitles.map((title,index)=>({
      id:uid('objective'),projectId:id,orderIndex:index+1,title,description:'',status:'active',createdAt:ts,updatedAt:ts
    })));

    const chapterInput=Array.isArray(input.chapters)&&input.chapters.length?input.chapters:null;
    const chapterRows=chapterInput
      ? chapterInput.map((item,index)=>{
          const value=typeof item==='string'?{title:item}:item;
          return {
            id:uid('chapter'),projectId:id,
            number:String(value.number||index+1),
            title:String(value.title||('Chapter '+(index+1))).trim(),
            orderIndex:index+1,targetWordCount:Number(value.targetWordCount)||null,
            currentWordCount:0,status:index===0?'in_progress':'not_started',
            createdAt:ts,updatedAt:ts
          };
        })
      : defaultChapters(id);
    state.chapters.push(...chapterRows);

    const themeNames=Array.isArray(input.themes)
      ? input.themes.map(x=>String(x||'').trim()).filter(Boolean)
      : [];
    state.themes.push(...themeNames.map(name=>({
      id:uid('theme'),projectId:id,name,description:'',createdAt:ts,updatedAt:ts
    })));

    state.progressSnapshots.push({
      id:uid('progress'),projectId:id,snapshotDate:ts.slice(0,10),
      ...normalizeProgress({currentWords:0,wordsPerWeek:0,articlesTotal:0,articlesReviewed:0,chaptersTotal:chapterRows.length,chaptersDeveloped:0,milestonesTotal:0,milestonesComplete:0,highlights:0,notes:0,source:'legacy'}),
      source:'legacy',
      createdAt:ts
    });
    syncMilestonesFromSetup(state,id);
    state.activeProjectId=id;
    writeState(state);
    return clone(state.projects.find(p=>p.id===id));
  }


  function updateProject(projectId,patch={}){
    const state=getState();
    const project=state.projects.find(p=>p.id===projectId);
    if(!project) return null;
    const allowed=['title','degreeName','institutionName','supervisorName','researchQuestion','abstract','wordTarget','proposalWordTarget','startDate','finalDeadline','status'];
    allowed.forEach(key=>{
      if(Object.prototype.hasOwnProperty.call(patch,key)) project[key]=patch[key];
    });
    project.updatedAt=nowIso();
    if(Object.prototype.hasOwnProperty.call(patch,'finalDeadline')) syncMilestonesFromSetup(state,projectId);
    writeState(state);
    return clone(project);
  }

  function archiveProject(projectId){
    const state=getState();
    const project=state.projects.find(p=>p.id===projectId);
    if(!project) return false;
    project.status='archived';
    project.updatedAt=nowIso();
    if(state.activeProjectId===projectId){
      const next=state.projects.find(p=>p.id!==projectId && p.status!=='archived') || state.projects.find(p=>p.id!==projectId);
      if(next) state.activeProjectId=next.id;
    }
    writeState(state);
    return true;
  }

  function restoreProject(projectId){
    return updateProject(projectId,{status:'active'});
  }

  function listProjects({includeArchived=true}={}){
    const state=getState();
    return clone(state.projects.filter(p=>includeArchived || p.status!=='archived')
      .sort((a,b)=>(b.updatedAt||'').localeCompare(a.updatedAt||'')));
  }

  function setActiveProject(projectId){
    const state=getState();
    if(!state.projects.some(p=>p.id===projectId)) return false;
    state.activeProjectId=projectId;
    writeState(state);
    return true;
  }

  function getStudySetupData(projectId){
    const state=getState();
    projectId=projectId || getActiveProjectId(state);
    const project=state.projects.find(p=>p.id===projectId) || {};
    const setup=state.studySetups.find(s=>s.projectId===projectId) || {};
    const d=setup.designDetails || {};
    return clone({
      studyType:setup.studyType || '',
      thesisTitle:project.title || '',
      wordCount:project.wordTarget || '',
      proposalWordCount:project.proposalWordTarget || '',
      degreeName:project.degreeName || '',
      institutionName:project.institutionName || '',
      researchQuestion:project.researchQuestion || '',
      proposalDeadline:setup.proposalDeadline || '',
      ethicsDeadline:setup.ethicsDeadline || '',
      dataStart:setup.dataStart || '',
      dataEnd:setup.dataEnd || '',
      draftDeadline:setup.draftDeadline || '',
      finalDeadline:project.finalDeadline || '',
      qualDesign:d.qualDesign || '',
      qualSampling:d.qualSampling || '',
      qualCollection:d.qualCollection || '',
      qualSampleSize:d.qualSampleSize || '',
      quantDesign:d.quantDesign || '',
      quantSampling:d.quantSampling || '',
      quantCollection:d.quantCollection || '',
      quantSampleSize:d.quantSampleSize || '',
      mixedDesign:d.mixedDesign || '',
      mixedPriority:d.mixedPriority || '',
      mixedIntegration:d.mixedIntegration || '',
      reviewType:d.reviewType || '',
      reportingFramework:d.reportingFramework || '',
      databases:d.databases || '',
      eligibilityFramework:d.eligibilityFramework || '',
      population:setup.population || '',
      studySetting:setup.studySetting || '',
      methodNotes:setup.methodNotes || '',
      analysis:Array.isArray(setup.analysis) ? setup.analysis : [],
      analysisSoftware:setup.analysisSoftware || '',
      analysisRule:setup.analysisRule || '',
      analysisNotes:setup.analysisNotes || '',
      proposalRequired:setup.proposalRequired ?? true,
      ethicsRequired:setup.ethicsRequired ?? true,
      dataManagementRequired:setup.dataManagementRequired ?? false,
      protocolRegistration:setup.protocolRegistration ?? false,
      proposalRequirements:setup.proposalRequirements || '',
      aiTailorMethod:setup.aiTailorMethod ?? true,
      aiMethodChecks:setup.aiMethodChecks ?? true,
      aiProtectVoice:setup.aiProtectVoice ?? true,
      aiEvidenceLinks:setup.aiEvidenceLinks ?? true
    });
  }

  function saveStudySetupData(data, projectId){
    const state=getState();
    projectId=projectId || getActiveProjectId(state);
    const ts=nowIso();
    let project=state.projects.find(p=>p.id===projectId);
    if(!project) throw new Error('Active project not found');

    project.title=data.thesisTitle || project.title;
    project.wordTarget=data.wordCount ? Number(data.wordCount) : null;
    project.proposalWordTarget=data.proposalWordCount ? Number(data.proposalWordCount) : null;
    project.degreeName=data.degreeName || '';
    project.institutionName=data.institutionName || '';
    project.researchQuestion=data.researchQuestion || '';
    project.finalDeadline=data.finalDeadline || null;
    project.updatedAt=ts;

    let setup=state.studySetups.find(s=>s.projectId===projectId);
    if(!setup){
      setup={id:uid('setup'),projectId,createdAt:ts};
      state.studySetups.push(setup);
    }
    Object.assign(setup,{
      studyType:data.studyType || '',
      population:data.population || '',
      studySetting:data.studySetting || '',
      methodNotes:data.methodNotes || '',
      analysis:Array.isArray(data.analysis) ? data.analysis : [],
      analysisSoftware:data.analysisSoftware || '',
      analysisRule:data.analysisRule || '',
      analysisNotes:data.analysisNotes || '',
      proposalRequired:Boolean(data.proposalRequired),
      ethicsRequired:Boolean(data.ethicsRequired),
      dataManagementRequired:Boolean(data.dataManagementRequired),
      protocolRegistration:Boolean(data.protocolRegistration),
      proposalRequirements:data.proposalRequirements || '',
      proposalDeadline:data.proposalDeadline || '',
      ethicsDeadline:data.ethicsDeadline || '',
      dataStart:data.dataStart || '',
      dataEnd:data.dataEnd || '',
      draftDeadline:data.draftDeadline || '',
      aiTailorMethod:Boolean(data.aiTailorMethod),
      aiMethodChecks:Boolean(data.aiMethodChecks),
      aiProtectVoice:Boolean(data.aiProtectVoice),
      aiEvidenceLinks:Boolean(data.aiEvidenceLinks),
      designDetails:{
        ...(setup.designDetails || {}),
        qualDesign:data.qualDesign || '',qualSampling:data.qualSampling || '',qualCollection:data.qualCollection || '',qualSampleSize:data.qualSampleSize || '',
        quantDesign:data.quantDesign || '',quantSampling:data.quantSampling || '',quantCollection:data.quantCollection || '',quantSampleSize:data.quantSampleSize || '',
        mixedDesign:data.mixedDesign || '',mixedPriority:data.mixedPriority || '',mixedIntegration:data.mixedIntegration || '',
        reviewType:data.reviewType || '',reportingFramework:data.reportingFramework || '',databases:data.databases || '',eligibilityFramework:data.eligibilityFramework || ''
      },
      updatedAt:ts
    });
    syncMilestonesFromSetup(state, projectId);
    writeState(state);
    return getStudySetupData(projectId);
  }

  function syncMilestonesFromSetup(state, projectId){
    const project=state.projects.find(p=>p.id===projectId) || {};
    const setup=state.studySetups.find(s=>s.projectId===projectId) || {};
    const defs=[
      ['proposal','Proposal submission',setup.proposalDeadline],
      ['ethics','Ethics submission',setup.ethicsDeadline],
      ['data_start','Data collection / screening begins',setup.dataStart],
      ['data_end','Data collection / screening ends',setup.dataEnd],
      ['draft','First full draft',setup.draftDeadline],
      ['submission','Final submission',project.finalDeadline]
    ];
    defs.forEach(([type,title,dueDate],index)=>{
      let row=state.milestones.find(m=>m.projectId===projectId && m.type===type);
      if(!dueDate){
        if(row) row.dueDate=null;
        return;
      }
      if(!row){
        row={id:uid('milestone'),projectId,type,title,orderIndex:index+1,status:'not_started',createdAt:nowIso()};
        state.milestones.push(row);
      }
      row.title=title;
      row.dueDate=dueDate;
      row.updatedAt=nowIso();
    });
  }


  function getMethodWorkspace(projectId){
    const state=getState();projectId=projectId||getActiveProjectId(state);
    const setup=state.studySetups.find(s=>s.projectId===projectId);
    return clone(setup?.designDetails?.workspace || {});
  }

  function saveMethodWorkspace(workspace={},projectId){
    const state=getState();projectId=projectId||getActiveProjectId(state);
    let setup=state.studySetups.find(s=>s.projectId===projectId);
    if(!setup){
      const ts=nowIso();setup={id:uid('setup'),projectId,designDetails:{},createdAt:ts,updatedAt:ts};state.studySetups.push(setup);
    }
    setup.designDetails={...(setup.designDetails||{}),workspace:{...(setup.designDetails?.workspace||{}),...workspace}};
    setup.updatedAt=nowIso();writeState(state);
    return clone(setup.designDetails.workspace);
  }

  function localDateKey(date=new Date()){
    const y=date.getFullYear();
    const m=String(date.getMonth()+1).padStart(2,'0');
    const d=String(date.getDate()).padStart(2,'0');
    return y+'-'+m+'-'+d;
  }

  function getProgressSnapshots(projectId,{derivedOnly=false}={}){
    const state=getState();
    projectId=projectId || getActiveProjectId(state);
    return clone(state.progressSnapshots.filter(p=>p.projectId===projectId && (!derivedOnly || p.source==='derived'))
      .sort((a,b)=>(a.snapshotDate||'').localeCompare(b.snapshotDate||'') || (a.createdAt||'').localeCompare(b.createdAt||'')));
  }

  function observedWritingPace(state,projectId,currentWords){
    const today=new Date();
    const todayKey=localDateKey(today);
    const rows=state.progressSnapshots.filter(p=>p.projectId===projectId && p.source==='derived' && p.snapshotDate!==todayKey)
      .sort((a,b)=>(b.snapshotDate||'').localeCompare(a.snapshotDate||''));
    if(!rows.length) return {wordsPerWeek:0,windowDays:0,baseline:null};
    const cutoff=new Date(today);cutoff.setDate(cutoff.getDate()-35);
    const eligible=rows.filter(row=>{
      const d=new Date((row.snapshotDate||'')+'T12:00:00');
      return !Number.isNaN(d.getTime()) && d>=cutoff;
    });
    const baseline=(eligible.length?eligible:rows).slice(-1)[0];
    const baselineDate=new Date((baseline.snapshotDate||'')+'T12:00:00');
    const days=Math.max(1,Math.round((today-baselineDate)/86400000));
    const delta=Math.max(0,Number(currentWords)-Number(baseline.currentWords||0));
    return {
      wordsPerWeek:days>=1?Math.round(delta/(days/7)):0,
      windowDays:days,
      baseline:clone(baseline)
    };
  }

  function computeLiveProgress(projectId){
    const state=getState();
    projectId=projectId || getActiveProjectId(state);
    const project=state.projects.find(p=>p.id===projectId)||{};
    const setup=state.studySetups.find(s=>s.projectId===projectId)||{};
    const articles=state.articles.filter(a=>a.projectId===projectId && a.readingStatus!=='archived');
    const chapters=state.chapters.filter(ch=>ch.projectId===projectId);
    const sections=state.sections.filter(sec=>sec.projectId===projectId);
    const milestones=state.milestones.filter(m=>m.projectId===projectId && m.status!=='skipped' && (m.dueDate || m.status==='complete'));
    const highlights=state.highlights.filter(h=>h.projectId===projectId);
    const notes=state.notes.filter(n=>n.projectId===projectId);
    const evidence=state.evidenceLinks.filter(e=>e.projectId===projectId);
    const objectives=state.objectives.filter(o=>o.projectId===projectId && o.status!=='archived');
    const themes=state.themes.filter(t=>t.projectId===projectId);

    const currentWords=sections.reduce((sum,sec)=>sum+Math.max(0,Number(sec.currentWordCount)||0),0);
    const articlesReviewed=articles.filter(a=>a.readingStatus==='reviewed').length;
    const chaptersDeveloped=chapters.filter(ch=>{
      const chapterSections=sections.filter(sec=>sec.chapterId===ch.id);
      const words=chapterSections.reduce((sum,sec)=>sum+Math.max(0,Number(sec.currentWordCount)||0),0);
      return ch.status==='complete' || ch.status==='review' || (words>0 && ['in_progress','outlined'].includes(ch.status));
    }).length;
    const milestonesComplete=milestones.filter(m=>m.status==='complete').length;

    const evidenceArticleIds=new Set();
    const evidenceSectionIds=new Set();
    const evidenceObjectiveIds=new Set();
    const evidenceThemeIds=new Set();
    evidence.forEach(link=>{
      let articleId=link.articleId;
      if(!articleId&&link.highlightId) articleId=highlights.find(h=>h.id===link.highlightId)?.articleId;
      if(articleId)evidenceArticleIds.add(articleId);
      if(link.sectionId)evidenceSectionIds.add(link.sectionId);
      if(link.objectiveId)evidenceObjectiveIds.add(link.objectiveId);
      if(link.themeId)evidenceThemeIds.add(link.themeId);
    });
    state.articleThemes.forEach(row=>{
      const article=articles.find(a=>a.id===row.articleId);
      if(article)evidenceThemeIds.add(row.themeId);
    });

    const ratio=(num,den)=>den?Math.min(1,num/den):0;
    const wordTarget=Number(project.wordTarget)||0;
    const writingRatio=ratio(currentWords,wordTarget);
    const researchRatio=ratio(articlesReviewed,articles.length);
    const chapterRatio=ratio(chaptersDeveloped,chapters.length);
    const milestoneRatio=ratio(milestonesComplete,milestones.length);
    const evidenceRatios=[];
    if(articles.length)evidenceRatios.push(ratio(evidenceArticleIds.size,articles.length));
    if(sections.length)evidenceRatios.push(ratio(evidenceSectionIds.size,sections.length));
    if(objectives.length)evidenceRatios.push(ratio(evidenceObjectiveIds.size,objectives.length));
    if(themes.length)evidenceRatios.push(ratio(evidenceThemeIds.size,themes.length));
    const evidenceRatio=evidenceRatios.length?evidenceRatios.reduce((a,b)=>a+b,0)/evidenceRatios.length:0;

    const setupFields=[
      setup.studyType,project.title,project.wordTarget,project.researchQuestion,project.finalDeadline,
      setup.population,setup.studySetting,setup.analysisSoftware,
      Array.isArray(setup.analysis)&&setup.analysis.length?'analysis':''
    ];
    const setupRatio=setupFields.filter(Boolean).length/setupFields.length;

    const overallProgress=Math.round((
      writingRatio*.35 + researchRatio*.15 + evidenceRatio*.15 +
      chapterRatio*.15 + milestoneRatio*.10 + setupRatio*.10
    )*100);

    const pace=observedWritingPace(state,projectId,currentWords);
    return clone({
      projectId,
      currentWords,
      wordTarget,
      wordsPerWeek:pace.wordsPerWeek,
      paceWindowDays:pace.windowDays,
      articlesTotal:articles.length,
      articlesReviewed,
      chaptersTotal:chapters.length,
      chaptersDeveloped,
      milestonesTotal:milestones.length,
      milestonesComplete,
      highlights:highlights.length,
      notes:notes.length,
      evidenceLinks:evidence.length,
      evidenceArticles:evidenceArticleIds.size,
      sectionsTotal:sections.length,
      sectionsWithEvidence:evidenceSectionIds.size,
      objectivesTotal:objectives.length,
      objectivesWithEvidence:evidenceObjectiveIds.size,
      themesTotal:themes.length,
      themesWithEvidence:evidenceThemeIds.size,
      writingRatio,
      researchRatio,
      evidenceRatio,
      chapterRatio,
      milestoneRatio,
      setupRatio,
      overallProgress
    });
  }

  function getLatestProgress(projectId){
    const state=getState();
    projectId=projectId || getActiveProjectId(state);
    const rows=state.progressSnapshots.filter(p=>p.projectId===projectId && p.source==='derived')
      .sort((a,b)=>(b.snapshotDate||'').localeCompare(a.snapshotDate||'') || (b.createdAt||'').localeCompare(a.createdAt||''));
    return clone(rows[0] || normalizeProgress({source:'derived'}));
  }

  function saveProgressSnapshot(progress, projectId, options={}){
    const state=getState();
    projectId=projectId || getActiveProjectId(state);
    const normalized=normalizeProgress({...progress,source:progress.source||'derived'});
    const ts=nowIso();
    const snapshotDate=options.snapshotDate||localDateKey(new Date());
    state.progressSnapshots.push({
      id:uid('progress'),projectId,snapshotDate,...normalized,source:normalized.source||'derived',createdAt:ts
    });
    writeState(state);
    return clone(state.progressSnapshots[state.progressSnapshots.length-1]);
  }

  function captureDailyProgressSnapshot(projectId){
    const state=getState();
    projectId=projectId || getActiveProjectId(state);
    const live=computeLiveProgress(projectId);
    const today=localDateKey(new Date());
    const ts=nowIso();
    const snapshot={
      currentWords:live.currentWords,
      wordsPerWeek:live.wordsPerWeek,
      articlesTotal:live.articlesTotal,
      articlesReviewed:live.articlesReviewed,
      chaptersTotal:live.chaptersTotal,
      chaptersDeveloped:live.chaptersDeveloped,
      milestonesTotal:live.milestonesTotal,
      milestonesComplete:live.milestonesComplete,
      highlights:live.highlights,
      notes:live.notes,
      evidenceLinks:live.evidenceLinks,
      sectionsTotal:live.sectionsTotal,
      sectionsWithEvidence:live.sectionsWithEvidence,
      overallProgress:live.overallProgress,
      source:'derived'
    };
    let row=state.progressSnapshots.find(p=>p.projectId===projectId && p.snapshotDate===today && p.source==='derived');
    const comparable=Object.keys(snapshot);
    if(row){
      const changed=comparable.some(k=>String(row[k]??'')!==String(snapshot[k]??''));
      if(!changed) return clone(row);
      Object.assign(row,snapshot,{createdAt:row.createdAt||ts,updatedAt:ts});
    }else{
      row={id:uid('progress'),projectId,snapshotDate:today,...snapshot,createdAt:ts,updatedAt:ts};
      state.progressSnapshots.push(row);
    }
    writeState(state);
    return clone(row);
  }

  function listMilestones(projectId){
    const state=getState();
    projectId=projectId || getActiveProjectId(state);
    return clone(state.milestones.filter(m=>m.projectId===projectId)
      .sort((a,b)=>(a.orderIndex||999)-(b.orderIndex||999) || String(a.dueDate||'').localeCompare(String(b.dueDate||''))));
  }

  function updateMilestone(milestoneId,patch={}){
    const state=getState();
    const row=state.milestones.find(m=>m.id===milestoneId);
    if(!row) return null;
    ['title','description','orderIndex','dueDate','status'].forEach(key=>{
      if(Object.prototype.hasOwnProperty.call(patch,key)) row[key]=patch[key];
    });
    if(row.status==='complete'&&!row.completedAt) row.completedAt=nowIso();
    if(row.status!=='complete') row.completedAt=null;
    row.updatedAt=nowIso();
    writeState(state);
    return clone(row);
  }


  function listArticles(projectId){
    const state=getState();
    projectId=projectId || getActiveProjectId(state);
    return clone(state.articles.filter(a=>a.projectId===projectId));
  }

  function getArticle(articleId){
    const state=getState();
    return clone(state.articles.find(a=>a.id===articleId) || null);
  }

  function addArticle(data={}, projectId){
    const state=getState();
    projectId=projectId || getActiveProjectId(state);
    if(!projectId) throw new Error('No active thesis project.');
    const ts=nowIso();
    const article={
      id:uid('article'),
      projectId,
      title:data.title || 'Untitled article',
      authors:data.authors || '',
      journal:data.journal || '',
      year:data.year || null,
      doi:data.doi || '',
      abstract:data.abstract || '',
      pdfPath:data.pdfPath || '',
      sourceUrl:data.sourceUrl || '',
      readingStatus:data.readingStatus || 'unread',
      aiProcessed:Boolean(data.aiProcessed),
      citationData:data.citationData || {},
      createdAt:ts,
      updatedAt:ts
    };
    state.articles.push(article);
    writeState(state);
    return clone(article);
  }

  function updateArticle(articleId,patch={}){
    const state=getState();
    const article=state.articles.find(a=>a.id===articleId);
    if(!article) return null;
    const allowed=['title','authors','journal','year','doi','abstract','pdfPath','sourceUrl','readingStatus','aiProcessed','citationData'];
    allowed.forEach(key=>{
      if(Object.prototype.hasOwnProperty.call(patch,key)) article[key]=patch[key];
    });
    article.updatedAt=nowIso();
    writeState(state);
    return clone(article);
  }


  function referenceDoi(value=''){
    return String(value||'').trim()
      .replace(/^doi:\s*/i,'')
      .replace(/^https?:\/\/(?:dx\.)?doi\.org\//i,'')
      .replace(/[\s.,;]+$/,'')
      .toLowerCase();
  }

  function referenceTitle(value=''){
    return String(value||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
  }

  function upsertArticles(items=[], projectId){
    const state=getState();
    projectId=projectId||getActiveProjectId(state);
    if(!projectId) throw new Error('No active thesis project.');
    const report={added:0,updated:0,skipped:0,total:Array.isArray(items)?items.length:0,articles:[]};
    const ts=nowIso();

    for(const incoming of (Array.isArray(items)?items:[])){
      if(!incoming?.title){report.skipped++;continue;}
      const doi=referenceDoi(incoming.doi);
      const titleKey=referenceTitle(incoming.title);
      let article=state.articles.find(a=>a.projectId===projectId && doi && referenceDoi(a.doi)===doi);
      if(!article && titleKey){
        article=state.articles.find(a=>a.projectId===projectId && referenceTitle(a.title)===titleKey);
      }

      if(article){
        for(const key of ['title','authors','journal','year','doi','abstract','sourceUrl']){
          if(incoming[key]!=null && incoming[key]!=='') article[key]=incoming[key];
        }
        article.citationData={...(article.citationData||{})};
        for(const [key,value] of Object.entries(incoming.citationData||{})){
          const empty=value==null||value===''||(Array.isArray(value)&&!value.length);
          if(!empty) article.citationData[key]=value;
        }
        article.updatedAt=ts;
        report.updated++;
        report.articles.push(clone(article));
      }else{
        const created={
          id:uid('article'),projectId,
          title:incoming.title||'Untitled article',
          authors:incoming.authors||'',
          journal:incoming.journal||'',
          year:incoming.year||null,
          doi:incoming.doi||'',
          abstract:incoming.abstract||'',
          pdfPath:incoming.pdfPath||'',
          sourceUrl:incoming.sourceUrl||'',
          readingStatus:incoming.readingStatus||'unread',
          aiProcessed:Boolean(incoming.aiProcessed),
          citationData:incoming.citationData||{},
          createdAt:ts,updatedAt:ts
        };
        state.articles.push(created);
        report.added++;
        report.articles.push(clone(created));
      }
    }

    if(report.added||report.updated) writeState(state);
    return report;
  }

  function removeArticle(articleId){
    const state=getState();
    const article=state.articles.find(a=>a.id===articleId);
    if(!article) return false;
    state.highlights=state.highlights.filter(h=>h.articleId!==articleId);
    state.notes=state.notes.filter(n=>n.articleId!==articleId);
    state.articleThemes=state.articleThemes.filter(x=>x.articleId!==articleId);
    state.evidenceLinks=state.evidenceLinks.filter(x=>x.articleId!==articleId);
    state.articles=state.articles.filter(a=>a.id!==articleId);
    writeState(state);
    return true;
  }


  function listHighlights(articleId){
    const state=getState();
    return clone(state.highlights.filter(h=>!articleId || h.articleId===articleId)
      .sort((a,b)=>(a.pageNumber||0)-(b.pageNumber||0) || (a.createdAt||'').localeCompare(b.createdAt||'')));
  }

  function getHighlight(highlightId){
    const state=getState();
    return clone(state.highlights.find(h=>h.id===highlightId) || null);
  }

  function addHighlight(data={}){
    const state=getState();
    const article=state.articles.find(a=>a.id===data.articleId);
    if(!article) throw new Error('Article not found.');
    const ts=nowIso();
    const highlight={
      id:uid('highlight'),projectId:article.projectId,articleId:article.id,
      pageNumber:Number(data.pageNumber)||null,
      highlightedText:data.highlightedText || '',
      color:data.color || 'yellow',
      category:data.category || 'key_finding',
      pdfAnchor:data.pdfAnchor || {},
      createdAt:ts,updatedAt:ts
    };
    state.highlights.push(highlight);
    writeState(state);
    return clone(highlight);
  }

  function updateHighlight(highlightId,patch={}){
    const state=getState();
    const row=state.highlights.find(h=>h.id===highlightId);
    if(!row) return null;
    ['color','category','highlightedText','pdfAnchor'].forEach(key=>{
      if(Object.prototype.hasOwnProperty.call(patch,key)) row[key]=patch[key];
    });
    row.updatedAt=nowIso();
    writeState(state);
    return clone(row);
  }

  function removeHighlight(highlightId){
    const state=getState();
    if(!state.highlights.some(h=>h.id===highlightId)) return false;
    state.notes=state.notes.filter(n=>n.highlightId!==highlightId);
    state.evidenceLinks=state.evidenceLinks.filter(e=>e.highlightId!==highlightId);
    state.highlights=state.highlights.filter(h=>h.id!==highlightId);
    writeState(state);
    return true;
  }

  function listNotes(articleId){
    const state=getState();
    return clone(state.notes.filter(n=>!articleId || n.articleId===articleId));
  }

  function addNote(data={}){
    const state=getState();
    const article=data.articleId ? state.articles.find(a=>a.id===data.articleId) : null;
    const projectId=data.projectId || article?.projectId || getActiveProjectId(state);
    if(!projectId) throw new Error('No active thesis project.');
    const ts=nowIso();
    const note={
      id:uid('note'),projectId,articleId:data.articleId||null,highlightId:data.highlightId||null,
      title:data.title||'',body:data.body||'',tags:Array.isArray(data.tags)?data.tags:[],
      noteType:data.noteType||'research',createdAt:ts,updatedAt:ts
    };
    state.notes.push(note);
    writeState(state);
    return clone(note);
  }

  function updateNote(noteId,patch={}){
    const state=getState();
    const row=state.notes.find(n=>n.id===noteId);
    if(!row) return null;
    ['title','body','tags','noteType'].forEach(key=>{
      if(Object.prototype.hasOwnProperty.call(patch,key)) row[key]=patch[key];
    });
    row.updatedAt=nowIso();
    writeState(state);
    return clone(row);
  }

  function listThemes(projectId){
    const state=getState(); projectId=projectId||getActiveProjectId(state);
    return clone(state.themes.filter(t=>t.projectId===projectId));
  }

  function listObjectives(projectId){
    const state=getState(); projectId=projectId||getActiveProjectId(state);
    return clone(state.objectives.filter(o=>o.projectId===projectId).sort((a,b)=>a.orderIndex-b.orderIndex));
  }


  function updateChapter(chapterId,patch={}){
    const state=getState();
    const row=state.chapters.find(c=>c.id===chapterId);
    if(!row) return null;
    ['title','number','orderIndex','targetWordCount','currentWordCount','status'].forEach(key=>{
      if(Object.prototype.hasOwnProperty.call(patch,key)) row[key]=patch[key];
    });
    row.updatedAt=nowIso();
    writeState(state);
    return clone(row);
  }

  function listSections(chapterId,projectId){
    const state=getState();
    projectId=projectId||getActiveProjectId(state);
    return clone(state.sections.filter(s=>s.projectId===projectId && (!chapterId||s.chapterId===chapterId))
      .sort((a,b)=>(a.orderIndex||0)-(b.orderIndex||0)));
  }

  function addSection(chapterId,data={}){
    const state=getState();
    const chapter=state.chapters.find(c=>c.id===chapterId);
    if(!chapter) throw new Error('Chapter not found.');
    const siblings=state.sections.filter(s=>s.chapterId===chapterId && !s.parentSectionId);
    const ts=nowIso();
    const row={
      id:uid('section'),projectId:chapter.projectId,chapterId,parentSectionId:data.parentSectionId||null,
      number:data.number||'',title:data.title||'Untitled section',
      orderIndex:data.orderIndex||siblings.length+1,content:data.content||'',
      targetWordCount:data.targetWordCount==null?null:Number(data.targetWordCount),
      currentWordCount:Number(data.currentWordCount)||0,status:data.status||'not_started',
      createdAt:ts,updatedAt:ts
    };
    state.sections.push(row);writeState(state);return clone(row);
  }

  function updateSection(sectionId,patch={}){
    const state=getState();
    const row=state.sections.find(s=>s.id===sectionId);
    if(!row) return null;
    ['parentSectionId','number','title','orderIndex','content','targetWordCount','currentWordCount','status'].forEach(key=>{
      if(Object.prototype.hasOwnProperty.call(patch,key)) row[key]=patch[key];
    });
    row.updatedAt=nowIso();
    writeState(state);return clone(row);
  }

  function removeSection(sectionId){
    const state=getState();
    if(!state.sections.some(s=>s.id===sectionId)) return false;
    const removedIds=new Set(state.sections.filter(s=>s.id===sectionId||s.parentSectionId===sectionId).map(s=>s.id));
    state.evidenceLinks=state.evidenceLinks.filter(e=>!removedIds.has(e.sectionId));
    state.aiThreads=state.aiThreads.filter(t=>!removedIds.has(t.sectionId));
    state.feedbackItems=state.feedbackItems.filter(f=>!removedIds.has(f.sectionId));
    state.sectionVersions=state.sectionVersions.filter(v=>!removedIds.has(v.sectionId));
    state.sections=state.sections.filter(s=>!removedIds.has(s.id));
    writeState(state);return true;
  }

  function reorderSections(chapterId,orderedIds=[]){
    const state=getState();
    orderedIds.forEach((id,index)=>{
      const row=state.sections.find(s=>s.id===id&&s.chapterId===chapterId);
      if(row){row.orderIndex=index+1;row.updatedAt=nowIso();}
    });
    writeState(state);return listSections(chapterId);
  }

  function listChapters(projectId){
    const state=getState(); projectId=projectId||getActiveProjectId(state);
    return clone(state.chapters.filter(ch=>ch.projectId===projectId).sort((a,b)=>a.orderIndex-b.orderIndex));
  }

  function addEvidenceLink(data={}){
    const state=getState();
    const projectId=data.projectId||getActiveProjectId(state);
    const ts=nowIso();
    const row={
      id:uid('evidence'),projectId,
      articleId:data.articleId||null,highlightId:data.highlightId||null,noteId:data.noteId||null,
      themeId:data.themeId||null,objectiveId:data.objectiveId||null,sectionId:data.sectionId||null,
      chapterId:data.chapterId||null,relationship:data.relationship||'supports',
      rationale:data.rationale||'',createdAt:ts
    };
    state.evidenceLinks.push(row);
    writeState(state);
    return clone(row);
  }


  function listEvidenceForSection(sectionId){
    const state=getState();
    return clone(state.evidenceLinks.filter(e=>e.sectionId===sectionId));
  }

  function removeEvidenceLink(linkId){
    const state=getState();
    const before=state.evidenceLinks.length;
    state.evidenceLinks=state.evidenceLinks.filter(e=>e.id!==linkId);
    if(state.evidenceLinks.length===before) return false;
    writeState(state);return true;
  }

  function listEvidenceLinks(highlightId){
    const state=getState();
    return clone(state.evidenceLinks.filter(e=>!highlightId || e.highlightId===highlightId));
  }


  function getOrCreateArticleThread(articleId, mode='article'){
    const state=getState();
    const article=state.articles.find(a=>a.id===articleId);
    if(!article) throw new Error('Article not found.');
    let thread=state.aiThreads.find(t=>t.articleId===articleId && t.mode===mode);
    if(!thread){
      const ts=nowIso();
      thread={
        id:uid('thread'),projectId:article.projectId,articleId,sectionId:null,
        mode,title:'Copilot · '+article.title,createdAt:ts,updatedAt:ts
      };
      state.aiThreads.push(thread);
      writeState(state);
    }
    return clone(thread);
  }

  function addAiMessage(threadId,role,content,sourceRefs=[]){
    const state=getState();
    const thread=state.aiThreads.find(t=>t.id===threadId);
    if(!thread) throw new Error('AI thread not found.');
    const ts=nowIso();
    const row={id:uid('message'),threadId,role,content,sourceRefs:Array.isArray(sourceRefs)?sourceRefs:[],createdAt:ts};
    state.aiMessages.push(row);
    thread.updatedAt=ts;
    writeState(state);
    return clone(row);
  }

  function listAiMessages(threadId){
    const state=getState();
    return clone(state.aiMessages.filter(m=>m.threadId===threadId)
      .sort((a,b)=>(a.createdAt||'').localeCompare(b.createdAt||'')));
  }


  function listReviewRounds(projectId){
    const state=getState();
    projectId=projectId||getActiveProjectId(state);
    return clone(state.reviewRounds.filter(r=>r.projectId===projectId)
      .sort((a,b)=>(b.createdAt||'').localeCompare(a.createdAt||'')));
  }

  function createSectionVersion(sectionId,data={}){
    const state=getState();
    const section=state.sections.find(s=>s.id===sectionId);
    if(!section) throw new Error('Section not found.');
    const ts=nowIso();
    const row={
      id:uid('version'),projectId:section.projectId,chapterId:section.chapterId,sectionId:section.id,
      reviewRoundId:data.reviewRoundId||null,
      label:data.label||('Snapshot · '+new Date(ts).toLocaleString()),
      reason:data.reason||'manual',
      sectionTitle:section.title||'',
      content:section.content||'',
      wordCount:Number(section.currentWordCount)||0,
      sectionStatus:section.status||'not_started',
      createdAt:ts
    };
    state.sectionVersions.push(row);
    writeState(state);
    return clone(row);
  }

  function listSectionVersions(sectionId,projectId){
    const state=getState();
    projectId=projectId||getActiveProjectId(state);
    return clone(state.sectionVersions.filter(v=>v.projectId===projectId && (!sectionId||v.sectionId===sectionId))
      .sort((a,b)=>(b.createdAt||'').localeCompare(a.createdAt||'')));
  }

  function restoreSectionVersion(versionId){
    const state=getState();
    const version=state.sectionVersions.find(v=>v.id===versionId);
    if(!version) throw new Error('Version not found.');
    const section=state.sections.find(s=>s.id===version.sectionId);
    if(!section) throw new Error('The section for this version no longer exists.');
    const ts=nowIso();

    state.sectionVersions.push({
      id:uid('version'),projectId:section.projectId,chapterId:section.chapterId,sectionId:section.id,
      reviewRoundId:null,label:'Before restore · '+new Date(ts).toLocaleString(),
      reason:'before_restore',sectionTitle:section.title||'',content:section.content||'',
      wordCount:Number(section.currentWordCount)||0,sectionStatus:section.status||'not_started',createdAt:ts
    });

    section.title=version.sectionTitle||section.title;
    section.content=version.content||'';
    section.currentWordCount=Number(version.wordCount)||0;
    section.status=version.sectionStatus||section.status;
    section.updatedAt=ts;

    const chapter=state.chapters.find(c=>c.id===section.chapterId);
    if(chapter){
      const total=state.sections.filter(s=>s.chapterId===chapter.id)
        .reduce((sum,s)=>sum+(Number(s.currentWordCount)||0),0);
      chapter.currentWordCount=total;
      chapter.updatedAt=ts;
    }

    writeState(state);
    return clone(section);
  }

  function createReviewRound(data={}){
    const state=getState();
    const projectId=data.projectId||getActiveProjectId(state);
    if(!projectId) throw new Error('No active thesis project.');
    const ts=nowIso();
    const row={
      id:uid('review'),projectId,
      title:data.title||('Review round · '+new Date(ts).toLocaleDateString()),
      reviewerName:data.reviewerName||'',
      status:data.status||'awaiting_feedback',
      scope:data.scope||'whole_thesis',
      chapterId:data.chapterId||null,
      submittedAt:data.submittedAt||ts.slice(0,10),
      responseDueDate:data.responseDueDate||null,
      notes:data.notes||'',
      createdAt:ts,updatedAt:ts
    };
    state.reviewRounds.push(row);

    const sections=state.sections.filter(s=>s.projectId===projectId && (row.scope!=='chapter'||s.chapterId===row.chapterId));
    sections.forEach(section=>{
      state.sectionVersions.push({
        id:uid('version'),projectId,chapterId:section.chapterId,sectionId:section.id,reviewRoundId:row.id,
        label:row.title+' · submitted',reason:'review_submission',sectionTitle:section.title||'',
        content:section.content||'',wordCount:Number(section.currentWordCount)||0,
        sectionStatus:section.status||'not_started',createdAt:ts
      });
    });

    writeState(state);
    return clone(row);
  }

  function updateReviewRound(reviewRoundId,patch={}){
    const state=getState();
    const row=state.reviewRounds.find(r=>r.id===reviewRoundId);
    if(!row) return null;
    ['title','reviewerName','status','responseDueDate','notes'].forEach(key=>{
      if(Object.prototype.hasOwnProperty.call(patch,key)) row[key]=patch[key];
    });
    row.updatedAt=nowIso();
    writeState(state);
    return clone(row);
  }

  function addFeedback(data={}){
    const state=getState();
    const projectId=data.projectId||getActiveProjectId(state);
    if(!projectId) throw new Error('No active thesis project.');
    if(!String(data.comment||'').trim()) throw new Error('Enter the supervisor feedback.');
    const ts=nowIso();
    const row={
      id:uid('feedback'),projectId,reviewRoundId:data.reviewRoundId||null,
      chapterId:data.chapterId||null,sectionId:data.sectionId||null,
      reviewerName:data.reviewerName||'',category:data.category||'content',
      priority:data.priority||'normal',status:data.status||'open',
      selectedText:data.selectedText||'',comment:String(data.comment).trim(),
      researcherResponse:data.researcherResponse||'',createdAt:ts,updatedAt:ts,resolvedAt:null
    };
    state.feedbackItems.push(row);
    writeState(state);
    return clone(row);
  }

  function listFeedback(filters={}){
    const state=getState();
    const projectId=filters.projectId||getActiveProjectId(state);
    return clone(state.feedbackItems.filter(item=>{
      if(item.projectId!==projectId)return false;
      if(filters.reviewRoundId&&item.reviewRoundId!==filters.reviewRoundId)return false;
      if(filters.sectionId&&item.sectionId!==filters.sectionId)return false;
      if(filters.chapterId&&item.chapterId!==filters.chapterId)return false;
      if(filters.status&&item.status!==filters.status)return false;
      return true;
    }).sort((a,b)=>{
      const priority={high:0,normal:1,low:2};
      return (priority[a.priority]??1)-(priority[b.priority]??1) || (b.createdAt||'').localeCompare(a.createdAt||'');
    }));
  }

  function updateFeedback(feedbackId,patch={}){
    const state=getState();
    const row=state.feedbackItems.find(f=>f.id===feedbackId);
    if(!row)return null;
    ['status','priority','category','comment','researcherResponse','reviewerName'].forEach(key=>{
      if(Object.prototype.hasOwnProperty.call(patch,key)) row[key]=patch[key];
    });
    row.resolvedAt=row.status==='resolved'?(row.resolvedAt||nowIso()):null;
    row.updatedAt=nowIso();
    writeState(state);
    return clone(row);
  }


  function defaultSearchPlan(projectId){
    const ts=nowIso();
    return {
      id:uid('searchplan'),projectId,
      framework:'',
      concepts:[
        {id:uid('concept'),label:'Concept 1',terms:[]},
        {id:uid('concept'),label:'Concept 2',terms:[]},
        {id:uid('concept'),label:'Concept 3',terms:[]}
      ],
      databases:[],
      limits:'',
      notes:'',
      createdAt:ts,updatedAt:ts
    };
  }

  function getSearchPlan(projectId){
    const state=getState();
    projectId=projectId||getActiveProjectId(state);
    const row=state.searchPlans.find(p=>p.projectId===projectId);
    return clone(row||defaultSearchPlan(projectId));
  }

  function saveSearchPlan(data={},projectId){
    const state=getState();
    projectId=projectId||getActiveProjectId(state);
    if(!projectId) throw new Error('No active thesis project.');
    let row=state.searchPlans.find(p=>p.projectId===projectId);
    const ts=nowIso();
    if(!row){
      row=defaultSearchPlan(projectId);
      state.searchPlans.push(row);
    }
    if(Object.prototype.hasOwnProperty.call(data,'framework'))row.framework=data.framework||'';
    if(Object.prototype.hasOwnProperty.call(data,'concepts')){
      row.concepts=Array.isArray(data.concepts)?data.concepts.map((concept,index)=>({
        id:concept.id||uid('concept'),
        label:String(concept.label||('Concept '+(index+1))).trim()||('Concept '+(index+1)),
        terms:Array.isArray(concept.terms)?concept.terms.map(x=>String(x).trim()).filter(Boolean):[]
      })):[];
    }
    if(Object.prototype.hasOwnProperty.call(data,'databases'))row.databases=Array.isArray(data.databases)?data.databases.map(x=>String(x).trim()).filter(Boolean):[];
    if(Object.prototype.hasOwnProperty.call(data,'limits'))row.limits=data.limits||'';
    if(Object.prototype.hasOwnProperty.call(data,'notes'))row.notes=data.notes||'';
    row.updatedAt=ts;
    writeState(state);
    return clone(row);
  }

  function listSearchRuns(projectId){
    const state=getState();
    projectId=projectId||getActiveProjectId(state);
    return clone(state.searchRuns.filter(r=>r.projectId===projectId)
      .sort((a,b)=>String(b.searchedAt||b.createdAt||'').localeCompare(String(a.searchedAt||a.createdAt||''))));
  }

  function addSearchRun(data={},projectId){
    const state=getState();
    projectId=projectId||getActiveProjectId(state);
    if(!projectId) throw new Error('No active thesis project.');
    if(!String(data.databaseName||'').trim()) throw new Error('Enter the database or source searched.');
    const ts=nowIso();
    const plan=state.searchPlans.find(p=>p.projectId===projectId);
    const row={
      id:uid('searchrun'),projectId,searchPlanId:data.searchPlanId||plan?.id||null,
      databaseName:String(data.databaseName).trim(),
      searchedAt:data.searchedAt||ts.slice(0,10),
      queryText:String(data.queryText||'').trim(),
      resultCount:Math.max(0,Number(data.resultCount)||0),
      importedCount:Math.max(0,Number(data.importedCount)||0),
      duplicatesRemoved:Math.max(0,Number(data.duplicatesRemoved)||0),
      notes:String(data.notes||'').trim(),
      createdAt:ts,updatedAt:ts
    };
    state.searchRuns.push(row);
    writeState(state);
    return clone(row);
  }

  function updateSearchRun(runId,patch={}){
    const state=getState();
    const row=state.searchRuns.find(r=>r.id===runId);
    if(!row)return null;
    ['databaseName','searchedAt','queryText','notes'].forEach(key=>{
      if(Object.prototype.hasOwnProperty.call(patch,key))row[key]=patch[key];
    });
    ['resultCount','importedCount','duplicatesRemoved'].forEach(key=>{
      if(Object.prototype.hasOwnProperty.call(patch,key))row[key]=Math.max(0,Number(patch[key])||0);
    });
    row.updatedAt=nowIso();
    writeState(state);
    return clone(row);
  }

  function removeSearchRun(runId){
    const state=getState();
    const before=state.searchRuns.length;
    state.searchRuns=state.searchRuns.filter(r=>r.id!==runId);
    if(state.searchRuns.length===before)return false;
    writeState(state);
    return true;
  }

  function ensureScreeningRecords(projectId){
    const state=getState();
    projectId=projectId||getActiveProjectId(state);
    const articles=state.articles.filter(a=>a.projectId===projectId);
    const existing=new Map(state.screeningRecords.filter(r=>r.projectId===projectId).map(r=>[r.articleId,r]));
    let changed=false;
    const ts=nowIso();
    articles.forEach(article=>{
      if(existing.has(article.id))return;
      const row={
        id:uid('screen'),projectId,articleId:article.id,
        titleAbstractDecision:'pending',
        fullTextDecision:'not_started',
        exclusionReason:'',
        notes:'',
        screenedAt:null,
        createdAt:ts,updatedAt:ts
      };
      state.screeningRecords.push(row);
      existing.set(article.id,row);
      changed=true;
    });
    if(changed)writeState(state);
    return clone(state.screeningRecords.filter(r=>r.projectId===projectId));
  }

  function listScreeningRecords(projectId){
    const state=getState();
    projectId=projectId||getActiveProjectId(state);
    const articles=state.articles.filter(a=>a.projectId===projectId);
    const existing=new Set(state.screeningRecords.filter(r=>r.projectId===projectId).map(r=>r.articleId));
    if(articles.some(a=>!existing.has(a.id)))return ensureScreeningRecords(projectId);
    return clone(state.screeningRecords.filter(r=>r.projectId===projectId));
  }

  function updateScreeningRecord(articleId,patch={}){
    const state=getState();
    const article=state.articles.find(a=>a.id===articleId);
    if(!article)throw new Error('Article not found.');
    let row=state.screeningRecords.find(r=>r.articleId===articleId);
    const ts=nowIso();
    if(!row){
      row={
        id:uid('screen'),projectId:article.projectId,articleId,
        titleAbstractDecision:'pending',fullTextDecision:'not_started',
        exclusionReason:'',notes:'',screenedAt:null,createdAt:ts,updatedAt:ts
      };
      state.screeningRecords.push(row);
    }
    const ta=['pending','include','exclude','maybe'];
    const ft=['not_started','include','exclude','maybe'];
    if(Object.prototype.hasOwnProperty.call(patch,'titleAbstractDecision')){
      row.titleAbstractDecision=ta.includes(patch.titleAbstractDecision)?patch.titleAbstractDecision:'pending';
    }
    if(Object.prototype.hasOwnProperty.call(patch,'fullTextDecision')){
      row.fullTextDecision=ft.includes(patch.fullTextDecision)?patch.fullTextDecision:'not_started';
    }
    if(Object.prototype.hasOwnProperty.call(patch,'exclusionReason'))row.exclusionReason=String(patch.exclusionReason||'');
    if(Object.prototype.hasOwnProperty.call(patch,'notes'))row.notes=String(patch.notes||'');
    if(Object.prototype.hasOwnProperty.call(patch,'screenedAt'))row.screenedAt=patch.screenedAt||null;
    if(row.titleAbstractDecision!=='pending'||row.fullTextDecision!=='not_started')row.screenedAt=row.screenedAt||ts;
    if(row.fullTextDecision!=='exclude'&&row.titleAbstractDecision!=='exclude'&&patch.exclusionReason===undefined){
      // Keep an existing reason for audit history; only explicit edits clear it.
    }
    row.updatedAt=ts;
    writeState(state);
    return clone(row);
  }

  function screeningSummary(projectId){
    const state=getState();
    projectId=projectId||getActiveProjectId(state);
    const articles=state.articles.filter(a=>a.projectId===projectId);
    const records=listScreeningRecords(projectId);
    const runs=state.searchRuns.filter(r=>r.projectId===projectId);
    const identified=runs.reduce((sum,r)=>sum+(Number(r.resultCount)||0),0);
    const imported=runs.reduce((sum,r)=>sum+(Number(r.importedCount)||0),0);
    const duplicatesRemoved=runs.reduce((sum,r)=>sum+(Number(r.duplicatesRemoved)||0),0);
    const titleScreened=records.filter(r=>r.titleAbstractDecision!=='pending').length;
    const titleIncluded=records.filter(r=>r.titleAbstractDecision==='include'||r.titleAbstractDecision==='maybe').length;
    const titleExcluded=records.filter(r=>r.titleAbstractDecision==='exclude').length;
    const fullTextAssessed=records.filter(r=>r.fullTextDecision!=='not_started').length;
    const fullTextIncluded=records.filter(r=>r.fullTextDecision==='include').length;
    const fullTextExcluded=records.filter(r=>r.fullTextDecision==='exclude').length;
    return clone({
      identified,imported,duplicatesRemoved,libraryTotal:articles.length,
      titleScreened,titleIncluded,titleExcluded,fullTextAssessed,fullTextIncluded,fullTextExcluded,
      pending:records.filter(r=>r.titleAbstractDecision==='pending').length
    });
  }

  function getProjectBundle(projectId){
    const state=getState();
    projectId=projectId || getActiveProjectId(state);
    const project=state.projects.find(p=>p.id===projectId);
    if(!project) return null;
    const byProject = name => state[name].filter(row=>row.projectId===projectId);
    return clone({
      project,
      studySetup:state.studySetups.find(s=>s.projectId===projectId) || null,
      objectives:byProject('objectives'),
      chapters:byProject('chapters'),
      sections:byProject('sections'),
      articles:byProject('articles'),
      highlights:byProject('highlights'),
      notes:byProject('notes'),
      themes:byProject('themes'),
      evidenceLinks:byProject('evidenceLinks'),
      milestones:byProject('milestones'),
      progressSnapshots:byProject('progressSnapshots'),
      aiThreads:byProject('aiThreads'),
      reviewRounds:byProject('reviewRounds'),
      feedbackItems:byProject('feedbackItems'),
      sectionVersions:byProject('sectionVersions'),
      searchPlans:byProject('searchPlans'),
      searchRuns:byProject('searchRuns'),
      screeningRecords:byProject('screeningRecords')
    });
  }

  window.QuireStore = {
    version:1,
    getState:()=>clone(getState()),
    replaceState,
    getActiveProject,
    getActiveProjectId:()=>getActiveProjectId(getState()),
    createProject,
    updateProject,
    archiveProject,
    restoreProject,
    listProjects,
    setActiveProject,
    getStudySetupData,
    saveStudySetupData,
    getMethodWorkspace,
    saveMethodWorkspace,
    computeLiveProgress,
    getProgressSnapshots,
    getLatestProgress,
    saveProgressSnapshot,
    captureDailyProgressSnapshot,
    listMilestones,
    updateMilestone,
    listArticles,
    getArticle,
    addArticle,
    updateArticle,
    upsertArticles,
    removeArticle,
    listHighlights,
    getHighlight,
    addHighlight,
    updateHighlight,
    removeHighlight,
    listNotes,
    addNote,
    updateNote,
    listThemes,
    listObjectives,
    updateChapter,
    listChapters,
    listSections,
    addSection,
    updateSection,
    removeSection,
    reorderSections,
    addEvidenceLink,
    listEvidenceForSection,
    removeEvidenceLink,
    listEvidenceLinks,
    getOrCreateArticleThread,
    addAiMessage,
    listAiMessages,
    listReviewRounds,
    createReviewRound,
    updateReviewRound,
    addFeedback,
    listFeedback,
    updateFeedback,
    createSectionVersion,
    listSectionVersions,
    restoreSectionVersion,
    getSearchPlan,
    saveSearchPlan,
    listSearchRuns,
    addSearchRun,
    updateSearchRun,
    removeSearchRun,
    ensureScreeningRecords,
    listScreeningRecords,
    updateScreeningRecord,
    screeningSummary,
    getProjectBundle
  };

  // Initialise/migrate on first load.
  getState();
})();