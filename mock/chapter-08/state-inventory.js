const $ = (id) => document.getElementById(id);
const token = (text, type = "") => `<span class="token ${type}">${text}</span>`;
const bucket = (title, description, tokens) => `<article class="bucket"><h2>${title}</h2><p>${description}</p><div class="tokens">${tokens}</div></article>`;
const operation = $("operation");

function render() {
  const mode = operation.value;
  $("sizeControl").hidden = mode !== "topk";
  $("groupsControl").hidden = mode !== "distinct";
  $("ordersControl").hidden = mode !== "join";
  $("promosControl").hidden = mode !== "join";
  let blocks, caption;
  if (mode === "topk") {
    const n = Number($("size").value); $("sizeValue").textContent = n;
    const rows = Array.from({ length:n },(_,i)=>token(`o${i+1}`,"input")).join("");
    blocks = bucket("Input orders",`${n} candidate rows`,rows)
      + bucket("Retained ranking state",`${n} candidates kept so replacements can be found`,Array.from({length:n},(_,i)=>token(`$${n-i}`)).join(""))
      + bucket("Top-3 output","Only the current winners",[1,2,3].map((n)=>token(`$${n}`,"hot")).join(""));
    caption = "If the current winner is deleted, the next candidate must be available to promote. Keeping only the three visible winners would not be enough.";
  } else if (mode === "distinct") {
    const keys = Number($("groups").value); $("groupsValue").textContent = keys;
    const names = ["North","South","East","West","Central","Coast","Metro","Rural"];
    const source = Array.from({length:Math.max(8,keys*2)},(_,i)=>token(`c${i+1}`,"input")).join("");
    const state = names.slice(0,keys).map((name,i)=>token(`${name} × ${Math.max(1,(i%3)+1)}`)).join("");
    const output = names.slice(0,keys).map((name)=>token(name,"hot")).join("");
    blocks = bucket("Input customers","Several rows can support one region",source)
      + bucket("Support counts",`${keys} region keys and their remaining row counts`,state)
      + bucket("Distinct output",`${keys} visible regions`,output);
    caption = "A region is retracted only when its final supporting customer disappears; the count is retained state behind each distinct output row.";
  } else {
    const orders = Number($("orders").value), promos = Number($("promos").value);
    $("ordersValue").textContent = orders; $("promosValue").textContent = promos;
    const matches = orders * promos;
    blocks = bucket("Input orders",`${orders} rows on one product key`,Array.from({length:orders},(_,i)=>token(`o${i+1}`,"input")).join(""))
      + bucket("Join matches",`${orders} × ${promos} = ${matches} matching pairs`,Array.from({length:Math.min(matches,32)},(_,i)=>token(`o${Math.floor(i/promos)+1}·p${i%promos+1}`)).join("")+(matches>32?token("…"):""))
      + bucket("Aggregate output","One total after the join",token(`sum(${matches} matches)`,"hot"));
    caption = `The final relation has one row, while changing an order or promotion can affect up to ${promos} or ${orders} matching pairs. The exact physical state depends on the chosen plan.`;
  }
  $("inventory").innerHTML = blocks; $("caption").textContent = caption;
}

[operation,$("size"),$("groups"),$("orders"),$("promos")].forEach((control)=>{control.addEventListener("input",render);control.addEventListener("change",render);});
if (new URLSearchParams(location.search).has("embed")) document.body.classList.add("embedded");
render();
