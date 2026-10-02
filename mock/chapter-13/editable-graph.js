const nodes=["A","B","C","D","E","F"],positions={A:[70,130],B:[190,65],C:[190,195],D:[330,130],E:[470,130],F:[580,130]};
const initial=[["A","B"],["A","C"],["B","D"],["C","D"],["D","E"]];let edges=initial.map((edge)=>[...edge]);
function routeCount(source,target){let count=0;function walk(at,visited){if(at===target){count++;return;}for(const [from,to] of edges)if(from===at&&!visited.has(to)){const next=new Set(visited);next.add(to);walk(to,next);}}walk(source,new Set([source]));return count;}
function render(){
 const edgeGroup=document.querySelector("#edges");edgeGroup.innerHTML=edges.map(([from,to])=>{const [x1,y1]=positions[from],[x2,y2]=positions[to];const dx=x2-x1,dy=y2-y1,length=Math.hypot(dx,dy),ux=dx/length,uy=dy/length;return `<line x1="${x1+ux*19}" y1="${y1+uy*19}" x2="${x2-ux*22}" y2="${y2-uy*22}"/>`;}).join("");
 document.querySelector("#nodes").innerHTML=nodes.map((node)=>{const [x,y]=positions[node];return `<g><circle cx="${x}" cy="${y}" r="19"/><text x="${x}" y="${y}">${node}</text></g>`;}).join("");
 document.querySelector("#edgeList").innerHTML=edges.map(([a,b])=>`<span class="edge-pill">${a} → ${b}<button type="button" data-remove="${a},${b}" aria-label="Remove ${a} to ${b}">×</button></span>`).join("");
 document.querySelectorAll("[data-remove]").forEach((button)=>button.addEventListener("click",()=>{const [a,b]=button.dataset.remove.split(",");edges=edges.filter(([from,to])=>from!==a||to!==b);render();}));
 const possible=[];for(const a of nodes)for(const b of nodes)if(a!==b&&!edges.some(([from,to])=>from===a&&to===b))possible.push([a,b]);
 const select=document.querySelector("#edgeChoice"),previous=select.value;select.innerHTML=possible.map(([a,b])=>`<option value="${a},${b}">${a} → ${b}</option>`).join("");if(possible.some(([a,b])=>`${a},${b}`===previous))select.value=previous;
 const pairs=[];for(const a of nodes)for(const b of nodes)if(routeCount(a,b)>0)pairs.push({a,b,routes:routeCount(a,b)});
 document.querySelector("#pairs").innerHTML=pairs.length?pairs.map(({a,b,routes})=>`<span class="pair${routes>1?" multiple":""}">${a} → ${b}${routes>1?` · ${routes} routes`:""}</span>`).join(""):`<span class="note">No reachable pairs yet.</span>`;
 document.querySelector("#status").textContent=`${edges.length} edges · ${pairs.length} reachable pairs. Try removing B → D: A can still reach D through C.`;
 document.querySelector("#addEdge").disabled=possible.length===0;
}
document.querySelector("#addEdge").addEventListener("click",()=>{if(!document.querySelector("#edgeChoice").value)return;edges.push(document.querySelector("#edgeChoice").value.split(","));render();});
document.querySelector("#reset").addEventListener("click",()=>{edges=initial.map((edge)=>[...edge]);render();});
if(new URLSearchParams(location.search).has("embed"))document.body.classList.add("embedded");render();
