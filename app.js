const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const audio=$("#audio"), playerCard=$("#playerCard");
let tracks=[], index=-1, shuffle=false, repeat=0, audioCtx, source, eqNodes=[], peqNode, bassNode, compNode, master, splitter, merger, pannerL, pannerR, installedPrompt=null;
const freqs=[31,44,63,88,125,175,250,350,500,700,1000,1400,2000,2800,4000,5600,8000,11000,15000,18000];
const presets={
Rock:[4,3,2,1,0,-1,-1,0,1,2,2,2,1,1,2,3,4,4,3,2],
Pop:[-1,0,2,3,3,2,1,0,0,1,2,2,1,0,1,2,3,3,2,1],
Jazz:[2,1,0,0,-1,-1,0,1,2,2,1,1,2,2,1,1,2,2,1,0],
Classical:[3,2,1,0,-1,-2,-2,-1,0,1,1,1,1,1,1,2,2,2,1,0],
"Bass Boost":[7,6,5,4,3,2,1,0,0,0,0,0,0,0,0,1,1,2,2,2],
Vocal:[-2,-2,-1,0,1,2,3,4,4,3,2,2,3,3,2,1,0,0,-1,-2],
Electronic:[4,3,2,0,-1,0,2,2,1,0,-1,0,2,3,4,3,4,5,4,3]
};
function initEQ(){
  const box=$("#eq"); box.innerHTML="";
  freqs.forEach((f,i)=>{let d=document.createElement("div");d.className="band";d.innerHTML=`<input data-i="${i}" type="range" min="-12" max="12" step=".5" value="0"><span>${fmtFreq(f)}</span><span class="db" id="db${i}">0</span>`;box.appendChild(d)});
  $$("#eq input").forEach(x=>x.oninput=()=>{ $("#db"+x.dataset.i).textContent=Number(x.value).toFixed(1); if(eqNodes[x.dataset.i])eqNodes[x.dataset.i].gain.value=+x.value});
}
function fmtFreq(f){return f>=1000?(f/1000)+"k":f}
function ensureAudio(){
 if(audioCtx)return;
 audioCtx=new (window.AudioContext||window.webkitAudioContext)();
 source=audioCtx.createMediaElementSource(audio);
 eqNodes=freqs.map(f=>{let n=audioCtx.createBiquadFilter();n.type="peaking";n.frequency.value=f;n.Q.value=.95;n.gain.value=0;return n});
 peqNode=audioCtx.createBiquadFilter();peqNode.type="peaking";peqNode.frequency.value=1000;peqNode.Q.value=1;peqNode.gain.value=0;
 bassNode=audioCtx.createBiquadFilter();bassNode.type="lowshelf";bassNode.frequency.value=90;bassNode.gain.value=0;
 compNode=audioCtx.createDynamicsCompressor();compNode.threshold.value=-24;compNode.knee.value=18;compNode.ratio.value=3;compNode.attack.value=.003;compNode.release.value=.25;
 master=audioCtx.createGain(); master.gain.value=.9;
 eqNodes.reduce((a,b)=>(a.connect(b),b),source).connect(peqNode).connect(bassNode).connect(compNode).connect(master).connect(audioCtx.destination);
}
async function play(){
 ensureAudio(); if(audioCtx.state==="suspended")await audioCtx.resume();
 if(index<0&&tracks.length)load(0); if(!audio.src)return;
 if(audio.paused){audio.play();playerCard.classList.add("playing");$("#play").textContent="⏸";$("#miniPlay").textContent="⏸"}else{audio.pause();playerCard.classList.remove("playing");$("#play").textContent="▶";$("#miniPlay").textContent="▶"}
}
function load(i){
 if(!tracks.length)return; index=(i+tracks.length)%tracks.length;let t=tracks[index];
 audio.src=t.url; $("#title").textContent=t.name;$("#artist").textContent="Local file • "+prettyBytes(t.size);
 $("#miniTitle").textContent=t.name;$("#miniStatus").textContent="Ready"; audio.load();
}
function next(){if(!tracks.length)return;let n=shuffle?Math.floor(Math.random()*tracks.length):index+1;load(n);play()}
function prev(){if(audio.currentTime>5){audio.currentTime=0;return}load(index-1);play()}
function prettyBytes(n){let u=["B","KB","MB","GB"],i=0;while(n>=1024&&i<3){n/=1024;i++}return n.toFixed(i?1:0)+" "+u[i]}
function time(s){if(!isFinite(s))return"0:00";return Math.floor(s/60)+":"+String(Math.floor(s%60)).padStart(2,"0")}
function renderLib(){let b=$("#library");b.innerHTML="";tracks.forEach((t,i)=>{let d=document.createElement("div");d.className="track";d.innerHTML=`<span>💿</span><div><b>${escapeHtml(t.name)}</b><small>${prettyBytes(t.size)}</small></div><span class="x">▶</span>`;d.onclick=()=>{load(i);play()};b.appendChild(d)})}
function escapeHtml(s){return s.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
$("#files").onchange=e=>{[...e.target.files].forEach(f=>tracks.push({name:f.name,size:f.size,url:URL.createObjectURL(f)}));renderLib();if(index<0)load(0)};
$("#play").onclick=play;$("#miniPlay").onclick=play;$("#next").onclick=next;$("#prev").onclick=prev;
$("#audio").ontimeupdate=()=>{$("#seek").value=audio.duration?audio.currentTime/audio.duration*100:0;$("#cur").textContent=time(audio.currentTime);$("#dur").textContent=time(audio.duration)};
$("#seek").oninput=()=>{if(audio.duration)audio.currentTime=+$("#seek").value/100*audio.duration};
audio.onended=()=>{if(repeat===2){audio.currentTime=0;play()}else if(repeat===1)play();else next()};
$("#shuffle").onclick=()=>{shuffle=!shuffle;$("#shuffle").textContent=shuffle?"🔀 Shuffle: On":"🔀 Shuffle"};
$("#repeat").onclick=()=>{repeat=(repeat+1)%3;$("#repeat").textContent=["🔁 Repeat: Off","🔂 Repeat: One","🔁 Repeat: All"][repeat]};
$("#mute").onclick=()=>{audio.muted=!audio.muted;$("#mute").textContent=audio.muted?"🔇":"🔊"};
$("#flat").onclick=()=>setEQ(Array(20).fill(0));$("#resetEq").onclick=()=>setEQ(Array(20).fill(0));
$("#eqPreset").onchange=e=>{if(presets[e.target.value])setEQ(presets[e.target.value])};
function setEQ(a){$$("#eq input").forEach((x,i)=>{x.value=a[i];$("#db"+i).textContent=Number(a[i]).toFixed(1);if(eqNodes[i])eqNodes[i].gain.value=+a[i]})}
$("#xwide").onchange=e=>applySpatial(+e.target.value,+$("#surround").value);
$("#surround").onchange=e=>applySpatial(+$("#xwide").value,+e.target.value);
function applySpatial(w,s){
 // Web Audio stereo widening: split/merge with opposite-channel bleed and gain.
 // Rebuild only if an AudioContext exists.
 if(!audioCtx)return;
 if(splitter){try{master.disconnect()}catch{}}
 splitter=audioCtx.createChannelSplitter(2);merger=audioCtx.createChannelMerger(2);pannerL=audioCtx.createGain();pannerR=audioCtx.createGain();
 const wide=[0,.12,.24,.36][w], sur=[0,.08,.16,.24][s];
 try{compNode.disconnect();compNode.connect(splitter);splitter.connect(merger,0,0);splitter.connect(merger,1,1);
   let bleed=wide+sur; let bl=audioCtx.createGain(),br=audioCtx.createGain();bl.gain.value=bleed;br.gain.value=bleed;
   splitter.connect(bl,0);bl.connect(merger,0,1);splitter.connect(br,1);br.connect(merger,0,0);
   merger.connect(master);
 }catch(e){}
}
$("#xbass").onchange=e=>{ensureAudio();bassNode.gain.value=[0,3,6,9][+e.target.value]};
$("#comp").onclick=()=>{$("#comp").textContent=$("#comp").textContent==="OFF"?"ON":"OFF";compNode.ratio.value=$("#comp").textContent==="ON"?3:1};
$("#loud").onclick=()=>{$("#loud").textContent=$("#loud").textContent==="OFF"?"ON":"OFF";bassNode.gain.value=$("#loud").textContent==="ON"?Math.max(bassNode.gain.value,3):0};
$("#peqApply").onclick=()=>{ensureAudio();peqNode.type=$("#peqType").value;peqNode.frequency.value=Math.max(20,Math.min(20000,+$("#peqFreq").value));peqNode.Q.value=Math.max(.1,Math.min(20,+$("#peqQ").value));peqNode.gain.value=Math.max(-18,Math.min(18,+$("#peqGain").value))};
$$(".tab").forEach(b=>b.onclick=()=>{$$(".tab").forEach(x=>x.classList.remove("active"));$$(".section").forEach(x=>x.classList.remove("active"));b.classList.add("active");$("#"+b.dataset.tab).classList.add("active")});
$("#openEq").onclick=()=>{document.querySelector('[data-tab="eqTab"]').click();window.scrollTo({top:0,behavior:"smooth"})};

if("mediaSession" in navigator){
 const update=()=>{navigator.mediaSession.metadata=new MediaMetadata({title:tracks[index]?.name||"VinylLab",artist:"Local Library",album:"VinylLab Player"})};
 navigator.mediaSession.setActionHandler("play",play);navigator.mediaSession.setActionHandler("pause",play);navigator.mediaSession.setActionHandler("previoustrack",prev);navigator.mediaSession.setActionHandler("nexttrack",next);
 const oldLoad=load; load=(i)=>{oldLoad(i);update()};
}
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();installedPrompt=e;$("#installBtn").hidden=false});
$("#installBtn").onclick=async()=>{if(installedPrompt){installedPrompt.prompt();await installedPrompt.userChoice;installedPrompt=null;$("#installBtn").hidden=true}};
window.addEventListener("appinstalled",()=>$("#installBtn").hidden=true);
if("serviceWorker" in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("sw.js"));
initEQ();
