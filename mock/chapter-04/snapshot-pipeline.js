const initialRows = [
  { id: "1", product: "Apple", price: 20 },
  { id: "2", product: "Pear", price: 15 },
  { id: "3", product: "Plum", price: 10 },
];
let upstream = initialRows.map((row) => ({ ...row }));
let snapshotRows = null;
let relation = null;
let events = [];
let appliedEvents = 0;
const $ = (selector) => document.querySelector(selector);

function renderTable(target, rows, changedIds = []) {
  target.innerHTML = rows.map((row) => `<tr class="${changedIds.includes(row.id) ? "updated" : ""}"><td>${row.id}</td><td>${row.product}</td><td>$${row.price}</td></tr>`).join("") || '<tr><td colspan="3">No rows</td></tr>';
}

function render() {
  renderTable($("#upstreamBody"), upstream);
  const started = snapshotRows !== null;
  const committed = relation !== null;
  $("#startSnapshot").disabled = started;
  $("#sourceChanges").disabled = !started || events.length > 0 || appliedEvents > 0;
  $("#commitSnapshot").disabled = !started || committed;
  $("#applyChange").disabled = !committed || appliedEvents >= events.length;
  $("#snapshotState").textContent = !started ? "Not started" : committed ? "Committed" : "Snapshotting";
  $("#snapshotState").classList.toggle("ready", committed);
  $("#tableState").textContent = committed ? "Queryable" : "Unavailable";
  $("#tableState").classList.toggle("ready", committed);
  renderTable($("#relationBody"), relation ?? [], appliedEvents > 0 ? ["1"] : []);
  if (!started) $("#snapshotNote").textContent = "The initial relation is not queryable until the snapshot commits.";
  else if (!committed) $("#snapshotNote").textContent = "Snapshot rows are being captured as one initial state. Later changes wait in the CDC queue.";
  else $("#snapshotNote").textContent = "The complete snapshot is queryable. Apply queued CDC changes to catch up to the database.";
  $("#eventList").innerHTML = events.length
    ? events.map((event, index) => `<div class="event-row ${index < appliedEvents ? "applied" : ""}"><span class="event-index">${index + 1}</span><span>${event.label}</span><small>${index < appliedEvents ? "Applied" : "Queued"}</small></div>`).join("")
    : '<p class="status">No changes queued.</p>';
}

$("#startSnapshot").addEventListener("click", () => {
  snapshotRows = upstream.map((row) => ({ ...row }));
  $("#actionStatus").textContent = "Snapshot point captured. Changes can now accumulate while the initial rows load.";
  render();
});
$("#sourceChanges").addEventListener("click", () => {
  upstream = upstream.map((row) => row.id === "1" ? { ...row, price: 25 } : row).filter((row) => row.id !== "3");
  events = [
    { type: "update", row: { id: "1", product: "Apple", price: 25 }, label: "Update Apple · $20 → $25" },
    { type: "delete", id: "3", label: "Delete Plum · product ID 3" },
  ];
  $("#actionStatus").textContent = "The database changed after the snapshot point. Both changes are queued for catch-up.";
  render();
});
$("#commitSnapshot").addEventListener("click", () => {
  relation = snapshotRows.map((row) => ({ ...row }));
  $("#actionStatus").textContent = "Snapshot committed atomically: all three initial rows became queryable together.";
  render();
});
$("#applyChange").addEventListener("click", () => {
  const event = events[appliedEvents];
  if (event.type === "update") relation = relation.map((row) => row.id === event.row.id ? { ...event.row } : row);
  else relation = relation.filter((row) => row.id !== event.id);
  appliedEvents += 1;
  $("#actionStatus").textContent = appliedEvents < events.length ? `${event.label} applied. One CDC change remains.` : `${event.label} applied. The relation has caught up to the database.`;
  render();
});
$("#reset").addEventListener("click", () => {
  upstream = initialRows.map((row) => ({ ...row }));
  snapshotRows = null;
  relation = null;
  events = [];
  appliedEvents = 0;
  $("#actionStatus").textContent = "Start the snapshot to capture the initial rows.";
  render();
});

render();
if (new URLSearchParams(window.location.search).has("embed")) document.body.classList.add("embedded");
