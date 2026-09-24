const products = {
  widget: { id: "7", name: "Widget", price: 20 },
  mug: { id: "8", name: "Mug", price: 12 },
};
const multiplicities = new Map();
const ledger = [];
const relationBody = document.querySelector("#relationBody");
const relationCount = document.querySelector("#relationCount");
const ledgerList = document.querySelector("#ledgerList");
const statusMessage = document.querySelector("#statusMessage");

function render() {
  const activeRows = [...multiplicities.entries()].filter(([, count]) => count > 0);
  const totalCopies = activeRows.reduce((sum, [, count]) => sum + count, 0);
  relationCount.textContent = `${totalCopies} row ${totalCopies === 1 ? "copy" : "copies"}`;
  relationBody.innerHTML = activeRows.length
    ? activeRows.map(([key, count]) => {
        const product = products[key];
        return `<tr><td>${product.id}</td><td>${product.name}</td><td>$${product.price}</td><td class="multiplicity">${count}</td></tr>`;
      }).join("")
    : '<tr class="empty-row"><td colspan="4">The relation is empty.</td></tr>';
  ledgerList.innerHTML = ledger.length
    ? [...ledger].reverse().map((entry) => `<div class="ledger-entry"><span class="ledger-time">t=${entry.time}</span><span class="diff-sign ${entry.diff > 0 ? "positive" : "negative"}">${entry.diff > 0 ? "+" : ""}${entry.diff}</span><span>(${entry.product.id}, ${entry.product.name}, $${entry.product.price})</span></div>`).join("")
    : '<p class="ledger-empty">Changes you apply will appear here.</p>';
}

document.querySelectorAll("[data-row][data-diff]").forEach((button) => {
  button.addEventListener("click", () => {
    const product = products[button.dataset.row];
    const diff = Number(button.dataset.diff);
    const next = (multiplicities.get(button.dataset.row) ?? 0) + diff;
    if (next < 0) {
      statusMessage.textContent = "That retraction would make the row multiplicity negative. No change was applied.";
      statusMessage.dataset.kind = "error";
      return;
    }
    const time = ledger.length + 1;
    multiplicities.set(button.dataset.row, next);
    ledger.push({ product, diff, time });
    statusMessage.textContent = `Applied diff ${diff > 0 ? "+" : ""}${diff} at logical time ${time}.`;
    delete statusMessage.dataset.kind;
    render();
  });
});

document.querySelector("#resetButton").addEventListener("click", () => {
  multiplicities.clear();
  ledger.length = 0;
  statusMessage.textContent = "Relation and ledger reset.";
  delete statusMessage.dataset.kind;
  render();
});

render();
