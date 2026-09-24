const change=document.querySelector("#change"),envelope=document.querySelector("#envelope"),key=document.querySelector("#key"),snapshot=document.querySelector("#snapshot");
function table(headers,rows){return `<table><thead><tr>${headers.map((x)=>`<th>${x}</th>`).join("")}</tr></thead><tbody>${rows.map((r)=>`<tr>${r.map((x)=>`<td>${x}</td>`).join("")}</tr>`).join("")}</tbody></table>`;}
function render(){
 const op=change.value,env=envelope.value,k=key.value;const initial=[["p-17","East",12],["p-17","West",8],["p-22","East",5]];let relation=initial.map((row)=>[...row]),message,time=101;
 if(op==="insert"){relation.push(["p-30","North",4]);message=env==="upsert"?{key:["p-30","North"],value:{product_id:"p-30",warehouse_id:"North",quantity:4}}:{before:null,after:{product_id:"p-30",warehouse_id:"North",quantity:4}};}
 if(op==="update"){relation[0][2]=7;time=102;message=env==="upsert"?{key:["p-17","East"],value:{product_id:"p-17",warehouse_id:"East",quantity:7}}:{before:{product_id:"p-17",warehouse_id:"East",quantity:12},after:{product_id:"p-17",warehouse_id:"East",quantity:7}};}
 if(op==="delete"){relation.shift();time=103;message=env==="upsert"?{key:["p-17","East"],value:null}:{before:{product_id:"p-17",warehouse_id:"East",quantity:12},after:null};}
 document.querySelector("#relation").innerHTML=table(["product_id","warehouse_id","quantity"],relation);
 const msgKey=op==="insert"?["p-30","North"]:["p-17","East"];
 const msg=env==="upsert"?{key:k==="product"?[msgKey[0]]:msgKey,value:message.value}:message;
 const snapshotRows=snapshot.checked?initial.map((row)=>env==="upsert"?{key:k==="product"?[row[0]]:[row[0],row[1]],value:{product_id:row[0],warehouse_id:row[1],quantity:row[2]}}:{before:null,after:{product_id:row[0],warehouse_id:row[1],quantity:row[2]}}):[];
 const display={topic:"stock-changes",snapshot:snapshotRows,change:{mz_timestamp:time,...msg}};
 document.querySelector("#message").textContent=JSON.stringify(display,null,2);
 const collision=env==="upsert"&&k==="product";
 const status=document.querySelector("#status");status.className=`status ${collision?"bad":snapshot.checked?"good":"warn"}`;
 status.textContent=collision?"Key conflict: product p-17 appears in East and West. product_id alone is not unique; consumers or Kafka compaction could overwrite distinct warehouse rows. Use both product_id and warehouse_id.":snapshot.checked?"The sink first emits a snapshot of the current relation, then sends this change. That lets an empty downstream table initialize.":"Snapshot is disabled: only subsequent changes are exported, so an empty downstream table will not receive untouched existing rows.";
}
[change,envelope,key].forEach((el)=>el.addEventListener("change",render));snapshot.addEventListener("change",render);if(new URLSearchParams(location.search).has("embed"))document.body.classList.add("embedded");render();
