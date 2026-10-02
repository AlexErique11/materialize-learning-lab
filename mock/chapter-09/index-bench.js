const indexKey=document.querySelector("#indexKey"),predicate=document.querySelector("#predicate"),timing=document.querySelector("#timing");
const suitable={full:["composite"],partial:["customer"],range:[],expression:["email"],product:["product"]};
const labels={none:"No index",customer:"customer_id",composite:"(customer_id, order_date)",email:"lower(email)",rawemail:"email",product:"product_id"};
function render(){
 const key=indexKey.value,pred=predicate.value,exact=suitable[pred].includes(key),available=timing.value==="before";
 const point=exact;
 document.querySelector("#access").textContent=key==="none"?"Scan input":point?"Point lookup":"Full index scan";
 document.querySelector("#match").textContent=key==="none"?"No supporting index":exact?`${labels[key]} matches the predicate`:`${labels[key]} does not exactly fit`;
 document.querySelector("#reuse").textContent=key==="none"?"No index to reuse":exact&&available?"Suitable index reused":"Existing plan does not use it";
 const detail=key==="none"?"Without a matching index, the query reads through its input using the available plan.":!exact?"This key does not provide a point lookup for the selected predicate. Try an exact key expression with equality on all indexed fields.":!available?"The index is suitable, but it arrived after this maintained plan was created. Recreate/replan the consumer to evaluate it against the new index.":"The exact key is available at plan creation, so this consumer can reuse the existing arrangement instead of duplicating that indexed state.";
 const box=document.querySelector("#details");box.textContent=detail;box.className=`message ${exact&&available?"good":exact?"warn":""}`;
}
[indexKey,predicate,timing].forEach((input)=>{input.addEventListener("input",render);input.addEventListener("change",render);});
if(new URLSearchParams(location.search).has("embed"))document.body.classList.add("embedded");render();
