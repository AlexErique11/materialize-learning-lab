const state = { view: false, indexes: { serving_a: false, serving_b: false }, materialized: false };
const $ = (selector) => document.querySelector(selector);
const clusterSelect = $("#indexCluster");

function objectCard(title, detail, variant = "") {
  return `<div class="object-card ${variant}"><strong>${title}</strong><small>${detail}</small></div>`;
}

function render() {
  const cluster = clusterSelect.value;
  $("#createIndex").disabled = !state.view || state.indexes[cluster];
  $("#dropIndex").disabled = !state.indexes[cluster];
  $("#dropMaterialized").disabled = !state.materialized;

  const catalog = [];
  const servingA = [];
  const servingB = [];
  const durable = [];
  if (state.view) catalog.push(objectCard("orders_view", "Saved SQL definition · no stored result"));
  for (const [clusterName, indexed] of Object.entries(state.indexes)) {
    if (!indexed) continue;
    catalog.push(objectCard("orders_view_idx", `Index definition · ${clusterName.replace("_", " ")}`));
    const target = clusterName === "serving_a" ? servingA : servingB;
    target.push(objectCard("orders_view rows", "Incrementally maintained in this cluster's memory", "memory"));
  }
  if (state.materialized) {
    catalog.push(objectCard("daily_revenue", "Materialized view definition"));
    durable.push(objectCard("daily_revenue result", "Persisted and maintained in durable storage", "durable"));
  }
  $("#catalogObjects").innerHTML = catalog.join("") || '<p class="state-message">No objects yet.</p>';
  $("#servingAObjects").innerHTML = servingA.join("") || '<p class="state-message">No local index.</p>';
  $("#servingBObjects").innerHTML = servingB.join("") || '<p class="state-message">No local index.</p>';
  $("#durableObjects").innerHTML = durable.join("") || '<p class="state-message">No materialized result.</p>';
}

$("#createView").addEventListener("click", () => {
  state.view = true;
  $("#stateMessage").textContent = "The view definition is saved in the catalog. Its results are computed when queried.";
  render();
});
$("#createIndex").addEventListener("click", () => {
  state.indexes[clusterSelect.value] = true;
  $("#stateMessage").textContent = `The view index keeps results in ${clusterSelect.options[clusterSelect.selectedIndex].text} memory.`;
  render();
});
$("#dropIndex").addEventListener("click", () => {
  state.indexes[clusterSelect.value] = false;
  $("#stateMessage").textContent = "The in-memory index is gone. The saved view definition remains in the catalog.";
  render();
});
$("#createMaterialized").addEventListener("click", () => {
  state.materialized = true;
  $("#stateMessage").textContent = "The materialized view definition is in the catalog and its result is in durable storage.";
  render();
});
$("#dropMaterialized").addEventListener("click", () => {
  state.materialized = false;
  $("#stateMessage").textContent = "The materialized view and its durable result were removed. Other objects remain.";
  render();
});
clusterSelect.addEventListener("change", render);

render();
if (new URLSearchParams(window.location.search).has("embed")) document.body.classList.add("embedded");
