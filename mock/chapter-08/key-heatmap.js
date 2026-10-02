const rowsInput = document.querySelector("#rows"), skewInput = document.querySelector("#skew"), workersInput = document.querySelector("#workers");

function render() {
  const rows = Number(rowsInput.value), skew = Number(skewInput.value), workers = Number(workersInput.value);
  const hot = Math.round(rows * skew / 100), remaining = rows - hot;
  const keyCounts = Array.from({length:9},(_,i)=>i===0?hot:Math.floor(remaining/8)+(i<=remaining%8?1:0));
  const matrix = Array.from({length:9},()=>Array(workers).fill(0));
  keyCounts.forEach((count,key)=>{const worker=key===0?0:((key-1)%workers);matrix[key][worker]=count;});
  const max = Math.max(1,...matrix.flat());
  const headings = Array.from({length:workers},(_,i)=>`<th>Worker ${i+1}</th>`).join("");
  const body = matrix.map((cells,key)=>`<tr><th>${key===0?"Hot key":"Key "+key}</th>${cells.map((count,worker)=>{const intensity=count/max;const color=key===0&&count?`rgba(187,139,50,${.14+intensity*.76})`:`rgba(91,82,177,${.08+intensity*.68})`;return `<td class="heat" style="background:${color}" title="${count} rows">${count||"·"}</td>`;}).join("")}</tr>`).join("");
  document.querySelector("#heatmap").innerHTML=`<table><thead><tr><th>Join key</th>${headings}</tr></thead><tbody>${body}</tbody></table>`;
  const totals=Array(workers).fill(0);matrix.forEach((cells)=>cells.forEach((count,i)=>totals[i]+=count));
  document.querySelector("#loads").innerHTML=totals.map((total,i)=>`<div class="worker-row"><span>Worker ${i+1}</span><span class="bar"><i class="${i===0&&hot>0?"hot":""}" style="width:${total/Math.max(1,...totals)*100}%"></i></span><strong>${total} rows</strong></div>`).join("");
  rowsInput.parentElement.querySelector("output").textContent=rows;skewInput.parentElement.querySelector("output").textContent=skew;workersInput.parentElement.querySelector("output").textContent=workers;
  document.querySelector("#note").textContent=`${rows} total rows. The hot key has ${hot}; its matches are concentrated on one worker. Average load is ${Math.round(rows/workers)} rows per worker, which can hide that bottleneck.`;
}

[rowsInput,skewInput,workersInput].forEach((input)=>input.addEventListener("input",render));
if (new URLSearchParams(location.search).has("embed")) document.body.classList.add("embedded");
render();
