const timeInput=document.querySelector("#time"),checkpointInput=document.querySelector("#checkpoint"),historyInput=document.querySelector("#history"),button=document.querySelector("#connection");let connected=true,resumed=false;
function render(){
 const now=Number(timeInput.value),checkpoint=Number(checkpointInput.value),quiet=connected?now:Math.min(now,checkpoint);
 document.querySelector("#timeValue").textContent=now;document.querySelector("#checkpointValue").textContent=checkpoint;
 document.querySelector("#quietProgress").style.width=`${quiet/20*100}%`;document.querySelector("#quietFrontier").textContent=`frontier ${quiet}`;
 document.querySelector("#stalledProgress").style.width=`${8/20*100}%`;
 document.querySelector("#events").innerHTML=connected?`<span class="message-row progress">${quiet} · progress</span><span class="message-row">0 business-row changes</span>`:`<span class="message-row pending">Disconnected · checkpoint ${checkpoint}</span>`;
 button.textContent=connected?"Disconnect":"Reconnect";
 const status=document.querySelector("#status");status.className=`status ${connected?"good":"warn"}`;
 if(!connected)status.textContent=`Client disconnected. Last stored complete timestamp is ${checkpoint}; incoming changes are not being applied.`;
 else if(resumed&&!historyInput.checked)status.textContent="Checkpoint history is unavailable: start a fresh subscription snapshot to rebuild the client, then store the new state and progress atomically.";
 else if(resumed)status.textContent=`Reconnected from ${checkpoint}: replay changes strictly after the saved timestamp. In this fixture, the next available update is at 11.`;
 else status.textContent=`At time ${now}, the quiet stream has advanced its progress frontier without row changes. The other stream has made no progress beyond 8.`;
}
button.addEventListener("click",()=>{connected=!connected;if(connected)resumed=true;render();});[timeInput,checkpointInput].forEach((input)=>input.addEventListener("input",render));historyInput.addEventListener("change",render);if(new URLSearchParams(location.search).has("embed"))document.body.classList.add("embedded");render();
