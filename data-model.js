/* Quire Data Model v1
 * Canonical client-side project store.
 * This mirrors the relational schema in /supabase/schema.sql so the app can
 * migrate to cloud persistence without changing its conceptual model.
 */
(function(){
  const STORE_KEY = 'quire:v1';
  const LEGACY_SETUP_KEY = 'quireStudySetup';
  const LEGACY_PROGRESS_KEY = 'quireProjectProgress';
  const CURRENT_SCHEMA_VERSION = 2;
  const RECOVERY_KEY = 'quire:migration-recovery';
  let statePrepared = false;

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
    schemaVersion: CURRENT_SCHEMA_VERSION,
    migrationHistory: [],
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
    screeningRecords: [],
    appraisals: [],
    analysisItems: [],
    submissionItems: []
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
    state.schemaVersion = CURRENT_SCHEMA_VERSION;
    if(!Array.isArray(state.migrationHistory)) state.migrationHistory=[];
    localStorage.setItem(STORE_KEY, JSON.stringify(state));
    if(!options.silent){
      window.dispatchEvent(new CustomEvent('quire:store-changed',{detail:{activeProjectId:state.activeProjectId}}));
    }
    return state;
  }

  function replaceState(nextState, options={}){
    if(!nextState || !Array.isArray(nextState.projects)) throw new Error('Invalid Quire state.');
    const current=readJson(STORE_KEY,null);
    if(current) saveRecoveryBackup(current,'before_workspace_replace');
    const prepared=prepareState(nextState);
    statePrepared=true;
    return clone(writeState(prepared.state, options));
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

  const DOCUMENT_TYPES={thesis:'Thesis',paper:'Research paper',assignment:'Assignment'};
  const ASSIGNMENT_TYPES={
    essay:'Essay',
    report:'Report',
    literature_review:'Literature review',
    case_study:'Case study',
    reflective:'Reflective account',
    critical_appraisal:'Critical appraisal',
    proposal:'Research proposal'
  };
  const PAPER_ARTICLE_TYPES={
    original:'Original research article',
    qualitative:'Qualitative research article',
    systematic_review:'Systematic review / meta-analysis',
    review:'Narrative / scoping review',
    short:'Short communication / brief report',
    case_report:'Case report'
  };
  const DOCUMENT_TEMPLATES={
    thesis:{
      empirical:['Introduction','Literature Review','Methodology','Results / Findings','Discussion','Conclusion'],
      review:['Introduction','Background / Literature Review','Review Methods','Results / Evidence Synthesis','Discussion','Conclusion'],
      compact:['Introduction','Literature / Context','Main Study / Analysis','Discussion','Conclusion']
    },
    paper:{
      original:['Introduction','Methods','Results','Discussion','Conclusion'],
      qualitative:['Introduction','Methods','Findings','Discussion','Conclusion'],
      systematic_review:['Introduction','Methods','Results','Discussion','Conclusion'],
      review:['Introduction','Review Methods','Main Themes','Discussion','Conclusion'],
      short:['Introduction','Methods','Results and Discussion','Conclusion'],
      case_report:['Introduction','Case Presentation','Discussion','Conclusion']
    },
    assignment:{
      essay:['Introduction','Main Body','Conclusion'],
      report:['Introduction','Background','Analysis','Recommendations','Conclusion'],
      literature_review:['Introduction','Search Strategy','Review of the Literature','Discussion','Conclusion'],
      case_study:['Introduction','Case Overview','Analysis','Discussion','Conclusion'],
      reflective:['Introduction','Description','Reflection','Action Plan','Conclusion'],
      critical_appraisal:['Introduction','Overview of the Study','Critical Appraisal','Implications for Practice','Conclusion'],
      proposal:['Introduction','Background and Rationale','Aims and Objectives','Methodology','Ethical Considerations','Timeline']
    }
  };

  function normalizeProjectType(value){return DOCUMENT_TYPES[value]?value:'thesis';}
  function untitledFor(type){return 'Untitled '+(normalizeProjectType(type)==='paper'?'paper':normalizeProjectType(type));}

  function normalizeAssignmentDetails(input={}){
    const d=input&&typeof input==='object'?input:{};
    return {
      assignmentType:ASSIGNMENT_TYPES[d.assignmentType]?d.assignmentType:'essay',
      moduleName:String(d.moduleName||''),
      moduleCode:String(d.moduleCode||''),
      tutor:String(d.tutor||''),
      studentId:String(d.studentId||''),
      brief:String(d.brief||''),
      markingCriteria:String(d.markingCriteria||''),
      wordTolerance:Number.isFinite(Number(d.wordTolerance))&&d.wordTolerance!==''&&d.wordTolerance!=null?Number(d.wordTolerance):10
    };
  }

  function normalizePaperDetails(input={}){
    const d=input&&typeof input==='object'?input:{};
    return {
      articleType:PAPER_ARTICLE_TYPES[d.articleType]?d.articleType:'original',
      targetJournal:String(d.targetJournal||''),
      authors:String(d.authors||''),
      correspondingAuthor:String(d.correspondingAuthor||''),
      affiliations:String(d.affiliations||''),
      keywords:String(d.keywords||''),
      abstractWordLimit:Number(d.abstractWordLimit)||null,
      reportingGuideline:String(d.reportingGuideline||'')
    };
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
      'reviewRounds','feedbackItems','sectionVersions','searchPlans','searchRuns','screeningRecords','appraisals','analysisItems',
      'migrationHistory'
    ];
    collections.forEach(key=>{if(!Array.isArray(state[key])) state[key]=[];});
    if(!Number.isFinite(Number(state.schemaVersion))) state.schemaVersion=1;
    return state;
  }

  function saveRecoveryBackup(state,reason='migration'){
    try{
      const payload=JSON.stringify({createdAt:nowIso(),reason,state});
      // Keep one emergency recovery copy, but avoid exhausting small localStorage quotas.
      if(payload.length<=3500000) localStorage.setItem(RECOVERY_KEY,payload);
      return payload.length<=3500000;
    }catch(e){
      return false;
    }
  }

  function getRecoveryBackup(){
    const row=readJson(RECOVERY_KEY,null);
    return row&&row.state ? clone(row) : null;
  }

  function restoreRecoveryBackup(){
    const row=getRecoveryBackup();
    if(!row?.state) throw new Error('No migration recovery backup is available.');
    const prepared=prepareState(row.state);
    statePrepared=true;
    writeState(prepared.state);
    return clone(prepared.state);
  }

  function migrateState(input){
    const state=normalizeStateShape(clone(input));
    let from=Math.max(1,Number(state.schemaVersion)||1);
    const history=state.migrationHistory;

    if(from<2){
      state.highlights.forEach(row=>{
        if(!row.highlightedText && row.text) row.highlightedText=row.text;
        if(!row.pdfAnchor || typeof row.pdfAnchor!=='object') row.pdfAnchor={};
      });
      state.notes.forEach(row=>{
        if(!row.body) row.body=row.content||row.text||'';
        if(!Array.isArray(row.tags)) row.tags=[];
      });
      state.sections.forEach(row=>{
        row.content=String(row.content||'');
        row.currentWordCount=Math.max(0,Number(row.currentWordCount)||0);
        row.status=row.status||'not_started';
      });
      state.articles.forEach(row=>{
        row.readingStatus=row.readingStatus||'unread';
        if(!row.citationData || typeof row.citationData!=='object') row.citationData={};
      });
      history.push({from:1,to:2,migratedAt:nowIso(),reason:'Normalize newer workflow collections and record shapes'});
      state.schemaVersion=2;
      from=2;
    }

    state.schemaVersion=CURRENT_SCHEMA_VERSION;
    return state;
  }

  function repairStateCopy(input){
    const state=normalizeStateShape(clone(input));
    const issues=[];
    const issue=(collection,id,detail,action)=>issues.push({collection,id:id||null,detail,action});

    function dedupeById(key){
      const seen=new Map();
      for(const row of state[key]){
        if(!row?.id) continue;
        const existing=seen.get(row.id);
        if(!existing || String(row.updatedAt||row.createdAt||'')>String(existing.updatedAt||existing.createdAt||'')){
          seen.set(row.id,row);
        }
      }
      if(seen.size!==state[key].length){
        issue(key,null,'Duplicate or missing record IDs were found.','Kept one canonical record per ID.');
        state[key]=[...seen.values()];
      }
    }

    [
      'projects','studySetups','objectives','chapters','sections','articles','highlights','notes','themes',
      'evidenceLinks','milestones','progressSnapshots','aiThreads','aiMessages','reviewRounds','feedbackItems',
      'sectionVersions','searchPlans','searchRuns','screeningRecords','appraisals','analysisItems'
    ].forEach(dedupeById);

    const projectIds=new Set(state.projects.map(p=>p.id).filter(Boolean));
    if(!projectIds.has(state.activeProjectId)){
      issue('projects',state.activeProjectId,'The active project no longer exists.','Selected the first available project.');
      state.activeProjectId=state.projects.find(p=>p.status!=='archived')?.id || state.projects[0]?.id || null;
    }

    const projectOwned=[
      'studySetups','objectives','chapters','sections','articles','highlights','notes','themes','evidenceLinks',
      'milestones','progressSnapshots','aiThreads','reviewRounds','feedbackItems','sectionVersions',
      'searchPlans','searchRuns','screeningRecords','appraisals','analysisItems'
    ];
    projectOwned.forEach(key=>{
      const before=state[key].length;
      state[key]=state[key].filter(row=>projectIds.has(row.projectId));
      if(state[key].length!==before) issue(key,null,'Records referenced projects that no longer exist.','Removed orphan project records.');
    });

    function keepLatestPer(key,field,label){
      const map=new Map();
      for(const row of state[key]){
        const value=row[field];
        if(!value) continue;
        const prev=map.get(value);
        if(!prev || String(row.updatedAt||row.createdAt||'')>String(prev.updatedAt||prev.createdAt||'')) map.set(value,row);
      }
      const passthrough=state[key].filter(row=>!row[field]);
      const next=[...map.values(),...passthrough];
      if(next.length!==state[key].length){
        issue(key,null,'Multiple '+label+' records were found.','Kept the most recently updated record.');
        state[key]=next;
      }
    }

    keepLatestPer('studySetups','projectId','study setup');
    keepLatestPer('searchPlans','projectId','search plan');

    const chapterIds=new Set(state.chapters.map(x=>x.id));
    const sectionBefore=state.sections.length;
    state.sections=state.sections.filter(row=>chapterIds.has(row.chapterId) && state.chapters.some(c=>c.id===row.chapterId&&c.projectId===row.projectId));
    if(state.sections.length!==sectionBefore) issue('sections',null,'Sections referenced missing or cross-project chapters.','Removed orphan sections.');
    const sectionIds=new Set(state.sections.map(x=>x.id));
    state.sections.forEach(row=>{
      if(row.parentSectionId && (!sectionIds.has(row.parentSectionId) || !state.sections.some(s=>s.id===row.parentSectionId&&s.chapterId===row.chapterId))){
        issue('sections',row.id,'A parent section reference was invalid.','Cleared the invalid parent reference.');
        row.parentSectionId=null;
      }
    });

    const articleIds=new Set(state.articles.map(x=>x.id));
    const highlightBefore=state.highlights.length;
    state.highlights=state.highlights.filter(row=>articleIds.has(row.articleId) && state.articles.some(a=>a.id===row.articleId&&a.projectId===row.projectId));
    if(state.highlights.length!==highlightBefore) issue('highlights',null,'Highlights referenced missing or cross-project articles.','Removed orphan highlights.');
    const highlightIds=new Set(state.highlights.map(x=>x.id));

    const themeIds=new Set(state.themes.map(x=>x.id));
    const objectiveIds=new Set(state.objectives.map(x=>x.id));
    const reviewIds=new Set(state.reviewRounds.map(x=>x.id));
    const noteIds=new Set(state.notes.map(x=>x.id));

    state.notes.forEach(row=>{
      if(row.articleId && !articleIds.has(row.articleId)){issue('notes',row.id,'A note referenced a missing article.','Cleared the article reference.');row.articleId=null;}
      if(row.highlightId && !highlightIds.has(row.highlightId)){issue('notes',row.id,'A note referenced a missing highlight.','Cleared the highlight reference.');row.highlightId=null;}
    });

    const articleThemeBefore=state.articleThemes.length;
    const seenArticleTheme=new Set();
    state.articleThemes=state.articleThemes.filter(row=>{
      const article=state.articles.find(a=>a.id===row.articleId);
      const theme=state.themes.find(t=>t.id===row.themeId);
      const key=row.articleId+'|'+row.themeId;
      const valid=Boolean(article&&theme&&article.projectId===theme.projectId&&!seenArticleTheme.has(key));
      if(valid) seenArticleTheme.add(key);
      return valid;
    });
    if(state.articleThemes.length!==articleThemeBefore) issue('articleThemes',null,'Invalid or duplicate article/theme links were found.','Removed invalid links.');

    state.evidenceLinks=state.evidenceLinks.filter(row=>{
      const sameProject=(collection,id)=>!id || collection.some(x=>x.id===id&&x.projectId===row.projectId);
      if(row.articleId&&!sameProject(state.articles,row.articleId)){issue('evidenceLinks',row.id,'Missing article reference.','Cleared invalid evidence source.');row.articleId=null;}
      if(row.highlightId&&!sameProject(state.highlights,row.highlightId)){issue('evidenceLinks',row.id,'Missing highlight reference.','Cleared invalid evidence source.');row.highlightId=null;}
      if(row.noteId&&!sameProject(state.notes,row.noteId)){issue('evidenceLinks',row.id,'Missing note reference.','Cleared invalid evidence source.');row.noteId=null;}
      if(row.themeId&&!sameProject(state.themes,row.themeId)){issue('evidenceLinks',row.id,'Missing theme reference.','Cleared invalid target.');row.themeId=null;}
      if(row.objectiveId&&!sameProject(state.objectives,row.objectiveId)){issue('evidenceLinks',row.id,'Missing objective reference.','Cleared invalid target.');row.objectiveId=null;}
      if(row.chapterId&&!sameProject(state.chapters,row.chapterId)){issue('evidenceLinks',row.id,'Missing chapter reference.','Cleared invalid target.');row.chapterId=null;}
      if(row.sectionId&&!sameProject(state.sections,row.sectionId)){issue('evidenceLinks',row.id,'Missing section reference.','Cleared invalid target.');row.sectionId=null;}
      if(!row.articleId&&!row.highlightId&&!row.noteId){
        issue('evidenceLinks',row.id,'No valid evidence source remained.','Removed the empty evidence link.');
        return false;
      }
      return true;
    });

    state.aiThreads.forEach(row=>{
      if(row.articleId&&!articleIds.has(row.articleId)){issue('aiThreads',row.id,'AI thread referenced a missing article.','Cleared article reference.');row.articleId=null;}
      if(row.sectionId&&!sectionIds.has(row.sectionId)){issue('aiThreads',row.id,'AI thread referenced a missing section.','Cleared section reference.');row.sectionId=null;}
    });
    const threadIds=new Set(state.aiThreads.map(x=>x.id));
    const messageBefore=state.aiMessages.length;
    state.aiMessages=state.aiMessages.filter(row=>threadIds.has(row.threadId));
    if(state.aiMessages.length!==messageBefore) issue('aiMessages',null,'AI messages referenced missing threads.','Removed orphan messages.');

    state.feedbackItems.forEach(row=>{
      if(row.reviewRoundId&&!reviewIds.has(row.reviewRoundId)){issue('feedbackItems',row.id,'Feedback referenced a missing review round.','Cleared review-round reference.');row.reviewRoundId=null;}
      if(row.chapterId&&!chapterIds.has(row.chapterId)){issue('feedbackItems',row.id,'Feedback referenced a missing chapter.','Cleared chapter reference.');row.chapterId=null;}
      if(row.sectionId&&!sectionIds.has(row.sectionId)){issue('feedbackItems',row.id,'Feedback referenced a missing section.','Cleared section reference.');row.sectionId=null;}
    });

    const versionBefore=state.sectionVersions.length;
    state.sectionVersions=state.sectionVersions.filter(row=>sectionIds.has(row.sectionId));
    if(state.sectionVersions.length!==versionBefore) issue('sectionVersions',null,'Section versions referenced deleted sections.','Removed orphan versions.');
    state.sectionVersions.forEach(row=>{
      if(row.reviewRoundId&&!reviewIds.has(row.reviewRoundId)){issue('sectionVersions',row.id,'A version referenced a missing review round.','Cleared review-round reference.');row.reviewRoundId=null;}
    });

    state.analysisItems.forEach(row=>{
      if(row.objectiveId&&!objectiveIds.has(row.objectiveId)){
        issue('analysisItems',row.id,'Analysis item referenced a missing objective.','Cleared objective reference.');
        row.objectiveId=null;
      }
      if(row.sectionId&&!sectionIds.has(row.sectionId)){
        issue('analysisItems',row.id,'Analysis item referenced a missing section.','Cleared section reference.');
        row.sectionId=null;
      }
    });

    const planIds=new Set(state.searchPlans.map(x=>x.id));
    state.searchRuns.forEach(row=>{
      if(row.searchPlanId&&!planIds.has(row.searchPlanId)){issue('searchRuns',row.id,'Search run referenced a missing search plan.','Cleared plan reference.');row.searchPlanId=null;}
    });

    keepLatestPer('screeningRecords','articleId','screening record');
    keepLatestPer('appraisals','articleId','critical appraisal');
    const screenBefore=state.screeningRecords.length;
    state.screeningRecords=state.screeningRecords.filter(row=>articleIds.has(row.articleId)&&state.articles.some(a=>a.id===row.articleId&&a.projectId===row.projectId));
    if(state.screeningRecords.length!==screenBefore) issue('screeningRecords',null,'Screening records referenced missing articles.','Removed orphan screening records.');
    const appraisalBefore=state.appraisals.length;
    state.appraisals=state.appraisals.filter(row=>articleIds.has(row.articleId)&&state.articles.some(a=>a.id===row.articleId&&a.projectId===row.projectId));
    if(state.appraisals.length!==appraisalBefore) issue('appraisals',null,'Appraisals referenced missing articles.','Removed orphan appraisals.');

    return {state,issues};
  }

  function prepareState(input){
    const migrated=migrateState(input);
    const repaired=repairStateCopy(migrated);
    repaired.state.schemaVersion=CURRENT_SCHEMA_VERSION;
    return repaired;
  }

  function auditIntegrity(){
    const state=getState();
    const report=repairStateCopy(state);
    return clone({
      schemaVersion:Number(state.schemaVersion)||1,
      currentSchemaVersion:CURRENT_SCHEMA_VERSION,
      issues:report.issues,
      issueCount:report.issues.length,
      healthy:report.issues.length===0
    });
  }

  function repairIntegrity(){
    const current=getState();
    const report=repairStateCopy(current);
    if(report.issues.length){
      saveRecoveryBackup(current,'before_integrity_repair');
      writeState(report.state);
    }
    return clone({
      schemaVersion:CURRENT_SCHEMA_VERSION,
      issues:report.issues,
      repaired:report.issues.length,
      healthy:true
    });
  }

  function getState(){
    const existing = readJson(STORE_KEY,null);
    if(existing && existing.version === 1){
      if(statePrepared && Number(existing.schemaVersion)===CURRENT_SCHEMA_VERSION) return normalizeStateShape(existing);
      const prepared=prepareState(existing);
      const changed=Number(existing.schemaVersion)!==CURRENT_SCHEMA_VERSION || prepared.issues.length>0;
      if(changed){
        saveRecoveryBackup(existing,Number(existing.schemaVersion)!==CURRENT_SCHEMA_VERSION?'automatic_schema_migration':'automatic_integrity_repair');
        writeState(prepared.state,{silent:true});
      }
      statePrepared=true;
      return prepared.state;
    }
    const created=normalizeStateShape(createInitialState());
    statePrepared=true;
    return created;
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
      title:input.title || untitledFor(input.projectType),
      projectType:normalizeProjectType(input.projectType),
      paperDetails:normalizePaperDetails(input.paperDetails),
      assignmentDetails:normalizeAssignmentDetails(input.assignmentDetails),
      degreeName:input.degreeName || '',
      institutionName:input.institutionName || '',
      supervisorName:input.supervisorName || '',
      researchQuestion:input.researchQuestion || '',
      abstract:String(input.abstract||''),
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


  function starterProjectIsBlank(state,projectId){
    const project=state.projects.find(p=>p.id===projectId);
    if(!project)return false;
    const title=String(project.title||'').trim().toLowerCase();
    const starterTitle=!title||title==='untitled thesis'||title==='untitled paper'||title==='untitled assignment'||title==='research project';
    if(!starterTitle)return false;
    const owned=key=>(state[key]||[]).filter(row=>row.projectId===projectId);
    const hasResearch=owned('articles').length||owned('highlights').length||owned('notes').length||owned('evidenceLinks').length||owned('analysisItems').length||owned('feedbackItems').length||owned('reviewRounds').length;
    const hasWriting=owned('sections').some(row=>String(row.content||'').replace(/<[^>]+>/g,'').trim()||Number(row.currentWordCount)>0);
    return !hasResearch&&!hasWriting;
  }

  function isStarterProject(projectId){
    const state=getState();
    projectId=projectId||getActiveProjectId(state);
    return starterProjectIsBlank(state,projectId);
  }

  function configureStarterProject(input={},projectId){
    const state=getState();
    projectId=projectId||getActiveProjectId(state);
    if(!starterProjectIsBlank(state,projectId))return null;
    const project=state.projects.find(p=>p.id===projectId);
    if(!project)return null;
    const ts=nowIso();

    project.projectType=normalizeProjectType(input.projectType);
    project.paperDetails=normalizePaperDetails(input.paperDetails);
    project.assignmentDetails=normalizeAssignmentDetails(input.assignmentDetails);
    project.title=String(input.title||'').trim()||untitledFor(project.projectType);
    if(input.abstract!==undefined)project.abstract=String(input.abstract||'');
    project.degreeName=String(input.degreeName||'');
    project.institutionName=String(input.institutionName||'');
    project.supervisorName=String(input.supervisorName||'');
    project.researchQuestion=String(input.researchQuestion||'').trim();
    project.wordTarget=Number(input.wordTarget)||null;
    project.proposalWordTarget=Number(input.proposalWordTarget)||null;
    project.startDate=input.startDate||project.startDate||ts.slice(0,10);
    project.finalDeadline=input.finalDeadline||null;
    project.status='active';
    project.updatedAt=ts;

    let setup=state.studySetups.find(s=>s.projectId===projectId);
    if(!setup){
      setup={id:uid('setup'),projectId,createdAt:ts,designDetails:{}};
      state.studySetups.push(setup);
    }
    setup.studyType=input.studyType||'';
    setup.population=String(input.population||'');
    setup.studySetting=String(input.studySetting||'');
    setup.proposalDeadline=input.proposalDeadline||'';
    setup.updatedAt=ts;
    if(!setup.designDetails||typeof setup.designDetails!=='object')setup.designDetails={};

    const objectiveTitles=Array.isArray(input.objectives)?input.objectives.map(v=>String(v||'').trim()).filter(Boolean):[];
    state.objectives=state.objectives.filter(row=>row.projectId!==projectId);
    state.objectives.push(...objectiveTitles.map((title,index)=>({
      id:uid('objective'),projectId,orderIndex:index+1,title,description:'',status:'active',createdAt:ts,updatedAt:ts
    })));

    const chapterInput=Array.isArray(input.chapters)&&input.chapters.length?input.chapters:null;
    const hasSections=state.sections.some(row=>row.projectId===projectId);
    if(chapterInput&&!hasSections){
      state.chapters=state.chapters.filter(row=>row.projectId!==projectId);
      state.chapters.push(...chapterInput.map((item,index)=>{
        const value=typeof item==='string'?{title:item}:item;
        return {
          id:uid('chapter'),projectId,
          number:String(value.number||index+1),
          title:String(value.title||('Chapter '+(index+1))).trim(),
          orderIndex:index+1,targetWordCount:Number(value.targetWordCount)||null,
          currentWordCount:0,status:index===0?'in_progress':'not_started',
          createdAt:ts,updatedAt:ts
        };
      }));
    }

    state.themes=state.themes.filter(row=>row.projectId!==projectId);
    const themeNames=Array.isArray(input.themes)?input.themes.map(v=>String(v||'').trim()).filter(Boolean):[];
    state.themes.push(...themeNames.map(name=>({
      id:uid('theme'),projectId,name,description:'',createdAt:ts,updatedAt:ts
    })));

    const snapshot=state.progressSnapshots.find(row=>row.projectId===projectId);
    if(snapshot){
      snapshot.chaptersTotal=state.chapters.filter(row=>row.projectId===projectId).length;
      snapshot.updatedAt=ts;
    }
    syncMilestonesFromSetup(state,projectId);
    writeState(state);
    return clone(project);
  }


  function updateProject(projectId,patch={}){
    const state=getState();
    const project=state.projects.find(p=>p.id===projectId);
    if(!project) return null;
    const allowed=['title','degreeName','institutionName','supervisorName','researchQuestion','abstract','wordTarget','proposalWordTarget','startDate','finalDeadline','status'];
    allowed.forEach(key=>{
      if(Object.prototype.hasOwnProperty.call(patch,key)) project[key]=patch[key];
    });
    if(Object.prototype.hasOwnProperty.call(patch,'projectType')) project.projectType=normalizeProjectType(patch.projectType);
    if(Object.prototype.hasOwnProperty.call(patch,'paperDetails')) project.paperDetails=normalizePaperDetails({...(project.paperDetails||{}),...(patch.paperDetails||{})});
    if(Object.prototype.hasOwnProperty.call(patch,'assignmentDetails')) project.assignmentDetails=normalizeAssignmentDetails({...(project.assignmentDetails||{}),...(patch.assignmentDetails||{})});
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

  function paperSetupFields(project){
    const p=normalizePaperDetails(project.paperDetails);
    return {
      paperArticleType:p.articleType,
      paperTargetJournal:p.targetJournal,
      paperAuthors:p.authors,
      paperCorrespondingAuthor:p.correspondingAuthor,
      paperAffiliations:p.affiliations,
      paperKeywords:p.keywords,
      paperAbstractWordLimit:p.abstractWordLimit||'',
      paperReportingGuideline:p.reportingGuideline,
      paperAbstract:project.abstract||''
    };
  }

  function assignmentSetupFields(project){
    const a=normalizeAssignmentDetails(project.assignmentDetails);
    return {
      assignmentType:a.assignmentType,
      assignmentModuleName:a.moduleName,
      assignmentModuleCode:a.moduleCode,
      assignmentTutor:a.tutor,
      assignmentStudentId:a.studentId,
      assignmentBrief:a.brief,
      assignmentMarkingCriteria:a.markingCriteria,
      assignmentWordTolerance:a.wordTolerance
    };
  }

  function getStudySetupData(projectId){
    const state=getState();
    projectId=projectId || getActiveProjectId(state);
    const project=state.projects.find(p=>p.id===projectId) || {};
    const setup=state.studySetups.find(s=>s.projectId===projectId) || {};
    const d=setup.designDetails || {};
    return clone({
      studyType:setup.studyType || '',
      projectType:normalizeProjectType(project.projectType),
      ...paperSetupFields(project),
      ...assignmentSetupFields(project),
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
    if(data.projectType!==undefined) project.projectType=normalizeProjectType(data.projectType);
    if(data.paperArticleType!==undefined){
      project.paperDetails=normalizePaperDetails({
        articleType:data.paperArticleType,targetJournal:data.paperTargetJournal,authors:data.paperAuthors,
        correspondingAuthor:data.paperCorrespondingAuthor,affiliations:data.paperAffiliations,keywords:data.paperKeywords,
        abstractWordLimit:data.paperAbstractWordLimit,reportingGuideline:data.paperReportingGuideline
      });
    }
    if(data.paperAbstract!==undefined&&normalizeProjectType(project.projectType)==='paper') project.abstract=String(data.paperAbstract||'');
    if(data.assignmentType!==undefined){
      project.assignmentDetails=normalizeAssignmentDetails({
        assignmentType:data.assignmentType,moduleName:data.assignmentModuleName,moduleCode:data.assignmentModuleCode,
        tutor:data.assignmentTutor,studentId:data.assignmentStudentId,brief:data.assignmentBrief,
        markingCriteria:data.assignmentMarkingCriteria,wordTolerance:data.assignmentWordTolerance
      });
    }
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

  function computeResearchReviewRatio(state,projectId,articles,highlights,notes,objectives,themes,evidence){
    const clamp01=value=>Math.max(0,Math.min(1,Number(value)||0));
    const hasText=value=>Boolean(String(value||'').trim());
    const plan=state.searchPlans.find(row=>row.projectId===projectId)||{};
    const searchRuns=state.searchRuns.filter(row=>row.projectId===projectId);
    const screening=state.screeningRecords.filter(row=>row.projectId===projectId);
    const appraisals=state.appraisals.filter(row=>row.projectId===projectId);
    const analysis=state.analysisItems.filter(row=>row.projectId===projectId);
    const articleThemes=state.articleThemes.filter(link=>articles.some(article=>article.id===link.articleId));
    const reviewed=articles.filter(article=>article.readingStatus==='reviewed');

    const searchChecks=[
      Array.isArray(plan.concepts)&&plan.concepts.some(concept=>Array.isArray(concept.terms)&&concept.terms.some(hasText)),
      Array.isArray(plan.databases)&&plan.databases.some(hasText),
      hasText(plan.inclusionCriteria)||hasText(plan.exclusionCriteria),
      searchRuns.length>0
    ];
    const searchScore=searchChecks.filter(Boolean).length/searchChecks.length;

    let screeningScore=0;
    if(articles.length){
      const recordMap=new Map(screening.map(row=>[row.articleId,row]));
      const titleDone=articles.filter(article=>{
        const value=recordMap.get(article.id)?.titleAbstractDecision;
        return value&&value!=='pending'&&value!=='not_started';
      }).length;
      const fullDone=articles.filter(article=>{
        const value=recordMap.get(article.id)?.fullTextDecision;
        return value&&value!=='not_started';
      }).length;
      screeningScore=clamp01(.20+(titleDone/articles.length*.40)+(fullDone/articles.length*.40));
    }

    const annotatedIds=new Set([...highlights.map(row=>row.articleId),...notes.map(row=>row.articleId)].filter(Boolean));
    const hasSynthesis=article=>{
      const data=article?.citationData?.synthesis||{};
      return ['design','sample','methods','findings','limitations','relevance'].some(key=>hasText(data[key]));
    };
    const extractedIds=new Set(articles.filter(hasSynthesis).map(row=>row.id));
    let readingDepth=0;
    articles.forEach(article=>{
      if(article.readingStatus==='reviewed')readingDepth+=.45;
      if(annotatedIds.has(article.id))readingDepth+=.25;
      if(extractedIds.has(article.id))readingDepth+=.30;
    });
    const readingScore=articles.length?clamp01(readingDepth/articles.length):0;

    const completedAppraisals=new Set(appraisals.filter(row=>row.completedAt&&row.overallJudgement&&row.overallJudgement!=='not_started').map(row=>row.articleId));
    const completedReviewed=reviewed.filter(article=>completedAppraisals.has(article.id)).length;
    const appraisalScore=reviewed.length?clamp01(completedReviewed/reviewed.length):0;

    const perTheme=new Map();
    articleThemes.forEach(link=>{
      if(!link.themeId||!link.articleId)return;
      if(!perTheme.has(link.themeId))perTheme.set(link.themeId,new Set());
      perTheme.get(link.themeId).add(link.articleId);
    });
    const multiThemes=[...perTheme.values()].filter(set=>set.size>=2).length;
    const contradictory=highlights.filter(row=>row.category==='contradictory').length;
    const synthesisItems=analysis.filter(row=>['synthesis_finding','review_outcome'].includes(row.kind)).length;
    const synthesized=articles.filter(hasSynthesis).length;
    const synthesisTarget=Math.max(2,Math.min(Math.max(reviewed.length,2),6));
    const synthesisScore=clamp01(
      Math.min(.50,synthesized/synthesisTarget*.50)+
      (multiThemes?.25:0)+(contradictory?.10:0)+(synthesisItems?.15:0)
    );

    const objectiveIds=new Set(objectives.map(row=>row.id));
    const themeIds=new Set(themes.map(row=>row.id));
    const coveredObjectives=new Set(evidence.filter(row=>row.objectiveId&&objectiveIds.has(row.objectiveId)).map(row=>row.objectiveId));
    const coveredThemes=new Set(evidence.filter(row=>row.themeId&&themeIds.has(row.themeId)).map(row=>row.themeId));
    let coverageBase=0;
    if(objectives.length)coverageBase=coveredObjectives.size/objectives.length;
    else if(themes.length)coverageBase=coveredThemes.size/themes.length;
    const gaps=analysis.filter(row=>row.kind==='gap_signal').length;
    const coverageScore=clamp01((coverageBase*.60)+(Math.min(1,gaps/2)*.40));

    return clamp01(
      searchScore*.15+
      screeningScore*.15+
      readingScore*.25+
      appraisalScore*.15+
      synthesisScore*.20+
      coverageScore*.10
    );
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
    const researchRatio=computeResearchReviewRatio(state,projectId,articles,highlights,notes,objectives,themes,evidence);
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
    state.screeningRecords=state.screeningRecords.filter(x=>x.articleId!==articleId);
    state.appraisals=state.appraisals.filter(x=>x.articleId!==articleId);
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
    state.analysisItems=state.analysisItems.map(item=>removedIds.has(item.sectionId)?{...item,sectionId:null,updatedAt:nowIso()}:item);
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

  function getProjectType(projectId){
    const state=getState();projectId=projectId||getActiveProjectId(state);
    return normalizeProjectType(state.projects.find(p=>p.id===projectId)?.projectType);
  }

  function chapterHasWriting(state,chapterId){
    return state.sections.some(row=>row.chapterId===chapterId&&(String(row.content||'').replace(/<[^>]+>/g,'').trim()||Number(row.currentWordCount)>0));
  }

  // Rename, add, reorder and remove top-level parts (thesis chapters / paper sections).
  // Parts that already contain writing are never removed; they are kept at the end and reported.
  function setDocumentStructure(projectId,items=[]){
    const state=getState();projectId=projectId||getActiveProjectId(state);
    if(!state.projects.some(p=>p.id===projectId)) return null;
    const ts=nowIso();
    const wanted=(Array.isArray(items)?items:[])
      .map(item=>typeof item==='string'?{title:item}:(item||{}))
      .map(item=>({id:item.id||null,title:String(item.title||'').trim()}))
      .filter(item=>item.title);
    const existing=state.chapters.filter(c=>c.projectId===projectId);
    const keptIds=new Set();
    const ordered=wanted.map(item=>{
      let row=item.id?existing.find(c=>c.id===item.id):null;
      if(row){row.title=item.title;keptIds.add(row.id);}
      else{
        row={id:uid('chapter'),projectId,number:'',title:item.title,orderIndex:0,targetWordCount:null,currentWordCount:0,status:'not_started',createdAt:ts};
        state.chapters.push(row);
      }
      return row;
    });
    const kept=[];
    const removedIds=new Set();
    existing.filter(c=>!keptIds.has(c.id)).forEach(c=>{
      if(chapterHasWriting(state,c.id)){kept.push(c.title);ordered.push(c);}
      else removedIds.add(c.id);
    });
    if(removedIds.size){
      const sectionIds=new Set(state.sections.filter(s=>removedIds.has(s.chapterId)).map(s=>s.id));
      state.sections=state.sections.filter(s=>!sectionIds.has(s.id));
      state.evidenceLinks=state.evidenceLinks.filter(e=>!sectionIds.has(e.sectionId)).map(e=>removedIds.has(e.chapterId)?{...e,chapterId:null}:e);
      state.aiThreads=state.aiThreads.filter(t=>!sectionIds.has(t.sectionId));
      state.feedbackItems=state.feedbackItems.filter(f=>!sectionIds.has(f.sectionId));
      state.sectionVersions=state.sectionVersions.filter(v=>!sectionIds.has(v.sectionId));
      state.chapters=state.chapters.filter(c=>!removedIds.has(c.id));
    }
    ordered.forEach((row,index)=>{row.orderIndex=index+1;row.number=String(index+1);row.updatedAt=ts;});
    writeState(state);
    return {chapters:listChapters(projectId),kept};
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


  function getOrCreateProjectThread(mode='project'){
    const state=getState();
    const projectId=getActiveProjectId(state);
    if(!projectId) throw new Error('No active thesis project.');
    let thread=state.aiThreads.find(t=>t.projectId===projectId && !t.articleId && !t.sectionId && t.mode===mode);
    if(!thread){
      const ts=nowIso();
      const project=state.projects.find(p=>p.id===projectId);
      thread={
        id:uid('thread'),projectId,articleId:null,sectionId:null,
        mode,title:'Project Copilot · '+(project?.title||'Thesis'),createdAt:ts,updatedAt:ts
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
      inclusionCriteria:'',
      exclusionCriteria:'',
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
    if(Object.prototype.hasOwnProperty.call(data,'inclusionCriteria'))row.inclusionCriteria=String(data.inclusionCriteria||'');
    if(Object.prototype.hasOwnProperty.call(data,'exclusionCriteria'))row.exclusionCriteria=String(data.exclusionCriteria||'');
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


  function listAppraisals(projectId){
    const state=getState();
    projectId=projectId||getActiveProjectId(state);
    return clone(state.appraisals.filter(a=>a.projectId===projectId));
  }

  function getAppraisal(articleId){
    const state=getState();
    return clone(state.appraisals.find(a=>a.articleId===articleId)||null);
  }

  function saveAppraisal(articleId,data={}){
    const state=getState();
    const article=state.articles.find(a=>a.id===articleId);
    if(!article)throw new Error('Article not found.');
    const ts=nowIso();
    let row=state.appraisals.find(a=>a.articleId===articleId);
    if(!row){
      row={
        id:uid('appraisal'),projectId:article.projectId,articleId,
        toolType:'generic',domains:[],overallJudgement:'not_started',
        strengths:'',limitations:'',applicability:'',completedAt:null,
        createdAt:ts,updatedAt:ts
      };
      state.appraisals.push(row);
    }
    if(Object.prototype.hasOwnProperty.call(data,'toolType'))row.toolType=data.toolType||'generic';
    if(Object.prototype.hasOwnProperty.call(data,'domains')){
      row.domains=Array.isArray(data.domains)?data.domains.map(d=>({
        key:String(d.key||''),
        label:String(d.label||''),
        decision:['yes','no','unclear','na'].includes(d.decision)?d.decision:'unclear',
        note:String(d.note||'')
      })):[];
    }
    const judgements=['not_started','lower_concern','some_concerns','major_concerns','unclear'];
    if(Object.prototype.hasOwnProperty.call(data,'overallJudgement')){
      row.overallJudgement=judgements.includes(data.overallJudgement)?data.overallJudgement:'unclear';
    }
    ['strengths','limitations','applicability'].forEach(key=>{
      if(Object.prototype.hasOwnProperty.call(data,key))row[key]=String(data[key]||'');
    });
    if(Object.prototype.hasOwnProperty.call(data,'completedAt'))row.completedAt=data.completedAt||null;
    if(row.overallJudgement!=='not_started'&&row.domains.length&&row.domains.every(d=>d.decision)){
      row.completedAt=row.completedAt||ts;
    }else if(row.overallJudgement==='not_started'){
      row.completedAt=null;
    }
    row.updatedAt=ts;
    writeState(state);
    return clone(row);
  }

  function appraisalSummary(projectId){
    const state=getState();
    projectId=projectId||getActiveProjectId(state);
    const rows=state.appraisals.filter(a=>a.projectId===projectId);
    return clone({
      total:rows.length,
      completed:rows.filter(a=>a.completedAt&&a.overallJudgement!=='not_started').length,
      lowerConcern:rows.filter(a=>a.overallJudgement==='lower_concern').length,
      someConcerns:rows.filter(a=>a.overallJudgement==='some_concerns').length,
      majorConcerns:rows.filter(a=>a.overallJudgement==='major_concerns').length,
      unclear:rows.filter(a=>a.overallJudgement==='unclear').length
    });
  }


  function listAnalysisItems(filters={}){
    const state=getState();
    const projectId=filters.projectId||getActiveProjectId(state);
    return clone(state.analysisItems.filter(item=>{
      if(item.projectId!==projectId)return false;
      if(filters.kind&&item.kind!==filters.kind)return false;
      if(filters.status&&item.status!==filters.status)return false;
      if(filters.objectiveId&&item.objectiveId!==filters.objectiveId)return false;
      if(filters.sectionId&&item.sectionId!==filters.sectionId)return false;
      return true;
    }).sort((a,b)=>(b.updatedAt||b.createdAt||'').localeCompare(a.updatedAt||a.createdAt||'')));
  }

  function getAnalysisItem(itemId){
    const state=getState();
    return clone(state.analysisItems.find(item=>item.id===itemId)||null);
  }

  function addAnalysisItem(data={}){
    const state=getState();
    const projectId=data.projectId||getActiveProjectId(state);
    if(!projectId)throw new Error('No active thesis project.');
    if(!String(data.title||'').trim())throw new Error('Give the analysis item a title.');
    const ts=nowIso();
    const row={
      id:uid('analysis'),projectId,
      kind:data.kind||'memo',
      objectiveId:data.objectiveId||null,
      sectionId:data.sectionId||null,
      title:String(data.title).trim(),
      payload:(data.payload&&typeof data.payload==='object')?clone(data.payload):{},
      status:['draft','ready','verified'].includes(data.status)?data.status:'draft',
      createdAt:ts,updatedAt:ts
    };
    state.analysisItems.push(row);
    writeState(state);
    return clone(row);
  }

  function updateAnalysisItem(itemId,patch={}){
    const state=getState();
    const row=state.analysisItems.find(item=>item.id===itemId);
    if(!row)return null;
    if(Object.prototype.hasOwnProperty.call(patch,'kind'))row.kind=patch.kind||row.kind;
    if(Object.prototype.hasOwnProperty.call(patch,'objectiveId'))row.objectiveId=patch.objectiveId||null;
    if(Object.prototype.hasOwnProperty.call(patch,'sectionId'))row.sectionId=patch.sectionId||null;
    if(Object.prototype.hasOwnProperty.call(patch,'title'))row.title=String(patch.title||'').trim()||row.title;
    if(Object.prototype.hasOwnProperty.call(patch,'payload'))row.payload=(patch.payload&&typeof patch.payload==='object')?clone(patch.payload):{};
    if(Object.prototype.hasOwnProperty.call(patch,'status'))row.status=['draft','ready','verified'].includes(patch.status)?patch.status:row.status;
    row.updatedAt=nowIso();
    writeState(state);
    return clone(row);
  }

  function removeAnalysisItem(itemId){
    const state=getState();
    const before=state.analysisItems.length;
    state.analysisItems=state.analysisItems.filter(item=>item.id!==itemId);
    if(state.analysisItems.length===before)return false;
    writeState(state);
    return true;
  }

  function analysisSummary(projectId){
    const state=getState();
    projectId=projectId||getActiveProjectId(state);
    const rows=state.analysisItems.filter(item=>item.projectId===projectId);
    const findings=rows.filter(item=>['qual_finding','quant_analysis','mixed_integration','review_outcome','synthesis_finding'].includes(item.kind));
    return clone({
      total:rows.length,
      findings:findings.length,
      ready:rows.filter(item=>item.status==='ready'||item.status==='verified').length,
      verified:rows.filter(item=>item.status==='verified').length,
      linkedObjectives:rows.filter(item=>item.objectiveId).length,
      linkedSections:rows.filter(item=>item.sectionId).length
    });
  }


  function listSubmissionItems(projectId){
    const state=getState();
    projectId=projectId||getActiveProjectId(state);
    return clone(state.submissionItems.filter(item=>item.projectId===projectId)
      .sort((a,b)=>(a.createdAt||'').localeCompare(b.createdAt||'')));
  }

  function addSubmissionItem(data={}){
    const state=getState();
    const projectId=data.projectId||getActiveProjectId(state);
    if(!projectId)throw new Error('No active thesis project.');
    if(!String(data.title||'').trim())throw new Error('Enter a checklist item.');
    const ts=nowIso();
    const row={
      id:uid('submission'),projectId,
      title:String(data.title).trim(),
      category:String(data.category||'Institution / local requirements'),
      completed:Boolean(data.completed),
      note:String(data.note||''),
      createdAt:ts,updatedAt:ts
    };
    state.submissionItems.push(row);
    writeState(state);
    return clone(row);
  }

  function updateSubmissionItem(itemId,patch={}){
    const state=getState();
    const row=state.submissionItems.find(item=>item.id===itemId);
    if(!row)return null;
    if(Object.prototype.hasOwnProperty.call(patch,'title'))row.title=String(patch.title||'').trim()||row.title;
    if(Object.prototype.hasOwnProperty.call(patch,'category'))row.category=String(patch.category||'Institution / local requirements');
    if(Object.prototype.hasOwnProperty.call(patch,'completed'))row.completed=Boolean(patch.completed);
    if(Object.prototype.hasOwnProperty.call(patch,'note'))row.note=String(patch.note||'');
    row.updatedAt=nowIso();
    writeState(state);
    return clone(row);
  }

  function removeSubmissionItem(itemId){
    const state=getState();
    const before=state.submissionItems.length;
    state.submissionItems=state.submissionItems.filter(item=>item.id!==itemId);
    if(state.submissionItems.length===before)return false;
    writeState(state);
    return true;
  }


  function defaultWritingCoachProfile(projectId){
    const ts=nowIso();
    return {
      id:uid('writingprofile'),projectId,
      explanationLevel:'teaching',
      targetStyle:'clear_academic',
      preserveVoice:true,
      vocabularyGrowth:true,
      grammarTeaching:true,
      preferredVariant:'british',
      createdAt:ts,updatedAt:ts
    };
  }

  function getWritingCoachProfile(projectId){
    const state=getState();
    projectId=projectId||getActiveProjectId(state);
    return clone(state.writingCoachProfiles.find(p=>p.projectId===projectId)||defaultWritingCoachProfile(projectId));
  }

  function saveWritingCoachProfile(data={},projectId){
    const state=getState();
    projectId=projectId||getActiveProjectId(state);
    if(!projectId)throw new Error('No active thesis project.');
    let row=state.writingCoachProfiles.find(p=>p.projectId===projectId);
    if(!row){
      row=defaultWritingCoachProfile(projectId);
      state.writingCoachProfiles.push(row);
    }
    ['explanationLevel','targetStyle','preferredVariant'].forEach(key=>{
      if(Object.prototype.hasOwnProperty.call(data,key))row[key]=String(data[key]||row[key]);
    });
    ['preserveVoice','vocabularyGrowth','grammarTeaching'].forEach(key=>{
      if(Object.prototype.hasOwnProperty.call(data,key))row[key]=Boolean(data[key]);
    });
    row.updatedAt=nowIso();
    writeState(state);
    return clone(row);
  }

  function listWritingLessons(projectId){
    const state=getState();
    projectId=projectId||getActiveProjectId(state);
    return clone(state.writingLessons.filter(x=>x.projectId===projectId)
      .sort((a,b)=>(b.createdAt||'').localeCompare(a.createdAt||'')));
  }

  function addWritingLesson(data={}){
    const state=getState();
    const projectId=data.projectId||getActiveProjectId(state);
    if(!projectId)throw new Error('No active thesis project.');
    const ts=nowIso();
    const row={
      id:uid('lesson'),projectId,sectionId:data.sectionId||null,
      category:data.category||'grammar',
      originalText:String(data.originalText||''),
      suggestedText:String(data.suggestedText||''),
      explanation:String(data.explanation||''),
      rule:String(data.rule||''),
      vocabulary:Array.isArray(data.vocabulary)?clone(data.vocabulary):[],
      status:['new','reviewed','mastered'].includes(data.status)?data.status:'new',
      createdAt:ts,updatedAt:ts
    };
    state.writingLessons.push(row);
    writeState(state);
    return clone(row);
  }

  function updateWritingLesson(lessonId,patch={}){
    const state=getState();
    const row=state.writingLessons.find(x=>x.id===lessonId);
    if(!row)return null;
    if(Object.prototype.hasOwnProperty.call(patch,'status')){
      row.status=['new','reviewed','mastered'].includes(patch.status)?patch.status:row.status;
    }
    ['category','originalText','suggestedText','explanation','rule'].forEach(key=>{
      if(Object.prototype.hasOwnProperty.call(patch,key))row[key]=String(patch[key]||'');
    });
    if(Object.prototype.hasOwnProperty.call(patch,'vocabulary'))row.vocabulary=Array.isArray(patch.vocabulary)?clone(patch.vocabulary):[];
    row.updatedAt=nowIso();
    writeState(state);
    return clone(row);
  }

  function writingGrowthSummary(projectId){
    const state=getState();
    projectId=projectId||getActiveProjectId(state);
    const rows=state.writingLessons.filter(x=>x.projectId===projectId);
    const categories={};
    rows.forEach(row=>{categories[row.category]=(categories[row.category]||0)+1;});
    return clone({
      total:rows.length,
      new:rows.filter(x=>x.status==='new').length,
      reviewed:rows.filter(x=>x.status==='reviewed').length,
      mastered:rows.filter(x=>x.status==='mastered').length,
      categories
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
      screeningRecords:byProject('screeningRecords'),
      appraisals:byProject('appraisals'),
      analysisItems:byProject('analysisItems'),
      submissionItems:byProject('submissionItems')
    });
  }

  window.QuireStore = {
    version:1,
    getState:()=>clone(getState()),
    replaceState,
    schemaVersion:CURRENT_SCHEMA_VERSION,
    auditIntegrity,
    repairIntegrity,
    getRecoveryBackup,
    restoreRecoveryBackup,
    getActiveProject,
    getActiveProjectId:()=>getActiveProjectId(getState()),
    createProject,
    isStarterProject,
    configureStarterProject,
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
    computeResearchReviewProgress:(projectId)=>{
      const state=getState();projectId=projectId||getActiveProjectId(state);
      const articles=state.articles.filter(a=>a.projectId===projectId&&a.readingStatus!=='archived');
      const highlights=state.highlights.filter(h=>h.projectId===projectId);
      const notes=state.notes.filter(n=>n.projectId===projectId);
      const objectives=state.objectives.filter(o=>o.projectId===projectId&&o.status!=='archived');
      const themes=state.themes.filter(t=>t.projectId===projectId);
      const evidence=state.evidenceLinks.filter(e=>e.projectId===projectId);
      return Math.round(computeResearchReviewRatio(state,projectId,articles,highlights,notes,objectives,themes,evidence)*100);
    },
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
    getProjectType,
    setDocumentStructure,
    documentTypes:clone(DOCUMENT_TYPES),
    paperArticleTypes:clone(PAPER_ARTICLE_TYPES),
    assignmentTypes:clone(ASSIGNMENT_TYPES),
    documentTemplates:clone(DOCUMENT_TEMPLATES),
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
    getOrCreateProjectThread,
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
    listAppraisals,
    getAppraisal,
    saveAppraisal,
    appraisalSummary,
    listAnalysisItems,
    getAnalysisItem,
    addAnalysisItem,
    updateAnalysisItem,
    removeAnalysisItem,
    analysisSummary,
    listSubmissionItems,
    addSubmissionItem,
    updateSubmissionItem,
    removeSubmissionItem,
    getProjectBundle
  };

  // Initialise/migrate on first load.
  getState();
})();