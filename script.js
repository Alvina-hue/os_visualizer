const $ = id => document.getElementById(id);
const workloads = {
 municipal: {
  label: "Municipal sustainability", quantum: 2, overhead: 0, quanta: [2,3],
  processes: [
   {id:"P1",name:"Water-quality monitoring",arrival:0,burst:5},
   {id:"P2",name:"Waste-collection scheduling",arrival:1,burst:3},
   {id:"P3",name:"Traffic-pollution analysis",arrival:2,burst:4},
   {id:"P4",name:"Public energy-use monitoring",arrival:3,burst:2}
  ]
 },
 climate: {
  label: "Climate emergency", quantum: 2, overhead: 1, quanta: [2,4],
  processes: [
   {id:"P1",name:"Flood-warning analysis",arrival:0,burst:5},
   {id:"P2",name:"Air-quality alert generation",arrival:1,burst:4},
   {id:"P3",name:"Emergency evacuation-route update",arrival:2,burst:3},
   {id:"P4",name:"Renewable-grid status monitoring",arrival:3,burst:2}
  ]
 }
};
const palette={P1:"#a79aff",P2:"#72dfbd",P3:"#ffc66d",P4:"#77c9ff",P5:"#ff9ca9",P6:"#b8a2ff",P7:"#9edb7b",P8:"#f5a7dc"};
let currentProcesses=[], activeWorkload="municipal", lastResult=null;
const fmt=n=>Number(n).toFixed(2).replace(/\.00$/,"");
function updateNote(){
 const act=$("activity").value;
 $("activity-note").textContent=act==="municipal"?"Activity 1: municipal services. Assignment data is loaded with 0 ms context-switch overhead.":act==="climate"?"Activity 2: climate emergency services. Assignment data is loaded with 1 ms context-switch overhead.":"Custom mode: enter your own arrival and burst times in the process table.";
 if(act==="municipal"||act==="climate"){const w=workloads[act];$("quantum").value=w.quantum;$("overhead").value=w.overhead;$("process-count").value=4;}
}
$("activity").addEventListener("change",updateNote);
$("theme").addEventListener("change",()=>{document.body.classList.remove("theme-mint","theme-amber");if($("theme").value==="mint")document.body.classList.add("theme-mint");if($("theme").value==="amber")document.body.classList.add("theme-amber");});
function makeProcesses(random=false){
 const act=$("activity").value, count=Math.max(1,Math.min(8,parseInt($("process-count").value)||4));
 if((act==="municipal"||act==="climate")&&!random){return workloads[act].processes.map(p=>({...p})).slice(0,count);}
 const names=["Water monitoring","Waste collection","Pollution analysis","Energy monitoring","Flood warning","Air-quality alerts","Evacuation route","Renewable grid"];
 return Array.from({length:count},(_,i)=>({id:`P${i+1}`,name:names[i]||`Service ${i+1}`,arrival:random?Math.floor(Math.random()*5):i,burst:random?Math.floor(Math.random()*6)+2:3}));
}
function showInputs(){
 currentProcesses=makeProcesses(false);activeWorkload=$("activity").value;
 if(activeWorkload==="municipal"||activeWorkload==="climate"){$("quantum").value=workloads[activeWorkload].quantum;$("overhead").value=workloads[activeWorkload].overhead;}
 $("setup-screen").classList.add("hidden");$("visual-screen").classList.remove("hidden");
 $("active-algorithm").textContent=$("algorithm").value==="rr"?"Round Robin":"FCFS";
 $("active-quantum").textContent=$("quantum").value+" ms";$("active-overhead").textContent=$("overhead").value+" ms";
 $("active-workload").textContent=activeWorkload==="custom"?"Custom workload":workloads[activeWorkload].label;
 renderInputs();runSimulation();window.scrollTo({top:0,behavior:"smooth"});
}
function renderInputs(){
 $("input-rows").innerHTML=currentProcesses.map((p,i)=>`<tr><td><span class="pid">${p.id}</span></td><td><input aria-label="Service name" class="table-input name-input" data-i="${i}" data-field="name" value="${escapeHTML(p.name)}"></td><td><input aria-label="Arrival time" class="table-input" type="number" min="0" data-i="${i}" data-field="arrival" value="${p.arrival}"></td><td><input aria-label="Burst time" class="table-input" type="number" min="1" data-i="${i}" data-field="burst" value="${p.burst}"></td><td><button class="remove" data-remove="${i}" title="Remove process" aria-label="Remove process">×</button></td></tr>`).join("");
 $("input-rows").querySelectorAll("input").forEach(input=>input.addEventListener("change",()=>{const i=Number(input.dataset.i),field=input.dataset.field;currentProcesses[i][field]=field==="name"?input.value:Math.max(field==="burst"?1:0,Number(input.value)||0);}));
 $("input-rows").querySelectorAll("[data-remove]").forEach(btn=>btn.addEventListener("click",()=>{if(currentProcesses.length<=1){alert("Keep at least one process.");return;}currentProcesses.splice(Number(btn.dataset.remove),1);currentProcesses.forEach((p,i)=>p.id=`P${i+1}`);renderInputs();}));
}
function escapeHTML(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
$("add-process").addEventListener("click",()=>{if(currentProcesses.length>=8){alert("Maximum 8 processes for this simple visualizer.");return;}const i=currentProcesses.length;currentProcesses.push({id:`P${i+1}`,name:`New service ${i+1}`,arrival:0,burst:3});renderInputs();});
function simulate(input,q,overhead,algorithm="rr"){
 if(!input.length)throw Error("Add at least one process.");
 if(!Number.isInteger(q)||q<1)throw Error("Time quantum must be a whole number greater than zero.");
 if(!Number.isFinite(overhead)||overhead<0)throw Error("Context-switch overhead cannot be negative.");
 const ps=input.map(p=>({...p,arrival:Number(p.arrival),burst:Number(p.burst)})).sort((a,b)=>a.arrival-b.arrival);
 if(ps.some(p=>!Number.isFinite(p.arrival)||p.arrival<0||!Number.isFinite(p.burst)||p.burst<1))throw Error("Arrival time must be 0 or more and burst time must be at least 1.");
 const rem=Object.fromEntries(ps.map(p=>[p.id,p.burst])), first={}, completion={}, queue=[], timeline=[];
 let t=0,i=0,prev=null,switches=0,doneCount=0;
 while(doneCount<ps.length){
  while(i<ps.length&&ps[i].arrival<=t)queue.push(ps[i++].id);
  if(!queue.length){const next=ps[i].arrival;timeline.push({id:"IDLE",start:t,end:next});t=next;prev=null;continue;}
  const id=queue.shift();
  if(prev!==null&&id!==prev){switches++;if(overhead>0){timeline.push({id:"CS",start:t,end:t+overhead});t+=overhead;while(i<ps.length&&ps[i].arrival<=t)queue.push(ps[i++].id);}}
  if(first[id]===undefined)first[id]=t;
  const slice=algorithm==="fcfs"?rem[id]:Math.min(q,rem[id]);
  timeline.push({id,start:t,end:t+slice});t+=slice;rem[id]-=slice;
  while(i<ps.length&&ps[i].arrival<=t)queue.push(ps[i++].id);
  if(rem[id]>0)queue.push(id);else{completion[id]=t;doneCount++;}
  prev=id;
 }
 const rows=ps.map(p=>{const ct=completion[p.id],tat=ct-p.arrival;return {...p,ct,tat,wt:tat-p.burst,rt:first[p.id]-p.arrival};});
 const useful=ps.reduce((s,p)=>s+p.burst,0),totalOverhead=timeline.filter(s=>s.id==="CS").reduce((s,x)=>s+x.end-x.start,0);
 const sum=k=>rows.reduce((s,p)=>s+p[k],0)/rows.length;
 return {rows,timeline,summary:{avgTat:sum("tat"),avgWt:sum("wt"),avgRt:sum("rt"),switches,totalOverhead,efficiency:100*useful/t,elapsed:t,useful}};
}
function drawGantt(result){
 const root=$("gantt");root.innerHTML="";
 result.timeline.forEach(seg=>{const el=document.createElement("div");el.className="gantt-block"+(seg.id==="CS"?" cs":seg.id==="IDLE"?" idle":"");el.style.setProperty("--grow",Math.max(seg.end-seg.start,.2));el.style.background=palette[seg.id]||"#a79aff";el.innerHTML=`<strong>${seg.id==="CS"?"SWITCH":seg.id}</strong><small>${fmt(seg.start)}–${fmt(seg.end)} ms</small>`;el.title=`${seg.id}: ${seg.start} to ${seg.end} ms`;root.appendChild(el);});
 const s=result.summary;$("start-label").textContent="Start: 0 ms";$("end-label").textContent=`Finish: ${fmt(s.elapsed)} ms`;$("switch-label").textContent=`Switches: ${s.switches}`;$("overhead-label").textContent=`Overhead: ${fmt(s.totalOverhead)} ms`;
 $("avg-tat").innerHTML=`${fmt(s.avgTat)} <em>ms</em>`;$("avg-wt").innerHTML=`${fmt(s.avgWt)} <em>ms</em>`;$("avg-rt").innerHTML=`${fmt(s.avgRt)} <em>ms</em>`;$("efficiency").innerHTML=`${fmt(s.efficiency)} <em>%</em>`;
 $("cpu-current").textContent=`${result.rows.length} processes scheduled`;$("cpu-service").textContent="The chart shows the complete simulated execution order."; $("timer").textContent=`${fmt(s.elapsed)} ms`;$("completed").textContent=`${result.rows.length} / ${result.rows.length}`;$("burst-total").textContent=`${fmt(s.useful)} ms`;
 $("results-rows").innerHTML=result.rows.map(p=>`<tr><td><span class="pid">${p.id}</span></td><td>${escapeHTML(p.name)}</td><td>${fmt(p.arrival)}</td><td>${fmt(p.burst)}</td><td>${fmt(p.ct)}</td><td>${fmt(p.tat)}</td><td>${fmt(p.wt)}</td><td>${fmt(p.rt)}</td><td><div style="height:7px;min-width:55px;background:#273b50;border-radius:9px;overflow:hidden"><div style="height:100%;width:100%;background:${palette[p.id]||"var(--accent)"}"></div></div></td></tr>`).join("");
}
function runSimulation(){
 try{const q=Number($("quantum").value),over=Number($("overhead").value),alg=$("algorithm").value;lastResult=simulate(currentProcesses,q,over,alg);$("active-algorithm").textContent=alg==="rr"?"Round Robin":"FCFS";$("active-quantum").textContent=q+" ms";$("active-overhead").textContent=over+" ms";drawGantt(lastResult);}
 catch(e){alert(e.message);}
}
$("enter-input").addEventListener("click",showInputs);
$("random-input").addEventListener("click",()=>{currentProcesses=makeProcesses(true);$("activity").value="custom";$("process-count").value=currentProcesses.length;$("quantum").value=2;$("overhead").value=0;activeWorkload="custom";$("setup-screen").classList.add("hidden");$("visual-screen").classList.remove("hidden");$("active-workload").textContent="Random workload";$("active-algorithm").textContent=$("algorithm").value==="rr"?"Round Robin":"FCFS";$("active-quantum").textContent=$("quantum").value+" ms";$("active-overhead").textContent=$("overhead").value+" ms";renderInputs();runSimulation();});
$("run-simulation").addEventListener("click",runSimulation);
$("back").addEventListener("click",()=>{$("visual-screen").classList.add("hidden");$("setup-screen").classList.remove("hidden");window.scrollTo({top:0,behavior:"smooth"});});
$("compare").addEventListener("click",()=>{
 try{
  const act=$("activity").value,quanta=(act==="municipal"||act==="climate")?workloads[act].quanta:[2,4],over=Number($("overhead").value),alg=$("algorithm").value;
  const results=quanta.map(q=>({q,r:simulate(currentProcesses,q,over,alg)}));
  $("comparison-rows").innerHTML=results.map(({q,r})=>{const s=r.summary;return `<tr><td><span class="pid">${q} ms</span></td><td>${fmt(s.avgTat)}</td><td>${fmt(s.avgWt)}</td><td>${fmt(s.avgRt)}</td><td>${s.switches}</td><td>${fmt(s.totalOverhead)} ms</td><td>${fmt(s.efficiency)}%</td></tr>`;}).join("");
  const a=results[0],b=results[1],sa=a.r.summary,sb=b.r.summary;
  $("recommendation").innerHTML=`<b>Comparison insight:</b> With quantum ${b.q} ms, average response changes from ${fmt(sa.avgRt)} ms to ${fmt(sb.avgRt)} ms; context switches change from ${sa.switches} to ${sb.switches}, and switching overhead changes from ${fmt(sa.totalOverhead)} ms to ${fmt(sb.totalOverhead)} ms. For the climate emergency workload, consider the response time as well as overhead before selecting a quantum.`;
 }catch(e){alert(e.message);}
});
$("activity").addEventListener("change",updateNote);
updateNote();