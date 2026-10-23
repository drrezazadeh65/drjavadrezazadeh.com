/**
 * JREI PRIVATE Windows OCR proposal — fixed owner-provisioned toolchain.
 * Actual OCR (when run after owner acceptance), not fabricated PDF text.
 *
 * The source file, the three optional executables and the work/output root
 * must be OWNER-PROVISIONED. No binary download, shell command, website
 * request, database write, student data or publication in this module.
 * TIFF/handwriting/math/diagram semantics require specialist review.
 *
 * Usage (only after final acceptance):
 *   node jrei-approved-local-ocr.mjs C:\private\reviewed-ocr-request.json
 *
 * Manifests are untrusted until a separate original source-rights approval
 * and observation digest have been independently verified.
 */
import {createHash,randomUUID} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {
  readFile,writeFile,lstat,realpath,stat,mkdir,readdir,unlink,link
} from 'node:fs/promises';
import {resolve,relative,isAbsolute,join,basename} from 'node:path';
import {tmpdir} from 'node:os';
const exec=promisify(execFile);
const HASH=/^[a-f0-9]{64}$/;
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/;
const safe=x=>typeof x==='string'&&x.length>0&&x.length<=550;
const inside=(root,path)=>{
  const rel=relative(root,path);
  return rel!==''&&!rel.startsWith('..')&&!isAbsolute(rel);
};
async function existing(path,max,kind){
  if(!safe(path)||!isAbsolute(path))throw Error('ABSOLUTE_APPROVED_PATH_REQUIRED');
  const absolute=resolve(path);
  const item=await lstat(absolute);
  if(item.isSymbolicLink()||!item.isFile()||item.size<1||
     item.size>max)throw Error('OCR_FILE_POLICY_REJECTED');
  if(kind==='exe'&& !absolute.toLowerCase().endsWith('.exe'))
    throw Error('OCR_BINARY_NOT_EXPLICITLY_APPROVED');
  return absolute;
}
function digest(bytes){return createHash('sha256').update(bytes).digest('hex');}
async function fileDigest(file){
  const sha=createHash('sha256');
  const stream=createReadStream(file,{highWaterMark:262144});
  for await(const part of stream)sha.update(part);
  return sha.digest('hex');
}
async function ownerPinnedBinary(file,shaExpected){
  if(!HASH.test(shaExpected??''))throw Error('OCR_BINARY_DIGEST_NOT_APPROVED');
  if(await fileDigest(file)!==shaExpected)
    throw Error('OCR_BINARY_DIGEST_CONFLICT');
  return file;
}
async function approvedConfig(){
  const rootString=process.env.JR_KA_OCR_PRIVATE_WORK_ROOT;
  if(!safe(rootString)||!isAbsolute(rootString))
    throw Error('PRIVATE_WORK_ROOT_NOT_SET');
  const rootInput=resolve(rootString);
  const inputInfo=await lstat(rootInput);
  if(inputInfo.isSymbolicLink())throw Error('PRIVATE_OCR_ROOT_SYMLINK');
  const root=await realpath(rootInput);
  const st=await lstat(root);
  if(!st.isDirectory()||st.isSymbolicLink()||
     root===resolve(tmpdir())||root.length<8)
    throw Error('PRIVATE_OCR_ROOT_UNSAFE');
  const tess=await ownerPinnedBinary(
    await existing(process.env.JR_KA_OCR_TESSERACT_EXE,180*1024*1024,'exe'),
    process.env.JR_KA_OCR_TESSERACT_SHA256);
  const poppler=await ownerPinnedBinary(
    await existing(process.env.JR_KA_OCR_PDFTOPPM_EXE,180*1024*1024,'exe'),
    process.env.JR_KA_OCR_PDFTOPPM_SHA256);
  return {root,tess,poppler};
}
async function command(file,args,seconds,maxBuffer=1048576){
  try{
    const {stdout}=await exec(file,args,{
      shell:false,windowsHide:true,timeout:seconds*1000,
      maxBuffer,encoding:'utf8',cwd:process.cwd(),
      env:{SystemRoot:process.env.SystemRoot||'C:\\Windows',
           PATH:process.env.SystemRoot+'\\System32'}
    });
    return stdout;
  }catch(_){throw Error('APPROVED_OCR_TOOL_FAILED_OR_TIMED_OUT');}
}
async function exclusivePrivateWrite(root,text){
  const bytes=Buffer.from(text,'utf8');
  if(bytes.length<1||bytes.length>3145728)
    throw Error('OCR_TEXT_TOO_LARGE');
  const hash=digest(bytes);
  const filename=hash+'.txt';
  const destination=join(root,filename);
  const temporary=join(root,'.jrei-ocr-'+randomUUID()+'.tmp');
  await writeFile(temporary,bytes,{flag:'wx',mode:0o600});
  try{
    try{
      await link(temporary,destination);
    }catch(error){
      if(error?.code!=='EEXIST')
        throw Error('PRIVATE_OCR_HARDLINK_UNAVAILABLE');
      const original=await readFile(destination);
      if(digest(original)!==hash)
        throw Error('PRIVATE_OCR_DIGEST_CONFLICT');
    }
  }finally{await unlink(temporary).catch(()=>{});}
  return {textSha256:hash,textObjectKey:filename,bytes:bytes.length};
}
async function localOcr(manifestPath){
  const {root,tess,poppler}=await approvedConfig();
  const input=await existing(manifestPath,8192,'json');
  if(!inside(root,input))throw Error('MANIFEST_OUTSIDE_PRIVATE_ROOT');
  const spec=JSON.parse(await readFile(input,'utf8'));
  if(spec?.schema!=='jr.jrei.owner-approved-ocr.v1'||
     !UUID.test(spec.sourceId??'')||!UUID.test(spec.observationId??'')||
     !HASH.test(spec.documentSha256??'')||
     spec.originalSourceRightsReviewed!==true||
     spec.ocrLocallyApproved!==true||
     spec.noLearnerPersonalRecordsConfirmed!==true||
     spec.ownerConfirmation!=='LOCAL_OCR_WITHOUT_PUBLISHING')
    throw Error('OWNER_OCR_RIGHTS_REVIEW_REQUIRED');
  const original=await existing(spec.documentPath,8388608,'pdf');
  if(!inside(root,original)||!original.toLowerCase().endsWith('.pdf'))
    throw Error('PDF_OUTSIDE_PRIVATE_ROOT');
  const pdf=await readFile(original);
  if(digest(pdf)!==spec.documentSha256||!pdf.subarray(0,5).equals(Buffer.from('%PDF-')))
    throw Error('ORIGINAL_PDF_DIGEST_FAILED');
  // At most eight rasterized pages, bounded resolution/time/bytes.
  // Never claim the full document was extracted without true page count.
  const subdir=join(root,'.jrei-ocr-'+randomUUID());
  await mkdir(subdir,{recursive:false,mode:0o700});
  let result;
  try{
    const prefix=join(subdir,'rendered');
    await command(poppler,['-f','1','-l','8','-scale-to','1500',
       '-png','-r','110',original,prefix],90);
    const imageFiles=(await readdir(subdir)).filter(name=>
      /^rendered-\d{1,4}\.png$/i.test(name)).sort((a,b)=>
        Number(a.match(/\d+/)?.[0]??0)-Number(b.match(/\d+/)?.[0]??0));
    if(imageFiles.length<1||imageFiles.length>8)
      throw Error('OCR_PAGES_OUT_OF_BOUNDS');
    const texts=[];
    const pageObservations=[];
    for(const name of imageFiles){
      const path=join(subdir,name);
      const info=await lstat(path);
      if(!info.isFile()||info.isSymbolicLink()||
         info.size<200||info.size>10485760)
        throw Error('OCR_RASTER_OUT_OF_BOUNDS');
      const raw=await command(tess,[path,'stdout','-l','fas+eng',
          '--psm','3'],55,1048576);
      if(typeof raw!=='string'||Buffer.byteLength(raw)>1048576)
        throw Error('OCR_PAGE_TEXT_OUT_OF_BOUNDS');
      const normalized=raw.trim();
      texts.push(normalized);
      // These are local provenance and triage *observations*, never OCR
      // confidence, equation correctness or proof of full page recognition.
      const imageDigest=await fileDigest(path);
      pageObservations.push({
        pageNumber:Number(name.match(/\\d+/)?.[0]??0),
        rasterSha256:imageDigest,
        extractedTextSha256:digest(Buffer.from(normalized,'utf8')),
        extractedBytes:Buffer.byteLength(normalized),
        emptyOcrPage:normalized.length===0,
        potentialMathSymbols:/[∑∏∫√∞∂∇≠≈≤≥∈⊂⊆⊗∠∥]/u.test(normalized)||
          /\\\\(?:frac|sqrt|sum|int|lim|begin)\\b/u.test(normalized),
        allEquationsAndFiguresScientificallyVerified:false
      });
    }
    const text=texts.map((value,i)=>
      '[JREI-OCR-UNREVIEWED PAGE '+(i+1)+']\n'+value).join('\n\n');
    if(Buffer.byteLength(text)>3145728)
      throw Error('OCR_DOCUMENT_TEXT_OVER_LIMIT');
    const saved=await exclusivePrivateWrite(root,text);
    result={
      schema:'jr.jrei.local-ocr-observation.v1',
      sourceId:spec.sourceId,observationId:spec.observationId,
      originalPdfSha256:spec.documentSha256,
      originalPdfBytes:pdf.length,
      method:'POPPLER_RENDER_AND_TESSERACT_FAS_ENG',
      executableFingerprintsOwnerPinned:true,
      executableHashesReturned:false,
      renderedPageCount:imageFiles.length,
      pageObservations,
      pagesWithEmptyOcrText:pageObservations.filter(p=>p.emptyOcrPage).length,
      pagesWithDetectedMathSymbols:pageObservations
        .filter(p=>p.potentialMathSymbols).length,
      mathSymbolsNotDetectedDoesNotProveAbsence:true,
      perPageOcrConfidenceMeasured:false,
      wholeDocumentPageCountVerified:false,
      mayHaveOmittedPages:true,
      handwrittenOrMathematicalAccuracyValidated:false,
      textScientificApproval:'REVIEW_REQUIRED',
      textCanBeUsedAsAnswerKey:false,
      textPubliclyReproducible:false,
      returnedFullSourceText:false,
      ...saved
    };
  }finally{
    for(const file of await readdir(subdir).catch(()=>[]))
      if(/^rendered-\d{1,4}\.png$/i.test(file))
        await unlink(join(subdir,file)).catch(()=>{});
    // Directory removal remains to owner cleanup; no broad recursive delete.
  }
  return result;
}
try{
  if(process.argv.length!==3)throw Error('OWNER_LOCAL_OCR_MANIFEST_REQUIRED');
  const result=await localOcr(process.argv[2]);
  process.stdout.write(JSON.stringify(result)+'\n');
}catch(err){
  const value=String(err?.message||'OCR_PRIVATE_REVIEW_REQUIRED');
  const safeCode=/^[A-Z0-9_]{3,85}$/.test(value)?value:'OCR_PRIVATE_REVIEW_REQUIRED';
  process.stderr.write('JREI_LOCAL_OCR='+safeCode+'\n');
  process.exitCode=1;
}
