const controls = ["rowsA","widthA","rowsB","widthB"].map((id)=>document.getElementById(id));
function render() {
  const [rowsA,widthA,rowsB,widthB]=controls.map((input)=>Number(input.value));
  const stateA=rowsA*widthA,stateB=rowsB*widthB,max=Math.max(stateA,stateB,1);
  document.querySelector("#rowsAValue").textContent=rowsA;document.querySelector("#widthAValue").textContent=widthA;
  document.querySelector("#rowsBValue").textContent=rowsB;document.querySelector("#widthBValue").textContent=widthB;
  document.querySelector("#stateScales").innerHTML=`<div class="scale-row"><strong>Fixture A</strong><span class="scale-track"><i style="width:${stateA/max*100}%"></i></span><small>${stateA.toLocaleString()} units</small></div><div class="scale-row"><strong>Fixture B</strong><span class="scale-track"><i style="width:${stateB/max*100}%"></i></span><small>${stateB.toLocaleString()} units</small></div>`;
  const rowMax=Math.max(rowsA,rowsB,10);
  document.querySelector("#rowScales").innerHTML=`<div class="scale-row"><strong>Fixture A retained</strong><span class="scale-track"><i style="width:${rowsA/rowMax*100}%"></i></span><small>${rowsA.toLocaleString()} rows</small></div><div class="scale-row"><strong>Fixture B retained</strong><span class="scale-track"><i style="width:${rowsB/rowMax*100}%"></i></span><small>${rowsB.toLocaleString()} rows</small></div><div class="scale-row"><strong>Query output</strong><span class="scale-track"><i style="width:${Math.max(1.5,10/rowMax*100)}%;background:#5c9d78"></i></span><small>10 rows</small></div>`;
}
controls.forEach((input)=>input.addEventListener("input",render));
if(new URLSearchParams(location.search).has("embed"))document.body.classList.add("embedded");
render();
