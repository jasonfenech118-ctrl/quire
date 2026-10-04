import {mkdir,readFile,writeFile,rename,rm,lstat,readdir} from 'node:fs/promises';
import {join,isAbsolute} from 'node:path';
import {randomUUID,createHash} from 'node:crypto';

const MAX_PDF_BYTES=100*1024*1024;
export class PdfLibraryError extends Error {
  constructor(code,message){super(message);this.code=code;}
}
const failure=()=>new PdfLibraryError('pdf_storage_unavailable','Quire could not access the article folder. Check that the drive is connected and the folder is writable.');
function articleId(value){
  if(typeof value!=='string'||!/^[a-zA-Z0-9_-]{1,100}$/.test(value))throw new PdfLibraryError('invalid_pdf_id','This article has an invalid file identifier.');
  return value;
}
function pdfBytes(value){
  if(!(value instanceof Uint8Array)&&!(value instanceof ArrayBuffer))throw new PdfLibraryError('invalid_pdf','Please choose a PDF file.');
  if(value.byteLength>MAX_PDF_BYTES)throw new PdfLibraryError('pdf_too_large','This PDF is larger than the 100 MB article limit.');
  const bytes=value instanceof Uint8Array?Buffer.from(value.buffer,value.byteOffset,value.byteLength):Buffer.from(value);
  if(!bytes.length||!bytes.subarray(0,1024).includes(Buffer.from('%PDF-')))throw new PdfLibraryError('invalid_pdf','The selected file does not have a PDF header.');
  return bytes;
}
async function regular(path,maximum){
  try{const info=await lstat(path);if(!info.isFile()||info.size>maximum)throw failure();return info;}
  catch(error){if(error.code==='ENOENT')return null;throw error instanceof PdfLibraryError?error:failure();}
}
async function atomic(path,bytes){
  const temporary=path+'.'+randomUUID()+'.tmp';
  try{await writeFile(temporary,bytes,{flag:'wx',mode:0o600});await rename(temporary,path);}
  finally{await rm(temporary,{force:true}).catch(()=>{});}
}
function validFilename(id,name){return typeof name==='string'&&name.length<220&&/^[a-zA-Z0-9_-]+\.pdf$/.test(name)&&name.endsWith('--'+id+'.pdf');}

export class PdfLibrary {
  constructor(userData){
    this.primaryFolder=join(userData,'articles');this.configFile=join(userData,'article-storage.json');
    this.copyFolder=null;this.notice='PDFs are saved on this PC.';this.tail=Promise.resolve();
  }
  queue(action){const work=this.tail.then(action);this.tail=work.catch(()=>{});return work;}
  async init(){
    await mkdir(this.primaryFolder,{recursive:true});
    try{
      const data=JSON.parse(await readFile(this.configFile,'utf8'));
      if(typeof data.copyFolder==='string'&&isAbsolute(data.copyFolder))this.copyFolder=data.copyFolder;
    }catch(error){if(error.code!=='ENOENT')this.notice='The folder setting could not be read. Your PC PDFs are still available; choose the copy folder again.';}
    return this.getState();
  }
  async metadata(folder,id){
    const path=join(folder,articleId(id)+'.json');
    if(!await regular(path,12000))return null;
    let data;try{data=JSON.parse(await readFile(path,'utf8'));}catch{throw failure();}
    if(data.articleId!==id||!validFilename(id,data.filename)||typeof data.name!=='string'||data.name.length>300)throw failure();
    return data;
  }
  async record(folder,id){
    const meta=await this.metadata(folder,id);if(!meta)return null;
    const path=join(folder,meta.filename);if(!await regular(path,MAX_PDF_BYTES))return null;
    const bytes=pdfBytes(await readFile(path));
    if(meta.digest!==createHash('sha256').update(bytes).digest('hex'))throw new PdfLibraryError('damaged_pdf','This stored PDF has changed or is damaged. Attach the original PDF again.');
    return {meta,bytes};
  }
  async writeRecord(folder,meta,bytes){
    const previous=await this.metadata(folder,meta.articleId).catch(()=>null);
    await atomic(join(folder,meta.filename),bytes);
    await atomic(join(folder,meta.articleId+'.json'),JSON.stringify(meta));
    if(previous&&previous.filename!==meta.filename)await rm(join(folder,previous.filename),{force:true});
  }
  async copyAvailable(){
    if(!this.copyFolder)return false;
    try{return (await lstat(this.copyFolder)).isDirectory();}catch{return false;}
  }
  async getState(){
    const files=await readdir(this.primaryFolder);
    return {primaryFolder:this.primaryFolder,copyFolder:this.copyFolder,copyAvailable:await this.copyAvailable(),pdfCount:files.filter(name=>name.endsWith('.json')&&/^[a-zA-Z0-9_-]+\.json$/.test(name)).length,notice:this.notice};
  }
  save(id,value,name='document.pdf'){
    id=articleId(id);const bytes=pdfBytes(value);
    if(typeof name!=='string'||name.length>300)throw new PdfLibraryError('invalid_pdf','The PDF filename is too long.');
    const slug=name.replace(/\.pdf$/i,'').replace(/[^a-zA-Z0-9_-]+/g,'-').slice(0,70)||'paper';
    const meta={articleId:id,name,filename:slug+'--'+id+'.pdf',size:bytes.length,digest:createHash('sha256').update(bytes).digest('hex'),updatedAt:new Date().toISOString()};
    return this.queue(async()=>{
      try{await this.writeRecord(this.primaryFolder,meta,bytes);}catch{throw failure();}
      if(this.copyFolder){
        try{if(!await this.copyAvailable())throw failure();await this.writeRecord(this.copyFolder,meta,bytes);this.notice='PDF saved on this PC and in your chosen folder.';}
        catch{this.notice='PDF saved on this PC. The folder copy is pending; reconnect the drive and Quire will retry while open.';}
      }else this.notice='PDF saved on this PC.';
      return this.getState();
    });
  }
  get(id){
    id=articleId(id);
    return this.queue(async()=>{
      let found=await this.record(this.primaryFolder,id);
      if(!found&&this.copyFolder&&await this.copyAvailable()){
        found=await this.record(this.copyFolder,id);
        if(found){await this.writeRecord(this.primaryFolder,found.meta,found.bytes);this.notice='PDF retrieved from your chosen folder and restored to this PC.';}
      }
      return found?{articleId:id,name:found.meta.name,size:found.bytes.length,updatedAt:found.meta.updatedAt,bytes:new Uint8Array(found.bytes)}:null;
    });
  }
  has(id){
    id=articleId(id);
    return this.queue(async()=>{
      for(const folder of [this.primaryFolder,this.copyFolder].filter(Boolean)){
        const meta=await this.metadata(folder,id);if(meta&&await regular(join(folder,meta.filename),MAX_PDF_BYTES))return true;
      }
      return false;
    });
  }
  remove(id){
    id=articleId(id);
    return this.queue(async()=>{
      for(const folder of [this.primaryFolder,this.copyFolder].filter(Boolean)){
        const meta=await this.metadata(folder,id).catch(()=>null);
        if(meta){await rm(join(folder,meta.filename),{force:true}).catch(()=>{});await rm(join(folder,id+'.json'),{force:true}).catch(()=>{});}
      }
    });
  }
  setCopyFolder(selected){
    if(typeof selected!=='string'||!isAbsolute(selected))throw failure();
    return this.queue(async()=>{
      if(!(await lstat(selected)).isDirectory())throw failure();
      const folder=join(selected,'Quire-article-library');await mkdir(folder,{recursive:true});
      await atomic(this.configFile,JSON.stringify({copyFolder:folder}));this.copyFolder=folder;
      return this.syncUnlocked();
    });
  }
  stopCopy(){return this.queue(async()=>{await atomic(this.configFile,JSON.stringify({copyFolder:null}));this.copyFolder=null;this.notice='PDFs stay on this PC. Existing folder copies have been kept.';return this.getState();});}
  sync(){return this.queue(()=>this.syncUnlocked());}
  async syncUnlocked(){
    if(!this.copyFolder)return this.getState();
    if(!await this.copyAvailable()){this.notice='Copy folder unavailable. PC PDFs remain available; Quire will retry when the drive returns.';return this.getState();}
    let pending=0;
    for(const file of await readdir(this.primaryFolder)){
      if(!/^[a-zA-Z0-9_-]+\.json$/.test(file))continue;
      const id=file.slice(0,-5);
      try{
        const primary=await this.metadata(this.primaryFolder,id),copied=await this.metadata(this.copyFolder,id).catch(()=>null);
        const target=copied?await regular(join(this.copyFolder,copied.filename),MAX_PDF_BYTES).catch(()=>null):null;
        if(copied?.digest===primary?.digest&&target?.size===primary.size)continue;
        const record=await this.record(this.primaryFolder,id);if(record)await this.writeRecord(this.copyFolder,record.meta,record.bytes);
      }catch{pending++;}
    }
    this.notice=pending?'Some folder copies are pending. PC PDFs remain available; check the drive or retry.':'Article folder copy is up to date.';
    return this.getState();
  }
}
