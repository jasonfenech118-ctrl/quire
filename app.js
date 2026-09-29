const views = [...document.querySelectorAll('.view')];
const navItems = [...document.querySelectorAll('.nav-item')];
const modal = document.getElementById('modal');
const fileInput = document.getElementById('fileInput');

function showView(id){
  views.forEach(v => v.classList.toggle('active', v.id === id));
  navItems.forEach(n => n.classList.toggle('active', n.dataset.view === id));
  window.scrollTo({top:0, behavior:'smooth'});
}

navItems.forEach(btn => btn.addEventListener('click', () => showView(btn.dataset.view)));
document.querySelectorAll('[data-go]').forEach(btn => btn.addEventListener('click', () => showView(btn.dataset.go)));
document.querySelectorAll('[data-open-reader]').forEach(card => card.addEventListener('click', () => showView('reader')));

document.getElementById('newItemBtn').addEventListener('click', () => modal.hidden = false);
document.getElementById('uploadArticleBtn').addEventListener('click', () => {
  if(window.QuirePdfReader) window.QuirePdfReader.pendingArticleId=null;
  fileInput.click();
});
document.getElementById('closeModal').addEventListener('click', () => modal.hidden = true);
modal.addEventListener('click', e => { if(e.target === modal) modal.hidden = true; });
document.querySelector('[data-action="upload"]').addEventListener('click', () => {
  if(window.QuirePdfReader) window.QuirePdfReader.pendingArticleId=null;
  fileInput.click();
});
document.querySelectorAll('[data-go-modal]').forEach(btn => btn.addEventListener('click', () => {
  modal.hidden = true; showView(btn.dataset.goModal);
}));

fileInput.addEventListener('change', async e => {
  const file = e.target.files[0];
  if(!file) return;
  modal.hidden = true;
  try{
    showToast('Adding '+file.name+'…');
    let article;
    const pendingId=window.QuirePdfReader?.pendingArticleId;
    if(pendingId){
      article=await window.QuirePdfReader.attachFileToArticle(pendingId,file);
      window.QuirePdfReader.pendingArticleId=null;
    }else{
      article=await window.QuirePdfReader.importFile(file);
    }
    renderLibraryArticles();
    showView('reader');
    showToast((article?.title || file.name)+' is ready to read');
  }catch(err){
    console.error(err);
    showToast(err.message || 'Quire could not add this PDF');
  }finally{
    fileInput.value='';
  }
});

document.querySelectorAll('.prompt-chip').forEach(chip => chip.addEventListener('click', () => {
  document.getElementById('dashboardPrompt').value = chip.textContent;
}));

document.getElementById('dashboardAsk').addEventListener('click', () => {
  const input = document.getElementById('dashboardPrompt');
  if(!input.value.trim()) return;
  showView('brainstorm');
  showToast('Copilot prompt opened in Brainstorm');
});

document.querySelectorAll('.suggestion-actions button').forEach(btn => btn.addEventListener('click', () => {
  showToast(btn.textContent + ' — prototype interaction');
}));

document.getElementById('newIdeaBtn').addEventListener('click', () => showToast('New idea capture will open here'));

document.addEventListener('keydown', e => {
  if((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k'){
    e.preventDefault();
    document.getElementById('globalSearch')?.focus();
  }
  if(e.key === 'Escape') modal.hidden = true;
});

function escapeHtml(str){
  return str.replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[s]));
}

function showToast(message){
  const old = document.querySelector('.toast');
  if(old) old.remove();
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  Object.assign(toast.style,{position:'fixed',right:'22px',bottom:'22px',background:'#173b34',color:'#fff',padding:'12px 16px',borderRadius:'9px',fontSize:'12px',zIndex:'120',boxShadow:'0 10px 30px rgba(0,0,0,.18)'});
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2600);
}


// ---------- Study setup ----------
const setupStorageKey = 'quireStudySetup';

const studyProfiles = {
  qualitative: {
    title: 'Qualitative study',
    description: 'Quire will emphasise research context, reflexivity, sampling rationale, data collection depth, coding, theme development and qualitative rigour.',
    items: ['Interview / focus-group planning','Qualitative methodology prompts','Coding & theme development','Trustworthiness / reflexivity checks']
  },
  quantitative: {
    title: 'Quantitative study',
    description: 'Quire will emphasise variables, sample planning, measurement, statistical analysis, assumptions, results structure and interpretation.',
    items: ['Variables & measurement','Statistical analysis planning','Results table structure','Assumption & interpretation checks']
  },
  mixed: {
    title: 'Mixed-methods study',
    description: 'Quire will help keep qualitative and quantitative strands aligned and make the point of integration explicit across the thesis.',
    items: ['Dual-method structure','Integration planning','Joint displays','Mixed-method interpretation']
  },
  meta: {
    title: 'Systematic review / Meta-analysis',
    description: 'Quire will emphasise protocol logic, reproducible searching, eligibility criteria, appraisal, synthesis and PRISMA-style reporting.',
    items: ['Search strategy planning','Screening & eligibility','Risk-of-bias tracking','Evidence synthesis / meta-analysis']
  }
};

function currentStudyType(){
  return document.querySelector('input[name="studyType"]:checked')?.value || '';
}

function updateStudyTypeUI(){
  const type = currentStudyType();
  document.querySelectorAll('[data-method-panel]').forEach(panel => {
    panel.hidden = panel.dataset.methodPanel !== type;
  });
  document.querySelectorAll('[data-analysis-panel]').forEach(panel => {
    panel.hidden = panel.dataset.analysisPanel !== type;
  });

  const profile = studyProfiles[type];
  if(profile){
    document.getElementById('adaptiveTitle').textContent = profile.title;
    document.getElementById('adaptiveDescription').textContent = profile.description;
    document.getElementById('adaptiveList').innerHTML = profile.items.map(item => '<span>' + item + '</span>').join('');
  } else {
    document.getElementById('adaptiveTitle').textContent = 'Choose a study design';
    document.getElementById('adaptiveDescription').textContent = 'Once selected, Quire will tailor methodology prompts, analysis options, suggested chapter content and milestone planning.';
    document.getElementById('adaptiveList').innerHTML = '<span>Methodology guidance</span><span>Analysis planning</span><span>Chapter prompts</span><span>Deadline planning</span>';
  }
  updateSetupCompletion();
}

document.querySelectorAll('input[name="studyType"]').forEach(radio => radio.addEventListener('change', updateStudyTypeUI));

document.querySelectorAll('[data-setup-jump]').forEach(btn => btn.addEventListener('click', () => {
  document.querySelectorAll('.setup-index-item').forEach(item => item.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById(btn.dataset.setupJump)?.scrollIntoView({behavior:'smooth', block:'start'});
}));

function valueOf(id){
  const el = document.getElementById(id);
  if(!el) return '';
  return el.type === 'checkbox' ? el.checked : el.value;
}

function checkedAnalysis(){
  const type = currentStudyType();
  return [...document.querySelectorAll('[data-analysis-panel="' + type + '"] input[type="checkbox"]:checked')].map(el => el.value);
}

function collectStudySetup(){
  return {
    studyType: currentStudyType(),
    thesisTitle: valueOf('thesisTitle'),
    wordCount: valueOf('wordCount'),
    proposalWordCount: valueOf('proposalWordCount'),
    degreeName: valueOf('degreeName'),
    institutionName: valueOf('institutionName'),
    researchQuestion: valueOf('researchQuestion'),
    proposalDeadline: valueOf('proposalDeadline'),
    ethicsDeadline: valueOf('ethicsDeadline'),
    dataStart: valueOf('dataStart'),
    dataEnd: valueOf('dataEnd'),
    draftDeadline: valueOf('draftDeadline'),
    finalDeadline: valueOf('finalDeadline'),
    qualDesign: valueOf('qualDesign'),
    qualSampling: valueOf('qualSampling'),
    qualCollection: valueOf('qualCollection'),
    qualSampleSize: valueOf('qualSampleSize'),
    quantDesign: valueOf('quantDesign'),
    quantSampling: valueOf('quantSampling'),
    quantCollection: valueOf('quantCollection'),
    quantSampleSize: valueOf('quantSampleSize'),
    mixedDesign: valueOf('mixedDesign'),
    mixedPriority: valueOf('mixedPriority'),
    mixedIntegration: valueOf('mixedIntegration'),
    reviewType: valueOf('reviewType'),
    reportingFramework: valueOf('reportingFramework'),
    databases: valueOf('databases'),
    eligibilityFramework: valueOf('eligibilityFramework'),
    population: valueOf('population'),
    studySetting: valueOf('studySetting'),
    methodNotes: valueOf('methodNotes'),
    analysis: checkedAnalysis(),
    analysisSoftware: valueOf('analysisSoftware'),
    analysisRule: valueOf('analysisRule'),
    analysisNotes: valueOf('analysisNotes'),
    proposalRequired: valueOf('proposalRequired'),
    ethicsRequired: valueOf('ethicsRequired'),
    dataManagementRequired: valueOf('dataManagementRequired'),
    protocolRegistration: valueOf('protocolRegistration'),
    proposalRequirements: valueOf('proposalRequirements'),
    aiTailorMethod: valueOf('aiTailorMethod'),
    aiMethodChecks: valueOf('aiMethodChecks'),
    aiProtectVoice: valueOf('aiProtectVoice'),
    aiEvidenceLinks: valueOf('aiEvidenceLinks')
  };
}

function setIfPresent(id, value){
  const el = document.getElementById(id);
  if(!el || value === undefined || value === null) return;
  if(el.type === 'checkbox') el.checked = Boolean(value);
  else el.value = value;
}

function restoreStudySetup(){
  const saved = window.QuireStore?.getStudySetupData() || null;
  if(!saved) return;

  if(saved.studyType){
    const radio = document.querySelector('input[name="studyType"][value="' + saved.studyType + '"]');
    if(radio) radio.checked = true;
  }

  Object.keys(saved).forEach(key => {
    if(['studyType','analysis'].includes(key)) return;
    setIfPresent(key, saved[key]);
  });

  updateStudyTypeUI();

  if(Array.isArray(saved.analysis) && saved.studyType){
    document.querySelectorAll('[data-analysis-panel="' + saved.studyType + '"] input[type="checkbox"]').forEach(box => {
      box.checked = saved.analysis.includes(box.value);
    });
  }
  updateSetupSummary(saved);
}

function updateSetupCompletion(){
  const data = collectStudySetup();
  const essentials = [
    data.studyType, data.thesisTitle, data.wordCount, data.researchQuestion,
    data.finalDeadline, data.population, data.studySetting,
    data.analysisSoftware, data.analysis.length ? 'yes' : ''
  ];
  const complete = essentials.filter(Boolean).length;
  const percent = Math.round((complete / essentials.length) * 100);
  const pct = document.getElementById('setupPercent');
  const bar = document.getElementById('setupProgressBar');
  if(pct) pct.textContent = percent + '%';
  if(bar) bar.style.width = percent + '%';
}

function updateSetupSummary(data){
  const profile = studyProfiles[data.studyType];
  const title = document.getElementById('setupSummaryTitle');
  const meta = document.getElementById('setupSummaryMeta');
  if(!title || !meta) return;
  title.textContent = data.thesisTitle || (profile ? profile.title : 'Not configured yet');
  const bits = [];
  if(profile) bits.push(profile.title);
  if(data.wordCount) bits.push(Number(data.wordCount).toLocaleString() + ' words');
  if(data.finalDeadline) bits.push('due ' + new Date(data.finalDeadline + 'T00:00:00').toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'}));
  meta.textContent = bits.length ? bits.join(' · ') : 'Choose your study design, target word count and key dates.';
}

document.getElementById('saveStudySetup')?.addEventListener('click', () => {
  const data = collectStudySetup();
  window.QuireStore?.saveStudySetupData(data);
  updateSetupSummary(data);
  updateSetupCompletion();
  showToast('Study setup saved');
});

document.querySelectorAll('#setup input, #setup select, #setup textarea').forEach(el => {
  el.addEventListener('input', updateSetupCompletion);
  el.addEventListener('change', updateSetupCompletion);
});

document.getElementById('generateTimeline')?.addEventListener('click', () => {
  const finalDateValue = valueOf('finalDeadline');
  const target = document.getElementById('generatedTimeline');
  if(!finalDateValue){
    showToast('Add a final submission date first');
    return;
  }
  const finalDate = new Date(finalDateValue + 'T00:00:00');
  const milestones = [
    ['Freeze literature search / evidence base', -140],
    ['Complete data collection or screening', -110],
    ['Complete analysis', -80],
    ['Full results / findings draft', -60],
    ['Discussion draft', -42],
    ['First full thesis draft', -28],
    ['Final editing and formatting', -10],
    ['Submission', 0]
  ];
  target.innerHTML = milestones.map(([label, days]) => {
    const d = new Date(finalDate);
    d.setDate(d.getDate() + days);
    return '<div class="timeline-item"><strong>' + label + '</strong><span>' + d.toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'}) + '</span></div>';
  }).join('');
  target.hidden = false;
});

restoreStudySetup();
updateStudyTypeUI();


// ---------- Thesis project overview ----------
const progressStorageKey = 'quireProjectProgress';

const defaultProgress = {
  currentWords: 6840,
  wordsPerWeek: 900,
  articlesTotal: 24,
  articlesReviewed: 18,
  chaptersTotal: 6,
  chaptersDeveloped: 2,
  milestonesTotal: 9,
  milestonesComplete: 4,
  highlights: 67,
  notes: 31
};

function loadProjectProgress(){
  return {...defaultProgress, ...(window.QuireStore?.getLatestProgress() || {})};
}

function saveProjectProgress(progress){
  window.QuireStore?.saveProgressSnapshot(progress);
}

function loadStudyData(){
  return window.QuireStore?.getStudySetupData() || {};
}

function prettyDate(value){
  if(!value) return 'Not set';
  const date = new Date(value + 'T00:00:00');
  return date.toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'});
}

function daysBetween(a,b){
  return Math.ceil((b - a) / 86400000);
}

function methodologyLabel(data){
  if(data.studyType === 'qualitative') return data.qualDesign || 'Qualitative design not selected';
  if(data.studyType === 'quantitative') return data.quantDesign || 'Quantitative design not selected';
  if(data.studyType === 'mixed') return data.mixedDesign || 'Mixed-methods design not selected';
  if(data.studyType === 'meta') return data.reviewType || 'Review type not selected';
  return 'Not selected';
}

function collectionLabel(data){
  if(data.studyType === 'qualitative') return data.qualCollection || 'Not selected';
  if(data.studyType === 'quantitative') return data.quantCollection || 'Not selected';
  if(data.studyType === 'mixed') return 'Qualitative + quantitative strands';
  if(data.studyType === 'meta') return data.databases ? 'Database literature search' : 'Search strategy not defined';
  return 'Not selected';
}

function studyTypeLabel(type){
  return studyProfiles[type]?.title || 'Not selected';
}

function computeOverallProgress(data, progress){
  const wordTarget = Number(data.wordCount) || 0;
  const writing = wordTarget ? Math.min(progress.currentWords / wordTarget, 1) : 0;
  const research = progress.articlesTotal ? progress.articlesReviewed / progress.articlesTotal : 0;
  const chapters = progress.chaptersTotal ? progress.chaptersDeveloped / progress.chaptersTotal : 0;
  const milestones = progress.milestonesTotal ? progress.milestonesComplete / progress.milestonesTotal : 0;
  const setupFields = [data.studyType,data.thesisTitle,data.wordCount,data.researchQuestion,data.finalDeadline,data.population,data.studySetting];
  const setup = setupFields.filter(Boolean).length / setupFields.length;
  return Math.round((writing*.30 + research*.18 + chapters*.22 + milestones*.20 + setup*.10) * 100);
}

function renderOverviewTimeline(data){
  const target = document.getElementById('overviewTimeline');
  if(!target) return;
  const rows = [
    ['Proposal', data.proposalDeadline],
    ['Ethics', data.ethicsDeadline],
    ['Data starts', data.dataStart],
    ['Data ends', data.dataEnd],
    ['Full draft', data.draftDeadline],
    ['Submission', data.finalDeadline]
  ].filter(([,date]) => date);
  if(!rows.length){
    target.innerHTML = '<div class="overview-timeline-row"><span>No dates yet</span><i></i><strong>Set deadlines in Study Setup</strong></div>';
    return;
  }
  const today = new Date();
  target.innerHTML = rows.map(([label,date]) => {
    const d = new Date(date + 'T00:00:00');
    const status = d < today ? 'Passed' : prettyDate(date);
    return '<div class="overview-timeline-row"><span>' + label + '</span><i></i><strong>' + status + '</strong></div>';
  }).join('');
}

function calculateForecast(data, progress){
  const targetWords = Number(data.wordCount) || 0;
  const currentWords = Number(progress.currentWords) || 0;
  const pace = Number(progress.wordsPerWeek) || 0;
  const remainingWords = Math.max(targetWords - currentWords, 0);
  const weeks = pace > 0 ? remainingWords / pace : 0;
  const forecast = new Date();
  forecast.setDate(forecast.getDate() + Math.ceil(weeks * 7));
  return {targetWords,currentWords,pace,remainingWords,weeks,forecast};
}

function renderProjectOverview(){
  const data = loadStudyData();
  const progress = loadProjectProgress();
  const profile = studyProfiles[data.studyType];
  const titleText = data.thesisTitle || 'Patient education and stoma self-management';
  const overall = computeOverallProgress(data, progress);
  const forecast = calculateForecast(data, progress);

  const projectTitle = document.getElementById('projectTitle');
  if(!projectTitle) return;
  projectTitle.textContent = titleText;
  document.getElementById('sidebarThesisTitle').textContent = titleText;

  const metaBits = [];
  if(data.degreeName) metaBits.push(data.degreeName);
  if(data.institutionName) metaBits.push(data.institutionName);
  if(profile) metaBits.push(profile.title);
  if(data.finalDeadline) metaBits.push('Submission ' + prettyDate(data.finalDeadline));
  document.getElementById('projectMeta').textContent = metaBits.length ? metaBits.join(' · ') : 'Study setup not yet completed';

  document.getElementById('projectProgressPercent').textContent = overall + '%';
  document.getElementById('projectProgressRing').style.background = 'conic-gradient(#ddc8a3 0deg,#ddc8a3 ' + (overall*3.6) + 'deg,#3d3935 ' + (overall*3.6) + 'deg,#3d3935 360deg)';
  document.getElementById('sidebarProgressBar').style.width = overall + '%';
  document.getElementById('sidebarProgressText').textContent = overall + '% complete · Open project →';

  let headline = 'Your thesis is taking shape.';
  if(overall < 20) headline = 'The foundation is being built.';
  else if(overall >= 70) headline = 'The thesis is moving into its final stretch.';
  else if(overall >= 45) headline = 'The project has moved beyond the foundation stage.';
  document.getElementById('projectStatusHeadline').textContent = headline;

  const wordPct = forecast.targetWords ? Math.min(Math.round(progress.currentWords / forecast.targetWords * 100),100) : 0;
  const articlePct = progress.articlesTotal ? Math.min(Math.round(progress.articlesReviewed / progress.articlesTotal * 100),100) : 0;
  const chapterPct = progress.chaptersTotal ? Math.min(Math.round(progress.chaptersDeveloped / progress.chaptersTotal * 100),100) : 0;
  const milestonePct = progress.milestonesTotal ? Math.min(Math.round(progress.milestonesComplete / progress.milestonesTotal * 100),100) : 0;

  document.getElementById('metricWords').textContent = Number(progress.currentWords).toLocaleString();
  document.getElementById('metricWordsTarget').textContent = forecast.targetWords ? 'of ' + forecast.targetWords.toLocaleString() + ' target · ' + wordPct + '%' : 'word target not set';
  document.getElementById('metricArticles').textContent = progress.articlesReviewed + ' / ' + progress.articlesTotal;
  document.getElementById('metricChapters').textContent = progress.chaptersDeveloped + ' / ' + progress.chaptersTotal;
  document.getElementById('metricMilestones').textContent = progress.milestonesComplete + ' / ' + progress.milestonesTotal;
  document.getElementById('wordProgressBar').style.width = wordPct + '%';
  document.getElementById('articleProgressBar').style.width = articlePct + '%';
  document.getElementById('chapterProgressBar').style.width = chapterPct + '%';
  document.getElementById('milestoneProgressBar').style.width = milestonePct + '%';

  document.getElementById('paramStudyType').textContent = studyTypeLabel(data.studyType);
  document.getElementById('paramMethodology').textContent = methodologyLabel(data);
  document.getElementById('paramCollection').textContent = collectionLabel(data);
  document.getElementById('paramAnalysis').textContent = Array.isArray(data.analysis) && data.analysis.length ? data.analysis.slice(0,2).join(', ') + (data.analysis.length > 2 ? ' +' + (data.analysis.length-2) : '') : 'Not selected';
  document.getElementById('paramPopulation').textContent = data.population || 'Not defined';
  document.getElementById('paramSoftware').textContent = data.analysisSoftware || 'Not selected';
  document.getElementById('overviewResearchQuestion').textContent = data.researchQuestion || 'Add your research question in Study Setup.';
  document.getElementById('achievementQuestion').textContent = data.researchQuestion ? 'Research question recorded in Study Setup' : 'Waiting for Study Setup';
  document.getElementById('achievementWriting').textContent = Number(progress.currentWords).toLocaleString() + ' words written across current draft work';
  document.getElementById('achievementAnalysis').textContent = Array.isArray(data.analysis) && data.analysis.length ? data.analysis.join(', ') : 'Will adapt to your selected analysis plan';

  document.getElementById('wordsPerWeek').value = progress.wordsPerWeek;
  document.getElementById('currentWordsWritten').value = progress.currentWords;

  if(forecast.targetWords && forecast.pace){
    document.getElementById('forecastDate').textContent = forecast.forecast.toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'});
    document.getElementById('forecastWeeks').textContent = forecast.weeks <= 0 ? 'Writing target reached' : Math.ceil(forecast.weeks) + ' weeks';
    const beforeDeadline = data.finalDeadline ? forecast.forecast <= new Date(data.finalDeadline + 'T23:59:59') : null;
    document.getElementById('forecastNote').textContent = data.finalDeadline
      ? (beforeDeadline ? 'At the current writing pace, the word target falls before the submission deadline.' : 'At the current writing pace, the word target falls after the submission deadline.')
      : 'Based on remaining words and your current weekly writing pace.';
  } else {
    document.getElementById('forecastDate').textContent = '—';
    document.getElementById('forecastWeeks').textContent = '—';
    document.getElementById('forecastNote').textContent = 'Add a word target and writing pace to estimate completion.';
  }

  const today = new Date();
  if(data.finalDeadline){
    const deadline = new Date(data.finalDeadline + 'T23:59:59');
    const days = daysBetween(today, deadline);
    document.getElementById('daysRemaining').textContent = days >= 0 ? days : Math.abs(days);
    const requiredWeekly = forecast.remainingWords > 0 && days > 0 ? Math.ceil(forecast.remainingWords / Math.max(days/7,1)) : 0;
    document.getElementById('weeklyTarget').textContent = requiredWeekly ? requiredWeekly.toLocaleString() : '—';

    let schedule = 'On track';
    let healthTitle = 'On track';
    let healthCopy = 'At the current pace, the writing forecast falls within the final submission deadline.';
    if(forecast.targetWords && forecast.pace && forecast.forecast > deadline){
      schedule = 'Pace needs attention';
      healthTitle = 'Writing pace needs attention';
      healthCopy = 'The current pace-based estimate falls after your final submission date. Increasing weekly writing output or revisiting the plan would bring the forecast closer to the deadline.';
    } else if(days < 0){
      schedule = 'Deadline passed';
      healthTitle = 'Deadline review needed';
      healthCopy = 'The saved final submission date has passed. Update the project timeline in Study Setup.';
    } else if(!forecast.targetWords || !forecast.pace){
      schedule = 'Needs data';
      healthTitle = 'Add planning data';
      healthCopy = 'Add your word target and current writing pace so Quire can estimate the remaining workload.';
    }
    document.getElementById('scheduleStatus').textContent = schedule;
    document.getElementById('healthTitle').textContent = healthTitle;
    document.getElementById('healthCopy').textContent = healthCopy;
  } else {
    document.getElementById('daysRemaining').textContent = '—';
    document.getElementById('weeklyTarget').textContent = '—';
    document.getElementById('scheduleStatus').textContent = 'No deadline';
    document.getElementById('healthTitle').textContent = 'Needs deadline';
    document.getElementById('healthCopy').textContent = 'Set a final submission date in Study Setup so Quire can calculate remaining time and compare it with your current pace.';
  }

  document.getElementById('deadlineList').innerHTML = [
    ['Proposal', data.proposalDeadline],
    ['First full draft', data.draftDeadline],
    ['Final submission', data.finalDeadline]
  ].map(([name,date]) => '<div><span>' + name + '</span><strong>' + prettyDate(date) + '</strong></div>').join('');

  renderOverviewTimeline(data);
}

document.getElementById('recalculateForecast')?.addEventListener('click', () => {
  const progress = loadProjectProgress();
  progress.wordsPerWeek = Math.max(0, Number(document.getElementById('wordsPerWeek').value) || 0);
  progress.currentWords = Math.max(0, Number(document.getElementById('currentWordsWritten').value) || 0);
  saveProjectProgress(progress);
  renderProjectOverview();
  showToast('Completion estimate updated');
});

document.getElementById('editProgressBtn')?.addEventListener('click', () => {
  document.getElementById('currentWordsWritten')?.focus();
  showToast('Update your current words and writing pace in the Completion Estimate panel');
});

const originalShowView = showView;
showView = function(id){
  originalShowView(id);
  if(id === 'overview') renderProjectOverview();
};

document.getElementById('saveStudySetup')?.addEventListener('click', () => {
  setTimeout(renderProjectOverview, 0);
});

renderProjectOverview();


// ---------- Account & cloud ----------
const accountModal=document.getElementById('accountModal');
const profileBtn=document.getElementById('profileBtn');
const cloudStatusBtn=document.getElementById('cloudStatusBtn');

function openAccountModal(){
  if(accountModal) accountModal.hidden=false;
  refreshAccountUI();
}
function closeAccountModal(){
  if(accountModal) accountModal.hidden=true;
}

profileBtn?.addEventListener('click',openAccountModal);
cloudStatusBtn?.addEventListener('click',openAccountModal);
document.getElementById('closeAccountModal')?.addEventListener('click',closeAccountModal);
accountModal?.addEventListener('click',e=>{if(e.target===accountModal) closeAccountModal();});

function formatLastSync(value){
  if(!value) return 'Not synced yet.';
  const d=new Date(value);
  if(Number.isNaN(d.getTime())) return 'Not synced yet.';
  return 'Last synced '+d.toLocaleString(undefined,{dateStyle:'medium',timeStyle:'short'})+'.';
}

function renderCloudStatus(detail={}){
  const configured=detail.configured ?? window.QuireCloud?.isConfigured();
  const user=detail.user ?? window.QuireCloud?.getUser();
  const status=detail.status || (user?'synced':configured?'signed_out':'local');
  const message=detail.message || (user?'Cloud sync is active.':configured?'Cloud connected — sign in to sync.':'Your thesis is saved locally on this device.');

  if(cloudStatusBtn){
    cloudStatusBtn.dataset.state=status;
    document.getElementById('cloudStatusLabel').textContent=
      status==='syncing'?'Syncing':status==='synced'?'Synced':status==='error'?'Cloud error':configured?'Sign in':'Local';
  }

  const accountStatus=document.querySelector('.cloud-account-status');
  if(accountStatus) accountStatus.dataset.state=status;
  const statusTitle=document.getElementById('accountStatusTitle');
  const statusMessage=document.getElementById('accountStatusMessage');
  if(statusTitle) statusTitle.textContent=
    status==='syncing'?'Syncing Quire…':
    status==='synced'?'Cloud sync active':
    status==='error'?'Cloud connection needs attention':
    configured?'Cloud connected':'Local-only mode';
  if(statusMessage) statusMessage.textContent=message;

  const cfg=window.QuireCloud?.getConfig?.() || {};
  const urlInput=document.getElementById('supabaseUrl');
  const keyInput=document.getElementById('supabaseAnonKey');
  if(urlInput && document.activeElement!==urlInput) urlInput.value=cfg.url||'';
  if(keyInput && document.activeElement!==keyInput) keyInput.value=cfg.anonKey||'';

  const signedOut=document.getElementById('authSignedOutPanel');
  const signedIn=document.getElementById('authSignedInPanel');
  if(signedOut) signedOut.hidden=!configured || Boolean(user);
  if(signedIn) signedIn.hidden=!user;

  if(user){
    document.getElementById('signedInEmail').textContent=user.email||'Signed-in researcher';
    document.getElementById('lastSyncText').textContent=formatLastSync(detail.lastSync || window.QuireCloud?.getLastSync?.());
    profileBtn?.classList.add('cloud-user');
    const label=profileBtn?.querySelector('strong');
    const sub=profileBtn?.querySelector('small');
    const avatar=profileBtn?.querySelector('.avatar');
    if(label) label.textContent=(user.email||'Researcher').split('@')[0];
    if(sub) sub.textContent='Cloud account';
    if(avatar && user.email) avatar.textContent=user.email.slice(0,2).toUpperCase();
  }else{
    profileBtn?.classList.remove('cloud-user');
  }
}

function refreshAccountUI(){
  renderCloudStatus({
    configured:window.QuireCloud?.isConfigured?.(),
    user:window.QuireCloud?.getUser?.(),
    lastSync:window.QuireCloud?.getLastSync?.()
  });
}

window.addEventListener('quire:cloud-status',e=>{
  renderCloudStatus(e.detail||{});
  if(e.detail?.status==='error' && e.detail.message) showToast(e.detail.message);
});

window.addEventListener('quire:cloud-pulled',()=>{
  restoreStudySetup();
  updateStudyTypeUI();
  renderProjectOverview();
  showToast('Cloud workspace loaded');
});

document.getElementById('saveCloudConfig')?.addEventListener('click',async()=>{
  try{
    const url=document.getElementById('supabaseUrl').value;
    const key=document.getElementById('supabaseAnonKey').value;
    window.QuireCloud.setConfig(url,key);
    await window.QuireCloud.init();
    refreshAccountUI();
    showToast('Cloud connection saved');
  }catch(err){showToast(err.message||'Could not configure cloud connection');}
});

document.getElementById('removeCloudConfig')?.addEventListener('click',()=>{
  if(!window.QuireCloud?.isConfigured?.()) return;
  if(!confirm('Remove the Supabase connection from this device? Your local thesis will remain here.')) return;
  window.QuireCloud.clearConfig();
  refreshAccountUI();
});

document.getElementById('signInBtn')?.addEventListener('click',async()=>{
  try{
    const email=document.getElementById('accountEmail').value;
    const password=document.getElementById('accountPassword').value;
    if(!email || !password) throw new Error('Enter your email and password.');
    await window.QuireCloud.signIn(email,password);
    refreshAccountUI();
    showToast('Signed in');
  }catch(err){showToast(err.message||'Sign-in failed');}
});

document.getElementById('signUpBtn')?.addEventListener('click',async()=>{
  try{
    const email=document.getElementById('accountEmail').value;
    const password=document.getElementById('accountPassword').value;
    if(!email || !password) throw new Error('Enter an email and password.');
    if(password.length<6) throw new Error('Use a password of at least 6 characters.');
    const result=await window.QuireCloud.signUp(email,password);
    refreshAccountUI();
    showToast(result.session?'Account created and signed in':'Account created — check your email if confirmation is enabled');
  }catch(err){showToast(err.message||'Could not create account');}
});

document.getElementById('signOutBtn')?.addEventListener('click',async()=>{
  try{await window.QuireCloud.signOut();refreshAccountUI();showToast('Signed out');}
  catch(err){showToast(err.message||'Could not sign out');}
});

document.getElementById('syncNowBtn')?.addEventListener('click',async()=>{
  try{await window.QuireCloud.pushAll();refreshAccountUI();showToast('Saved to cloud');}
  catch(err){showToast(err.message||'Cloud sync failed');}
});

document.getElementById('pullCloudBtn')?.addEventListener('click',async()=>{
  if(!confirm('Reload this workspace from the cloud? Unsynced local changes could be replaced.')) return;
  try{await window.QuireCloud.pullAll();refreshAccountUI();}
  catch(err){showToast(err.message||'Could not load cloud workspace');}
});

refreshAccountUI();
window.QuireCloud?.init?.();


// ---------- Step 3: live research library + PDF opening ----------
function articleYearLabel(article){
  return article.year ? String(article.year) : 'PDF';
}

async function renderLibraryArticles(){
  const mount=document.getElementById('articleListMount');
  if(!mount || !window.QuireStore) return;
  const articles=window.QuireStore.listArticles();
  const count=document.querySelector('.filter-tabs button:first-child span');
  if(count) count.textContent=String(articles.length);

  if(!articles.length){
    mount.innerHTML='<div class="project-panel"><span class="eyebrow">RESEARCH LIBRARY</span><h3>No articles yet</h3><p>Upload your first PDF to start building the evidence base for this thesis.</p><button class="primary-btn" id="emptyLibraryUpload" type="button">＋ Add article</button></div>';
    document.getElementById('emptyLibraryUpload')?.addEventListener('click',()=>{
      if(window.QuirePdfReader) window.QuirePdfReader.pendingArticleId=null;
      fileInput.click();
    });
    return;
  }

  mount.innerHTML=articles
    .slice()
    .sort((x,y)=>(y.createdAt||'').localeCompare(x.createdAt||''))
    .map(article=>{
      const citation=article.citationData || {};
      const meta=[article.authors,article.journal].filter(Boolean).join(' · ') || 'Imported PDF';
      const pageText=citation.pageCount ? citation.pageCount+' pages' : 'PDF';
      const reviewed=article.readingStatus==='reviewed'?'Reviewed':article.readingStatus==='reading'?'Reading':'Unread';
      const highlightTotal=window.QuireStore.listHighlights(article.id).length;
      const noteTotal=window.QuireStore.listNotes(article.id).length;
      return '<article class="article-card" data-article-id="'+escapeHtml(article.id)+'">'+
        '<div class="article-main">'+
          '<div class="pdf-thumb">PDF</div>'+
          '<div>'+
            '<div class="tags"><span>'+escapeHtml(articleYearLabel(article))+'</span><span>'+escapeHtml(reviewed)+'</span>'+(article.doi?'<span>DOI</span>':'')+'</div>'+
            '<h3>'+escapeHtml(article.title || 'Untitled article')+'</h3>'+
            '<p>'+escapeHtml(meta)+(article.doi?' · DOI '+escapeHtml(article.doi):'')+'</p>'+
            '<div class="meta-row"><span>'+escapeHtml(pageText)+'</span><span>◫ '+highlightTotal+' highlights</span><span>▱ '+noteTotal+' notes</span><span data-pdf-status="'+escapeHtml(article.id)+'">Checking PDF…</span></div>'+
          '</div>'+
        '</div>'+
        '<div class="article-score"><strong>Open paper</strong><span>Quire reader</span></div>'+
      '</article>';
    }).join('');

  mount.querySelectorAll('[data-article-id]').forEach(card=>{
    card.addEventListener('click',async()=>{
      const id=card.dataset.articleId;
      showView('reader');
      try{await window.QuirePdfReader.openArticle(id);}
      catch(err){console.error(err);showToast(err.message || 'Could not open PDF');}
    });
  });

  for(const article of articles){
    const target=[...mount.querySelectorAll('[data-pdf-status]')].find(el=>el.dataset.pdfStatus===article.id);
    if(!target) continue;
    try{
      const hasPdf=await window.QuirePdfStore.has(article.id);
      target.innerHTML=hasPdf
        ? '<span class="local-pdf-badge">● PDF on this device</span>'
        : '<span class="local-pdf-badge missing-pdf-badge">○ Attach PDF</span>';
    }catch(e){
      target.textContent='Local file status unavailable';
    }
  }
}

window.addEventListener('quire:store-changed',()=>renderLibraryArticles());
window.addEventListener('quire:cloud-pulled',()=>renderLibraryArticles());
renderLibraryArticles();


function updateResearchDeskCounts(){
  if(!window.QuireStore) return;
  const articles=window.QuireStore.listArticles();
  const highlights=window.QuireStore.listHighlights();
  const notes=window.QuireStore.listNotes();
  const themes=window.QuireStore.listThemes();
  const values=[articles.length,highlights.length,notes.length,themes.length];
  document.querySelectorAll('.stat-panel .stats > div strong').forEach((el,index)=>{
    if(values[index]!==undefined) el.textContent=String(values[index]);
  });
}

window.addEventListener('quire:annotation-changed',()=>{
  renderLibraryArticles();
  updateResearchDeskCounts();
});
window.addEventListener('quire:store-changed',updateResearchDeskCounts);
updateResearchDeskCounts();


// ---------- Step 5: DOI / scholarly metadata import ----------
document.getElementById('openMetadataImport')?.addEventListener('click',()=>{
  modal.hidden=true;
  window.QuireMetadata?.open?.();
});

document.getElementById('readerMetadataBtn')?.addEventListener('click',()=>{
  window.QuireMetadata?.open?.();
});

window.addEventListener('quire:metadata-saved',async e=>{
  renderLibraryArticles();
  updateResearchDeskCounts();
  const articleId=e.detail?.articleId;
  if(e.detail?.applied && articleId && window.QuirePdfReader?.getCurrentArticleId?.()===articleId){
    try{await window.QuirePdfReader.openArticle(articleId);}catch(err){console.warn(err);}
  }
  showToast(e.detail?.applied ? 'Article metadata updated' : 'Article added to your research library');
});


// ---------- Step 8: reference-manager interoperability ----------
document.getElementById('openReferenceImportCard')?.addEventListener('click',()=>{
  modal.hidden=true;
  window.QuireReferences?.open?.();
});

window.addEventListener('quire:references-imported',e=>{
  renderLibraryArticles();
  updateResearchDeskCounts();
  const d=e.detail||{};
  showToast('References imported: '+(d.added||0)+' added, '+(d.updated||0)+' updated');
});

window.addEventListener('quire:references-exported',e=>{
  const d=e.detail||{};
  const label=d.format==='bib'?'BibTeX':'RIS';
  showToast((d.count||0)+' references exported as '+label);
});
