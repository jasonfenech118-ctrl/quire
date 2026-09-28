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
