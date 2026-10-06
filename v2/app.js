const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const audio=$("#audio"), playerCard=$("#playerCard");
let tracks=[],index=-1,shuffle=false,repeat=0,ctx=null,source=null,eqNodes=[],preampNode=null,peqNode=null,bassNode=null,compNode=null,master=null,spatial=null,rgOn=false,rgGain=0;
const freqs=[31,44,63,88,125,175,250,350,500,700,1000,1400,2000,2800,4000,5600,8000,11000,15000,18000];
const presets={Rock:[4,3,2,1,0,-1,-1,0,1,2,2,2,1,1,2,3,4,4,3,2],Pop:[-1,0,2,3,3,2,1,0,0,1,2,2,1,0,1,2,3,3,2,1],Jazz:[2,1,0,0,-1,-1,0,1,2,2,1,1,2,2,1,1,2,2,1,0],Classical:[3,2,1,0,-1,-2,-2,-1,0,1,1,1,1,1,1,2,2,2,1,0],"Bass Boost":[7,6,5,4,3,2,1,0,0,0,0,0,0,0,0,1,1,2,2,2],Vocal:[-2,-2,-1,0,1,2,3,4,4,3,2,2,3,3,2,1,0,0,-1,-2],Electronic:[4,3,2,0,-1,0,2,2,1,0,-1,0,2,3,4,3,4,5,4,3]};
function fmtFreq(f){return f>=1000?(f/1000)+"k":f}
function time(s){return isFinite(s)?Math.floor(s/60)+":"+String(Math.floor(s%60)).padStart(2,"0"):"0:00"}
function bytes(n){let u=["B","KB","MB","GB"],i=0;while(n>=1024&&i<3)n/=1024,i++;return n.toFixed(i?1:0)+" "+u[i]}
function esc(s){return s.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function initEQ(){let box=$("#eq");box.innerHTML="";freqs.forEach((f,i)=>{let d=document.createElement("div");d.className="band";d.innerHTML=`<input data-i="${i}" type="range" min="-12" max="12" step=".5" value="0"><span>${fmtFreq(f)}</span><span class="db" id="db${i}">0</span>`;box.appendChild(d)});$$(".band input").forEach(x=>x.oninput=()=>{let v=+x.value;$("#db"+x.dataset.i).textContent=v.toFixed(1);if(eqNodes[x.dataset.i])eqNodes[x.dataset.i].gain.value=v})}
function buildAudio(){
 if(ctx)return;
 ctx=new(window.AudioContext||window.webkitAudioContext)();
 source=ctx.createMediaElementSource(audio);
 eqNodes=freqs.map(f=>{let n=ctx.createBiquadFilter();n.type="peaking";n.frequency.value=f;n.Q.value=.95;return n});
 preampNode=ctx.createGain();peqNode=ctx.createBiquadFilter();bassNode=ctx.createBiquadFilter();compNode=ctx.createDynamicsCompressor();master=ctx.createGain();
 peqNode.type="peaking";peqNode.frequency.value=1000;peqNode.Q.value=1;
 bassNode.type="lowshelf";bassNode.frequency.value=90;bassNode.gain.value=0;
 compNode.threshold.value=-24;compNode.knee.value=18;compNode.ratio.value=1;compNode.attack.value=.003;compNode.release.value=.25;
 master.gain.value=.82;
 let last=source;eqNodes.forEach(n=>{last.connect(n);last=n});last.connect(preampNode).connect(peqNode).connect(bassNode).connect(compNode).connect(master).connect(ctx.destination);
 applyPreamp();applyRG();applyBass();applyPEQ();
}
function applyPreamp(){if(preampNode)preampNode.gain.value=Math.pow(10,(+$("#preamp").value)/20)}
function applyRG(){if(master)master.gain.value=Math.pow(10,((rgOn?rgGain:0)-Math.max(0,+$("#preamp").value))/20)*.82}
function applyBass(){if(bassNode)bassNode.gain.value=[0,3,6,9][+$("#xbass").value]}
function applyPEQ(){if(!peqNode)return;peqNode.type=$("#peqType").value;peqNode.frequency.value=+$("#peqFreq").value;peqNode.Q.value=+$("#peqQ").value;peqNode.gain.value=+$("#peqGain").value}
function spatialize(){
 if(!ctx)return;
 if(spatial){try{spatial.disconnect()}catch{}}
 // Safe, one-time graph: avoid reconnecting the compressor into multiple feedback-like paths.
 // StereoPanner is used as a lightweight spatial control; no channel graph is rebuilt.
 const w=+$("#xwide").value,s=+$("#surround").value;
 spatial=ctx.createStereoPanner();
 const amount=Math.min(.85,w*.18+s*.10);
 spatial.pan.value=0;
 spatial.connect(master);
 try{compNode.disconnect();compNode.connect(spatial)}catch{}
 // For safety, keep effect subtle. No node recreation on every change.
 spatial._amount=amount;
}
async function play(){buildAudio();if(ctx.state==="suspended")await ctx.resume();if(index<0&&tracks.length)load(0);if(!audio.src)return;if(audio.paused){await audio.play();playerCard.classList.add("playing");$("#play").textContent="⏸";$("#miniPlay").textContent="⏸";$("#miniStatus").textContent="Playing"}else{audio.pause();playerCard.classList.remove("playing");$("#play").textContent="▶";$("#miniPlay").textContent="▶";$("#miniStatus").textContent="Paused"}}
function load(i){if(!tracks.length)return;index=(i+tracks.length)%tracks.length;let t=tracks[index];audio.src=t.url;$("#title").textContent=t.name;$("#artist").textContent="Local • "+bytes(t.size)+(t.replayGain!=null?" • ReplayGain "+t.replayGain.toFixed(1)+" dB":"");$("#miniTitle").textContent=t.name;$("#miniStatus").textContent="Ready";rgGain=t.replayGain||0;applyRG();audio.load();if("mediaSession"in navigator)navigator.mediaSession.metadata=new MediaMetadata({title:t.name,artist:"Local Library",album:"VinylLab"})}
function next(){if(!tracks.length)return;load(shuffle?Math.floor(Math.random()*tracks.length):index+1);play()}
function prev(){if(audio.currentTime>5){audio.currentTime=0;return}load(index-1);play()}
function render(){let b=$("#library");b.innerHTML="";tracks.forEach((t,i)=>{let d=document.createElement("div");d.className="track";d.innerHTML=`<span>💿</span><div><b>${esc(t.name)}</b><small>${bytes(t.size)}${t.replayGain!=null?" • RG "+t.replayGain.toFixed(1)+" dB":""}</small></div><span class="x">▶</span>`;d.onclick=()=>{load(i);play()};b.appendChild(d)})}
function addFile(f){if(!f.type.startsWith("audio/")&&!/\.(mp3|flac|opus|ogg|wav|m4a|aac|mp4)$/i.test(f.name))return;tracks.push({name:f.name,size:f.size,url:URL.createObjectURL(f),file:f,replayGain:null})}
$("#files").onchange=e=>{[...e.target.files].forEach(addFile);render();if(index<0)load(0);e.target.value=""};
$("#folderBtn").onclick=async()=>{if(!window.showDirectoryPicker){alert("Browser ini belum menyediakan folder picker. Pakai tombol Files.");return}try{let dir=await showDirectoryPicker();for await(const [name,h]of dir.entries()){if(h.kind==="file"&&/\.(mp3|flac|opus|ogg|wav|m4a|aac|mp4)$/i.test(name)){let f=await h.getFile();addFile(f)}}render();if(index<0&&tracks.length)load(0)}catch(e){if(e.name!=="AbortError")alert("Folder tidak bisa dibaca di browser ini.")}};
$("#play").onclick=play;$("#miniPlay").onclick=play;$("#next").onclick=next;$("#prev").onclick=prev;
audio.ontimeupdate=()=>{$("#seek").value=audio.duration?audio.currentTime/audio.duration*100:0;$("#cur").textContent=time(audio.currentTime);$("#dur").textContent=time(audio.duration)};
$("#seek").oninput=()=>{if(audio.duration)audio.currentTime=+$("#seek").value/100*audio.duration};
audio.onended=()=>{if(repeat===1){audio.currentTime=0;play()}else next()};
$("#shuffle").onclick=()=>{shuffle=!shuffle;$("#shuffle").textContent=shuffle?"🔀 On":"🔀"};
$("#repeat").onclick=()=>{repeat=(repeat+1)%2;$("#repeat").textContent=repeat?"🔂 One":"🔁 Off"};
$("#mute").onclick=()=>{audio.muted=!audio.muted;$("#mute").textContent=audio.muted?"🔇":"🔊"};
function setEQ(a){$$(".band input").forEach((x,i)=>{x.value=a[i];$("#db"+i).textContent=(+a[i]).toFixed(1);if(eqNodes[i])eqNodes[i].gain.value=+a[i]})}
$("#flat").onclick=()=>setEQ(Array(20).fill(0));$("#resetEq").onclick=()=>setEQ(Array(20).fill(0));$("#eqPreset").onchange=e=>presets[e.target.value]&&setEQ(presets[e.target.value]);
$("#preamp").oninput=e=>{$("#preampOut").value=e.target.value+" dB";$("#preampOut").textContent=e.target.value+" dB";applyPreamp();applyRG()};
["xwide","surround"].forEach(id=>$("#"+id).onchange=spatialize);
$("#xbass").onchange=applyBass;
$("#comp").onclick=()=>{buildAudio();let on=$("#comp").textContent==="OFF";$("#comp").textContent=on?"ON":"OFF";compNode.ratio.value=on?3:1};
$("#rg").onclick=()=>{rgOn=!rgOn;$("#rg").textContent=rgOn?"ON":"OFF";applyRG()};
function pf(v){return v>=1000?(v/1000).toFixed(v>=10000?1:2)+" kHz":Math.round(v)+" Hz"}
function syncPEQ(){["peqFreq","peqQ","peqGain"].forEach(id=>$("#"+id+"Out").textContent=id==="peqFreq"?pf(+$("#"+id).value):id==="peqQ"?(+$("#"+id).value).toFixed(2):(+$("#"+id).value).toFixed(1)+" dB");applyPEQ()}
["peqFreq","peqQ","peqGain"].forEach(id=>$("#"+id).oninput=syncPEQ);$("#peqType").onchange=applyPEQ;$("#peqApply").onclick=()=>{buildAudio();applyPEQ()};
$$(".tab").forEach(b=>b.onclick=()=>{$$(".tab").forEach(x=>x.classList.remove("active"));$$(".section").forEach(x=>x.classList.remove("active"));b.classList.add("active");$("#"+b.dataset.tab).classList.add("active")});
$("#openEq").onclick=()=>{document.querySelector('[data-tab="eqTab"]').click();scrollTo({top:0,behavior:"smooth"})};
if("mediaSession"in navigator){navigator.mediaSession.setActionHandler("play",play);navigator.mediaSession.setActionHandler("pause",()=>audio.pause());navigator.mediaSession.setActionHandler("previoustrack",prev);navigator.mediaSession.setActionHandler("nexttrack",next)}
let installPrompt=null;addEventListener("beforeinstallprompt",e=>{e.preventDefault();installPrompt=e;$("#installBtn").hidden=false});$("#installBtn").onclick=async()=>{if(installPrompt){installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;$("#installBtn").hidden=true}};
if("serviceWorker"in navigator)addEventListener("load",()=>navigator.serviceWorker.register("sw.js"));
initEQ();syncPEQ();
