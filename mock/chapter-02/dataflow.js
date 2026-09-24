const products = { A: "Books", B: "Games" };
const originalOrders = [
  { id: "101", product: "A", amount: 40, note: "rush" },
  { id: "102", product: "B", amount: 80, note: "gift" },
  { id: "103", product: "A", amount: 60, note: "standard" },
];
let orders = originalOrders.map((order) => ({ ...order }));
let trace = "initial";
const $ = (selector) => document.querySelector(selector);
const nodes = ["sourceNode", "filterNode", "joinNode", "aggregateNode", "outputNode"].map((id) => document.getElementById(id));

function render() {
  const passing = orders.filter((order) => order.amount >= 50);
  const totals = new Map();
  for (const order of passing) {
    const category = products[order.product];
    totals.set(category, (totals.get(category) ?? 0) + order.amount);
  }
  $("#sourceValue").textContent = `Order 101 · $${orders[0].amount}`;
  $("#sourceDetail").textContent = `note: ${orders[0].note}`;
  $("#filterValue").textContent = `${passing.length} orders pass`;
  $("#joinValue").textContent = `${passing.length} rows joined`;
  $("#aggregateValue").textContent = [...totals.entries()].map(([category, amount]) => `${category} $${amount}`).join(" · ");
  $("#answerBody").innerHTML = [...totals.entries()].map(([category, amount]) => `<tr><td>${category}</td><td>$${amount}</td></tr>`).join("");
  nodes.forEach((node, index) => node.classList.toggle("changed", trace === "amount" ? index < 5 : trace === "note" && index === 0));
  if (trace === "amount") $("#traceNote").textContent = "Order 101 crosses the filter. Its product match sends the change into the Books aggregate, so Books revenue updates from $60 to $130.";
  else if (trace === "note") $("#traceNote").textContent = "Only an unused note changed on order 102. The query does not read that column, so no change reaches the filter, join result, aggregate, or output.";
  else $("#traceNote").textContent = "Choose a source change to see which operators are affected.";
}

$("#thresholdButton").addEventListener("click", () => {
  orders = originalOrders.map((order) => ({ ...order }));
  orders[0].amount = 70;
  trace = "amount";
  render();
});
$("#unusedButton").addEventListener("click", () => {
  orders = originalOrders.map((order) => ({ ...order }));
  orders[1].note = "wrapped";
  trace = "note";
  render();
});
$("#resetButton").addEventListener("click", () => {
  orders = originalOrders.map((order) => ({ ...order }));
  trace = "initial";
  render();
});

render();
if (new URLSearchParams(window.location.search).has("embed")) document.body.classList.add("embedded");
