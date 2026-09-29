/* Quire Progress Intelligence — Step 19 */
(function(){
  let captureTimer=null;
  let capturing=false;

  function el(id){return document.getElementById(id);}
  function clamp(n,min=0,max=100){return Math.max(min,Math.min(max,n));}
  function pct(ratio){return Math.round(clamp((Number(ratio)||0)*100));}
  function escapeHtml(v){return String(v??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[s]));}

  function prettyDate(value){
    if(!value)return 'Not set';
    const raw=String(value);
    const date=new Date(raw.length===10?raw+'T12:00:00':raw);
    if(Number.isNaN(date.getTime()))return 'Not set';
    return date.toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'});
  }

  function dayDiff(a,b){return Math.ceil((b-a)/86400000);}

  function studyTypeLabel(type){
    return ({
      qualitative:'Qualitative study',
      quantitative:'Quantitative study',
      mixed:'Mixed-methods study',
      meta:'Systematic review / Meta-analysis'
    })[type]||'Not selected';
  }

  function methodologyLabel(data){
    if(data.studyType==='qualitative')return data.qualDesign||'Qualitative design not selected';
    if(data.studyType==='quantitative')return data.quantDesign||'Quantitative design not selected';
    if(data.studyType==='mixed')return data.mixedDesign||'Mixed-methods design not selected';
    if(data.studyType==='meta')return data.reviewType||'Review type not selected';
    return 'Not selected';
  }

  function collectionLabel(data){
    if(data.studyType==='qualitative')return data.qualCollection||'Not selected';
    if(data.studyType==='quantitative')return data.quantCollection||'Not selected';
    if(data.studyType==='mixed')return 'Qualitative + quantitative strands';
    if(data.studyType==='meta')return data.databases?'Database literature search':'Search strategy not defined';
    return 'Not selected';
  }

  function context(){
    const store=window.QuireStore;
    const project=store.getActiveProject()||{};
    const setup=store.getStudySetupData()||{};
    const live=store.computeLiveProgress()||{};
    const milestones=store.listMilestones?.()||[];
    const history=store.getProgressSnapshots?.(null,{derivedOnly:true})||[];
    return {project,setup,live,milestones,history};
  }

  function forecastFor(project,live){
    const target=Number(live.wordTarget)||Number(project.wordTarget)||0;
    const words=Number(live.currentWords)||0;
    const pace=Number(live.wordsPerWeek)||0;
    const remaining=Math.max(0,target-words);
    const today=new Date();
    const deadline=project.finalDeadline?new Date(project.finalDeadline+'T23:59:59'):null;
    const days=deadline&&!Number.isNaN(deadline.getTime())?dayDiff(today,deadline):null;
    const requiredWeekly=remaining>0&&days>0?Math.ceil(remaining/Math.max(days/7,1)):0;
    let forecast=null;
    let weeks=null;
    if(target&&remaining===0){forecast=today;weeks=0;}
    else if(target&&pace>0){
      weeks=remaining/pace;
      forecast=new Date(today);
      forecast.setDate(forecast.getDate()+Math.ceil(weeks*7));
    }
    return {target,words,pace,remaining,deadline,days,requiredWeekly,forecast,weeks};
  }

  function setText(id,value){
    const node=el(id);if(node)node.textContent=value;
  }
  function setWidth(id,value){
    const node=el(id);if(node)node.style.width=clamp(value)+'%';
  }

  function renderBreakdown(live,reviewProgress){
    const mount=el('progressBreakdown');
    if(!mount)return;
    const reviewPct=Number.isFinite(Number(reviewProgress?.score))?Number(reviewProgress.score):pct(live.researchRatio);
    const rows=[
      ['Writing',pct(live.writingRatio),35],
      ['Research review',reviewPct,15],
      ['Evidence coverage',pct(live.evidenceRatio),15],
      ['Chapters',pct(live.chapterRatio),15],
      ['Milestones',pct(live.milestoneRatio),10],
      ['Study setup',pct(live.setupRatio),10]
    ];
    mount.innerHTML=rows.map(([name,value,weight])=>
      '<div class="progress-breakdown-row"><div><span>'+escapeHtml(name)+'</span><small>'+weight+'% weight</small></div><div class="progress-breakdown-track"><i style="width:'+value+'%"></i></div><strong>'+value+'%</strong></div>'
    ).join('');
  }

  function renderHistory(history,live){
    const chart=el('progressHistoryChart');
    if(!chart)return;
    const rows=history.slice(-10);
    setText('historySnapshotCount',String(rows.length));
    if(rows.length<2){
      chart.innerHTML='<div class="progress-history-empty"><strong>Building progress history</strong><small>Quire has recorded today’s real project state. Once there are snapshots on different days, writing velocity and trend estimates will appear here.</small></div>';
      setText('historyWordsDelta','—');
      setText('historyArticlesDelta','—');
      setText('historyEvidenceDelta','—');
      setText('historyRangeLabel','Need at least 2 dated snapshots');
      return;
    }

    const first=rows[0],last=rows[rows.length-1];
    const firstDate=new Date(first.snapshotDate+'T12:00:00');
    const lastDate=new Date(last.snapshotDate+'T12:00:00');
    const spanDays=Math.max(1,Math.round((lastDate-firstDate)/86400000));
    const wordDelta=(Number(last.currentWords)||0)-(Number(first.currentWords)||0);
    const articleDelta=(Number(last.articlesReviewed)||0)-(Number(first.articlesReviewed)||0);
    const evidenceDelta=(Number(last.evidenceLinks)||0)-(Number(first.evidenceLinks)||0);

    setText('historyWordsDelta',(wordDelta>=0?'+':'')+wordDelta.toLocaleString());
    setText('historyArticlesDelta',(articleDelta>=0?'+':'')+articleDelta);
    setText('historyEvidenceDelta',(evidenceDelta>=0?'+':'')+evidenceDelta);
    setText('historyRangeLabel',spanDays+' days observed');

    const maxWords=Math.max(1,...rows.map(r=>Number(r.currentWords)||0),Number(live.wordTarget)||0);
    chart.innerHTML='<div class="progress-history-bars">'+rows.map(row=>{
      const wordHeight=Math.max(3,Math.round((Number(row.currentWords)||0)/maxWords*100));
      const overall=clamp(Number(row.overallProgress)||0);
      return '<div class="progress-history-column" title="'+escapeHtml(prettyDate(row.snapshotDate)+' · '+Number(row.currentWords||0).toLocaleString()+' words · '+overall+'% overall')+'">'+
        '<div class="history-overall-marker" style="bottom:'+overall+'%"></div>'+
        '<i style="height:'+wordHeight+'%"></i>'+
        '<span>'+escapeHtml(new Date(row.snapshotDate+'T12:00:00').toLocaleDateString(undefined,{day:'numeric',month:'short'}))+'</span>'+
      '</div>';
    }).join('')+'</div><div class="progress-history-legend"><span><i></i>Words vs target</span><span><b></b>Overall progress</span></div>';
  }

  function milestoneState(milestone){
    if(milestone.status==='complete')return {label:'Completed',className:'complete'};
    if(!milestone.dueDate)return {label:'No date',className:'neutral'};
    const now=new Date();
    const due=new Date(milestone.dueDate+'T23:59:59');
    const days=dayDiff(now,due);
    if(days<0)return {label:'Overdue · '+prettyDate(milestone.dueDate),className:'overdue'};
    if(days===0)return {label:'Due today',className:'due'};
    if(days<=14)return {label:'Due in '+days+' days',className:'due'};
    return {label:prettyDate(milestone.dueDate),className:'upcoming'};
  }

  function renderTimeline(milestones,setup,project){
    const mount=el('overviewTimeline');
    if(!mount)return;
    let rows=milestones.filter(m=>m.dueDate);
    if(!rows.length){
      const fallback=[
        ['Proposal',setup.proposalDeadline],
        ['Ethics',setup.ethicsDeadline],
        ['Data starts',setup.dataStart],
        ['Data ends',setup.dataEnd],
        ['Full draft',setup.draftDeadline],
        ['Submission',project.finalDeadline]
      ].filter(([,date])=>date).map(([title,dueDate],i)=>({id:'fallback_'+i,title,dueDate,status:'not_started'}));
      rows=fallback;
    }
    if(!rows.length){
      mount.innerHTML='<div class="overview-timeline-row"><span>No dates yet</span><i></i><strong>Set deadlines in Study Setup</strong></div>';
      return;
    }
    mount.innerHTML=rows.map(m=>{
      const state=milestoneState(m);
      return '<div class="overview-timeline-row milestone-'+state.className+'"><span>'+escapeHtml(m.title)+'</span><i></i><strong>'+escapeHtml(state.label)+'</strong></div>';
    }).join('');
  }

  function renderDashboardMilestones(milestones){
    const mount=el('dashboardMilestones');
    if(!mount)return;
    const rows=milestones.filter(m=>m.status!=='skipped').sort((a,b)=>{
      if(a.status==='complete'&&b.status!=='complete')return 1;
      if(a.status!=='complete'&&b.status==='complete')return -1;
      return String(a.dueDate||'9999').localeCompare(String(b.dueDate||'9999'));
    }).slice(0,5);
    if(!rows.length){
      mount.innerHTML='<div class="dashboard-milestone-empty">Set project dates in Study Setup to create live milestones.</div>';
      return;
    }
    mount.innerHTML=rows.map(m=>{
      const state=milestoneState(m);
      return '<label class="task '+(m.status==='complete'?'done':'')+' milestone-task '+state.className+'">'+
        '<input type="checkbox" data-progress-milestone="'+escapeHtml(m.id)+'" '+(m.status==='complete'?'checked':'')+'>'+
        '<span>'+escapeHtml(m.title)+'</span><small>'+escapeHtml(state.label)+'</small></label>';
    }).join('');
    mount.querySelectorAll('[data-progress-milestone]').forEach(input=>input.addEventListener('change',()=>{
      window.QuireStore.updateMilestone(input.dataset.progressMilestone,{status:input.checked?'complete':'not_started'});
      scheduleCapture();
      renderAll();
    }));
  }

  function renderAchievements(ctx){
    const {project,setup,live}=ctx;
    const topic=String(project.title||'').trim();
    const directionReady=Boolean(topic&&!['untitled thesis','research project'].includes(topic.toLowerCase()));
    setText('achievementQuestion',directionReady
      ? (setup.researchQuestion?'Working question recorded; keep refining it against the literature.':'Research area recorded; the working question can emerge as the literature develops.')
      : 'Start with a broad research area; the final question does not need to be fixed yet.');
    setText('achievementLibrary',live.articlesTotal
      ? live.articlesTotal+' papers in library · '+live.articlesReviewed+' reviewed'
      : 'No research papers added yet');
    setText('achievementEvidence',live.highlights+' highlights · '+live.notes+' notes · '+live.evidenceLinks+' evidence links');
    setText('achievementWriting',live.currentWords.toLocaleString()+' words written across '+live.sectionsTotal+' sections');
    setText('achievementAnalysis',Array.isArray(setup.analysis)&&setup.analysis.length?setup.analysis.join(', '):'Will adapt to your selected analysis plan');

    const list=document.querySelector('.achievement-list');
    if(!list)return;
    const items=[...list.querySelectorAll('.achievement')];
    const statuses=[
      directionReady,
      live.articlesTotal>0,
      live.evidenceLinks>0||live.highlights>0,
      live.currentWords>0,
      Array.isArray(setup.analysis)&&setup.analysis.length>0
    ];
    const firstIncomplete=statuses.findIndex(value=>!value);
    items.forEach((item,index)=>{
      item.classList.remove('done','current');
      const icon=item.querySelector(':scope > span');
      if(statuses[index]){
        item.classList.add('done');
        if(icon)icon.textContent='✓';
      }else if(index===firstIncomplete){
        item.classList.add('current');
        if(icon)icon.textContent='→';
      }else if(icon){
        icon.textContent='○';
      }
    });
  }

  function renderPace(forecast,live){
    setText('observedPace',live.wordsPerWeek>0?live.wordsPerWeek.toLocaleString():'—');
    setText('paceHistoryWindow',live.paceWindowDays>0?'Measured across '+live.paceWindowDays+' days':'Waiting for a second dated snapshot');
    setText('requiredPace',forecast.requiredWeekly>0?forecast.requiredWeekly.toLocaleString():'—');

    if(forecast.target&&forecast.remaining===0){
      setText('forecastDate','Target reached');
      setText('forecastWeeks','0 weeks');
      setText('forecastNote','The current draft word count has reached the saved thesis target.');
      return;
    }
    if(forecast.forecast&&forecast.weeks!=null){
      setText('forecastDate',forecast.forecast.toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'}));
      setText('forecastWeeks',Math.ceil(forecast.weeks)+' weeks');
      if(forecast.deadline){
        setText('forecastNote',forecast.forecast<=forecast.deadline
          ? 'Based on observed writing history, the word target currently falls before the saved submission date.'
          : 'Based on observed writing history, the word target currently falls after the saved submission date.');
      }else{
        setText('forecastNote','Estimated from your observed writing history and remaining word target.');
      }
    }else{
      setText('forecastDate','Building history');
      setText('forecastWeeks','—');
      setText('forecastNote',forecast.target
        ? 'Quire needs progress snapshots from at least two different days before it estimates your writing completion date.'
        : 'Set a thesis word target in Study Setup to calculate writing progress.');
    }
  }

  function projectHealth(forecast,live){
    if(!forecast.deadline)return {
      schedule:'No deadline',
      title:'Add a submission date',
      copy:'Set a final submission date in Study Setup so Quire can compare the remaining workload with the time available.'
    };
    if(forecast.days<0)return {
      schedule:'Deadline passed',
      title:'Timeline needs review',
      copy:'The saved final submission date has passed. Update the project timeline before relying on pace estimates.'
    };
    if(forecast.remaining===0&&forecast.target)return {
      schedule:'Writing target reached',
      title:'Writing target reached',
      copy:'Your section word counts have reached the saved thesis target. Remaining work may still include review, evidence checking, formatting and milestones.'
    };
    if(!forecast.target)return {
      schedule:'Needs word target',
      title:'Add a word target',
      copy:'A thesis word target is needed before Quire can compare writing progress with the submission date.'
    };
    if(!live.paceWindowDays)return {
      schedule:'Building history',
      title:'Collecting real pace data',
      copy:'Quire has started recording real project snapshots. A pace comparison will become available after progress has been observed on another day.'
    };
    if(forecast.requiredWeekly>0 && live.wordsPerWeek<forecast.requiredWeekly*.85)return {
      schedule:'Pace below target',
      title:'Writing pace needs attention',
      copy:'Your observed writing pace is below the weekly pace currently required to reach the word target by the saved submission date.'
    };
    if(forecast.requiredWeekly>0 && live.wordsPerWeek>forecast.requiredWeekly*1.15)return {
      schedule:'Ahead of writing pace',
      title:'Writing pace is ahead',
      copy:'Your observed writing pace is above the weekly pace currently required for the saved word target and deadline.'
    };
    return {
      schedule:'Near required pace',
      title:'Writing pace is aligned',
      copy:'Your observed writing pace is currently close to the weekly pace required by the saved word target and submission date.'
    };
  }

  function renderOverview(){
    if(!window.QuireStore)return;
    const ctx=context();
    const {project,setup,live,milestones,history}=ctx;
    const projectTitle=el('projectTitle');
    if(!projectTitle)return;

    const title=project.title||setup.thesisTitle||'Untitled thesis';
    projectTitle.textContent=title;
    setText('sidebarThesisTitle',title);

    const meta=[project.degreeName,project.institutionName,studyTypeLabel(setup.studyType),project.finalDeadline?'Submission '+prettyDate(project.finalDeadline):''].filter(Boolean);
    setText('projectMeta',meta.length?meta.join(' · '):'Study setup not yet completed');

    const overall=clamp(live.overallProgress||0);
    setText('projectProgressPercent',overall+'%');
    const ring=el('projectProgressRing');
    if(ring)ring.style.background='conic-gradient(#ddc8a3 0deg,#ddc8a3 '+(overall*3.6)+'deg,#3d3935 '+(overall*3.6)+'deg,#3d3935 360deg)';
    setWidth('sidebarProgressBar',overall);
    setText('sidebarProgressText',overall+'% evidence-based progress · Open project →');

    let headline='The project is taking shape.';
    if(overall<15)headline='The research foundation is being built.';
    else if(overall>=80)headline='The project is in an advanced stage.';
    else if(overall>=55)headline='The thesis is moving through its middle stages.';
    else if(overall>=30)headline='Research and writing are becoming connected.';
    setText('projectStatusHeadline',headline);
    const researchReview=window.QuireResearchFoundation?.reviewProgress?.(window.QuireStore.getActiveProjectId())||null;
    const articlePct=Number.isFinite(Number(researchReview?.score))?Number(researchReview.score):pct(live.researchRatio);
    setText('projectStatusCopy',
      'Calculated from real project records: writing '+pct(live.writingRatio)+'%, research review '+articlePct+'%, evidence coverage '+pct(live.evidenceRatio)+'%, chapters '+pct(live.chapterRatio)+'%, milestones '+pct(live.milestoneRatio)+'% and setup '+pct(live.setupRatio)+'%. Research review is process-based and does not mean that '+articlePct+'% of all existing literature has been read.');

    const wordPct=pct(live.writingRatio);
    const chapterPct=pct(live.chapterRatio);
    const milestonePct=pct(live.milestoneRatio);
    setText('metricWords',live.currentWords.toLocaleString());
    setText('metricWordsTarget',live.wordTarget?'of '+live.wordTarget.toLocaleString()+' target · '+wordPct+'%':'word target not set');
    setText('metricArticles',articlePct+'%');
    setText('metricArticlesTarget',researchReview
      ? researchReview.counts.reviewed+' reviewed in depth · '+researchReview.counts.papers+' collected'
      : live.articlesReviewed+' reviewed · '+live.articlesTotal+' collected');
    setText('metricChapters',live.chaptersDeveloped+' / '+live.chaptersTotal);
    setText('metricMilestones',live.milestonesComplete+' / '+live.milestonesTotal);
    setWidth('wordProgressBar',wordPct);setWidth('articleProgressBar',articlePct);setWidth('chapterProgressBar',chapterPct);setWidth('milestoneProgressBar',milestonePct);

    setText('paramStudyType',studyTypeLabel(setup.studyType));
    setText('paramMethodology',methodologyLabel(setup));
    setText('paramCollection',collectionLabel(setup));
    setText('paramAnalysis',Array.isArray(setup.analysis)&&setup.analysis.length?setup.analysis.slice(0,2).join(', ')+(setup.analysis.length>2?' +'+(setup.analysis.length-2):''):'Not selected');
    setText('paramPopulation',setup.population||'Not defined');
    setText('paramSoftware',setup.analysisSoftware||'Not selected');
    setText('overviewResearchQuestion',project.researchQuestion||'Add your research question in Study Setup.');

    renderAchievements(ctx);
    renderBreakdown(live,researchReview);

    const forecast=forecastFor(project,live);
    renderPace(forecast,live);

    if(forecast.deadline){
      setText('daysRemaining',forecast.days>=0?String(forecast.days):String(Math.abs(forecast.days)));
      const daysLabel=el('daysRemainingLabel');
      if(daysLabel)daysLabel.textContent=forecast.days>=0?'days to submission':'days since deadline';
      setText('weeklyTarget',forecast.requiredWeekly?forecast.requiredWeekly.toLocaleString():'—');
    }else{
      setText('daysRemaining','—');setText('weeklyTarget','—');
      const daysLabel=el('daysRemainingLabel');if(daysLabel)daysLabel.textContent='days to submission';
    }

    const health=projectHealth(forecast,live);
    setText('scheduleStatus',health.schedule);
    setText('healthTitle',health.title);
    setText('healthCopy',health.copy);

    const next=milestones.filter(m=>m.status!=='complete'&&m.status!=='skipped'&&m.dueDate)
      .sort((a,b)=>String(a.dueDate).localeCompare(String(b.dueDate))).slice(0,4);
    const deadlineList=el('deadlineList');
    if(deadlineList){
      deadlineList.innerHTML=next.length?next.map(m=>{
        const st=milestoneState(m);
        return '<div class="'+st.className+'"><span>'+escapeHtml(m.title)+'</span><strong>'+escapeHtml(st.label)+'</strong></div>';
      }).join(''):'<div><span>Next deadline</span><strong>No upcoming dated milestones</strong></div>';
    }

    renderTimeline(milestones,setup,project);
    renderHistory(history,live);
  }

  function renderDashboard(){
    if(!window.QuireStore)return;
    const ctx=context();
    const {project,live,milestones}=ctx;
    const state=window.QuireStore.getState();
    const projectId=window.QuireStore.getActiveProjectId();
    const objectives=state.objectives.filter(o=>o.projectId===projectId&&o.status!=='archived');
    const themes=state.themes.filter(t=>t.projectId===projectId);

    window.QuireResearchFoundation?.renderHomeHero?.();

    const values=[live.articlesTotal,live.highlights,live.notes,themes.length];
    document.querySelectorAll('.stat-panel .stats > div strong').forEach((node,index)=>{
      if(values[index]!==undefined)node.textContent=String(values[index]);
    });
    renderDashboardMilestones(milestones);
  }

  function renderReaderReviewStatus(articleId=window.QuirePdfReader?.getCurrentArticleId?.()){
    const button=el('readerReviewStatusBtn');
    if(!button)return;
    const article=articleId?window.QuireStore?.getArticle?.(articleId):null;
    if(!article){button.textContent='Mark reviewed';button.disabled=true;return;}
    button.disabled=false;
    button.textContent=article.readingStatus==='reviewed'?'✓ Reviewed':'Mark reviewed';
    button.classList.toggle('reviewed',article.readingStatus==='reviewed');
  }

  function renderAll(){
    renderOverview();
    renderDashboard();
    renderReaderReviewStatus();
    window.QuireProjects?.render?.();
  }

  function captureNow(){
    if(capturing||!window.QuireStore?.captureDailyProgressSnapshot)return;
    capturing=true;
    try{window.QuireStore.captureDailyProgressSnapshot();}
    finally{capturing=false;}
  }

  function scheduleCapture(){
    if(capturing)return;
    clearTimeout(captureTimer);
    captureTimer=setTimeout(()=>{
      captureNow();
      renderAll();
    },900);
  }

  function bind(){
    el('refreshProgressBtn')?.addEventListener('click',()=>{
      captureNow();renderAll();
      window.dispatchEvent(new CustomEvent('quire:progress-refreshed'));
    });
    el('readerReviewStatusBtn')?.addEventListener('click',()=>{
      const articleId=window.QuirePdfReader?.getCurrentArticleId?.();
      const article=articleId?window.QuireStore?.getArticle?.(articleId):null;
      if(!article)return;
      const markingReviewed=article.readingStatus!=='reviewed';
      window.QuireStore.updateArticle(articleId,{readingStatus:markingReviewed?'reviewed':'reading'});
      renderReaderReviewStatus(articleId);
      scheduleCapture();
      if(markingReviewed)window.dispatchEvent(new CustomEvent('quire:paper-reviewed',{detail:{articleId}}));
    });
    window.addEventListener('quire:article-selected',e=>renderReaderReviewStatus(e.detail?.articleId));
    window.addEventListener('quire:pdf-opened',e=>renderReaderReviewStatus(e.detail?.articleId));
    window.addEventListener('quire:project-switched',()=>{setTimeout(()=>{captureNow();renderAll();},0);});
    window.addEventListener('quire:cloud-pulled',()=>{setTimeout(()=>{captureNow();renderAll();},0);});
    window.addEventListener('quire:store-changed',()=>{
      if(capturing)return;
      scheduleCapture();
      if(el('overview')?.classList.contains('active')||el('dashboard')?.classList.contains('active')) renderAll();
    });

    captureNow();
    renderAll();
  }

  document.addEventListener('DOMContentLoaded',bind);
  window.QuireProgress={renderOverview,renderDashboard,renderAll,captureNow,forecastFor};
})();