/* Quire Reference Manager v1 — BibTeX/RIS import + export */
(function(){
  let pendingImport=null;

  function clean(value=''){
    return String(value)
      .replace(/[{}]/g,'')
      .replace(/\\([&%_$#{}])/g,'$1')
      .replace(/\s+/g,' ')
      .trim();
  }

  function normalizeTitle(value=''){
    return clean(value).toLowerCase().replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
  }

  function normalizeDoi(value=''){
    return String(value||'').trim()
      .replace(/^doi:\s*/i,'')
      .replace(/^https?:\/\/(?:dx\.)?doi\.org\//i,'')
      .replace(/[\s.,;]+$/,'')
      .toLowerCase();
  }

  function splitAuthors(value=''){
    if(!value) return [];
    if(/\s+and\s+/i.test(value)){
      return value.split(/\s+and\s+/i).map(formatBibAuthor).filter(Boolean);
    }
    return value.split(';').map(x=>x.trim()).filter(Boolean);
  }

  function formatBibAuthor(author=''){
    const value=clean(author);
    if(!value) return '';
    if(value.includes(',')){
      const [family,...rest]=value.split(',').map(x=>x.trim());
      const given=rest.join(' ').trim();
      return [given,family].filter(Boolean).join(' ');
    }
    return value;
  }

  function citationDataFrom(fields={},source=''){
    return {
      importSource:source,
      importedAt:new Date().toISOString(),
      publisher:clean(fields.publisher||''),
      volume:clean(fields.volume||''),
      issue:clean(fields.issue||fields.number||''),
      page:clean(fields.pages||fields.page||''),
      issn:clean(fields.issn||''),
      isbn:clean(fields.isbn||''),
      keywords:Array.isArray(fields.keywords)?fields.keywords:clean(fields.keywords||'').split(/[,;]/).map(x=>x.trim()).filter(Boolean),
      citationKey:clean(fields.citationKey||''),
      referenceType:clean(fields.referenceType||fields.type||'article')
    };
  }

  function articleFromFields(fields={},source=''){
    const yearMatch=String(fields.year||'').match(/\d{4}/);
    return {
      title:clean(fields.title||'Untitled reference'),
      authors:splitAuthors(fields.author||fields.authors||'').join('; '),
      journal:clean(fields.journal||fields.journaltitle||fields.booktitle||''),
      year:yearMatch?Number(yearMatch[0]):null,
      doi:normalizeDoi(fields.doi||''),
      abstract:clean(fields.abstract||''),
      sourceUrl:clean(fields.url||''),
      readingStatus:'unread',
      citationData:citationDataFrom(fields,source)
    };
  }

  function parseBibEntries(text){
    const entries=[];
    let i=0;
    while(i<text.length){
      const at=text.indexOf('@',i);
      if(at<0) break;
      const typeMatch=text.slice(at).match(/^@([a-zA-Z]+)\s*([({])/);
      if(!typeMatch){i=at+1;continue;}
      const type=typeMatch[1].toLowerCase();
      const open=typeMatch[2];
      const close=open==='{'?'}':')';
      let pos=at+typeMatch[0].length;
      let depth=1,quote=false,escaped=false;
      for(;pos<text.length;pos++){
        const ch=text[pos];
        if(escaped){escaped=false;continue;}
        if(ch==='\\'){escaped=true;continue;}
        if(ch==='"'){quote=!quote;continue;}
        if(quote) continue;
        if(ch===open) depth++;
        else if(ch===close){
          depth--;
          if(depth===0) break;
        }
      }
      if(depth!==0){i=at+1;continue;}
      const body=text.slice(at+typeMatch[0].length,pos);
      entries.push({type,body});
      i=pos+1;
    }
    return entries;
  }

  function splitTopLevel(text,delimiter=','){
    const parts=[];let start=0,brace=0,paren=0,quote=false,escaped=false;
    for(let i=0;i<text.length;i++){
      const ch=text[i];
      if(escaped){escaped=false;continue;}
      if(ch==='\\'){escaped=true;continue;}
      if(ch==='"'){quote=!quote;continue;}
      if(quote) continue;
      if(ch==='{') brace++;
      else if(ch==='}') brace=Math.max(0,brace-1);
      else if(ch==='(') paren++;
      else if(ch===')') paren=Math.max(0,paren-1);
      else if(ch===delimiter&&brace===0&&paren===0){
        parts.push(text.slice(start,i));start=i+1;
      }
    }
    parts.push(text.slice(start));
    return parts;
  }

  function unwrapBibValue(value=''){
    let v=value.trim();
    if((v.startsWith('{')&&v.endsWith('}'))||(v.startsWith('"')&&v.endsWith('"'))){
      v=v.slice(1,-1);
    }
    return clean(v);
  }

  function parseBibTeX(text){
    return parseBibEntries(text).map(entry=>{
      const chunks=splitTopLevel(entry.body);
      const citationKey=clean(chunks.shift()||'');
      const fields={citationKey,referenceType:entry.type};
      for(const chunk of chunks){
        const eq=chunk.indexOf('=');
        if(eq<0) continue;
        const key=chunk.slice(0,eq).trim().toLowerCase();
        const value=unwrapBibValue(chunk.slice(eq+1));
        if(key) fields[key]=value;
      }
      return articleFromFields(fields,'BibTeX');
    }).filter(x=>x.title&&x.title!=='Untitled reference');
  }

  function parseRis(text){
    const entries=[];let current={};let authors=[];let keywords=[];
    const flush=()=>{
      if(!Object.keys(current).length&&!authors.length) return;
      current.authors=authors.join('; ');
      current.keywords=keywords;
      entries.push(articleFromFields(current,'RIS'));
      current={};authors=[];keywords=[];
    };

    for(const raw of String(text).split(/\r?\n/)){
      const match=raw.match(/^([A-Z0-9]{2})\s{0,2}-\s?(.*)$/);
      if(!match) continue;
      const tag=match[1],value=match[2].trim();
      if(tag==='TY'){if(Object.keys(current).length) flush();current.referenceType=value;}
      else if(tag==='ER') flush();
      else if(tag==='T1'||tag==='TI') current.title=value;
      else if(tag==='AU'||tag==='A1') authors.push(value);
      else if(tag==='JO'||tag==='JF'||tag==='T2') current.journal=current.journal||value;
      else if(tag==='PY'||tag==='Y1') current.year=value;
      else if(tag==='DO') current.doi=value;
      else if(tag==='AB'||tag==='N2') current.abstract=(current.abstract?current.abstract+' ':'')+value;
      else if(tag==='VL') current.volume=value;
      else if(tag==='IS') current.issue=value;
      else if(tag==='SP') current.startPage=value;
      else if(tag==='EP') current.endPage=value;
      else if(tag==='SN'){
        if(/^\d{3,5}-?\d{3,5}[\dX]?$/i.test(value.replace(/\s/g,''))) current.issn=value;
        else current.isbn=value;
      }
      else if(tag==='UR') current.url=value;
      else if(tag==='PB') current.publisher=value;
      else if(tag==='KW') keywords.push(value);
    }
    flush();
    return entries.map(item=>{
      const page=[item.citationData?.startPage,item.citationData?.endPage].filter(Boolean).join('-');
      if(page) item.citationData.page=page;
      return item;
    });
  }

  function detectFormat(file,text){
    const name=(file?.name||'').toLowerCase();
    if(name.endsWith('.bib')) return 'BibTeX';
    if(name.endsWith('.ris')) return 'RIS';
    if(/^\s*@\w+\s*[({]/m.test(text)) return 'BibTeX';
    if(/^TY\s{0,2}-/m.test(text)) return 'RIS';
    throw new Error('Quire could not identify this reference file. Use a .bib or .ris export.');
  }

  function findDuplicate(article){
    const articles=window.QuireStore?.listArticles?.()||[];
    const doi=normalizeDoi(article.doi);
    if(doi){
      const byDoi=articles.find(x=>normalizeDoi(x.doi)===doi);
      if(byDoi) return byDoi;
    }
    const title=normalizeTitle(article.title);
    if(title){
      return articles.find(x=>normalizeTitle(x.title)===title)||null;
    }
    return null;
  }

  function mergeCitationData(existing,incoming){
    const merged={...(existing||{})};
    for(const [key,value] of Object.entries(incoming||{})){
      const isEmpty=value==null||value===''||(Array.isArray(value)&&!value.length);
      if(!isEmpty) merged[key]=value;
    }
    return merged;
  }

  function mergeArticle(existing,incoming){
    const patch={};
    for(const key of ['title','authors','journal','year','doi','abstract','sourceUrl']){
      if(incoming[key]!=null&&incoming[key]!=='') patch[key]=incoming[key];
    }
    patch.citationData=mergeCitationData(existing.citationData,incoming.citationData);
    return window.QuireStore.updateArticle(existing.id,patch);
  }

  function importArticles(items=[]){
    const report={added:0,updated:0,skipped:0,total:items.length,articles:[]};
    for(const article of items){
      if(!article.title){report.skipped++;continue;}
      const duplicate=findDuplicate(article);
      if(duplicate){
        report.articles.push(mergeArticle(duplicate,article));
        report.updated++;
      }else{
        report.articles.push(window.QuireStore.addArticle(article));
        report.added++;
      }
    }
    return report;
  }

  async function parseFile(file){
    if(!file) throw new Error('Choose a BibTeX or RIS file.');
    const text=await file.text();
    const format=detectFormat(file,text);
    const articles=format==='BibTeX'?parseBibTeX(text):parseRis(text);
    if(!articles.length) throw new Error('No usable references were found in this '+format+' file.');
    return {format,articles,fileName:file.name};
  }

  function slug(value=''){
    return clean(value).toLowerCase().replace(/[^a-z0-9]+/g,'').slice(0,18)||'reference';
  }

  function familyName(authors=''){
    const first=String(authors).split(';')[0].trim();
    const bits=first.split(/\s+/).filter(Boolean);
    return bits[bits.length-1]||'ref';
  }

  function bibEscape(value=''){
    return String(value)
      .replace(/\\/g,'\\textbackslash{}')
      .replace(/([%&#_$])/g,'\\$1')
      .replace(/[{}]/g,'');
  }

  function bibAuthors(authors=''){
    return String(authors).split(';').map(x=>x.trim()).filter(Boolean).join(' and ');
  }

  function makeCiteKeys(articles){
    const used=new Map();
    return articles.map(article=>{
      const desired=article.citationData?.citationKey||slug(familyName(article.authors))+String(article.year||'nd')+slug(article.title).slice(0,8);
      const base=desired||'reference';
      const n=(used.get(base)||0)+1;used.set(base,n);
      return n===1?base:base+String.fromCharCode(96+n);
    });
  }

  function toBibTeX(articles){
    const keys=makeCiteKeys(articles);
    return articles.map((a,index)=>{
      const c=a.citationData||{};
      const type=(c.referenceType||'article').toLowerCase()==='journal'?'article':(c.referenceType||'article').toLowerCase();
      const fields=[
        ['title',a.title],
        ['author',bibAuthors(a.authors)],
        ['journal',a.journal],
        ['year',a.year],
        ['volume',c.volume],
        ['number',c.issue],
        ['pages',c.page],
        ['doi',a.doi],
        ['url',a.sourceUrl],
        ['issn',c.issn],
        ['abstract',a.abstract],
        ['keywords',Array.isArray(c.keywords)?c.keywords.join(', '):c.keywords]
      ].filter(([,v])=>v!=null&&String(v).trim()!=='');
      return '@'+type+'{'+keys[index]+',\n'+fields.map(([k,v])=>'  '+k+' = {'+bibEscape(v)+'}').join(',\n')+'\n}';
    }).join('\n\n');
  }

  function risAuthors(authors=''){
    return String(authors).split(';').map(x=>x.trim()).filter(Boolean);
  }

  function splitPages(value=''){
    const m=String(value).match(/^\s*([^\-–]+)\s*[\-–]\s*(.+)\s*$/);
    return m?[m[1],m[2]]:[String(value).trim(),''];
  }

  function toRIS(articles){
    return articles.map(a=>{
      const c=a.citationData||{};
      const [sp,ep]=splitPages(c.page||'');
      const lines=['TY  - JOUR'];
      if(a.title) lines.push('T1  - '+a.title);
      risAuthors(a.authors).forEach(author=>lines.push('AU  - '+author));
      if(a.journal) lines.push('JO  - '+a.journal);
      if(a.year) lines.push('PY  - '+a.year);
      if(c.volume) lines.push('VL  - '+c.volume);
      if(c.issue) lines.push('IS  - '+c.issue);
      if(sp) lines.push('SP  - '+sp);
      if(ep) lines.push('EP  - '+ep);
      if(a.doi) lines.push('DO  - '+a.doi);
      if(a.sourceUrl) lines.push('UR  - '+a.sourceUrl);
      if(c.issn) lines.push('SN  - '+c.issn);
      if(a.abstract) lines.push('AB  - '+a.abstract.replace(/\r?\n/g,' '));
      (Array.isArray(c.keywords)?c.keywords:[]).forEach(keyword=>lines.push('KW  - '+keyword));
      lines.push('ER  - ');
      return lines.join('\n');
    }).join('\n\n');
  }

  function safeFilename(){
    const project=window.QuireStore?.getActiveProject?.();
    const base=(project?.title||'quire-library').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,55)||'quire-library';
    return base+'-references';
  }

  function download(text,filename,type='text/plain'){
    const blob=new Blob([text],{type:type+';charset=utf-8'});
    const url=URL.createObjectURL(blob);
    const link=document.createElement('a');
    link.href=url;link.download=filename;
    document.body.appendChild(link);link.click();link.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1500);
  }

  function exportLibrary(format){
    const articles=window.QuireStore?.listArticles?.()||[];
    if(!articles.length) throw new Error('There are no references in this thesis library yet.');
    if(format==='bib'){
      download(toBibTeX(articles),safeFilename()+'.bib','application/x-bibtex');
      return articles.length;
    }
    if(format==='ris'){
      download(toRIS(articles),safeFilename()+'.ris','application/x-research-info-systems');
      return articles.length;
    }
    throw new Error('Unknown export format.');
  }

  function renderPreview(parsed){
    pendingImport=parsed;
    const box=document.getElementById('referenceImportPreview');
    const list=document.getElementById('referenceImportItems');
    if(!box||!list) return;
    box.hidden=false;
    document.getElementById('referenceImportFile').textContent=parsed.fileName;
    document.getElementById('referenceImportFormat').textContent=parsed.format;
    document.getElementById('referenceImportCount').textContent=parsed.articles.length+' references';
    list.innerHTML=parsed.articles.slice(0,8).map(article=>{
      const duplicate=findDuplicate(article);
      return '<article><div><strong>'+escapeHtml(article.title)+'</strong><small>'+
        escapeHtml([article.authors,article.journal,article.year].filter(Boolean).join(' · '))+
        '</small></div><span class="'+(duplicate?'will-update':'will-add')+'">'+(duplicate?'Update':'Add')+'</span></article>';
    }).join('')+(parsed.articles.length>8?'<small class="reference-more">+'+(parsed.articles.length-8)+' more references</small>':'');
    document.getElementById('confirmReferenceImport').disabled=false;
  }

  function renderReport(report){
    const el=document.getElementById('referenceImportReport');
    if(!el) return;
    el.hidden=false;
    el.textContent='Imported '+report.total+' references: '+report.added+' added, '+report.updated+' updated, '+report.skipped+' skipped.';
  }

  function escapeHtml(value){
    return String(value??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[s]));
  }

  function open(){
    document.getElementById('referenceManagerModal').hidden=false;
    pendingImport=null;
    const preview=document.getElementById('referenceImportPreview');
    const report=document.getElementById('referenceImportReport');
    if(preview) preview.hidden=true;
    if(report) report.hidden=true;
    const input=document.getElementById('referenceFileInput');
    if(input) input.value='';
  }

  function close(){
    document.getElementById('referenceManagerModal').hidden=true;
  }

  function bind(){
    document.getElementById('openReferenceManager')?.addEventListener('click',open);
    document.getElementById('closeReferenceManagerModal')?.addEventListener('click',close);
    document.getElementById('referenceManagerModal')?.addEventListener('click',e=>{if(e.target.id==='referenceManagerModal')close();});
    document.getElementById('chooseReferenceFile')?.addEventListener('click',()=>document.getElementById('referenceFileInput')?.click());
    document.getElementById('referenceFileInput')?.addEventListener('change',async e=>{
      const file=e.target.files?.[0];if(!file)return;
      try{renderPreview(await parseFile(file));}
      catch(err){
        const report=document.getElementById('referenceImportReport');
        if(report){report.hidden=false;report.textContent=err.message;}
      }
    });
    document.getElementById('confirmReferenceImport')?.addEventListener('click',()=>{
      if(!pendingImport) return;
      try{
        const report=importArticles(pendingImport.articles);
        renderReport(report);
        window.dispatchEvent(new CustomEvent('quire:references-imported',{detail:report}));
        pendingImport=null;
        document.getElementById('confirmReferenceImport').disabled=true;
      }catch(err){
        const report=document.getElementById('referenceImportReport');
        if(report){report.hidden=false;report.textContent=err.message;}
      }
    });
    document.querySelectorAll('[data-reference-export]').forEach(btn=>btn.addEventListener('click',()=>{
      try{
        const count=exportLibrary(btn.dataset.referenceExport);
        window.dispatchEvent(new CustomEvent('quire:references-exported',{detail:{count,format:btn.dataset.referenceExport}}));
      }catch(err){
        const report=document.getElementById('referenceImportReport');
        if(report){report.hidden=false;report.textContent=err.message;}
      }
    }));
  }

  window.QuireReferences={
    open,parseBibTeX,parseRis,importArticles,toBibTeX,toRIS,exportLibrary
  };
  document.addEventListener('DOMContentLoaded',bind);
})();