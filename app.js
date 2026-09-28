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
document.getElementById('uploadArticleBtn').addEventListener('click', () => fileInput.click());
document.getElementById('closeModal').addEventListener('click', () => modal.hidden = true);
modal.addEventListener('click', e => { if(e.target === modal) modal.hidden = true; });
document.querySelector('[data-action="upload"]').addEventListener('click', () => fileInput.click());
document.querySelectorAll('[data-go-modal]').forEach(btn => btn.addEventListener('click', () => {
  modal.hidden = true; showView(btn.dataset.goModal);
}));

fileInput.addEventListener('change', e => {
  const file = e.target.files[0];
  if(!file) return;
  modal.hidden = true;
  showToast(file.name + ' added to your library (prototype)');
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

const aiContent = {
  summary: '<span class="eyebrow">SUMMARY</span><p>The paper describes how people develop stoma self-management skills after discharge. Repeated practical teaching, consistent information and access to specialist follow-up are presented as important contributors to confidence.</p><div class="evidence-callout"><strong>Possible thesis link</strong><p>Chapter 2 → Patient education; Discussion → continuity of support.</p></div><small>Prototype AI output — verify against source.</small>',
  methods: '<span class="eyebrow">METHODS</span><p><strong>Design:</strong> qualitative interview study.<br><strong>Focus:</strong> educational needs during the first six months following discharge.<br><strong>Interpretive value:</strong> useful for understanding patient experience, but not designed to estimate population-level effects.</p><small>Prototype AI output — verify against source.</small>',
  findings: '<span class="eyebrow">KEY FINDINGS</span><p>1. Education needs changed over time.<br>2. Practical rehearsal was highly valued.<br>3. Conflicting information increased uncertainty.<br>4. Specialist follow-up supported problem solving.</p><small>Prototype AI output — verify against source.</small>',
  critique: '<span class="eyebrow">CRITICAL APPRAISAL</span><p>The qualitative design is appropriate for exploring experience. When using this paper, separate participants\' reported perceptions from claims about effectiveness. Check sampling, reflexivity and transferability before making broader conclusions.</p><small>Prototype AI output — verify against source.</small>'
};
document.querySelectorAll('[data-ai]').forEach(btn => btn.addEventListener('click', () => {
  document.getElementById('aiResponse').innerHTML = aiContent[btn.dataset.ai];
}));

document.getElementById('readerAsk').addEventListener('click', () => {
  const input = document.getElementById('readerPrompt');
  if(!input.value.trim()) return;
  document.getElementById('aiResponse').innerHTML = '<span class="eyebrow">QUIRE COPILOT</span><p><strong>Your question:</strong> ' + escapeHtml(input.value) + '</p><p>This is the front-end prototype. Once the AI service is connected, Quire will answer using the article text and point back to the relevant pages and passages.</p><small>AI connection not enabled yet.</small>';
  input.value = '';
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
  let saved;
  try { saved = JSON.parse(localStorage.getItem(setupStorageKey) || 'null'); } catch(e) { saved = null; }
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
  localStorage.setItem(setupStorageKey, JSON.stringify(data));
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
