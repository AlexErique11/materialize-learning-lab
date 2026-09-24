const $ = (selector) => document.querySelector(selector);
let envelope = "append";
let step = 0;
const oldRow = { id: "7", product: "Widget", price: 20 };
const newRow = { id: "7", product: "Widget", price: 25 };

function serializedMessage(kind, currentStep) {
  if (kind === "append") {
    if (currentStep === 1) return '{"id":7,"product":"Widget","price":20}';
    if (currentStep === 2) return '{"id":7,"product":"Widget","price":25}';
    return "No append-only delete message: this envelope has no delete semantics.";
  }
  if (kind === "upsert") {
    if (currentStep === 1) return 'key: 7\nvalue: {"product":"Widget","price":20}';
    if (currentStep === 2) return 'key: 7\nvalue: {"product":"Widget","price":25}';
    return 'key: 7\nvalue: null  ← tombstone';
  }
  if (currentStep === 1) return '{"before":null,"after":{"id":7,"product":"Widget","price":20}}';
  if (currentStep === 2) return '{"before":{"id":7,"product":"Widget","price":20},\n "after":{"id":7,"product":"Widget","price":25}}';
  return '{"before":{"id":7,"product":"Widget","price":25},\n "after":null}';
}

function relationAtStep() {
  if (envelope === "append") return [ ...(step >= 1 ? [oldRow] : []), ...(step >= 2 ? [newRow] : []) ];
  if (step === 0 || step === 3) return [];
  return [step === 1 ? oldRow : newRow];
}

function explanation() {
  if (step === 0) return envelope === "append" ? "Append-only treats each received record as an insert." : envelope === "upsert" ? "Upsert replaces values by key; a keyed null value removes that key." : "Debezium uses before and after fields to describe inserts, updates, and deletes.";
  if (envelope === "append") {
    if (step === 1) return "The first record inserts one row.";
    if (step === 2) return "The second record is another insert. Append-only does not infer an update, so both values remain.";
    return "This intent cannot be represented as a delete with append-only; the two inserted rows remain.";
  }
  if (envelope === "upsert") return step === 1 ? "Key 7 has no current value, so the row is inserted." : step === 2 ? "The non-null value for key 7 replaces its previous value." : "The null value for key 7 is a tombstone, so that row is deleted.";
  return step === 1 ? "A null before and non-null after represents an insert." : step === 2 ? "Before and after show the old and new row for this update." : "A non-null before and null after represents a deletion.";
}

function render() {
  document.querySelectorAll("[data-envelope]").forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.envelope === envelope)));
  $("#messageHeading").textContent = step === 0 ? "Ready for message 1" : `Message ${step} of 3`;
  $("#messageBody").textContent = step === 0 ? "Press “Next message” to apply the insert." : serializedMessage(envelope, step);
  $("#nextMessage").disabled = step >= 3;
  const rows = relationAtStep();
  $("#rowCount").textContent = `· ${rows.length} ${rows.length === 1 ? "row" : "rows"}`;
  $("#relationList").innerHTML = rows.length
    ? rows.map((row) => `<div class="relation-row">(${row.id}, ${row.product}, $${row.price})</div>`).join("")
    : '<div class="relation-empty">No rows</div>';
  $("#interpretation").textContent = explanation();
}

document.querySelectorAll("[data-envelope]").forEach((button) => button.addEventListener("click", () => {
  envelope = button.dataset.envelope;
  step = 0;
  render();
}));
$("#nextMessage").addEventListener("click", () => { step = Math.min(3, step + 1); render(); });
$("#resetMessages").addEventListener("click", () => { step = 0; render(); });

render();
if (new URLSearchParams(window.location.search).has("embed")) document.body.classList.add("embedded");
