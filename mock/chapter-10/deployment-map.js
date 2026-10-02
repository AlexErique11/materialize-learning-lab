const selectors={source:document.querySelector("#sourcePlace"),transform:document.querySelector("#transformPlace"),serve:document.querySelector("#servePlace"),explore:document.querySelector("#explorePlace"),replicas:document.querySelector("#replicas")};
function render(){
 const clusters={A:[],B:[],C:[]};
 const workloads=[ ["source","Orders ingestion"],["transform","Join + maintained results"],["serve","Application serving"],["explore","Exploratory query"] ];
 workloads.forEach(([key,label])=>clusters[selectors[key].value].push(label));
 const transformCluster=selectors.transform.value,serveCluster=selectors.serve.value,replicas=Number(selectors.replicas.value);
 document.querySelector("#replicaValue").textContent=replicas;
 document.querySelector("#clusters").innerHTML=Object.entries(clusters).map(([id,items])=>{
  const indexes=id===transformCluster?["orders(product_id) join index","result serving index"]:[];
  const copies=id===serveCluster?`<div class="replicas">${Array.from({length:replicas},(_,i)=>`<span class="replica">Replica ${i+1} · full copy</span>`).join("")}</div>`:"";
  return `<article class="cluster${id===serveCluster?" focus":""}"><h2>Cluster ${id}</h2><small>${items.length?"workloads placed here":"no workloads placed"}</small><div class="chips">${items.map((item)=>`<span class="chip">${item}</span>`).join("")||""}${indexes.map((item)=>`<span class="chip index">Index · ${item}</span>`).join("")}</div>${copies}</article>`;
 }).join("");
 const local=transformCluster===serveCluster;
 const box=document.querySelector("#status");box.className=`status ${local?"good":"warn"}`;
 box.textContent=local?`Serving and transformation share Cluster ${serveCluster}, so serving can use its local maintained index. ${replicas} replicas each hold a full copy of the cluster's work.`:`Serving is on Cluster ${serveCluster}, but the transformation index is on Cluster ${transformCluster}. It is not shared across clusters; serving needs its own local state/index if required.`;
}
Object.values(selectors).forEach((input)=>input.addEventListener("change",render));selectors.replicas.addEventListener("input",render);
if(new URLSearchParams(location.search).has("embed"))document.body.classList.add("embedded");render();
