/* Quire Cloud v1 — Supabase auth + local-first project sync */
(function(){
  const CONFIG_KEY='quire:cloud-config';
  const LAST_SYNC_KEY='quire:last-sync';
  let client=null;
  let currentUser=null;
  let syncTimer=null;
  let syncing=false;
  let suppressAutoSync=false;
  const PDF_BUCKET='quire-pdfs';

  const tableMap=[
    ['projects','thesis_projects',projectToDb],
    ['studySetups','study_setups',setupToDb],
    ['objectives','objectives',objectiveToDb],
    ['chapters','chapters',chapterToDb],
    ['sections','sections',sectionToDb],
    ['articles','articles',articleToDb],
    ['highlights','highlights',highlightToDb],
    ['notes','notes',noteToDb],
    ['themes','themes',themeToDb],
    ['articleThemes','article_themes',articleThemeToDb],
    ['evidenceLinks','evidence_links',evidenceToDb],
    ['milestones','milestones',milestoneToDb],
    ['progressSnapshots','progress_snapshots',progressToDb],
    ['reviewRounds','review_rounds',reviewRoundToDb],
    ['feedbackItems','feedback_items',feedbackToDb],
    ['sectionVersions','section_versions',sectionVersionToDb],
    ['searchPlans','literature_search_plans',searchPlanToDb],
    ['searchRuns','literature_search_runs',searchRunToDb],
    ['screeningRecords','screening_records',screeningToDb],
    ['aiThreads','ai_threads',threadToDb],
    ['aiMessages','ai_messages',messageToDb]
  ];

  function emit(status,message){
    window.dispatchEvent(new CustomEvent('quire:cloud-status',{detail:{
      status,
      message:message || '',
      user:currentUser,
      configured:isConfigured(),
      lastSync:localStorage.getItem(LAST_SYNC_KEY)
    }}));
  }

  function config(){
    try{return JSON.parse(localStorage.getItem(CONFIG_KEY)||'{}')||{};}catch(e){return {};}
  }

  function isConfigured(){
    const c=config();
    return Boolean(c.url && c.anonKey);
  }

  function setConfig(url,anonKey){
    const cleanUrl=(url||'').trim().replace(/\/$/,'');
    const cleanKey=(anonKey||'').trim();
    if(!/^https:\/\/.+\.supabase\.co$/i.test(cleanUrl)) throw new Error('Enter a valid Supabase project URL.');
    if(!cleanKey) throw new Error('Enter your Supabase anon / publishable key.');
    localStorage.setItem(CONFIG_KEY,JSON.stringify({url:cleanUrl,anonKey:cleanKey}));
    client=null;
    currentUser=null;
    createClient();
    emit('configured','Cloud connection saved.');
  }

  function clearConfig(){
    localStorage.removeItem(CONFIG_KEY);
    client=null;
    currentUser=null;
    emit('local','Cloud connection removed. Local data is unchanged.');
  }

  function createClient(){
    if(client) return client;
    if(!isConfigured()) return null;
    if(!window.supabase?.createClient) throw new Error('Supabase library did not load.');
    const c=config();
    client=window.supabase.createClient(c.url,c.anonKey,{
      auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}
    });
    return client;
  }

  async function init(){
    if(!isConfigured()){
      emit('local','Local-only mode');
      return;
    }
    try{
      createClient();
      const {data,error}=await client.auth.getSession();
      if(error) throw error;
      currentUser=data.session?.user || null;
      bindAuthListener();
      if(currentUser){
        emit('syncing','Checking cloud workspace…');
        await initialSync();
      }else{
        emit('signed_out','Cloud connected — sign in to sync.');
      }
    }catch(err){
      emit('error',err.message || 'Cloud connection failed.');
    }
  }

  let authBound=false;
  function bindAuthListener(){
    if(authBound || !client) return;
    authBound=true;
    client.auth.onAuthStateChange(async(event,session)=>{
      currentUser=session?.user || null;
      if(event==='SIGNED_IN' && currentUser){
        emit('syncing','Signed in. Checking cloud workspace…');
        try{await initialSync();}catch(err){emit('error',err.message);}
      }else if(event==='SIGNED_OUT'){
        currentUser=null;
        emit('signed_out','Signed out. Quire remains available locally.');
      }
    });
  }

  async function signUp(email,password){
    createClient();
    if(!client) throw new Error('Configure Supabase first.');
    emit('syncing','Creating account…');
    const {data,error}=await client.auth.signUp({email:email.trim(),password});
    if(error) throw error;
    currentUser=data.user || data.session?.user || null;
    if(data.session && currentUser) await initialSync();
    else emit('signed_out','Account created. Check your email if confirmation is enabled.');
    return data;
  }

  async function signIn(email,password){
    createClient();
    if(!client) throw new Error('Configure Supabase first.');
    emit('syncing','Signing in…');
    const {data,error}=await client.auth.signInWithPassword({email:email.trim(),password});
    if(error) throw error;
    currentUser=data.user || null;
    await initialSync();
    return data;
  }

  async function signOut(){
    if(!client) return;
    const {error}=await client.auth.signOut();
    if(error) throw error;
    currentUser=null;
    emit('signed_out','Signed out. Your local copy remains on this device.');
  }

  async function requireUser(){
    createClient();
    if(!client) throw new Error('Cloud is not configured.');
    if(currentUser) return currentUser;
    const {data,error}=await client.auth.getUser();
    if(error) throw error;
    currentUser=data.user || null;
    if(!currentUser) throw new Error('Sign in to use cloud sync.');
    return currentUser;
  }

  function iso(value){return value || new Date().toISOString();}

  function projectToDb(p,user){
    return {
      id:p.id,user_id:user.id,title:p.title,degree_name:p.degreeName||null,institution_name:p.institutionName||null,
      supervisor_name:p.supervisorName||null,research_question:p.researchQuestion||null,abstract:p.abstract||null,
      word_target:p.wordTarget==null?null:Number(p.wordTarget),proposal_word_target:p.proposalWordTarget==null?null:Number(p.proposalWordTarget),
      start_date:p.startDate||null,final_deadline:p.finalDeadline||null,status:p.status||'active',
      created_at:iso(p.createdAt),updated_at:iso(p.updatedAt)
    };
  }
  function setupToDb(s){return {
    id:s.id,project_id:s.projectId,study_type:s.studyType||null,population:s.population||null,study_setting:s.studySetting||null,
    method_notes:s.methodNotes||null,analysis:s.analysis||[],analysis_software:s.analysisSoftware||null,analysis_rule:s.analysisRule||null,
    analysis_notes:s.analysisNotes||null,proposal_required:s.proposalRequired!==false,ethics_required:s.ethicsRequired!==false,
    data_management_required:Boolean(s.dataManagementRequired),protocol_registration:Boolean(s.protocolRegistration),
    proposal_requirements:s.proposalRequirements||null,proposal_deadline:s.proposalDeadline||null,ethics_deadline:s.ethicsDeadline||null,
    data_start:s.dataStart||null,data_end:s.dataEnd||null,draft_deadline:s.draftDeadline||null,
    ai_tailor_method:s.aiTailorMethod!==false,ai_method_checks:s.aiMethodChecks!==false,ai_protect_voice:s.aiProtectVoice!==false,
    ai_evidence_links:s.aiEvidenceLinks!==false,design_details:s.designDetails||{},created_at:iso(s.createdAt),updated_at:iso(s.updatedAt)
  };}
  function objectiveToDb(x){return {id:x.id,project_id:x.projectId,order_index:x.orderIndex||1,title:x.title,description:x.description||null,status:x.status||'active',created_at:iso(x.createdAt),updated_at:iso(x.updatedAt)};}
  function chapterToDb(x){return {id:x.id,project_id:x.projectId,number:x.number||null,title:x.title,order_index:x.orderIndex,target_word_count:x.targetWordCount==null?null:Number(x.targetWordCount),current_word_count:Number(x.currentWordCount)||0,status:x.status||'not_started',created_at:iso(x.createdAt),updated_at:iso(x.updatedAt)};}
  function sectionToDb(x){return {id:x.id,project_id:x.projectId,chapter_id:x.chapterId,parent_section_id:x.parentSectionId||null,number:x.number||null,title:x.title,order_index:x.orderIndex,content:x.content||'',target_word_count:x.targetWordCount==null?null:Number(x.targetWordCount),current_word_count:Number(x.currentWordCount)||0,status:x.status||'not_started',created_at:iso(x.createdAt),updated_at:iso(x.updatedAt)};}
  function articleToDb(x){return {id:x.id,project_id:x.projectId,title:x.title,authors:x.authors||null,journal:x.journal||null,publication_year:x.year||null,doi:x.doi||null,abstract:x.abstract||null,pdf_storage_path:x.pdfPath||null,source_url:x.sourceUrl||null,reading_status:x.readingStatus||'unread',ai_processed:Boolean(x.aiProcessed),citation_data:x.citationData||{},created_at:iso(x.createdAt),updated_at:iso(x.updatedAt)};}
  function highlightToDb(x){return {id:x.id,project_id:x.projectId,article_id:x.articleId,page_number:x.pageNumber||null,highlighted_text:x.highlightedText||x.text||'',color:x.color||null,category:x.category||null,pdf_anchor:x.pdfAnchor||{},created_at:iso(x.createdAt),updated_at:iso(x.updatedAt)};}
  function noteToDb(x){return {id:x.id,project_id:x.projectId,article_id:x.articleId||null,highlight_id:x.highlightId||null,title:x.title||null,body:x.body||'',tags:x.tags||[],note_type:x.noteType||'research',created_at:iso(x.createdAt),updated_at:iso(x.updatedAt)};}
  function themeToDb(x){return {id:x.id,project_id:x.projectId,name:x.name,description:x.description||null,created_at:iso(x.createdAt),updated_at:iso(x.updatedAt)};}
  function articleThemeToDb(x){return {article_id:x.articleId,theme_id:x.themeId,created_at:iso(x.createdAt)};}
  function evidenceToDb(x){return {id:x.id,project_id:x.projectId,article_id:x.articleId||null,highlight_id:x.highlightId||null,note_id:x.noteId||null,theme_id:x.themeId||null,objective_id:x.objectiveId||null,chapter_id:x.chapterId||null,section_id:x.sectionId||null,relationship:x.relationship||'supports',rationale:x.rationale||null,created_at:iso(x.createdAt)};}
  function milestoneToDb(x){return {id:x.id,project_id:x.projectId,type:x.type||null,title:x.title,description:x.description||null,order_index:x.orderIndex||null,due_date:x.dueDate||null,completed_at:x.completedAt||null,status:x.status||'not_started',created_at:iso(x.createdAt),updated_at:iso(x.updatedAt)};}
  function progressToDb(x){return {id:x.id,project_id:x.projectId,snapshot_date:x.snapshotDate,current_words:Number(x.currentWords)||0,words_per_week:Number(x.wordsPerWeek)||0,articles_total:Number(x.articlesTotal)||0,articles_reviewed:Number(x.articlesReviewed)||0,chapters_total:Number(x.chaptersTotal)||0,chapters_developed:Number(x.chaptersDeveloped)||0,milestones_total:Number(x.milestonesTotal)||0,milestones_complete:Number(x.milestonesComplete)||0,highlights:Number(x.highlights)||0,notes:Number(x.notes)||0,evidence_links:Number(x.evidenceLinks)||0,sections_total:Number(x.sectionsTotal)||0,sections_with_evidence:Number(x.sectionsWithEvidence)||0,overall_progress:Number(x.overallProgress)||0,source:x.source||'legacy',created_at:iso(x.createdAt)};}
  function reviewRoundToDb(x){return {id:x.id,project_id:x.projectId,title:x.title,reviewer_name:x.reviewerName||null,status:x.status||'awaiting_feedback',scope:x.scope||'whole_thesis',chapter_id:x.chapterId||null,submitted_at:x.submittedAt||null,response_due_date:x.responseDueDate||null,notes:x.notes||null,created_at:iso(x.createdAt),updated_at:iso(x.updatedAt)};}
  function feedbackToDb(x){return {id:x.id,project_id:x.projectId,review_round_id:x.reviewRoundId||null,chapter_id:x.chapterId||null,section_id:x.sectionId||null,reviewer_name:x.reviewerName||null,category:x.category||'content',priority:x.priority||'normal',status:x.status||'open',selected_text:x.selectedText||null,comment:x.comment||'',researcher_response:x.researcherResponse||null,resolved_at:x.resolvedAt||null,created_at:iso(x.createdAt),updated_at:iso(x.updatedAt)};}
  function sectionVersionToDb(x){return {id:x.id,project_id:x.projectId,chapter_id:x.chapterId||null,section_id:x.sectionId,review_round_id:x.reviewRoundId||null,label:x.label||'Snapshot',reason:x.reason||'manual',section_title:x.sectionTitle||null,content:x.content||'',word_count:Number(x.wordCount)||0,section_status:x.sectionStatus||'not_started',created_at:iso(x.createdAt)};}
  function searchPlanToDb(x){return {id:x.id,project_id:x.projectId,framework:x.framework||null,concepts:x.concepts||[],databases:x.databases||[],limits:x.limits||null,notes:x.notes||null,created_at:iso(x.createdAt),updated_at:iso(x.updatedAt)};}
  function searchRunToDb(x){return {id:x.id,project_id:x.projectId,search_plan_id:x.searchPlanId||null,database_name:x.databaseName, searched_at:x.searchedAt||null,query_text:x.queryText||null,result_count:Number(x.resultCount)||0,imported_count:Number(x.importedCount)||0,duplicates_removed:Number(x.duplicatesRemoved)||0,notes:x.notes||null,created_at:iso(x.createdAt),updated_at:iso(x.updatedAt)};}
  function screeningToDb(x){return {id:x.id,project_id:x.projectId,article_id:x.articleId,title_abstract_decision:x.titleAbstractDecision||'pending',full_text_decision:x.fullTextDecision||'not_started',exclusion_reason:x.exclusionReason||null,notes:x.notes||null,screened_at:x.screenedAt||null,created_at:iso(x.createdAt),updated_at:iso(x.updatedAt)};}
  function threadToDb(x){return {id:x.id,project_id:x.projectId,article_id:x.articleId||null,section_id:x.sectionId||null,mode:x.mode||'research',title:x.title||null,created_at:iso(x.createdAt),updated_at:iso(x.updatedAt)};}
  function messageToDb(x){return {id:x.id,thread_id:x.threadId,role:x.role,content:x.content,source_refs:x.sourceRefs||[],created_at:iso(x.createdAt)};}

  async function upsert(table,rows,onConflict='id'){
    if(!rows.length) return;
    const {error}=await client.from(table).upsert(rows,{onConflict});
    if(error) throw new Error(table+': '+error.message);
  }


  function pdfPathFor(user,article){
    return user.id+'/'+article.projectId+'/'+article.id+'.pdf';
  }

  async function uploadPdf(articleId,user=currentUser){
    user=user||await requireUser();
    const article=window.QuireStore?.getArticle?.(articleId);
    if(!article) throw new Error('Article not found.');
    const local=await window.QuirePdfStore?.get?.(articleId);
    if(!local?.blob) return {uploaded:false,reason:'no_local_pdf'};

    const expectedPath=pdfPathFor(user,article);
    const uploadedAt=article.citationData?.cloudPdfUploadedAt||'';
    if(article.pdfPath===expectedPath && uploadedAt && String(uploadedAt)>=String(local.updatedAt||'')){
      return {uploaded:false,reason:'current',path:expectedPath};
    }

    const {error}=await client.storage.from(PDF_BUCKET).upload(expectedPath,local.blob,{
      contentType:local.type||'application/pdf',
      upsert:true,
      cacheControl:'3600'
    });
    if(error) throw new Error('PDF upload: '+error.message);

    const now=new Date().toISOString();
    window.QuireStore.updateArticle(articleId,{
      pdfPath:expectedPath,
      citationData:{
        ...(article.citationData||{}),
        cloudPdf:true,
        cloudPdfUploadedAt:now,
        cloudPdfSize:local.size||local.blob.size||null
      }
    });
    return {uploaded:true,path:expectedPath};
  }

  async function syncLocalPdfs(user=currentUser){
    if(!window.QuirePdfStore?.get) return {checked:0,uploaded:0};
    user=user||await requireUser();
    const articles=window.QuireStore?.listArticles?.()||[];
    let checked=0,uploaded=0;
    for(const article of articles){
      const local=await window.QuirePdfStore.get(article.id).catch(()=>null);
      if(!local?.blob) continue;
      checked++;
      const result=await uploadPdf(article.id,user);
      if(result.uploaded)uploaded++;
    }
    return {checked,uploaded};
  }

  async function downloadPdfToLocal(articleId){
    const user=await requireUser();
    const article=window.QuireStore?.getArticle?.(articleId);
    if(!article) throw new Error('Article not found.');
    const path=article.pdfPath||pdfPathFor(user,article);
    if(!path) return false;

    const allowedPrefix=user.id+'/'+article.projectId+'/';
    if(!String(path).startsWith(allowedPrefix)) throw new Error('This PDF path does not belong to the signed-in project.');

    const {data,error}=await client.storage.from(PDF_BUCKET).download(path);
    if(error){
      if(/not found/i.test(error.message||'')) return false;
      throw new Error('PDF download: '+error.message);
    }
    if(!data) return false;

    const filename=article.citationData?.localFileName || (article.title||'research-paper').replace(/[\\/:*?"<>|]+/g,'_')+'.pdf';
    const file=typeof File!=='undefined'
      ? new File([data],filename,{type:data.type||'application/pdf'})
      : Object.assign(data,{name:filename});
    await window.QuirePdfStore.save(articleId,file);

    window.QuireStore.updateArticle(articleId,{
      pdfPath:path,
      citationData:{
        ...(article.citationData||{}),
        localPdf:true,
        cloudPdf:true,
        cloudPdfDownloadedAt:new Date().toISOString()
      }
    });
    return true;
  }

  async function deleteCloudPdf(articleId){
    const user=await requireUser();
    const article=window.QuireStore?.getArticle?.(articleId);
    if(!article?.pdfPath) return false;
    const allowedPrefix=user.id+'/'+article.projectId+'/';
    if(!String(article.pdfPath).startsWith(allowedPrefix)) throw new Error('This PDF path does not belong to the signed-in project.');
    const {error}=await client.storage.from(PDF_BUCKET).remove([article.pdfPath]);
    if(error) throw new Error('PDF delete: '+error.message);
    return true;
  }

  async function pushAll(){
    if(syncing) return;
    const user=await requireUser();
    syncing=true;
    const previousSuppress=suppressAutoSync;
    suppressAutoSync=true;
    emit('syncing','Saving Quire to cloud…');
    try{
      await syncLocalPdfs(user);
      const state=window.QuireStore.getState();
      for(const [key,table,mapper] of tableMap){
        const rows=(state[key]||[]).map(row=>mapper(row,user));
        await upsert(table,rows,table==='article_themes'?'article_id,theme_id':'id');
      }
      const stamp=new Date().toISOString();
      localStorage.setItem(LAST_SYNC_KEY,stamp);
      emit('synced','Saved to cloud');
      return stamp;
    }finally{
      suppressAutoSync=previousSuppress;
      syncing=false;
    }
  }

  async function selectProjectRows(table,projectIds){
    if(!projectIds.length) return [];
    const {data,error}=await client.from(table).select('*').in('project_id',projectIds);
    if(error) throw new Error(table+': '+error.message);
    return data||[];
  }

  const fromProject=r=>({id:r.id,title:r.title,degreeName:r.degree_name||'',institutionName:r.institution_name||'',supervisorName:r.supervisor_name||'',researchQuestion:r.research_question||'',abstract:r.abstract||'',wordTarget:r.word_target,proposalWordTarget:r.proposal_word_target,startDate:r.start_date,finalDeadline:r.final_deadline,status:r.status,createdAt:r.created_at,updatedAt:r.updated_at});
  const fromSetup=r=>({id:r.id,projectId:r.project_id,studyType:r.study_type||'',population:r.population||'',studySetting:r.study_setting||'',methodNotes:r.method_notes||'',analysis:r.analysis||[],analysisSoftware:r.analysis_software||'',analysisRule:r.analysis_rule||'',analysisNotes:r.analysis_notes||'',proposalRequired:r.proposal_required,ethicsRequired:r.ethics_required,dataManagementRequired:r.data_management_required,protocolRegistration:r.protocol_registration,proposalRequirements:r.proposal_requirements||'',proposalDeadline:r.proposal_deadline||'',ethicsDeadline:r.ethics_deadline||'',dataStart:r.data_start||'',dataEnd:r.data_end||'',draftDeadline:r.draft_deadline||'',aiTailorMethod:r.ai_tailor_method,aiMethodChecks:r.ai_method_checks,aiProtectVoice:r.ai_protect_voice,aiEvidenceLinks:r.ai_evidence_links,designDetails:r.design_details||{},createdAt:r.created_at,updatedAt:r.updated_at});
  const fromObjective=r=>({id:r.id,projectId:r.project_id,orderIndex:r.order_index,title:r.title,description:r.description||'',status:r.status,createdAt:r.created_at,updatedAt:r.updated_at});
  const fromChapter=r=>({id:r.id,projectId:r.project_id,number:r.number||'',title:r.title,orderIndex:r.order_index,targetWordCount:r.target_word_count,currentWordCount:r.current_word_count,status:r.status,createdAt:r.created_at,updatedAt:r.updated_at});
  const fromSection=r=>({id:r.id,projectId:r.project_id,chapterId:r.chapter_id,parentSectionId:r.parent_section_id,number:r.number||'',title:r.title,orderIndex:r.order_index,content:r.content||'',targetWordCount:r.target_word_count,currentWordCount:r.current_word_count,status:r.status,createdAt:r.created_at,updatedAt:r.updated_at});
  const fromArticle=r=>({id:r.id,projectId:r.project_id,title:r.title,authors:r.authors||'',journal:r.journal||'',year:r.publication_year,doi:r.doi||'',abstract:r.abstract||'',pdfPath:r.pdf_storage_path||'',sourceUrl:r.source_url||'',readingStatus:r.reading_status,aiProcessed:r.ai_processed,citationData:r.citation_data||{},createdAt:r.created_at,updatedAt:r.updated_at});
  const fromHighlight=r=>({id:r.id,projectId:r.project_id,articleId:r.article_id,pageNumber:r.page_number,highlightedText:r.highlighted_text,color:r.color||'',category:r.category||'',pdfAnchor:r.pdf_anchor||{},createdAt:r.created_at,updatedAt:r.updated_at});
  const fromNote=r=>({id:r.id,projectId:r.project_id,articleId:r.article_id,highlightId:r.highlight_id,title:r.title||'',body:r.body||'',tags:r.tags||[],noteType:r.note_type||'research',createdAt:r.created_at,updatedAt:r.updated_at});
  const fromTheme=r=>({id:r.id,projectId:r.project_id,name:r.name,description:r.description||'',createdAt:r.created_at,updatedAt:r.updated_at});
  const fromArticleTheme=r=>({articleId:r.article_id,themeId:r.theme_id,createdAt:r.created_at});
  const fromEvidence=r=>({id:r.id,projectId:r.project_id,articleId:r.article_id,highlightId:r.highlight_id,noteId:r.note_id,themeId:r.theme_id,objectiveId:r.objective_id,chapterId:r.chapter_id,sectionId:r.section_id,relationship:r.relationship,rationale:r.rationale||'',createdAt:r.created_at});
  const fromMilestone=r=>({id:r.id,projectId:r.project_id,type:r.type||'',title:r.title,description:r.description||'',orderIndex:r.order_index,dueDate:r.due_date,completedAt:r.completed_at,status:r.status,createdAt:r.created_at,updatedAt:r.updated_at});
  const fromProgress=r=>({id:r.id,projectId:r.project_id,snapshotDate:r.snapshot_date,currentWords:r.current_words,wordsPerWeek:r.words_per_week,articlesTotal:r.articles_total,articlesReviewed:r.articles_reviewed,chaptersTotal:r.chapters_total,chaptersDeveloped:r.chapters_developed,milestonesTotal:r.milestones_total,milestonesComplete:r.milestones_complete,highlights:r.highlights,notes:r.notes,evidenceLinks:r.evidence_links||0,sectionsTotal:r.sections_total||0,sectionsWithEvidence:r.sections_with_evidence||0,overallProgress:r.overall_progress||0,source:r.source||'legacy',createdAt:r.created_at});
  const fromReviewRound=r=>({id:r.id,projectId:r.project_id,title:r.title,reviewerName:r.reviewer_name||'',status:r.status||'awaiting_feedback',scope:r.scope||'whole_thesis',chapterId:r.chapter_id||null,submittedAt:r.submitted_at||null,responseDueDate:r.response_due_date||null,notes:r.notes||'',createdAt:r.created_at,updatedAt:r.updated_at});
  const fromFeedback=r=>({id:r.id,projectId:r.project_id,reviewRoundId:r.review_round_id||null,chapterId:r.chapter_id||null,sectionId:r.section_id||null,reviewerName:r.reviewer_name||'',category:r.category||'content',priority:r.priority||'normal',status:r.status||'open',selectedText:r.selected_text||'',comment:r.comment||'',researcherResponse:r.researcher_response||'',resolvedAt:r.resolved_at||null,createdAt:r.created_at,updatedAt:r.updated_at});
  const fromSectionVersion=r=>({id:r.id,projectId:r.project_id,chapterId:r.chapter_id||null,sectionId:r.section_id,reviewRoundId:r.review_round_id||null,label:r.label||'Snapshot',reason:r.reason||'manual',sectionTitle:r.section_title||'',content:r.content||'',wordCount:r.word_count||0,sectionStatus:r.section_status||'not_started',createdAt:r.created_at});
  const fromSearchPlan=r=>({id:r.id,projectId:r.project_id,framework:r.framework||'',concepts:r.concepts||[],databases:r.databases||[],limits:r.limits||'',notes:r.notes||'',createdAt:r.created_at,updatedAt:r.updated_at});
  const fromSearchRun=r=>({id:r.id,projectId:r.project_id,searchPlanId:r.search_plan_id||null,databaseName:r.database_name,searchedAt:r.searched_at||null,queryText:r.query_text||'',resultCount:r.result_count||0,importedCount:r.imported_count||0,duplicatesRemoved:r.duplicates_removed||0,notes:r.notes||'',createdAt:r.created_at,updatedAt:r.updated_at});
  const fromScreening=r=>({id:r.id,projectId:r.project_id,articleId:r.article_id,titleAbstractDecision:r.title_abstract_decision||'pending',fullTextDecision:r.full_text_decision||'not_started',exclusionReason:r.exclusion_reason||'',notes:r.notes||'',screenedAt:r.screened_at||null,createdAt:r.created_at,updatedAt:r.updated_at});
  const fromThread=r=>({id:r.id,projectId:r.project_id,articleId:r.article_id,sectionId:r.section_id,mode:r.mode,title:r.title||'',createdAt:r.created_at,updatedAt:r.updated_at});
  const fromMessage=r=>({id:r.id,threadId:r.thread_id,role:r.role,content:r.content,sourceRefs:r.source_refs||[],createdAt:r.created_at});

  async function pullAll(){
    if(syncing) return;
    await requireUser();
    syncing=true;suppressAutoSync=true;
    emit('syncing','Loading your cloud workspace…');
    try{
      const {data:projects,error}=await client.from('thesis_projects').select('*').order('created_at',{ascending:true});
      if(error) throw error;
      if(!projects?.length) return {empty:true};

      const projectIds=projects.map(p=>p.id);
      const [setups,objectives,chapters,sections,articles,highlights,notes,themes,evidenceLinks,milestones,progressSnapshots,reviewRounds,feedbackItems,sectionVersions,searchPlans,searchRuns,screeningRecords,aiThreads]=await Promise.all([
        selectProjectRows('study_setups',projectIds),selectProjectRows('objectives',projectIds),selectProjectRows('chapters',projectIds),
        selectProjectRows('sections',projectIds),selectProjectRows('articles',projectIds),selectProjectRows('highlights',projectIds),
        selectProjectRows('notes',projectIds),selectProjectRows('themes',projectIds),selectProjectRows('evidence_links',projectIds),
        selectProjectRows('milestones',projectIds),selectProjectRows('progress_snapshots',projectIds),
        selectProjectRows('review_rounds',projectIds),selectProjectRows('feedback_items',projectIds),selectProjectRows('section_versions',projectIds),
        selectProjectRows('literature_search_plans',projectIds),selectProjectRows('literature_search_runs',projectIds),selectProjectRows('screening_records',projectIds),
        selectProjectRows('ai_threads',projectIds)
      ]);

      let articleThemes=[];
      if(articles.length){
        const {data,error}=await client.from('article_themes').select('*').in('article_id',articles.map(a=>a.id));
        if(error) throw error; articleThemes=data||[];
      }
      let aiMessages=[];
      if(aiThreads.length){
        const {data,error}=await client.from('ai_messages').select('*').in('thread_id',aiThreads.map(t=>t.id));
        if(error) throw error; aiMessages=data||[];
      }

      const old=window.QuireStore.getState();
      const state={
        version:1,
        activeProjectId:projects.some(p=>p.id===old.activeProjectId)?old.activeProjectId:projects[0].id,
        projects:projects.map(fromProject),
        studySetups:setups.map(fromSetup),
        objectives:objectives.map(fromObjective),
        chapters:chapters.map(fromChapter),
        sections:sections.map(fromSection),
        articles:articles.map(fromArticle),
        highlights:highlights.map(fromHighlight),
        notes:notes.map(fromNote),
        themes:themes.map(fromTheme),
        articleThemes:articleThemes.map(fromArticleTheme),
        evidenceLinks:evidenceLinks.map(fromEvidence),
        milestones:milestones.map(fromMilestone),
        progressSnapshots:progressSnapshots.map(fromProgress),
        reviewRounds:reviewRounds.map(fromReviewRound),
        feedbackItems:feedbackItems.map(fromFeedback),
        sectionVersions:sectionVersions.map(fromSectionVersion),
        searchPlans:searchPlans.map(fromSearchPlan),
        searchRuns:searchRuns.map(fromSearchRun),
        screeningRecords:screeningRecords.map(fromScreening),
        aiThreads:aiThreads.map(fromThread),
        aiMessages:aiMessages.map(fromMessage)
      };
      window.QuireStore.replaceState(state,{silent:true});
      const stamp=new Date().toISOString();
      localStorage.setItem(LAST_SYNC_KEY,stamp);
      window.dispatchEvent(new CustomEvent('quire:cloud-pulled'));
      emit('synced','Cloud workspace loaded');
      return {empty:false};
    }finally{
      syncing=false;
      suppressAutoSync=false;
    }
  }

  async function initialSync(){
    const user=await requireUser();
    emit('syncing','Preparing '+(user.email||'your account')+'…');
    const {count,error}=await client.from('thesis_projects').select('*',{count:'exact',head:true});
    if(error) throw error;
    if((count||0)===0){
      await pushAll();
      emit('synced','Your local thesis is now backed up to the cloud.');
    }else{
      await pullAll();
    }
  }

  function queueSync(){
    if(suppressAutoSync || !currentUser || !isConfigured()) return;
    clearTimeout(syncTimer);
    syncTimer=setTimeout(()=>pushAll().catch(err=>emit('error',err.message)),1200);
  }

  window.addEventListener('quire:store-changed',queueSync);
  window.addEventListener('quire:pdf-local-changed',queueSync);

  window.QuireCloud={
    init,setConfig,clearConfig,getConfig:config,isConfigured,
    getClient:()=>client,getUser:()=>currentUser,getLastSync:()=>localStorage.getItem(LAST_SYNC_KEY),
    signUp,signIn,signOut,pushAll,pullAll,queueSync,
    uploadPdf,syncLocalPdfs,downloadPdfToLocal,deleteCloudPdf
  };
})();