const $=(id)=>document.getElementById(id);
const controls=["backlog","arrivals","capacity","replicas","elapsed"].map($);
function render(){
 const [initial,arrivals,capacity,replicas,elapsed]=controls.map((x)=>Number(x.value));
 const hydration=Math.min(100,elapsed/30*100),remaining=Math.max(0,initial+(arrivals-capacity)*elapsed);
 const ready=hydration>=100&&remaining===0,available=replicas>1||ready;
 $("backlogValue").textContent=initial;$("arrivalsValue").textContent=arrivals;$("capacityValue").textContent=capacity;$("replicasValue").textContent=replicas;$("elapsedValue").textContent=elapsed;
 $("hydrationLabel").textContent=`${Math.round(hydration)}%`;$("hydrationPct").textContent=`${Math.round(hydration)}%`;$("hydrationBar").style.width=`${hydration}%`;
 $("backlogLabel").textContent=Math.round(remaining).toLocaleString();$("backlogCount").textContent=Math.round(remaining).toLocaleString();$("backlogBar").style.width=`${Math.min(100,remaining/Math.max(initial,1)*100)}%`;
 $("availability").textContent=available?replicas>1?"Available · other replica":"Available":"Unavailable";
 const status=$("status");status.className=`status ${!available?"bad":arrivals>=capacity&&remaining>0?"warn":"good"}`;
 status.textContent=arrivals>=capacity&&remaining>0?`Backlog is not shrinking: ${arrivals} changes/sec arrive while capacity is ${capacity}/sec. Increase capacity above arrivals to catch up.`:!available?`Replica is rebuilding state and catching up. It becomes available after hydration completes and backlog reaches zero.`:replicas>1&&!ready?`The other full replica keeps the cluster available while this copy hydrates and catches up.`:`Recovery is complete: memory state is rebuilt and the backlog is cleared.`;
}
controls.forEach((input)=>input.addEventListener("input",render));if(new URLSearchParams(location.search).has("embed"))document.body.classList.add("embedded");render();
