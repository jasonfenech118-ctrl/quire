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
    aiMessages: []
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
      currentWords:Number(input.currentWords ?? input.current_words ?? 6840) || 0,
      wordsPerWeek:Number(input.wordsPerWeek ?? input.words_per_week ?? 900) || 0,
      articlesTotal:Number(input.articlesTotal ?? 24) || 0,
      articlesReviewed:Number(input.articlesReviewed ?? 18) || 0,
      chaptersTotal:Number(input.chaptersTotal ?? 6) || 0,
      chaptersDeveloped:Number(input.chaptersDeveloped ?? 2) || 0,
      milestonesTotal:Number(input.milestonesTotal ?? 9) || 0,
      milestonesComplete:Number(input.milestonesComplete ?? 4) || 0,
      highlights:Number(input.highlights ?? 67) || 0,
      notes:Number(input.notes ?? 31) || 0
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
      createdAt:ts
    });

    syncMilestonesFromSetup(state, projectId);
    return writeState(state);
  }

  function getState(){
    const existing = readJson(STORE_KEY,null);
    if(existing && existing.version === 1) return existing;
    return createInitialState();
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
      id:uid('setup'),projectId:id,studyType:'',population:'',studySetting:'',methodNotes:'',
      analysis:[],analysisSoftware:'',analysisRule:'',analysisNotes:'',
      proposalRequired:true,ethicsRequired:true,dataManagementRequired:false,protocolRegistration:false,
      proposalRequirements:'',proposalDeadline:'',ethicsDeadline:'',dataStart:'',dataEnd:'',draftDeadline:'',
      aiTailorMethod:true,aiMethodChecks:true,aiProtectVoice:true,aiEvidenceLinks:true,
      designDetails:{},createdAt:ts,updatedAt:ts
    });
    state.chapters.push(...defaultChapters(id));
    state.progressSnapshots.push({
      id:uid('progress'),projectId:id,snapshotDate:ts.slice(0,10),
      ...normalizeProgress({currentWords:0,wordsPerWeek:0,articlesTotal:0,articlesReviewed:0,chaptersTotal:6,chaptersDeveloped:0,milestonesTotal:0,milestonesComplete:0,highlights:0,notes:0}),
      createdAt:ts
    });
    state.activeProjectId=id;
    writeState(state);
    return clone(state.projects.find(p=>p.id===id));
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

  function getLatestProgress(projectId){
    const state=getState();
    projectId=projectId || getActiveProjectId(state);
    const rows=state.progressSnapshots.filter(p=>p.projectId===projectId)
      .sort((a,b)=>(b.createdAt || '').localeCompare(a.createdAt || ''));
    return clone(rows[0] || normalizeProgress({}));
  }

  function saveProgressSnapshot(progress, projectId){
    const state=getState();
    projectId=projectId || getActiveProjectId(state);
    const normalized=normalizeProgress(progress);
    const ts=nowIso();
    state.progressSnapshots.push({
      id:uid('progress'),projectId,snapshotDate:ts.slice(0,10),...normalized,createdAt:ts
    });
    writeState(state);
    return clone(normalized);
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
      aiThreads:byProject('aiThreads')
    });
  }

  window.QuireStore = {
    version:1,
    getState:()=>clone(getState()),
    replaceState,
    getActiveProject,
    getActiveProjectId:()=>getActiveProjectId(getState()),
    createProject,
    setActiveProject,
    getStudySetupData,
    saveStudySetupData,
    getLatestProgress,
    saveProgressSnapshot,
    getProjectBundle
  };

  // Initialise/migrate on first load.
  getState();
})();