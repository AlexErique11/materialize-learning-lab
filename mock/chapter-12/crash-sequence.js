const crash=document.querySelector("#crash"),order=document.querySelector("#order"),idempotent=document.querySelector("#idempotent");
function render(){
 const point=crash.value,offsetFirst=order.value==="offset-first",dedupe=idempotent.checked;
 const actions=offsetFirst?["Offset checkpoint","External side effect"]:["External side effect","Offset checkpoint"];
 let deliveries=1,attempts=1,result="One effect",message="The message is delivered once, the external action completes, and the offset is stored.";
 let state={"Materialize sink":"committed","Kafka topic":"delivered","Consumer":"read"};
 let crashAt=null;
 if(point==="before"){
  state.Consumer="crash";state[actions[0]]="pending";state[actions[1]]="pending";
  deliveries=1;attempts=1;result="One effect";message="The first delivery is not processed. Since no offset was committed, it is replayed and applied once.";
 } else if(point==="effect"){
  state["External side effect"]="done";
  if(offsetFirst){state["Offset checkpoint"]="done";deliveries=1;attempts=1;result="One effect";message="The offset was already committed before the side effect. A crash after the effect does not replay this message; the duplicate-risk window was earlier, between commit and effect.";}
  else {state["Offset checkpoint"]="crash";deliveries=2;attempts=2;result=dedupe?"One logical effect":"Duplicate effect";message=dedupe?"The offset is uncommitted, so the message is replayed; the event-ID guard makes the second side-effect attempt a no-op.":"The side effect happened but its offset did not commit. The message is replayed, so a non-idempotent consumer applies the effect twice.";}
 } else if(point==="offset"){
  state["Offset checkpoint"]="done";
  if(offsetFirst){state["External side effect"]="crash";deliveries=1;attempts=0;result="Lost effect";message="The offset is committed before the external action. After the crash Kafka skips this message, so the side effect is lost.";}
  else {state["External side effect"]="done";deliveries=1;attempts=1;result="One effect";message="With effect-first ordering, the external action has already completed when the offset is committed. The selected point is after both operations.";}
 } else {
  state["External side effect"]="done";state["Offset checkpoint"]="done";
  deliveries=1;attempts=1;result="One effect";message="Both the external action and offset checkpoint completed before the crash; restart does not repeat the work.";
 }
 const labels=["Materialize sink","Kafka topic","Consumer",...actions];
 document.querySelector("#sequence").innerHTML=labels.map((label,i)=>{const value=state[label]||"pending";return `<article class="stage ${value==="crash"?"crash":value==="done"||value==="committed"||value==="delivered"?"done":value==="pending"?"risk":""}"><small>Step ${i+1}</small><strong>${label}</strong><i>${value==="crash"?"CRASH HERE":value}</i></article>`;}).join("");
 document.querySelector("#deliveries").textContent=deliveries;document.querySelector("#attempts").textContent=attempts;document.querySelector("#result").textContent=result;
 const box=document.querySelector("#status");box.className=`status ${result.includes("Lost")||result.includes("Duplicate")?"bad":result.includes("logical")?"good":""}`;box.textContent=message;
}
[crash,order,idempotent].forEach((el)=>el.addEventListener("change",render));
if(new URLSearchParams(location.search).has("embed"))document.body.classList.add("embedded");render();
