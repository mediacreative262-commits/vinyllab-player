const $=id=>document.getElementById(id);
const audio=$('audio');
const bands=[31,44,63,90,125,180,250,355,500,710,1000,1400,2000,2800,4000,5600,8000,11000,15000,18000];
const state={files:[],idx:-1,shuffle:false,repeat:false,dsp:true,replay:false,normalize:false,limiter:true,preamp:0,volume:.85,cross:0,width:0,ms:0,db:0,air:0,harsh:0,trans:0,exc:0,sat:0};
let ctx,src,analyser,master,preampNode,comp,limiter,eq=[],peq=null,split,merge;
let matrix={directL:null,directR:null,crossL:null,crossR:null,msMidL:null,msMidR:null,msSideL:null,msSideR:null};
const fmt=s=>{s=Math.max(0,Math.floor(s||0));return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`};
function setStatus(t){$('status').textContent=t||''}
function db(v){return Math.pow(10,v/20)}
function curve(x){return Math.tanh(x)}
function makeImpulse(amount=.15){const n=256,b=ctx.createBuffer(2,n,ctx.sampleRate);for(let c=0;c<2;c++){const d=b.getChannelData(c);for(let i=0;i<n;i++){const t=i/n;d[i]=i===0?1:amount*Math.exp(-t*7)*(Math.random()*2-1)}}return b}
function createDSP(){
 if(ctx)return;
 ctx=new (window.AudioContext||window.webkitAudioContext)();
 src=ctx.createMediaElementSource(audio);
 eq=bands.map(f=>{const n=ctx.createBiquadFilter();n.type='peaking';n.frequency.value=f;n.Q.value=1.05;n.gain.value=0;return n});
 preampNode=ctx.createGain(); comp=ctx.createDynamicsCompressor(); limiter=ctx.createDynamicsCompressor();
 comp.threshold.value=-18;comp.knee.value=18;comp.ratio.value=2.2;comp.attack.value=.01;comp.release.value=.12;
 limiter.threshold.value=-1;limiter.knee.value=0;limiter.ratio.value=20;limiter.attack.value=.001;limiter.release.value=.08;
 split=ctx.createChannelSplitter(2);merge=ctx.createChannelMerger(2);
 master=ctx.createGain();analyser=ctx.createAnalyser();analyser.fftSize=2048;analyser.smoothingTimeConstant=.72;
 let node=src;eq.forEach(n=>{node.connect(n);node=n});node.connect(preampNode);preampNode.connect(comp);comp.connect(split);
 matrix.directL=ctx.createGain();matrix.directR=ctx.createGain();matrix.crossL=ctx.createGain();matrix.crossR=ctx.createGain();
 split.connect(matrix.directL,0);split.connect(matrix.crossL,1);split.connect(matrix.directR,1);split.connect(matrix.crossR,0);
 matrix.directL.connect(merge,0,0);matrix.crossL.connect(merge,0,0);matrix.directR.connect(merge,0,1);matrix.crossR.connect(merge,0,1);
 merge.connect(master);master.connect(analyser);analyser.connect(ctx.destination);
 updateMatrix();
 audio.addEventListener('play',()=>ctx.resume());
}
function updateMatrix(){
 if(!ctx)return;
 const w=Number(state.width)/100, c=Number(state.cross)/100;
 const cross=Math.min(.45,c*.35);
 matrix.directL.gain.value=1+w;
 matrix.directR.gain.value=1+w;
 matrix.crossL.gain.value=-w+cross;
 matrix.crossR.gain.value=-w+cross;
 // M/S tilt: 0 neutral, positive emphasizes side, negative emphasizes mid.
 const m=Number(state.ms)/100;
 const mid=1-Math.min(0,m)*.35, side=1+Math.max(0,m)*.35;
 // keep the matrix stable; M/S is approximated by balanced width coefficients
 matrix.directL.gain.value*=side*mid;
 matrix.directR.gain.value*=side*mid;
}
function connectEffects(){
 // Character controls use safe, low-level EQ adjustments instead of rebuilding the live graph.
 const vals={...Object.fromEntries(bands.map((f,i)=>[f,0]))};
 vals[31]=state.db*.035;vals[44]=state.db*.035;vals[63]=state.db*.025;vals[80]=state.db*.015;
 vals[11000]=state.air*.018;vals[15000]=state.air*.025;vals[18000]=state.air*.03;
 vals[2800]-=state.harsh*.012;vals[4000]-=state.harsh*.016;vals[5600]-=state.harsh*.01;
 vals[125]+=state.trans*.006;vals[250]+=state.trans*.004;vals[8000]+=state.trans*.004;
 vals[180]+=state.exc*.006;vals[355]+=state.exc*.004;vals[11000]+=state.exc*.005;
 vals[125]+=state.sat*.003;vals[250]+=state.sat*.003;
 bands.forEach((f,i)=>eq[i].gain.value=(eq[i]._user||0)+(vals[f]||0));
 preampNode.gain.value=db(state.preamp);
 comp.ratio.value=state.normalize?3:2.2;
 limiter.threshold.value=state.limiter?-1:0;
}
function rebuildUserEQ(){bands.forEach((f,i)=>eq[i].gain.value=(eq[i]._user||0));connectEffects()}
function load(i){
 if(!state.files.length)return;
 state.idx=(i+state.files.length)%state.files.length;const f=state.files[state.idx];
 audio.src=URL.createObjectURL(f);audio.load();$('title').textContent=f.name.replace(/\.[^.]+$/,'');
 $('artist').textContent=`${f.type||'audio'} · ${(f.size/1048576).toFixed(2)} MB`;
 $('codec').textContent=(f.name.split('.').pop()||'audio').toUpperCase();
 setStatus('Loaded locally. No upload.');
 audio.play().catch(()=>{});
}
function addFiles(files){
 state.files=[...files].filter(f=>f.type.startsWith('audio/')||/\.(mp3|flac|opus|ogg|wav|m4a|aac|mp4)$/i.test(f.name));
 $('filelist').innerHTML=state.files.map((f,i)=>`<div class="fileitem" data-i="${i}">${i+1}. ${f.name}</div>`).join('');
 document.querySelectorAll('.fileitem').forEach(x=>x.onclick=()=>load(+x.dataset.i));
 if(state.files.length)load(0);
}
$('files').onclick=()=>{$('fileInput').click()};
$('fileInput').onchange=e=>addFiles([...e.target.files]);
$('folder').onclick=async()=>{
 if(!window.showDirectoryPicker){setStatus('Folder picker tidak didukung browser ini. Pakai Choose files.');return}
 try{const h=await showDirectoryPicker();const out=[];
 async function walk(d){for await(const e of d.values()){if(e.kind==='file'){const f=await e.getFile();if(f.type.startsWith('audio/')||/\.(mp3|flac|opus|ogg|wav|m4a|aac|mp4)$/i.test(f.name))out.push(f)}else if(e.kind==='directory')await walk(e)}}await walk(h);addFiles(out);setStatus(`${out.length} audio ditemukan.`)}catch(e){setStatus('Folder picker dibatalkan.')}
};
$('play').onclick=()=>{createDSP();if(audio.paused)audio.play();else audio.pause()};
audio.onplay=()=>{$('play').textContent='⏸';$('vinyl').classList.add('playing')};
audio.onpause=()=>{$('play').textContent='▶';$('vinyl').classList.remove('playing')};
audio.ontimeupdate=()=>{if(audio.duration)$('seek').value=audio.currentTime/audio.duration*1000;$('cur').textContent=fmt(audio.currentTime);$('dur').textContent=fmt(audio.duration)};
$('seek').oninput=e=>{if(audio.duration)audio.currentTime=e.target.value/1000*audio.duration};
$('prev').onclick=()=>load(state.idx-1);$('next').onclick=()=>load(state.shuffle?Math.floor(Math.random()*state.files.length):state.idx+1);
$('shuffle').onclick=()=>{state.shuffle=!state.shuffle;$('shuffle').classList.toggle('on',state.shuffle)};
$('repeat').onclick=()=>{state.repeat=!state.repeat;$('repeat').classList.toggle('on',state.repeat)};
audio.onended=()=>state.repeat?load(state.idx):$('next').click();
$('mute').onclick=()=>audio.muted=!audio.muted;
$('volume').oninput=e=>{state.volume=+e.target.value;audio.volume=state.volume;$('volVal').textContent=Math.round(state.volume*100)+'%'};
audio.volume=state.volume;
$('preamp').oninput=e=>{state.preamp=+e.target.value;$('preampVal').textContent=state.preamp.toFixed(1)+' dB';$('gainReadout').textContent=state.preamp.toFixed(1)+' dB';createDSP();connectEffects()};
function slider(id,key,suffix='%'){ $(id).oninput=e=>{state[key]=+e.target.value;$(`${id}Val`).textContent=(suffix==='%'?`${e.target.value}%`:e.target.value);createDSP();updateMatrix();connectEffects()}}
slider('cross','cross');slider('width','width');slider('ms','ms');slider('db','db');slider('air','air');slider('harsh','harsh');slider('trans','trans');slider('exc','exc');slider('sat','sat');
$('limiter').onclick=()=>{state.limiter=!state.limiter;$('limiter').classList.toggle('on',state.limiter);createDSP();connectEffects()};
$('replay').onclick=()=>{state.replay=!state.replay;$('replay').classList.toggle('on',state.replay);setStatus(state.replay?'ReplayGain UI enabled; actual tag gain is not fabricated.':'ReplayGain off.')};
$('normalize').onclick=()=>{state.normalize=!state.normalize;$('normalize').classList.toggle('on',state.normalize);createDSP();connectEffects()};
$('ab').onclick=()=>{state.dsp=!state.dsp;$('ab').classList.toggle('on',state.dsp);master.gain.value=state.dsp?1:1;eq.forEach(n=>n.gain.value=state.dsp?(n._user||0):0);setStatus(state.dsp?'DSP ON':'DSP bypassed; volume matched at output.')};
$('xwide').onclick=()=>{state.width=state.width?0:45;$('width').value=state.width;$('widthVal').textContent=state.width+'%';createDSP();updateMatrix()};
$('surround').onclick=()=>{state.cross=state.cross?0:55;$('cross').value=state.cross;$('crossVal').textContent=state.cross+'%';createDSP();updateMatrix()};
$('monobass').onclick=()=>{state.db=state.db?0:45;$('db').value=state.db;$('dbVal').textContent=state.db+'%';createDSP();connectEffects()};
$('ytmode').onclick=()=>{state.db=30;state.air=18;state.harsh=25;state.trans=15;state.exc=10;['db','air','harsh','trans','exc'].forEach(id=>{$(id).value=state[id];$(`${id}Val`).textContent=state[id]+'%'});state.limiter=true;$('limiter').classList.add('on');createDSP();connectEffects();setStatus('YouTube Restore preset active.')};
$('neutral').onclick=()=>{['db','air','harsh','trans','exc','sat','cross','width','ms'].forEach(id=>{state[id]=0;$(id).value=0;const v=$(id+'Val');if(v)v.textContent='0%'});bands.forEach((f,i)=>eq[i]._user=0);rebuildUserEQ();updateMatrix();setStatus('Neutral / bypass enhancements.')};
document.querySelectorAll('[data-preset]').forEach(b=>b.onclick=()=>{
 const p=b.dataset.preset, maps={flat:0,rock:[4,3,2,0,-1,-2,-1,1,2,2,1,0,1,2,3,3,2,1,0,-1],warm:[2,2,2,1,1,0,0,0,-1,-1,-1,0,1,2,2,1,0,-1,-2,-2],detail:[-1,-1,-1,-1,0,0,0,1,1,1,1,1,2,2,3,3,3,2,2,2],ytclean:[1,1,1,0,0,0,0,0,0,0,0,0,0,0,-1,0,1,2,2,1],ytbass:[4,3,3,2,1,0,0,0,-1,-1,0,0,1,1,1,1,1,1,0,0]};
 const a=maps[p];bands.forEach((f,i)=>eq[i]._user=Array.isArray(a)?a[i]:0);rebuildUserEQ();
});
$('pf').oninput=e=>$('pfVal').textContent=(+e.target.value<1000?e.target.value:e.target.value>=10000?(+e.target.value/1000).toFixed(1)+' kHz':(+e.target.value/1000).toFixed(2)+' kHz');
$('pq').oninput=e=>$('pqVal').textContent=(+e.target.value).toFixed(1);
$('pg').oninput=e=>$('pgVal').textContent=(+e.target.value).toFixed(1)+' dB';
$('applyPEQ').onclick=()=>{createDSP();if(peq)peq.disconnect();peq=ctx.createBiquadFilter();peq.type=$('ptype').value;peq.frequency.value=+$('pf').value;peq.Q.value=+$('pq').value;peq.gain.value=+$('pg').value; // PEQ is inserted as a safe side-chain replacement by folding into nearest EQ band.
 const f=+$('pf').value, nearest=bands.reduce((a,b)=>Math.abs(b-f)<Math.abs(a-f)?b:a,bands[0]),i=bands.indexOf(nearest);eq[i]._user=(eq[i]._user||0)+ +$('pg').value;rebuildUserEQ();setStatus(`PEQ applied near ${nearest} Hz.`)
};
for(let i=0;i<bands.length;i++){$('eq').insertAdjacentHTML('beforeend',`<div class="band"><input data-band="${i}" type="range" min="-12" max="12" step=".1" value="0"><small>${bands[i]>=1000?(bands[i]/1000)+'k':bands[i]}</small></div>`)}
document.querySelectorAll('[data-band]').forEach(x=>x.oninput=e=>{const i=+e.target.dataset.band;eq[i]._user=+e.target.value;createDSP();rebuildUserEQ()});
function analyze(){
 requestAnimationFrame(analyze);if(!analyser)return;
 const data=new Uint8Array(analyser.frequencyBinCount);analyser.getByteFrequencyData(data);
 const c=$('spec'),g=c.getContext('2d'),w=c.width=c.clientWidth*devicePixelRatio,h=c.height=130*devicePixelRatio;g.clearRect(0,0,w,h);g.beginPath();
 for(let i=0;i<data.length;i++){const x=i/data.length*w,y=h-data[i]/255*h;i?g.lineTo(x,y):g.moveTo(x,y)}g.strokeStyle='#8db7ff';g.stroke();
 let peak=0;data.forEach(v=>peak=Math.max(peak,v));const p=20*Math.log10(Math.max(peak/255,1e-5));$('peak').textContent=`Peak ${p.toFixed(1)} dB`;$('rms').textContent=`RMS ${(p-10).toFixed(1)} dB`;$('lu').textContent=`LUFS approx ${(p-14).toFixed(1)}`;
}
analyze();


// --- Library / playlist reader v4 ---
const VL4 = { library: [], queue: [], recent: [], favorites: new Set(), mode:"songs" };
const vlExt = f => (f.name.split(".").pop()||"").toLowerCase();
const vlKey = f => `${f.name}|${f.size}|${f.lastModified}`;
function vlMeta(file){
  const base=file.name.replace(/\.[^.]+$/,"").replace(/[_]+/g," ").trim();
  const m=base.match(/^\s*(?:(\d{1,3})[\s._-]+)?(.+?)\s+[-–]\s+(.+)$/);
  return {title:(m?m[3]:base).trim(), artist:(m?m[2]:"Unknown Artist").trim(), album:"Unknown Album", track:m?m[1]:""};
}
function vlAddFiles(files){
  for(const f of files){
    if(!f.type.startsWith("audio/") && !/\.(mp3|flac|opus|ogg|wav|m4a|aac|mp4)$/i.test(f.name)) continue;
    const k=vlKey(f);
    if(!VL4.library.some(x=>x.key===k)) VL4.library.push({file:f,key:k,...vlMeta(f)});
  }
  vlRender();
}
function vlPlay(x){
  if(!x)return;
  if(!state.files.includes(x.file)) state.files.push(x.file);
  state.idx=state.files.indexOf(x.file);
  audio.src=URL.createObjectURL(x.file);
  audio.load();
  const titleEl=$("title"), artistEl=$("artist"), codecEl=$("codec");
  if(titleEl) titleEl.textContent=x.title;
  if(artistEl) artistEl.textContent=`${x.artist} · ${x.album}`;
  if(codecEl) codecEl.textContent=vlExt(x.file).toUpperCase();
  VL4.recent=VL4.recent.filter(y=>y.key!==x.key); VL4.recent.unshift(x); VL4.recent=VL4.recent.slice(0,50);
  audio.play().catch(()=>{});
}
function vlDisplay(){
  let a=VL4.mode==="recent"?VL4.recent.slice():VL4.library.slice();
  if(VL4.mode==="favorites") a=a.filter(x=>VL4.favorites.has(x.key));
  if(VL4.mode==="artists"){
    const s=new Set(); a=a.filter(x=>{const k=x.artist.toLowerCase();if(s.has(k))return false;s.add(k);return true});
  }
  if(VL4.mode==="albums"){
    const s=new Set(); a=a.filter(x=>{const k=(x.artist+"|"+x.album).toLowerCase();if(s.has(k))return false;s.add(k);return true});
  }
  const q=(($("librarySearch")||{}).value||"").toLowerCase();
  return a.filter(x=>`${x.title} ${x.artist} ${x.album}`.toLowerCase().includes(q));
}
function vlRender(){
  const list=$("libraryList"); if(!list)return;
  const a=vlDisplay();
  $("libraryCount").textContent=`${VL4.library.length} tracks`;
  list.innerHTML=a.map(x=>`<div class="fileitem" data-vl-key="${encodeURIComponent(x.key)}"><b>${x.title}</b><br><span class="sub">${x.artist} · ${x.album}</span><span class="pill">${vlExt(x.file).toUpperCase()} ${VL4.favorites.has(x.key)?"★":""}</span></div>`).join("");
  list.querySelectorAll("[data-vl-key]").forEach(el=>el.onclick=()=>{
    const k=decodeURIComponent(el.dataset.vlKey);
    let x=VL4.library.find(y=>y.key===k)||VL4.recent.find(y=>y.key===k);
    if(VL4.mode==="artists"&&x) VL4.queue.splice(0,VL4.queue.length,...VL4.library.filter(y=>y.artist===x.artist));
    else if(VL4.mode==="albums"&&x) VL4.queue.splice(0,VL4.queue.length,...VL4.library.filter(y=>y.artist===x.artist&&y.album===x.album));
    else if(x) VL4.queue.splice(0,VL4.queue.length,x);
    vlRenderQueue(); vlPlay(VL4.queue[0]);
  });
  vlRenderQueue();
}
function vlRenderQueue(){
  const el=$("queueList"); if(!el)return;
  $("queueCount").textContent=`${VL4.queue.length} track${VL4.queue.length===1?"":"s"}`;
  el.innerHTML=VL4.queue.map((x,i)=>`<div class="fileitem" data-vl-q="${i}">${i+1}. <b>${x.title}</b><br><span class="sub">${x.artist}</span></div>`).join("");
  el.querySelectorAll("[data-vl-q]").forEach(e=>e.onclick=()=>vlPlay(VL4.queue[+e.dataset.vlQ]));
}
document.addEventListener("DOMContentLoaded",()=>{
  const modes=[["libSongs","songs"],["libArtists","artists"],["libAlbums","albums"],["libFavorites","favorites"],["libRecent","recent"]];
  modes.forEach(([id,mode])=>{const b=$(id);if(b)b.onclick=()=>{VL4.mode=mode;modes.forEach(([i])=>$(i)?.classList.toggle("on",i===id));vlRender()}});
  $("librarySearch")?.addEventListener("input",vlRender);
  $("clearLibrary")?.addEventListener("click",()=>{VL4.library.length=0;VL4.queue.length=0;VL4.recent.length=0;VL4.favorites.clear();vlRender()});
  $("importM3U")?.addEventListener("click",()=>$("m3uInput")?.click());
  $("m3uInput")?.addEventListener("change",async e=>{
    const f=e.target.files?.[0];if(!f)return;
    const lines=(await f.text()).split(/\r?\n/).map(s=>s.trim()).filter(s=>s&&!s.startsWith("#"));
    VL4.queue.splice(0,VL4.queue.length,...VL4.library.filter(x=>lines.some(p=>p.toLowerCase().endsWith(x.file.name.toLowerCase()))));
    vlRenderQueue();
  });
  vlRender();
});

// Reconcile files loaded by the original v3 picker/folder code into the v4 library.
setInterval(()=>{ if(window.state?.files?.length) { const before=VL4.library.length; vlAddFiles(state.files); if(VL4.library.length!==before) vlRender(); } },1500);


// --- Google Drive folder reader v5 ---
const VL5={files:[]};
const $5=id=>document.getElementById(id);
function driveFolderId(s){const m=(s||"").trim().match(/\/folders\/([A-Za-z0-9_-]+)/);return m?m[1]:(/^[A-Za-z0-9_-]{10,}$/.test((s||"").trim())?(s||"").trim():"")}
function driveAudio(f){return (f.mimeType||"").startsWith("audio/")||/\.(mp3|flac|opus|ogg|wav|m4a|aac|mp4)$/i.test(f.name||"")}
async function driveList(){
 const key=$5("driveApiKey")?.value.trim(),folder=driveFolderId($5("driveFolder")?.value);
 if(!key||!folder){if(typeof setStatus==="function")setStatus("Masukkan API key dan link folder Drive.");return}
 localStorage.setItem("vl5_drive_key",key);localStorage.setItem("vl5_drive_folder",folder);
 $5("driveStatus").textContent="Reading…";
 try{
  const q=encodeURIComponent(`'${folder}' in parents and trashed=false`);
  const fields=encodeURIComponent("nextPageToken,files(id,name,mimeType,size)");
  let token="",all=[];
  do{
   const u=`https://www.googleapis.com/drive/v3/files?q=${q}&pageSize=1000&fields=${fields}&key=${encodeURIComponent(key)}${token?"&pageToken="+encodeURIComponent(token):""}`;
   const r=await fetch(u); if(!r.ok)throw Error("Drive API "+r.status);
   const d=await r.json(); all.push(...(d.files||[])); token=d.nextPageToken||"";
  }while(token);
  VL5.files=all.filter(driveAudio);
  $5("driveStatus").textContent=`${VL5.files.length} audio`;
  $5("driveList").innerHTML=VL5.files.map((f,i)=>`<div class="fileitem" data-drive-i="${i}"><b>${f.name}</b><br><span class="sub">☁️ Drive · ${f.size?Math.round(f.size/104857.6)/10+" MB":"size unknown"}</span></div>`).join("");
  $5("driveList").querySelectorAll("[data-drive-i]").forEach(e=>e.onclick=()=>drivePlay(VL5.files[+e.dataset.driveI]));
 }catch(e){$5("driveStatus").textContent="Error";if(typeof setStatus==="function")setStatus(`Drive gagal: ${e.message}`)}
}
function drivePlay(f){
 const key=$5("driveApiKey")?.value.trim()||localStorage.getItem("vl5_drive_key");if(!key)return;
 const u=`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(f.id)}?alt=media&key=${encodeURIComponent(key)}`;
 audio.src=u;audio.load();$("title").textContent=f.name.replace(/\.[^.]+$/,"");$("artist").textContent="Google Drive · VinylLab";$("codec").textContent=(f.name.split(".").pop()||"").toUpperCase();audio.play().catch(()=>{});
}
document.addEventListener("DOMContentLoaded",()=>{
 const k=localStorage.getItem("vl5_drive_key"),f=localStorage.getItem("vl5_drive_folder");
 if(k&&$5("driveApiKey"))$5("driveApiKey").value=k;
 if(f&&$5("driveFolder"))$5("driveFolder").value=`https://drive.google.com/drive/folders/${f}`;
 $5("driveConnect")?.addEventListener("click",driveList);
 $5("driveImport")?.addEventListener("click",driveList);
});
