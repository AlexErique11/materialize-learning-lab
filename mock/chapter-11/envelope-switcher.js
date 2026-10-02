const change=document.querySelector("#change"),envelope=document.querySelector("#envelope");
function table(headers,rows){return `<table><thead><tr>${headers.map((x)=>`<th>${x}</th>`).join("")}</tr></thead><tbody>${rows.map((row)=>`<tr>${row.map((x)=>`<td>${x}</td>`).join("")}</tr>`).join("")}</tbody></table>`;}
function render(){
 const op=change.value,kind=envelope.value;let relation=[[1,"open"]],rawRows=[],beforeLabel="";let time=11;
 if(op==="insert"){relation=[[1,"open"],[2,"open"]];rawRows=kind==="diff"?[[11,false,1,2,"open"]]:kind==="upsert"?[[11,false,"upsert",2,"open"]]:[[11,false,"insert",2,"NULL","open"]];}
 if(op==="update"){relation=[[1,"paid"],[2,"open"]];time=12;rawRows=kind==="diff"?[[12,false,-1,1,"open"],[12,false,1,1,"paid"]]:kind==="upsert"?[[12,false,"upsert",1,"paid"]]:[[12,false,"upsert",1,"open","paid"]];}
 if(op==="delete"){relation=[[1,"open"]];time=13;rawRows=kind==="diff"?[[13,false,-1,2,"open"]]:kind==="upsert"?[[13,false,"delete",2,"NULL"]]:[[13,false,"delete",2,"open","NULL"]];}
 document.querySelector("#relation").innerHTML=table(["id","status"],relation);
 const heads=kind==="diff"?["mz_timestamp","mz_progressed","mz_diff","id","status"]:kind==="upsert"?["mz_timestamp","mz_progressed","mz_state","id","status"]:["mz_timestamp","mz_progressed","mz_state","id","before_status","after_status"];
 document.querySelector("#message").innerHTML=table(heads,rawRows);
 document.querySelector("#envelopeLabel").textContent=kind==="diff"?"Differential rows show retractions and insertions.":kind==="upsert"?"One key-level state per change; deletes carry a NULL value.":"One keyed event carries the previous and resulting values.";
 const status=document.querySelector("#status");status.className=`status ${kind==="before"?"warn":""}`;
 status.textContent=kind==="diff"&&op==="update"?`At timestamp ${time}, the old row is retracted and the new row inserted; apply both as one timestamp group.`:kind==="upsert"&&op==="update"?`At timestamp ${time}, the keyed value is upserted to the new state; the key must identify at most one live row.`:kind==="before"?"Debezium-style before/after output includes old and new values, but this SUBSCRIBE envelope is a private-preview feature in the current docs.":"The envelope changes only how this relation update is represented, not the relation itself.";
}
[change,envelope].forEach((input)=>input.addEventListener("change",render));if(new URLSearchParams(location.search).has("embed"))document.body.classList.add("embedded");render();
