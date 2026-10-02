const objectSelect = document.querySelector("#objectSelect");
const runQuery = document.querySelector("#runQuery");

function explainPath(card, object) {
  const cluster = card.dataset.cluster.replace("_", " ");
  const hasIndex = card.querySelector(`[data-index="${object}"]`).checked;
  if (object === "view") {
    return hasIndex
      ? `Read the incrementally maintained orders_view index from ${cluster} memory.`
      : `Recompute the saved orders_view query from its inputs in ${cluster}.`;
  }
  return hasIndex
    ? `Read daily_revenue from ${cluster}'s local in-memory index.`
    : `Read the precomputed daily_revenue result from durable storage in ${cluster}.`;
}

function renderPaths() {
  const object = objectSelect.value;
  document.querySelectorAll(".cluster-card").forEach((card) => {
    card.querySelector("[data-path]").textContent = explainPath(card, object);
  });
}

runQuery.addEventListener("click", renderPaths);
objectSelect.addEventListener("change", () => {
  document.querySelectorAll("[data-path]").forEach((path) => { path.textContent = "Run the query to see its path."; });
});
if (new URLSearchParams(window.location.search).has("embed")) document.body.classList.add("embedded");
