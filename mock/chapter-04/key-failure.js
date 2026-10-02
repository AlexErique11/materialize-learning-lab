const original = { id: "7", product: "Widget", price: 20 };
let keyField = "product name";
let rows = new Map([["Widget", { ...original }]]);
let renamedWithName = false;
let sourceError = false;
const $ = (selector) => document.querySelector(selector);

function render() {
  $("#keyRule").textContent = keyField;
  $("#sourceState").textContent = sourceError ? "Error · null key" : "Running";
  $("#sourceState").classList.toggle("error", sourceError);
  $("#sourceState").classList.toggle("ready", !sourceError);
  $("#deleteOld").disabled = !renamedWithName || sourceError || !rows.has("Widget");
  $("#renameName").disabled = sourceError;
  $("#renameId").disabled = sourceError;
  $("#nullKey").disabled = sourceError;
  $("#keyedRows").innerHTML = `<table><thead><tr><th>Source key</th><th>Product row</th></tr></thead><tbody>${[...rows.entries()].map(([key, row]) => `<tr><td>${key}</td><td>(${row.id}, ${row.product}, $${row.price})</td></tr>`).join("")}</tbody></table>`;
}

$("#renameName").addEventListener("click", () => {
  keyField = "product name · mutable";
  rows.set("Widget Pro", { id: "7", product: "Widget Pro", price: 20 });
  renamedWithName = true;
  $("#keyStatus").textContent = "The new name is a new key, so it inserts another row. The old key remains until it is tombstoned.";
  render();
});
$("#deleteOld").addEventListener("click", () => {
  rows.delete("Widget");
  $("#keyStatus").textContent = "A tombstone for the old key removes its stale row.";
  render();
});
$("#renameId").addEventListener("click", () => {
  keyField = "product_id · stable";
  rows = new Map([["7", { id: "7", product: "Widget Pro", price: 20 }]]);
  renamedWithName = false;
  $("#keyStatus").textContent = "The key stays 7, so the new value replaces the old product row instead of adding a second key.";
  render();
});
$("#nullKey").addEventListener("click", () => {
  sourceError = true;
  $("#keyStatus").textContent = "A null Kafka key puts an UPSERT source into an error state. The displayed relation is its last successfully ingested state.";
  render();
});
$("#reset").addEventListener("click", () => {
  keyField = "product name";
  rows = new Map([["Widget", { ...original }]]);
  renamedWithName = false;
  sourceError = false;
  $("#keyStatus").textContent = "One key identifies the product row.";
  render();
});

render();
if (new URLSearchParams(window.location.search).has("embed")) document.body.classList.add("embedded");
