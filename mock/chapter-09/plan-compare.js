const rowsControl=document.querySelector("#rows"),reuseControl=document.querySelector("#reuse");
function operator(title,detail,estimate=""){return `<div class="operator"><small>${detail}</small><strong>${title}</strong><em>${estimate}</em></div>`;}
function render(){
 const rows=Number(rowsControl.value), filtered=Math.max(1,Math.round(rows*.1)), matchesBefore=rows*4, matchesAfter=filtered*4, shared=reuseControl.value==="yes";
 document.querySelector("#rowsValue").textContent=rows;
 const before=operator("Read all","orders",`${rows} rows`)+operator("Join","4 matches/order",`${matchesBefore} pairs`)+operator("Filter + project","reduce to 10%",`${filtered} rows`)+operator("Aggregate","same answer","10 rows");
 const after=operator("Filter + project","safe predicate",`${filtered} rows`)+operator("Join",shared?"shared index":"private arrangement",`${matchesAfter} pairs`)+operator("Aggregate","same answer","10 rows");
 document.querySelector("#plans").innerHTML=`<article class="plan"><h2>Before · filter after join</h2><p>More rows flow through the join.</p><div class="graph">${before}</div><div class="stat">Join input pairs: <strong>${matchesBefore.toLocaleString()}</strong> · wider intermediate: <strong>higher</strong></div></article><article class="plan"><h2>After · filter before join</h2><p>Reduce rows and columns before joining.</p><div class="graph">${after}</div><div class="stat">Join input pairs: <strong>${matchesAfter.toLocaleString()}</strong> · intermediate: <strong>${shared?"shared arrangement available":"local arrangement"}</strong></div></article>`;
 document.querySelector("#summary").textContent=`Both sketches return the same ten-row result. Moving a semantics-preserving filter and projection earlier reduces the illustrative join work from ${matchesBefore.toLocaleString()} to ${matchesAfter.toLocaleString()} pairs.`;
}
[rowsControl,reuseControl].forEach((input)=>{input.addEventListener("input",render);input.addEventListener("change",render);});
if(new URLSearchParams(location.search).has("embed"))document.body.classList.add("embedded");render();
