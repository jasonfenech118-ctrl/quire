/* Quire Citations — Step 12 */
(function(){
  const KEY='quire:citation-style';
  const styles=['harvard','apa7','vancouver'];

  function styleKey(){return KEY+':'+(window.QuireStore?.getActiveProjectId?.()||'default');}
  function getStyle(){const s=localStorage.getItem(styleKey())||'harvard';return styles.includes(s)?s:'harvard';}
  function setStyle(style){if(styles.includes(style)){localStorage.setItem(styleKey(),style);render();window.dispatchEvent(new CustomEvent('quire:citation-style-changed',{detail:{style}}));}}

  function authors(article){
    return String(article?.authors||'').split(';').map(x=>x.trim()).filter(Boolean);
  }
  function surname(name=''){const bits=String(name).trim().split(/\s+/).filter(Boolean);return bits[bits.length-1]||'Unknown';}
  function initials(name=''){
    const bits=String(name).trim().split(/\s+/).filter(Boolean);
    if(bits.length<2) return '';
    return bits.slice(0,-1).map(x=>(x[0]||'').toUpperCase()+'.').join(' ');
  }
  function authorText(article,mode='inline'){
    const a=authors(article);
    if(!a.length) return 'Unknown';
    if(mode==='bibliography'){
      if(getStyle()==='apa7'){
        return a.map(n=>surname(n)+', '+initials(n)).join(a.length>1?', ':'');
      }
      return a.map(n=>surname(n)+', '+initials(n)).join(', ');
    }
    if(a.length===1) return surname(a[0]);
    if(a.length===2) return surname(a[0])+' & '+surname(a[1]);
    return surname(a[0])+' et al.';
  }

  function inText(article,number=null){
    const style=getStyle();
    if(style==='vancouver') return number?'['+number+']':'[?]';
    const year=article?.year||'n.d.';
    return '('+authorText(article,'inline')+', '+year+')';
  }

  function bibliographyEntry(article,index=1){
    const style=getStyle();
    const c=article?.citationData||{};
    const title=article?.title||'Untitled';
    const journal=article?.journal||'';
    const year=article?.year||'n.d.';
    const volume=c.volume||'';
    const issue=c.issue||'';
    const pages=c.page||'';
    const doi=article?.doi?'https://doi.org/'+article.doi:'';
    const au=authorText(article,'bibliography');

    if(style==='vancouver'){
      return index+'. '+au+'. '+title+'. '+journal+(journal?'. ':'')+year+
        (volume?';'+volume:'')+(issue?'('+issue+')':'')+(pages?':'+pages:'')+'.'+(doi?' '+doi:'');
    }
    if(style==='apa7'){
      return au+' ('+year+'). '+title+'. '+(journal?journal:'')+
        (volume?', '+volume:'')+(issue?'('+issue+')':'')+(pages?', '+pages:'')+'.'+(doi?' '+doi:'');
    }
    return au+' ('+year+') '+title+'. '+(journal?journal+', ':'')+
      (volume?volume:'')+(issue?'('+issue+')':'')+(pages?', pp. '+pages:'')+'.'+(doi?' '+doi:'');
  }

  function usedArticleIds(){
    const state=window.QuireStore.getState();
    const projectId=window.QuireStore.getActiveProjectId();
    const used=new Set();
    state.evidenceLinks.filter(e=>e.projectId===projectId && (e.sectionId||e.chapterId)).forEach(e=>{
      if(e.articleId) used.add(e.articleId);
      if(!e.articleId&&e.highlightId){
        const h=state.highlights.find(x=>x.id===e.highlightId);
        if(h?.articleId) used.add(h.articleId);
      }
    });
    state.sections.filter(s=>s.projectId===projectId).forEach(section=>{
      const html=String(section.content||'');
      const re=/data-citation-article=["']([^"']+)["']/g;
      let match;
      while((match=re.exec(html))) if(match[1]) used.add(match[1]);
    });
    return used;
  }

  function bibliography({onlyUsed=true}={}){
    const all=window.QuireStore.listArticles();
    const used=usedArticleIds();
    let rows=onlyUsed?all.filter(a=>used.has(a.id)):all.slice();
    rows.sort((a,b)=>{
      if(getStyle()==='vancouver') return (a.createdAt||'').localeCompare(b.createdAt||'');
      return surname(authors(a)[0]||'').localeCompare(surname(authors(b)[0]||'')) || Number(a.year||0)-Number(b.year||0);
    });
    return rows.map((a,i)=>({article:a,index:i+1,text:bibliographyEntry(a,i+1)}));
  }

  function vancouverNumber(articleId){
    const rows=bibliography({onlyUsed:true});
    const found=rows.find(x=>x.article.id===articleId);
    return found?.index||null;
  }

  function citationForArticle(article){
    return inText(article,getStyle()==='vancouver'?vancouverNumber(article.id):null);
  }

  function diagnostics(){
    const all=window.QuireStore.listArticles();
    const used=usedArticleIds();
    const unused=all.filter(a=>!used.has(a.id));
    const missing=all.filter(a=>!a.title||!a.authors||!a.year);
    return {unused,missing,usedIds:[...used],usedCount:used.size,total:all.length};
  }

  function render(){
    const list=document.getElementById('bibliographyList');
    if(!list) return;
    const usedOnly=document.getElementById('bibliographyScope')?.value!=='all';
    const rows=bibliography({onlyUsed:usedOnly});
    document.getElementById('citationStyleSelect').value=getStyle();
    document.getElementById('bibliographyCount').textContent=rows.length+' entries';
    list.innerHTML=rows.length?rows.map(r=>'<div class="bibliography-entry"><span>'+escapeHtml(r.text)+'</span></div>').join(''):'<div class="metadata-empty">No cited references yet. Link research evidence to thesis sections first.</div>';
    const d=diagnostics();
    const diag=document.getElementById('bibliographyDiagnostics');
    if(diag){
      diag.innerHTML='<div><strong>'+d.usedCount+'</strong><span>Cited</span></div><div><strong>'+d.unused.length+'</strong><span>Unused library items</span></div><div><strong>'+d.missing.length+'</strong><span>Missing core metadata</span></div>';
    }
  }

  function open(){document.getElementById('bibliographyModal').hidden=false;render();}
  function close(){document.getElementById('bibliographyModal').hidden=true;}

  function copy(){
    const text=bibliography({onlyUsed:document.getElementById('bibliographyScope').value!=='all'}).map(r=>r.text).join('\n\n');
    navigator.clipboard?.writeText(text);
    window.dispatchEvent(new CustomEvent('quire:bibliography-copied'));
  }

  function bind(){
    document.getElementById('openBibliographyBtn')?.addEventListener('click',open);
    document.getElementById('closeBibliographyModal')?.addEventListener('click',close);
    document.getElementById('bibliographyModal')?.addEventListener('click',e=>{if(e.target.id==='bibliographyModal')close();});
    document.getElementById('citationStyleSelect')?.addEventListener('change',e=>setStyle(e.target.value));
    document.getElementById('bibliographyScope')?.addEventListener('change',render);
    document.getElementById('copyBibliography')?.addEventListener('click',copy);
    window.addEventListener('quire:store-changed',()=>{if(!document.getElementById('bibliographyModal')?.hidden)render();});
  }

  function escapeHtml(v){return String(v??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[s]));}
  document.addEventListener('DOMContentLoaded',bind);
  window.QuireCitations={getStyle,setStyle,inText,citationForArticle,bibliography,bibliographyEntry,diagnostics,vancouverNumber,open};
})();