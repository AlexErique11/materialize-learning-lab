const orders = [
  { id: "101", product: "A", amount: 40 },
  { id: "102", product: "B", amount: 80 },
  { id: "103", product: "A", amount: 60 },
  { id: "104", product: "A", amount: 65, changed: true },
  { id: "105", product: "B", amount: 35 },
  { id: "106", product: "C", amount: 70 },
];
const products = [
  { id: "A", category: "Books" },
  { id: "B", category: "Games" },
  { id: "C", category: "Tools" },
];
let method = "full";
const orderRows = document.querySelector("#orderRows");
const productRows = document.querySelector("#productRows");
const groupState = document.querySelector("#groupState");

function render() {
  const incremental = method === "incremental";
  document.querySelectorAll("[data-method]").forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.method === method)));
  document.querySelector("#methodTitle").textContent = incremental ? "Incremental maintenance" : "Full recomputation";
  document.querySelector("#workCount").textContent = incremental
    ? "Illustrative work: check the changed order, its product match, and retained Books group state."
    : "Illustrative work: inspect all 6 orders and all 3 products.";
  orderRows.innerHTML = orders.map((order) => {
    const examined = !incremental || order.changed;
    const amount = order.changed ? `<strong>$${order.amount}</strong> <small>(was $45)</small>` : `$${order.amount}`;
    return `<tr class="${examined ? "examined" : ""} ${order.changed ? "changed-row" : ""}"><td>${order.id}${order.changed ? " · edited" : ""}</td><td>${order.product}</td><td>${amount}</td></tr>`;
  }).join("");
  productRows.innerHTML = products.map((product) => `<div class="product-chip ${!incremental || product.id === "A" ? "examined" : ""}">Product ${product.id} · ${product.category}</div>`).join("");
  groupState.classList.toggle("examined", incremental);
}

document.querySelectorAll("[data-method]").forEach((button) => button.addEventListener("click", () => {
  method = button.dataset.method;
  render();
}));

render();
if (new URLSearchParams(window.location.search).has("embed")) document.body.classList.add("embedded");
