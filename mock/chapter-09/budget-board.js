const indexes=[
 {id:"customer",name:"orders(customer_id)",cost:7,helps:["customer"],why:"Customer point lookups"},
 {id:"product",name:"orders(product_id)",cost:6,helps:["product"],why:"Product joins"},
 {id:"email",name:"customers(lower(email))",cost:5,helps:["email"],why:"Case-insensitive email lookup"},
 {id:"payment",name:"payments(order_id)",cost:8,helps:["payment"],why:"Orders ↔ payments join"},
 {id:"region",name:"orders(region)",cost:5,helps:["region"],why:"Region dashboard filter"},
];
const patterns=[{id:"customer",name:"Find one customer’s orders",detail:"customer_id = ?"},{id:"product",name:"Join by product",detail:"orders.product_id = products.id"},{id:"email",name:"Find by normalized email",detail:"lower(email) = ?"},{id:"payment",name:"Join payments to orders",detail:"payments.order_id = orders.id"},{id:"region",name:"Filter dashboard by region",detail:"region = ?"}];
const selected=new Set(["customer","product"]);
function render(){
 const budget=Number(document.querySelector("#budget").value),cost=indexes.filter((x)=>selected.has(x.id)).reduce((n,x)=>n+x.cost,0);
 document.querySelector("#budgetValue").textContent=budget;
 document.querySelector("#choices").innerHTML=indexes.map((x)=>`<label class="choice"><input type="checkbox" data-index="${x.id}" ${selected.has(x.id)?"checked":""}/><span><strong>${x.name} · ${x.cost} units</strong><small>${x.why}</small></span></label>`).join("");
 document.querySelectorAll("[data-index]").forEach((input)=>input.addEventListener("change",()=>{input.checked?selected.add(input.dataset.index):selected.delete(input.dataset.index);render();}));
 document.querySelector("#cost").textContent=`${cost} units ${cost>budget?"· over budget":""}`;
 document.querySelector("#remaining").textContent=`${budget-cost} units`;
 const helped=patterns.filter((p)=>selected.has(p.id));document.querySelector("#covered").textContent=`${helped.length} / ${patterns.length}`;
 document.querySelector("#patterns").innerHTML=patterns.map((p)=>{const covered=selected.has(p.id);return `<div class="pattern${covered?" covered":""}"><strong>${covered?"✓ Helps":"○ Not covered"} · ${p.name}</strong><small>${p.detail}</small></div>`;}).join("");
 const costReadout=document.querySelector("#cost");costReadout.parentElement.className=`readout ${cost>budget?"bad":""}`;
}
document.querySelector("#budget").addEventListener("input",render);
if(new URLSearchParams(location.search).has("embed"))document.body.classList.add("embedded");render();
