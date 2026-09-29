/* Quire Submission Readiness & Integrity — Step 27 */
(function(){
  let checks=[],lastRun=null;
  const esc=v=>String(v??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[s]));
  const norm=v=>String(v||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  const plural=(n,s,p)=>n+' '+(n===1?s:(p||s+'s'));
  const mk=(id,category,title,status,detail,view=null,label='Open')=>({id,category,title,status,detail,view,label});

  function inlineCitationIds(sections){
    const out=[],re=/data-citation-article=["']([^"']+)["']/g;
    sections.forEach(sec=>{let m;while((m=re.exec(String(sec.content||''))))out.push(m[1]);});
    return out;
  }
  function duplicates(articles){
    const doi=new Map(),title=new Map(),dupes=new Set();
    articles.forEach(a=>{
      const d=String(a.doi||'').trim().toLowerCase(),t=norm(a.title);
      if(d){if(doi.has(d)){dupes.add(doi.get(d));dupes.add(a.id);}else doi.set(d,a.id);}
      else if(t){if(title.has(t)){dupes.add(title.get(t));dupes.add(a.id);}else title.set(t,a.id);}
    });
    return dupes;
  }
  function includedIds(records){
    return new Set(records.filter(r=>r.fullTextDecision==='include'||(r.fullTextDecision==='not_started'&&r.titleAbstractDecision==='include')).map(r=>r.articleId));
  }

  function evaluate(){
    const store=window.QuireStore,state=store.getState(),pid=store.getActiveProjectId();
    const project=store.getActiveProject()||{},setup=store.getStudySetupData()||{},progress=store.computeLiveProgress()||{};
    const chapters=store.listChapters(),sections=(state.sections||[]).filter(s=>s.projectId===pid),articles=store.listArticles();
    const objectives=store.listObjectives(),evidence=(state.evidenceLinks||[]).filter(e=>e.projectId===pid);
    const milestones=store.listMilestones?.()||[],feedback=store.listFeedback?.()||[],screening=store.listScreeningRecords?.()||[];
    const appraisals=store.listAppraisals?.()||[],analysis=store.listAnalysisItems?.()||[],custom=store.listSubmissionItems?.()||[];
    const out=[];

    out.push(mk('title','Project foundation','Thesis title',project.title&&norm(project.title)!=='untitled thesis'?'clear':'review',
      project.title&&norm(project.title)!=='untitled thesis'?'A working thesis title is recorded.':'The project still uses a generic or missing title.','setup','Study Setup'));
    out.push(mk('question','Project foundation','Research question',String(project.researchQuestion||'').trim()?'clear':'blocker',
      String(project.researchQuestion||'').trim()?'A research question is recorded.':'No research question is recorded for the active thesis.','setup','Study Setup'));
    out.push(mk('objectives','Project foundation','Research objectives',objectives.length?'clear':'review',
      objectives.length?plural(objectives.length,'objective')+' recorded.':'No research objectives are recorded.','setup','Study Setup'));
    out.push(mk('design','Project foundation','Study design',setup.studyType?'clear':'review',
      setup.studyType?'Study type: '+setup.studyType.replace('meta','systematic review / meta-analysis')+'.':'Study type has not been selected.','setup','Study Setup'));

    const anchorText=[project.researchQuestion,...objectives.map(o=>o.title+' '+(o.description||''))].join(' ');
    const driftStop=new Set('the and that with from this into your their about study research question explore identify evaluate effect impact relationship'.split(' '));
    const anchorTerms=new Set(norm(anchorText).split(' ').filter(x=>x.length>4&&!driftStop.has(x)));
    const overlap=value=>{const t=new Set(norm(value).split(' ').filter(x=>x.length>4&&!driftStop.has(x)));return [...t].filter(x=>anchorTerms.has(x)).length;};
    const readyIdeas=(state.analysisItems||[]).filter(x=>x.projectId===pid&&x.kind==='idea'&&x.payload?.ideaStatus==='ready');
    const driftIdeas=anchorTerms.size?readyIdeas.filter(x=>overlap(x.title)===0):[];
    const substantiveSections=sections.filter(s=>(Number(s.currentWordCount)||0)>=120);
    const driftSections=anchorTerms.size?substantiveSections.filter(s=>overlap((()=>{const d=document.createElement('div');d.innerHTML=s.content||'';return d.innerText||'';})())===0):[];
    out.push(mk('question-drift','Project foundation','Research-question alignment reflection',driftIdeas.length||driftSections.length?'review':'clear',
      driftIdeas.length||driftSections.length?plural(driftIdeas.length,'ready argument')+' and '+plural(driftSections.length,'substantive section')+' share no obvious key terms with the saved question/objectives. Review relevance manually; different terminology can still be fully appropriate.':'Ready arguments and substantive sections share at least some terminology with the saved question/objectives.','map','Thesis Map'));

    const sectionPlain=sections.map(s=>{const d=document.createElement('div');d.innerHTML=s.content||'';return {section:s,text:(d.innerText||'').replace(/\s+/g,' ').trim()};});
    const claimRows=sectionPlain.flatMap(row=>(row.text.match(/[^.!?]+[.!?]+|[^.!?]+$/g)||[]).map(sentence=>({section:row.section,text:sentence.trim(),norm:norm(sentence)})).filter(x=>x.text.length>45));
    const repeated=[];
    for(let i=0;i<claimRows.length;i++)for(let j=i+1;j<claimRows.length;j++){
      if(claimRows[i].section.id===claimRows[j].section.id)continue;
      const a=claimRows[i].norm.split(' ').filter(x=>x.length>4),b=new Set(claimRows[j].norm.split(' ').filter(x=>x.length>4));
      const ratio=a.length?[...new Set(a)].filter(x=>b.has(x)).length/Math.max(1,new Set(a).size):0;
      if(ratio>=.75)repeated.push([claimRows[i],claimRows[j]]);
    }
    out.push(mk('cross-repeat','Writing & structure','Cross-section claim repetition',repeated.length?'review':'clear',
      repeated.length?plural(repeated.length,'high-overlap claim pair')+' appear across different sections. Check whether repetition is purposeful or should be synthesised/referenced once.':'No strong repeated-claim wording detected across sections.','chapters','Chapters'));
    const uncoveredObjectives=objectives.filter(o=>substantiveSections.length&&sectionPlain.filter(x=>(Number(x.section.currentWordCount)||0)>=120).every(x=>overlap(o.title+' '+x.text)===0));
    out.push(mk('objective-coverage','Writing & structure','Objective coverage reflection',uncoveredObjectives.length?'review':'clear',
      uncoveredObjectives.length?plural(uncoveredObjectives.length,'objective')+' have no obvious terminology overlap with substantive writing. Check coverage manually.':'Each objective has at least some terminology overlap with substantive writing, or there is not enough writing yet to assess.','chapters','Chapters'));
    const neg=/\b(no|not|without|did not|does not|failed to|no association|no difference|lower|reduced)\b/i;
    const possibleOpposition=[];
    for(let i=0;i<claimRows.length;i++)for(let j=i+1;j<claimRows.length;j++){
      if(claimRows[i].section.id===claimRows[j].section.id||neg.test(claimRows[i].text)===neg.test(claimRows[j].text))continue;
      const a=new Set(claimRows[i].norm.split(' ').filter(x=>x.length>5)),b=new Set(claimRows[j].norm.split(' ').filter(x=>x.length>5));
      if([...a].filter(x=>b.has(x)).length>=3)possibleOpposition.push([claimRows[i],claimRows[j]]);
    }
    out.push(mk('cross-opposition','Writing & structure','Possible cross-section tension',possibleOpposition.length?'review':'clear',
      possibleOpposition.length?plural(possibleOpposition.length,'statement pair')+' discuss overlapping terms with differing negation/direction. Compare context before deciding whether there is a real contradiction.':'No obvious opposite-direction statement pairs detected across sections.','review','Writing Review'));

    const emptyChapters=chapters.filter(ch=>!sections.some(s=>s.chapterId===ch.id));
    out.push(mk('chapters','Writing & structure','Chapter structure',chapters.length&&emptyChapters.length===0?'clear':'review',
      !chapters.length?'No chapters exist.':emptyChapters.length?plural(emptyChapters.length,'chapter')+' currently have no sections.':'Every chapter has at least one section.','chapters','Chapters'));
    const incomplete=sections.filter(s=>s.status!=='complete'&&(s.currentWordCount||s.content));
    out.push(mk('sections','Writing & structure','Draft status',sections.length&&incomplete.length===0?'clear':'review',
      !sections.length?'No manuscript sections exist.':incomplete.length?plural(incomplete.length,'written section')+' are not marked complete.':'Written sections are marked complete.','chapters','Chapters'));
    if(progress.wordTarget){
      const ratio=progress.currentWords/progress.wordTarget;
      out.push(mk('words','Writing & structure','Word target',ratio>=.9?'clear':'review',
        progress.currentWords.toLocaleString()+' of '+progress.wordTarget.toLocaleString()+' words recorded ('+Math.round(ratio*100)+'%).','overview','Overview'));
    }else out.push(mk('words','Writing & structure','Word target','review','No thesis word target is set.','setup','Study Setup'));

    const diag=window.QuireCitations?.diagnostics?.()||{missing:[]},articleIds=new Set(articles.map(a=>a.id));
    const orphan=[...new Set(inlineCitationIds(sections).filter(id=>!articleIds.has(id)))];
    out.push(mk('citations','Evidence & references','Inline citation links',orphan.length?'blocker':'clear',
      orphan.length?plural(orphan.length,'inline citation')+' point to missing library records.':'Inline citations point to existing library records.','chapters','Chapters'));
    out.push(mk('metadata','Evidence & references','Reference metadata',diag.missing?.length?'review':'clear',
      diag.missing?.length?plural(diag.missing.length,'library reference')+' are missing core title/author/year metadata.':'Core metadata is present for the references checked by Quire.','library','Research Library'));
    const dupes=duplicates(articles);
    out.push(mk('duplicates','Evidence & references','Duplicate references',dupes.size?'review':'clear',
      dupes.size?plural(dupes.size,'library record')+' appear to share a DOI or normalised title.':'No obvious DOI/title duplicates detected.','library','Research Library'));
    out.push(mk('unused-references','Evidence & references','Unused library references',diag.unused?.length?'info':'clear',
      diag.unused?.length?plural(diag.unused.length,'library item')+' are not currently cited in the manuscript. This is informational; research libraries commonly contain uncited reading.':'Every current library item is cited.','library','Research Library'));
    const citedIds=new Set(diag.usedIds||[]);
    const highlightedArticleIds=new Set((state.highlights||[]).filter(h=>h.projectId===pid).map(h=>h.articleId));
    const citedWithoutPassage=[...citedIds].filter(id=>!highlightedArticleIds.has(id));
    out.push(mk('citation-passages','Evidence & references','Cited-source passage trace',citedWithoutPassage.length?'review':'clear',
      citedWithoutPassage.length?plural(citedWithoutPassage.length,'cited source')+' have no saved highlight/passage in Quire. The citation may still be valid, but page-level support has not been captured here.':'Cited sources have at least one saved passage/highlight for traceability.','library','Research Library'));
    const sectionEvidence=new Set(evidence.map(e=>e.sectionId).filter(Boolean)),written=sections.filter(s=>(Number(s.currentWordCount)||0)>0);
    const noEvidence=written.filter(s=>!sectionEvidence.has(s.id));
    out.push(mk('evidence','Evidence & references','Evidence-linked writing',noEvidence.length?'review':'clear',
      noEvidence.length?plural(noEvidence.length,'written section')+' have no evidence link.':'Written sections have at least one stored evidence relationship.','map','Thesis Map'));

    const highlightIds=new Set((state.highlights||[]).filter(h=>h.projectId===pid).map(h=>h.id));
    const noteIds=new Set((state.notes||[]).filter(n=>n.projectId===pid).map(n=>n.id)),sectionIds=new Set(sections.map(s=>s.id));
    const broken=evidence.filter(e=>(e.articleId&&!articleIds.has(e.articleId))||(e.highlightId&&!highlightIds.has(e.highlightId))||(e.noteId&&!noteIds.has(e.noteId))||(e.sectionId&&!sectionIds.has(e.sectionId)));
    out.push(mk('graph','Data integrity','Evidence graph integrity',broken.length?'blocker':'clear',
      broken.length?plural(broken.length,'evidence link')+' reference records that no longer exist.':'No broken article/highlight/note/section evidence links detected.','map','Thesis Map'));

    const reviewFlow=setup.studyType==='meta'||(state.searchRuns||[]).some(r=>r.projectId===pid)||screening.some(r=>r.titleAbstractDecision!=='pending');
    if(reviewFlow){
      const pending=screening.filter(r=>r.titleAbstractDecision==='pending').length;
      const maybe=screening.filter(r=>r.titleAbstractDecision==='maybe'||r.fullTextDecision==='maybe').length;
      const noReason=screening.filter(r=>(r.titleAbstractDecision==='exclude'||r.fullTextDecision==='exclude')&&!String(r.exclusionReason||'').trim()).length;
      out.push(mk('screening','Search, screening & appraisal','Screening decisions',pending||maybe?'review':'clear',
        pending||maybe?plural(pending,'pending record')+' · '+plural(maybe,'maybe decision'):'No pending or maybe screening decisions.','searchscreen','Search & Screening'));
      out.push(mk('reasons','Search, screening & appraisal','Exclusion reasons',noReason?'review':'clear',
        noReason?plural(noReason,'excluded record')+' have no exclusion reason.':'Excluded records have recorded reasons.','searchscreen','Search & Screening'));
      const included=includedIds(screening),appraised=new Set(appraisals.filter(a=>a.completedAt&&a.overallJudgement!=='not_started').map(a=>a.articleId));
      const missing=[...included].filter(id=>!appraised.has(id)).length;
      out.push(mk('appraisal','Search, screening & appraisal','Appraisal of included evidence',missing?'review':'clear',
        included.size?(missing?plural(missing,'included paper')+' do not have a completed appraisal.':'Included papers have completed appraisal records.'):'No included-paper set has been established yet.','appraisal','Critical Appraisal'));
    }else out.push(mk('screening-info','Search, screening & appraisal','Formal screening workflow','info',
      'A formal screening workflow has not been used. This may be appropriate for a non-systematic thesis literature review.','searchscreen','Search & Screening'));

    const methodText=[setup.methodNotes,setup.analysisNotes,setup.analysisSoftware,(setup.analysis||[]).join(' ')].join(' ').trim();
    out.push(mk('methods','Methods & analysis','Methodology planning',setup.studyType&&methodText?'clear':'review',
      setup.studyType&&methodText?'Study design and analysis planning information are recorded.':'Methodology or analysis planning is still sparse.','methodology','Methodology'));
    if(['qualitative','quantitative','mixed','meta'].includes(setup.studyType)){
      out.push(mk('analysis','Methods & analysis','Analysis outputs',analysis.length?'clear':'review',
        analysis.length?plural(analysis.length,'analysis item')+' recorded.':'No analysis findings/results are recorded.','analysis','Data & Analysis'));
      const unlinked=analysis.filter(i=>(i.status==='ready'||i.status==='verified')&&!i.sectionId).length;
      out.push(mk('analysis-links','Methods & analysis','Analysis-to-writing links',unlinked?'review':'clear',
        unlinked?plural(unlinked,'ready analysis item')+' are not linked to a manuscript section.':'Ready/verified analysis items are linked to writing destinations.','analysis','Data & Analysis'));
    }

    const unresolved=feedback.filter(f=>f.status!=='resolved').length;
    out.push(mk('feedback','Supervision & timeline','Supervisor feedback',unresolved?'review':'clear',
      unresolved?plural(unresolved,'feedback item')+' remain open or in progress.':'No unresolved supervisor feedback is recorded.','supervision','Supervision'));
    const now=new Date(),overdue=milestones.filter(m=>m.status!=='complete'&&m.status!=='skipped'&&m.dueDate&&new Date(m.dueDate+'T23:59:59')<now);
    out.push(mk('milestones','Supervision & timeline','Overdue milestones',overdue.length?'review':'clear',
      overdue.length?plural(overdue.length,'milestone')+' are past their saved due date.':'No overdue active milestones.','overview','Overview'));

    out.push(mk('abstract','Export & final package','Abstract',String(project.abstract||'').trim()?'clear':'review',
      String(project.abstract||'').trim()?'An abstract is recorded.':'The project abstract is empty.','export','Thesis Export'));
    const identity=[!project.degreeName?'degree/programme':null,!project.institutionName?'institution':null].filter(Boolean);
    out.push(mk('identity','Export & final package','Title-page metadata',identity.length?'review':'clear',
      identity.length?'Missing '+identity.join(' and ')+'.':'Degree/programme and institution are recorded.','setup','Study Setup'));
    let exportSettings={};try{exportSettings=JSON.parse(localStorage.getItem('quire:export:'+pid)||'{}')||{};}catch(e){}
    out.push(mk('author','Export & final package','Candidate / author name',String(exportSettings.authorName||'').trim()?'clear':'review',
      String(exportSettings.authorName||'').trim()?'Candidate/author name is set for export.':'Candidate/author name has not yet been set in Thesis Export.','export','Thesis Export'));

    if(custom.length){
      const open=custom.filter(i=>!i.completed).length;
      out.push(mk('local','Institution / local requirements','Institution-specific checklist',open?'review':'clear',
        open?plural(open,'custom checklist item')+' remain incomplete.':'Your custom institution/local checklist is complete.','readiness','Checklist'));
    }else out.push(mk('local','Institution / local requirements','Institution-specific checklist','info',
      'No local checklist items have been added. Add university-specific formatting, declarations or approval requirements below.','readiness','Checklist'));

    checks=out;lastRun=new Date();return out;
  }

  function countRows(rows=checks){return {blocker:rows.filter(x=>x.status==='blocker').length,review:rows.filter(x=>x.status==='review').length,clear:rows.filter(x=>x.status==='clear').length,info:rows.filter(x=>x.status==='info').length};}

  function renderSummary(rows){
    const c=countRows(rows);
    document.getElementById('readinessBlockers').textContent=c.blocker;
    document.getElementById('readinessReviews').textContent=c.review;
    document.getElementById('readinessClear').textContent=c.clear;
    document.getElementById('readinessCustomOpen').textContent=window.QuireStore.listSubmissionItems().filter(i=>!i.completed).length;
    document.getElementById('readinessLastRun').textContent='Checked '+lastRun.toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit'});
    const box=document.getElementById('readinessStatus');
    if(c.blocker){box.className='readiness-status blocker';box.innerHTML='<span>STRUCTURAL BLOCKERS</span><strong>'+plural(c.blocker,'blocking integrity issue')+' detected</strong><p>Resolve the red checks before relying on Quire’s final export package. This does not assess academic merit.</p>';}
    else if(c.review){box.className='readiness-status review';box.innerHTML='<span>REVIEW REMAINING ITEMS</span><strong>No structural blockers detected</strong><p>'+plural(c.review,'item')+' still need review, completion or a researcher decision before finalisation.</p>';}
    else{box.className='readiness-status clear';box.innerHTML='<span>CORE CHECKS CLEAR</span><strong>No unresolved structural checks detected</strong><p>Quire’s recorded checks are clear. Final academic, ethical and institutional approval remains with you, your supervisor and your institution.</p>';}
  }

  function renderChecks(rows){
    const mount=document.getElementById('readinessChecks');if(!mount)return;
    const cats=[...new Set(rows.map(x=>x.category))];
    mount.innerHTML=cats.map(cat=>'<section class="readiness-category"><div class="readiness-category-head"><span>'+esc(cat)+'</span><small>'+rows.filter(x=>x.category===cat).length+' checks</small></div>'+
      rows.filter(x=>x.category===cat).map(x=>'<article class="readiness-check '+x.status+'"><span class="readiness-check-icon">'+({clear:'✓',review:'!',blocker:'×',info:'i'})[x.status]+'</span><div><strong>'+esc(x.title)+'</strong><p>'+esc(x.detail)+'</p></div>'+(x.view?'<button type="button" data-readiness-view="'+esc(x.view)+'">'+esc(x.label)+' →</button>':'')+'</article>').join('')+'</section>').join('');
    mount.querySelectorAll('[data-readiness-view]').forEach(btn=>btn.addEventListener('click',()=>{
      const view=btn.dataset.readinessView;
      if(view==='readiness')document.getElementById('submissionChecklist')?.scrollIntoView({behavior:'smooth'});
      else window.showView?.(view);
    }));
  }

  function renderCustom(){
    const mount=document.getElementById('submissionChecklist');if(!mount)return;
    const rows=window.QuireStore.listSubmissionItems();
    if(!rows.length){mount.innerHTML='<div class="readiness-empty"><strong>No local checklist items yet</strong><small>Add requirements from your university handbook, supervisor or programme that Quire cannot infer automatically.</small></div>';return;}
    mount.innerHTML=rows.map(item=>'<article class="submission-item '+(item.completed?'done':'')+'"><label><input type="checkbox" data-submission-toggle="'+item.id+'" '+(item.completed?'checked':'')+'><span><strong>'+esc(item.title)+'</strong><small>'+esc(item.category)+(item.note?' · '+esc(item.note):'')+'</small></span></label><button type="button" data-submission-delete="'+item.id+'">×</button></article>').join('');
    mount.querySelectorAll('[data-submission-toggle]').forEach(input=>input.addEventListener('change',()=>{window.QuireStore.updateSubmissionItem(input.dataset.submissionToggle,{completed:input.checked});run();}));
    mount.querySelectorAll('[data-submission-delete]').forEach(btn=>btn.addEventListener('click',()=>{if(confirm('Delete this local checklist item?')){window.QuireStore.removeSubmissionItem(btn.dataset.submissionDelete);run();}}));
  }

  function addCustom(){
    const title=document.getElementById('submissionItemTitle').value.trim();if(!title)return;
    window.QuireStore.addSubmissionItem({title,category:document.getElementById('submissionItemCategory').value.trim()||'Institution / local requirements'});
    document.getElementById('submissionItemTitle').value='';run();
  }

  function markdown(){
    const project=window.QuireStore.getActiveProject()||{},c=countRows(),custom=window.QuireStore.listSubmissionItems();
    const lines=['# Quire submission readiness report','','**Project:** '+(project.title||'Untitled thesis'),'**Generated:** '+new Date().toLocaleString(),'','> Structural/integrity checklist only. This does not certify academic quality, ethical compliance or institutional approval.','','## Summary','','- Blocking integrity issues: '+c.blocker,'- Items to review: '+c.review,'- Checks clear: '+c.clear,'- Informational checks: '+c.info,''];
    [...new Set(checks.map(x=>x.category))].forEach(cat=>{lines.push('## '+cat,'');checks.filter(x=>x.category===cat).forEach(x=>lines.push('- **'+x.status.toUpperCase()+' — '+x.title+':** '+x.detail));lines.push('');});
    lines.push('## Institution / local checklist','');if(custom.length)custom.forEach(i=>lines.push('- ['+(i.completed?'x':' ')+'] '+i.title+(i.category?' — '+i.category:'')));else lines.push('- No custom checklist items recorded.');
    return lines.join('\n');
  }
  function download(){
    if(!checks.length)evaluate();
    const project=window.QuireStore.getActiveProject()||{},blob=new Blob([markdown()],{type:'text/markdown;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download=(project.title||'thesis').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,60)+'-readiness.md';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  function run(){const rows=evaluate();renderSummary(rows);renderChecks(rows);renderCustom();}
  function bind(){
    document.getElementById('runReadinessBtn')?.addEventListener('click',run);
    document.getElementById('downloadReadinessReportBtn')?.addEventListener('click',download);
    document.getElementById('addSubmissionItemBtn')?.addEventListener('click',addCustom);
    document.getElementById('submissionItemTitle')?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();addCustom();}});
    window.addEventListener('quire:project-switched',run);window.addEventListener('quire:cloud-pulled',run);
    window.addEventListener('quire:store-changed',()=>{if(document.getElementById('readiness')?.classList.contains('active'))run();});
    run();
  }
  document.addEventListener('DOMContentLoaded',bind);
  window.QuireReadiness={run,evaluate,markdown};
})();