const stepInput=document.querySelector("#step"),snapshotInput=document.querySelector("#snapshot");
const batches=[
 [],
 [{kind:"data",t:10,d:1,key:"1",value:"Alice"},{kind:"data",t:10,d:2,key:"2",value:"Bob"},{kind:"progress",t:11}],
 [{kind:"data",t:11,d:1,key:"3",value:"Carol"},{kind:"progress",t:12}],
 [{kind:"data",t:12,d:-2,key:"2",value:"Bob"}],
 [{kind:"data",t:12,d:2,key:"2",value:"Bobby"}],
 [{kind:"progress",t:13}],
];
function showRows(host,rows){host.innerHTML=rows.length?rows.map((r)=>`<span class="row">${r.key} · ${r.value}${r.count===1?"":` ×${r.count}`}</span>`).join(""):`<span class="empty">empty</span>`;}
function render(){
 const step=Number(stepInput.value),snapshot=snapshotInput.checked,client=new Map(),pending=[],feed=[];
 const apply=(change)=>{const current=client.get(change.key)||{key:change.key,value:change.value,count:0};current.count+=change.d;if(current.count<=0)client.delete(change.key);else{current.value=change.value;client.set(change.key,current);}};
 for(let s=1;s<=step;s++){
  for(const message of batches[s]){
   if(message.kind==="progress"){
    feed.push({text:`PROGRESS ${message.t}`,progress:true});
    for(let i=pending.length-1;i>=0;i--)if(pending[i].t<message.t){apply(pending[i]);pending.splice(i,1);}
   } else if(s!==1||snapshot){pending.push(message);feed.push({text:`${message.t} · ${message.d>0?"+":""}${message.d} ${message.key}:${message.value}`,pending:true});}
  }
 }
 const server=new Map([["1",{key:"1",value:"Alice",count:1}],["2",{key:"2",value:"Bob",count:2}]]);
 if(step>=2)server.set("3",{key:"3",value:"Carol",count:1});if(step>=3)server.set("2",{key:"2",value:"Bobby",count:2});
 showRows(document.querySelector("#server"),Array.from(server.values()));
 document.querySelector("#feed").innerHTML=feed.length?feed.map((m)=>`<span class="message-row${m.progress?" progress":m.pending?" pending":""}">${m.text}</span>`).join(""):`<span class="empty">waiting for subscription</span>`;
 document.querySelector("#buffer").innerHTML=pending.length?pending.map((m)=>`<span class="message-row pending">${m.t} · ${m.d>0?"+":""}${m.d} ${m.key}:${m.value}</span>`).join(""):`<span class="empty">no incomplete timestamp</span>`;
 showRows(document.querySelector("#client"),Array.from(client.values()));document.querySelector("#stepValue").textContent=step;
 const progress=step>=5?13:step>=2?12:step>=1?11:10;
 document.querySelector("#status").textContent=!snapshot&&step>=1?"SNAPSHOT = false: the client starts empty; only later changes arrive, so untouched rows remain absent.":pending.some((m)=>m.t===12)?"Timestamp 12 is split across deliveries. The client keeps the partial group buffered until a later progress message completes it.":`Client applied complete changes strictly before ${progress}; compare the server relation above with the reconstructed client.`;
}
stepInput.addEventListener("input",render);snapshotInput.addEventListener("change",render);if(new URLSearchParams(location.search).has("embed"))document.body.classList.add("embedded");render();
