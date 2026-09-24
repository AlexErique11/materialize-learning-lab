const fixtures={chain:[["A","B"],["B","C"],["C","D"]],diamond:[["A","B"],["A","C"],["B","D"],["C","D"]],cycle:[["A","B"],["B","C"],["C","A"]]};
const fixture=document.querySelector("#fixture"),union=document.querySelector("#union"),limit=document.querySelector("#limit"),limitMode=document.querySelector("#limitMode");
function compute(edges,mode,max){
 const seen=new Set(edges.map(([a,b])=>`${a}>${b}`));let frontier=new Map([...seen].map((pair)=>[pair,1]));const rounds=[new Map(frontier)];let converged=false;
 for(let i=0;i<max;i++){
  const next=new Map();for(const [pair,multiplicity] of frontier){const [src,mid]=pair.split(">");for(const [from,to] of edges)if(from===mid){const value=`${src}>${to}`;if(mode==="union"){if(!seen.has(value)){seen.add(value);next.set(value,1);}}else next.set(value,(next.get(value)||0)+multiplicity);}}
  rounds.push(next);if(next.size===0){converged=true;break;}frontier=next;
 }
 const totals=new Map();if(mode==="union"){seen.forEach((pair)=>totals.set(pair,1));}else rounds.forEach((round)=>round.forEach((count,pair)=>totals.set(pair,(totals.get(pair)||0)+count)));
 return {rounds,totals,converged};
}
function render(){
 const edges=fixtures[fixture.value],mode=union.value,max=Number(limit.value),result=compute(edges,mode,max);document.querySelector("#limitValue").textContent=max;
 const names=[...new Set(edges.flat())];document.querySelector("#fixtureGraph").innerHTML=edges.map(([a,b])=>`<span class="pair">${a} → ${b}</span>`).join("");
 document.querySelector("#rounds").innerHTML=result.rounds.map((round,i)=>{const entries=[...round.entries()];return `<article class="round"><h2>Iteration ${i}${i===0?" · seed":" · newly produced"} · ${entries.reduce((n,[,count])=>n+count,0)} row${entries.reduce((n,[,count])=>n+count,0)===1?"":"s"}</h2>${entries.length?`<div class="pairs">${entries.map(([pair,count])=>`<span>${pair.replace(">"," → ")}${count>1?` ×${count}`:""}</span>`).join("")}</div>`:`<p>No new rows.</p>`}</article>`;}).join("");
 const box=document.querySelector("#status");box.className=`status ${result.converged?"good":limitMode.value==="error"?"bad":"warn"}`;
 const pairCount=result.totals.size,walkCount=[...result.totals.values()].reduce((a,b)=>a+b,0);
 box.textContent=result.converged?`Fixed point reached: no new rows after ${result.rounds.length-1} recursive iterations. Final distinct reachability pairs: ${pairCount}.`:limitMode.value==="error"?`Recursion limit ${max} reached while rows were still appearing. ERROR AT returns no partial answer; investigate duplicate growth or convergence.`:`RETURN AT limit ${max}: showing a partial result with ${pairCount} distinct pairs and ${walkCount} total walk rows. This is not a complete fixed point.`;
}
[fixture,union,limit,limitMode].forEach((input)=>input.addEventListener("change",render));limit.addEventListener("input",render);if(new URLSearchParams(location.search).has("embed"))document.body.classList.add("embedded");render();
