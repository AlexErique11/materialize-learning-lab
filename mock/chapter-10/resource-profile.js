const $=(id)=>document.getElementById(id);const inputs=["steady","peak","budget","duration","loop"].map($);
function render(){
 const steady=Number($("steady").value),peak=Number($("peak").value),budget=Number($("budget").value),duration=Number($("duration").value),loop=$("loop").checked;
 $("steadyValue").textContent=steady;$("peakValue").textContent=peak;$("budgetValue").textContent=budget;$("durationValue").textContent=duration;
 const max=160,x0=45,x1=575,y0=185,y1=22, x=(t)=>x0+(x1-x0)*t/100,y=(v)=>y0-(y0-y1)*v/max;
 const pts=[[0,steady],[5,steady],[5,peak],[5+duration,peak],[5+duration,steady],[100,steady]];
 if(loop){pts.length=0;pts.push([0,steady]);for(let start=0;start<100;start+=duration+8){pts.push([start,steady],[start,peak],[Math.min(100,start+duration),peak],[Math.min(100,start+duration),steady]);}pts.push([100,steady]);}
 const line=pts.map(([t,v])=>`${x(t)},${y(v)}`).join(" ");
 const grid=[0,40,80,120,160].map((v)=>`<line x1="${x0}" y1="${y(v)}" x2="${x1}" y2="${y(v)}" stroke="#e8eaed"/><text x="5" y="${y(v)+4}">${v}</text>`).join("");
 $("chart").innerHTML=`${grid}<line x1="${x0}" y1="${y(budget)}" x2="${x1}" y2="${y(budget)}" stroke="#a33a35" stroke-width="2" stroke-dasharray="6 4"/><polyline points="${line}" fill="none" stroke="#665db8" stroke-width="4" stroke-linejoin="round"/><text x="${x0}" y="210">time →</text><text x="${x1-100}" y="${y(budget)-6}" fill="#a33a35">budget ${budget}</text>`;
 const steadyFits=steady<=budget,peakFits=peak<=budget;const status=$("status");status.className=`status ${!steadyFits?"bad":!peakFits?"warn":"good"}`;
 status.textContent=!steadyFits?`Steady-state demand (${steady}) exceeds the budget (${budget}); the workload cannot remain running.`:peakFits?`Both steady state (${steady}) and hydration peak (${peak}) fit within the ${budget}-unit budget.`:loop?`Steady state fits, but hydration peak (${peak}) exceeds budget (${budget}). The replica fails during hydration and repeats the restart loop.`:`Steady state fits, but hydration peak (${peak}) exceeds budget (${budget}); a restart can repeatedly fail before reaching steady state.`;
}
inputs.forEach((input)=>input.addEventListener("input",render));if(new URLSearchParams(location.search).has("embed"))document.body.classList.add("embedded");render();
