const HORIZON = 100;
const ALERT_AFTER = 20;
const EXPIRE_AFTER = 75;
const TICK_MS = 170;

const orders = [
  { id: "101", customer: "Amira", createdAt: 0 },
  { id: "102", customer: "Bram", createdAt: 12 },
  { id: "103", customer: "Cleo", createdAt: 22 },
];

const payments = [
  { orderId: "103", arrivesAt: 30 },
  { orderId: "101", arrivesAt: 48 },
];

const checkpoints = [
  {
    id: 1,
    time: 20,
    title: "Time alone added a row",
    copy: "No source row changed at this moment. Materialize's logical clock crossed the 20-second threshold, so order 101 began satisfying the query and entered the maintained result.",
    watch: "The timeline cursor, order_alerts, and the +1 subscription diff.",
    focus: ["timelinePanel", "resultPanel", "streamPanel"],
  },
  {
    id: 2,
    time: 30,
    title: "New input does not always change the answer",
    copy: "Payment 103 arrived, but order 103 had never become an alert. The source tables changed while order_alerts stayed exactly the same, so the subscription produced no result diff.",
    watch: "The new payment row, the current-event explanation, and the unchanged result.",
    focus: ["sourcePanel", "eventPanel", "resultPanel"],
  },
  {
    id: 3,
    time: 48,
    title: "A payment retracts an alert",
    copy: "Payment 101 made the LEFT JOIN find a match. The condition p.order_id IS NULL became false, so Materialize removed order 101 from the current answer and emitted a −1 diff.",
    watch: "Payment 101 in the source, the smaller maintained result, and the −1 diff.",
    focus: ["sourcePanel", "resultPanel", "streamPanel"],
  },
  {
    id: 4,
    time: 87,
    title: "Time can retract a row too",
    copy: "No payment arrived for order 102. Its 75-second alert window simply expired when mz_now() reached 12:01:27, so the row left the result even though the source tables did not change.",
    watch: "The timeline cursor, the empty maintained result, and the time-driven −1 diff.",
    focus: ["timelinePanel", "resultPanel", "streamPanel"],
  },
];

const timelineLanes = [
  { id: "101", arrives: 0, enters: 20, exits: 48, exitReason: "Payment arrives" },
  { id: "102", arrives: 12, enters: 32, exits: 87, exitReason: "Time window expires" },
  { id: "103", arrives: 22, enters: null, exits: 30, exitReason: "Payment arrives before alert" },
];

const els = {
  clock: document.querySelector("#clock"),
  timeSlider: document.querySelector("#timeSlider"),
  timeSliderOutput: document.querySelector("#timeSliderOutput"),
  timelineTrack: document.querySelector("#timelineTrack"),
  ordersBody: document.querySelector("#ordersBody"),
  paymentsBody: document.querySelector("#paymentsBody"),
  sourceCount: document.querySelector("#sourceCount"),
  causeTag: document.querySelector("#causeTag"),
  eventTime: document.querySelector("#eventTime"),
  eventGlyph: document.querySelector("#eventGlyph"),
  eventTitle: document.querySelector("#eventTitle"),
  eventCopy: document.querySelector("#eventCopy"),
  conditionList: document.querySelector("#conditionList"),
  viewCount: document.querySelector("#viewCount"),
  resultBody: document.querySelector("#resultBody"),
  resultTable: document.querySelector("#resultTable"),
  resultEmpty: document.querySelector("#resultEmpty"),
  changeStream: document.querySelector("#changeStream"),
  progressLabel: document.querySelector("#progressLabel"),
  progressBar: document.querySelector("#progressBar"),
  labCount: document.querySelector("#labCount"),
  labsCompletion: document.querySelector("#labsCompletion"),
  activeLabStatus: document.querySelector("#activeLabStatus"),
  labList: document.querySelector("#labList"),
  referenceDetails: document.querySelector(".reference-details"),
  play: document.querySelector("#playButton"),
  playLabel: document.querySelector("#playLabel"),
  playIcon: document.querySelector("#playIcon"),
  run: document.querySelector("#runButton"),
  runLabel: document.querySelector("#runLabel"),
  runIcon: document.querySelector("#runIcon"),
  reset: document.querySelector("#resetButton"),
  focusOverlay: document.querySelector("#focusOverlay"),
  coachmark: document.querySelector("#coachmark"),
  coachStep: document.querySelector("#coachStep"),
  coachTime: document.querySelector("#coachTime"),
  coachTitle: document.querySelector("#coachTitle"),
  coachCopy: document.querySelector("#coachCopy"),
  coachWatch: document.querySelector("#coachWatch"),
  continueButton: document.querySelector("#continueButton"),
  labMain: document.querySelector(".lab-main"),
  libraryButtons: [...document.querySelectorAll("[data-library]")],
  featureDialog: document.querySelector("#featureDialog"),
  featureEyebrow: document.querySelector("#featureEyebrow"),
  featureTitle: document.querySelector("#featureTitle"),
  featureContent: document.querySelector("#featureContent"),
  dialogClose: document.querySelector("#dialogClose"),
  coreWorkspace: document.querySelector(".core-workspace"),
  chapterHub: document.querySelector("#chapterHub"),
  chapterVisualization: document.querySelector("#chapterVisualization"),
  chapterFrame: document.querySelector("#chapterFrame"),
  chapterVisualizationTitle: document.querySelector("#chapterVisualizationTitle"),
  chapterBack: document.querySelector("#chapterBack"),
  chapter2Hub: document.querySelector("#chapter2Hub"),
  chapter2Visualization: document.querySelector("#chapter2Visualization"),
  chapter2Frame: document.querySelector("#chapter2Frame"),
  chapter2VisualizationTitle: document.querySelector("#chapter2VisualizationTitle"),
  chapter2Back: document.querySelector("#chapter2Back"),
};

const learningCatalog = {
  labs: {
    eyebrow: "Guided labs",
    title: "Choose a chapter",
    items: [
      { number: "01", name: "Changing Relations — Rows, Updates, and Diffs", navLabel: "Changing Relations", description: "Reconstruct a changing relation from additions, retractions, and updates.", chapterHub: "01" },
      { number: "02", name: "Incremental Maintenance — How One Change Travels Through SQL", navLabel: "Incremental Maintenance", description: "Trace one input change through filters, joins, and aggregates.", chapterHub: "02" },
      { number: "03", name: "Views, Indexes, and Materialized Views", description: "Choose where to save SQL, maintain results in memory, or persist them." },
      { number: "04", name: "Getting Data In — Sources, Snapshots, and CDC", navLabel: "Getting Data In", description: "Turn initial snapshots and incoming changes into the right relation." },
      { number: "05", name: "Time in Materialize — Temporal Filters", navLabel: "Time in Materialize", description: "See logical time add and retract rows without a new source event.", current: true },
      { number: "06", name: "Progress and Freshness — Why Is the System Behind?", navLabel: "Progress and Freshness", description: "Find what progress proves and where a delayed result falls behind." },
      { number: "07", name: "Consistent Reads — Which Moment Does a Query See?", navLabel: "Consistent Reads", description: "Choose a readable moment and compare freshness with waiting." },
      { number: "08", name: "Maintained State — Why Small Results Can Be Expensive", navLabel: "Maintained State", description: "Find the state that joins, aggregates, and Top-K results retain." },
      { number: "09", name: "Query Optimization — Change the Plan, Preserve the Answer", navLabel: "Query Optimization", description: "Use indexes and plan inspection to improve a query without changing its result." },
      { number: "10", name: "Clusters, Replicas, and Recovery", description: "Place workloads and follow a replica through hydration and catch-up." },
      { number: "11", name: "Building Live Applications with SUBSCRIBE", navLabel: "Live Applications with SUBSCRIBE", description: "Apply snapshots, diffs, and progress safely in a live client." },
      { number: "12", name: "Sinks and Reliable Downstream Delivery", navLabel: "Sinks and Delivery", description: "Export changing results and reason about downstream processing." },
      { number: "13", name: "Recursive Queries and Changing Graphs", navLabel: "Recursive Queries", description: "Follow recursive results to a fixed point as graph edges change.", optional: true },
    ],
  },
  challenges: {
    eyebrow: "Capstones",
    title: "Choose a capstone",
    items: [
      { number: "01", name: "Live Order Operations", description: "Build a recent-orders result with updates, cancellations, and expiration." },
      { number: "02", name: "The Dashboard Is Fresh but Expensive", description: "Redesign a costly dashboard under a fixed resource budget." },
      { number: "03", name: "Recover Without Corrupting Delivery", description: "Handle recovery and reconnection without losing or duplicating effects." },
    ],
  },
};

function renderLabNavigation() {
  els.labList.innerHTML = learningCatalog.labs.items.map((item) => `
    <li${item.current ? ' class="active"' : item.optional ? ' class="optional"' : ""}>
      <button class="lab-link" data-sidebar-lab type="button" title="${item.number} · ${item.name}"${item.chapterHub ? ` data-chapter-hub="${item.chapterHub}"` : ""}${item.current ? ' data-current="true" aria-current="page"' : ""}>
        <span>${item.number}</span>
        <span><strong>${item.navLabel ?? item.name}</strong>${item.current ? '<small id="activeLabStatus">Current lab</small>' : item.optional ? "<small>Optional</small>" : ""}</span>
      </button>
    </li>`).join("");
  els.activeLabStatus = document.querySelector("#activeLabStatus");
}

renderLabNavigation();

let currentTime = 0;
let playing = false;
let timer = null;
let runMode = null;
let activeCheckpoint = null;
let completedCheckpoints = new Set();
let labCompleted = false;
let focusReturnTarget = null;

function formatClock(seconds) {
  const total = 12 * 3600 + seconds;
  const hours = Math.floor(total / 3600) % 24;
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  return [hours, minutes, secs].map((part) => String(part).padStart(2, "0")).join(":");
}

function visibleOrders(time = currentTime) {
  return orders.filter((order) => order.createdAt <= time);
}

function visiblePayments(time = currentTime) {
  return payments.filter((payment) => payment.arrivesAt <= time);
}

function resultRows(time = currentTime) {
  const paid = new Set(visiblePayments(time).map((payment) => payment.orderId));
  return visibleOrders(time).filter((order) => {
    const age = time - order.createdAt;
    return !paid.has(order.id) && age >= ALERT_AFTER && age < EXPIRE_AFTER;
  });
}

function logsUntil(targetTime) {
  const logs = [];
  let previous = new Set();
  for (let time = 0; time <= targetTime; time += 1) {
    orders.filter((order) => order.createdAt === time).forEach((order) => {
      logs.push({ time, type: "source", diff: "in", text: `Order ${order.id} arrived in orders.` });
    });
    payments.filter((payment) => payment.arrivesAt === time).forEach((payment) => {
      logs.push({ time, type: "payment", diff: "in", text: `Payment ${payment.orderId} arrived in payments.` });
    });

    const rows = resultRows(time);
    const current = new Set(rows.map((row) => row.id));
    rows.forEach((row) => {
      if (!previous.has(row.id)) logs.push({ time, type: "add", diff: "+1", text: `Order ${row.id} entered order_alerts.` });
    });
    previous.forEach((id) => {
      if (!current.has(id)) {
        const paidNow = payments.some((payment) => payment.orderId === id && payment.arrivesAt === time);
        logs.push({
          time,
          type: "remove",
          diff: "−1",
          text: paidNow ? `Order ${id} left after its payment arrived.` : `Order ${id} left when its time window expired.`,
        });
      }
    });
    previous = current;
  }
  return logs;
}

function renderTimeline() {
  const marker = (type, time, label, text = "") => {
    const passed = time <= currentTime ? " passed" : "";
    return `<span class="timeline-marker ${type}${passed}" style="left:${time}%" title="${label} at +${time}s"><i>${text}</i></span>`;
  };
  const lanes = timelineLanes.map((lane, index) => `
    <div class="timeline-lane" style="top:${11 + index * 42}px">
      <strong>#${lane.id}</strong>
      <span class="lifecycle-line" style="left:${lane.arrives}%; width:${lane.exits - lane.arrives}%"></span>
      ${marker("arrival", lane.arrives, `Order ${lane.id} arrives`)}
      ${lane.enters === null ? "" : marker("entry", lane.enters, `Order ${lane.id} enters the result`, "+")}
      ${marker("exit", lane.exits, `${lane.exitReason} for order ${lane.id}`)}
    </div>`).join("");
  els.timelineTrack.innerHTML = `
    <div class="timeline-plot">
      ${lanes}
      <i class="now-line${currentTime > 92 ? " near-end" : ""}" style="left:${currentTime}%"><span>now</span></i>
      <div class="timeline-axis"><span>0s</span><span>20s</span><span>40s</span><span>60s</span><span>80s</span><span>100s</span></div>
    </div>`;
  els.timelineTrack.setAttribute("aria-valuenow", String(currentTime));
  els.timelineTrack.setAttribute("aria-valuetext", `${formatClock(currentTime)}, plus ${currentTime} seconds`);
}

function renderSourceTables() {
  const currentOrders = visibleOrders();
  const currentPayments = visiblePayments();
  const paid = new Set(currentPayments.map((payment) => payment.orderId));

  els.ordersBody.innerHTML = currentOrders.map((order) => `
    <tr>
      <td>#${order.id}</td>
      <td>${order.customer}</td>
      <td>${formatClock(order.createdAt)}</td>
      <td class="${paid.has(order.id) ? "status-paid" : "status-unpaid"}">${paid.has(order.id) ? "Paid" : "Unpaid"}</td>
    </tr>`).join("");

  els.paymentsBody.innerHTML = currentPayments.length
    ? currentPayments.map((payment) => `<tr><td>#${payment.orderId}</td><td>${formatClock(payment.arrivesAt)}</td></tr>`).join("")
    : `<tr><td class="empty-cell" colspan="2">No payments yet</td></tr>`;

  const rowCount = currentOrders.length + currentPayments.length;
  els.sourceCount.textContent = `${rowCount} row${rowCount === 1 ? "" : "s"}`;
}

function describeMoment() {
  const logs = logsUntil(currentTime);
  const exact = logs.filter((entry) => entry.time === currentTime);
  const resultChange = [...exact].reverse().find((entry) => entry.type === "add" || entry.type === "remove");
  const inputChange = [...exact].reverse().find((entry) => entry.type === "payment" || entry.type === "source");

  if (resultChange?.type === "add") {
    const id = resultChange.text.match(/\d+/)?.[0] ?? "";
    return { cause: "Logical time", causeClass: "time", glyph: "+1", title: `Order ${id} entered the answer`, copy: `The order reached ${ALERT_AFTER} seconds old while still unpaid. No source row was edited; mz_now() crossed the query threshold.`, orderId: id };
  }
  if (resultChange?.type === "remove") {
    const id = resultChange.text.match(/\d+/)?.[0] ?? "";
    const paidNow = payments.some((payment) => payment.orderId === id && payment.arrivesAt === currentTime);
    return paidNow
      ? { cause: "Source data", causeClass: "data", glyph: "−1", title: `Payment ${id} retracted the alert`, copy: "The payment made the join match, so p.order_id IS NULL became false and the row left order_alerts.", orderId: id }
      : { cause: "Logical time", causeClass: "time", glyph: "−1", title: `Order ${id}'s window expired`, copy: "The order reached the end of its 75-second window. The answer changed even though no new source data arrived.", orderId: id };
  }
  if (inputChange?.type === "payment") {
    const id = inputChange.text.match(/\d+/)?.[0] ?? "";
    return { cause: "Source data", causeClass: "data", glyph: "$", title: `Payment ${id} arrived`, copy: "The source changed, but this order was never in order_alerts, so the maintained answer produced no +1 or −1 diff.", orderId: id };
  }
  if (inputChange?.type === "source") {
    const id = inputChange.text.match(/\d+/)?.[0] ?? "";
    return { cause: "Source data", causeClass: "data", glyph: "row", title: `Order ${id} arrived`, copy: "The order is stored in the source table immediately, but it must remain unpaid for 20 seconds before it can enter the alert result.", orderId: id };
  }

  const next = timelineEvents.find((event) => event.time > currentTime);
  const rows = resultRows();
  const representative = rows[0]?.id ?? visibleOrders().find((order) => !visiblePayments().some((p) => p.orderId === order.id))?.id ?? "101";
  return {
    cause: "Logical time",
    causeClass: "time",
    glyph: "→",
    title: rows.length ? "The current answer is stable" : "The query is waiting",
    copy: next ? `Nothing changes at this exact second. The next meaningful event is ${next.label} at +${next.time}s.` : "The scenario has finished. Review the four moments to compare data-driven and time-driven changes.",
    orderId: representative,
  };
}

function renderCurrentMoment() {
  const moment = describeMoment();
  els.causeTag.textContent = moment.cause;
  els.causeTag.className = `cause-tag ${moment.causeClass}`;
  els.eventTime.textContent = `+${currentTime}s`;
  els.eventGlyph.textContent = moment.glyph;
  els.eventTitle.textContent = moment.title;
  els.eventCopy.textContent = moment.copy;

  const order = orders.find((item) => item.id === moment.orderId) ?? orders[0];
  const age = Math.max(0, currentTime - order.createdAt);
  const paid = visiblePayments().some((payment) => payment.orderId === order.id);
  const conditions = [
    { label: `Order ${order.id} has no payment`, pass: !paid, value: paid ? "No" : "Yes" },
    { label: `Age is at least ${ALERT_AFTER}s`, pass: age >= ALERT_AFTER, value: `${age}s` },
    { label: `Age is below ${EXPIRE_AFTER}s`, pass: age < EXPIRE_AFTER, value: `${age}s` },
  ];
  els.conditionList.innerHTML = conditions.map((condition) => `<div class="condition ${condition.pass ? "pass" : "fail"}"><span>${condition.label}</span><strong>${condition.pass ? "✓" : "×"} ${condition.value}</strong></div>`).join("");
}

function renderResult() {
  const rows = resultRows();
  els.viewCount.textContent = String(rows.length);
  els.resultBody.innerHTML = rows.map((order) => `<tr><td>#${order.id}</td><td>${order.customer}</td><td>${currentTime - order.createdAt}s</td></tr>`).join("");
  els.resultTable.hidden = rows.length === 0;
  els.resultEmpty.hidden = rows.length > 0;
}

function renderStream() {
  const entries = logsUntil(currentTime).filter((entry) => entry.type === "add" || entry.type === "remove").slice(-5).reverse();
  els.changeStream.innerHTML = entries.length
    ? entries.map((entry) => `<div class="stream-item ${entry.type}"><span class="stream-time">+${entry.time}s</span><span class="stream-diff">${entry.diff}</span><span class="stream-text">${entry.text}</span></div>`).join("")
    : `<p class="stream-empty">No result changes yet.</p>`;
}

function renderProgress() {
  const count = completedCheckpoints.size;
  const coreLabCount = learningCatalog.labs.items.filter((item) => !item.optional).length;
  els.progressLabel.textContent = `Progress ${count}/${checkpoints.length}`;
  els.progressBar.style.width = `${(count / checkpoints.length) * 100}%`;
  els.labCount.textContent = String(coreLabCount);
  els.labsCompletion.textContent = `${labCompleted ? 1 : 0}/${coreLabCount} core completed`;
  els.activeLabStatus.textContent = labCompleted ? "Completed" : "Current lab";
}

function render() {
  els.clock.textContent = formatClock(currentTime);
  els.timeSlider.value = String(currentTime);
  els.timeSliderOutput.value = `+${currentTime}s`;
  renderTimeline();
  renderSourceTables();
  renderCurrentMoment();
  renderResult();
  renderStream();
  renderProgress();
}

function pause(guidedLabel = currentTime >= HORIZON ? "Replay guided run" : "Start guided run", runLabel = currentTime >= HORIZON ? "Replay" : "Run") {
  playing = false;
  window.clearInterval(timer);
  timer = null;
  runMode = null;
  els.playIcon.textContent = "▶";
  els.playLabel.textContent = guidedLabel;
  els.runIcon.textContent = "▶";
  els.runLabel.textContent = runLabel;
}

function clearHighlights() {
  document.querySelectorAll(".tour-highlight").forEach((node) => node.classList.remove("tour-highlight"));
}

function showCheckpoint(checkpoint) {
  pause("Paused for explanation");
  activeCheckpoint = checkpoint;
  focusReturnTarget = document.activeElement;
  clearHighlights();
  checkpoint.focus.forEach((id) => document.getElementById(id)?.classList.add("tour-highlight"));
  els.coachStep.textContent = `Moment ${checkpoint.id} of ${checkpoints.length}`;
  els.coachTime.textContent = `+${checkpoint.time} seconds`;
  els.coachTitle.textContent = checkpoint.title;
  els.coachCopy.textContent = checkpoint.copy;
  els.coachWatch.textContent = checkpoint.watch;
  els.coachmark.dataset.position = checkpoint.focus.includes("timelinePanel") ? "lower-left" : "upper-right";
  els.focusOverlay.hidden = false;
  els.coachmark.hidden = false;
  els.labMain.classList.add("tour-active");
  renderProgress();
  els.continueButton.focus();
}

function hideCheckpoint({ restoreFocus = false } = {}) {
  els.focusOverlay.hidden = true;
  els.coachmark.hidden = true;
  els.labMain.classList.remove("tour-active");
  clearHighlights();
  if (restoreFocus && focusReturnTarget instanceof HTMLElement) focusReturnTarget.focus();
  focusReturnTarget = null;
}

function advance() {
  currentTime = Math.min(HORIZON, currentTime + 1);
  render();
  const checkpoint = runMode === "guided"
    ? checkpoints.find((item) => item.time === currentTime && !completedCheckpoints.has(item.id))
    : null;
  if (checkpoint) {
    showCheckpoint(checkpoint);
  } else if (currentTime >= HORIZON) {
    pause("Replay guided run", "Replay");
  }
}

function startGuidedPlayback({ fromBeginning = false } = {}) {
  if (activeCheckpoint) return;
  if (fromBeginning) {
    pause("Start guided run", "Run");
    hideCheckpoint();
    activeCheckpoint = null;
    completedCheckpoints = new Set();
    currentTime = 0;
    render();
  }
  els.referenceDetails.open = false;
  runMode = "guided";
  playing = true;
  els.playIcon.textContent = "Ⅱ";
  els.playLabel.textContent = "Pause";
  els.runIcon.textContent = "▶";
  els.runLabel.textContent = "Run";
  timer = window.setInterval(advance, TICK_MS);
}

function toggleGuidedRun() {
  if (activeCheckpoint) return;
  if (playing && runMode === "guided") {
    pause("Resume guided run", "Run");
    return;
  }
  if (playing) pause();
  const isResume = els.playLabel.textContent === "Resume guided run";
  startGuidedPlayback({ fromBeginning: !isResume });
}

function runUninterrupted() {
  if (playing && runMode === "continuous") {
    pause("Start guided run", "Resume");
    return;
  }
  if (playing) pause();
  if (activeCheckpoint) {
    activeCheckpoint = null;
    hideCheckpoint();
  }
  if (currentTime >= HORIZON) reset();
  els.referenceDetails.open = false;
  runMode = "continuous";
  playing = true;
  els.playIcon.textContent = "▶";
  els.playLabel.textContent = "Start guided run";
  els.runIcon.textContent = "Ⅱ";
  els.runLabel.textContent = "Pause";
  timer = window.setInterval(advance, TICK_MS);
}

function reset() {
  pause("Start guided run", "Run");
  hideCheckpoint();
  activeCheckpoint = null;
  completedCheckpoints = new Set();
  currentTime = 0;
  render();
}

function continueTutorial() {
  if (!activeCheckpoint) return;
  completedCheckpoints.add(activeCheckpoint.id);
  if (activeCheckpoint.id === checkpoints.length) labCompleted = true;
  activeCheckpoint = null;
  hideCheckpoint();
  renderProgress();
  startGuidedPlayback();
}

els.play.addEventListener("click", toggleGuidedRun);
els.run.addEventListener("click", runUninterrupted);
els.reset.addEventListener("click", reset);
els.continueButton.addEventListener("click", continueTutorial);
els.dialogClose.addEventListener("click", () => els.featureDialog.close());
els.chapterBack.addEventListener("click", showChapterHub);
els.chapterHub.addEventListener("click", (event) => {
  openChapterVisualization(event, els.chapterHub, els.chapterVisualization, els.chapterFrame, els.chapterVisualizationTitle);
});
els.chapter2Hub.addEventListener("click", (event) => {
  openChapterVisualization(event, els.chapter2Hub, els.chapter2Visualization, els.chapter2Frame, els.chapter2VisualizationTitle);
});
els.chapter2Back.addEventListener("click", showChapter2Hub);
els.libraryButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const section = button.dataset.library;
    if (playing) pause();
    if (section === "sandbox" || section === "challenges") showNotReady();
    else showCatalog(section);
  });
});
els.labList.addEventListener("click", (event) => {
  const button = event.target instanceof Element ? event.target.closest("[data-sidebar-lab]") : null;
  if (!button) return;
  if (playing) pause();
  els.labList.querySelectorAll("[data-sidebar-lab]").forEach((lab) => {
    lab.closest("li")?.classList.toggle("active", lab === button);
    if (lab === button) lab.setAttribute("aria-current", "page");
    else lab.removeAttribute("aria-current");
  });
  if (button.dataset.chapterHub === "01") {
    showChapterHub();
    return;
  }
  if (button.dataset.chapterHub === "02") {
    showChapter2Hub();
    return;
  }
  if (button.dataset.current === "true") {
    hideChapterPages();
    els.coreWorkspace.hidden = false;
  }
  else showNotReady();
});
let draggingTimelinePointer = null;
let timelineDragBounds = null;

function dismissActiveCheckpoint() {
  if (!activeCheckpoint) return;
  activeCheckpoint = null;
  hideCheckpoint();
}

function seekToTime(nextTime) {
  currentTime = Math.max(0, Math.min(HORIZON, Math.round(nextTime)));
  // Every panel is derived from currentTime, so seeking backward rebuilds a
  // faithful historical snapshot instead of preserving future UI state.
  render();
}

els.timeSlider.addEventListener("input", (event) => {
  pause();
  dismissActiveCheckpoint();
  seekToTime(Number(event.target.value));
});

function setTimeFromTimeline(clientX) {
  if (!timelineDragBounds) return;
  const bounds = timelineDragBounds;
  const ratio = Math.max(0, Math.min(1, (clientX - bounds.left) / bounds.width));
  seekToTime(ratio * HORIZON);
}

els.timelineTrack.addEventListener("pointerdown", (event) => {
  pause();
  dismissActiveCheckpoint();
  const plot = els.timelineTrack.querySelector(".timeline-plot");
  if (!plot) return;
  timelineDragBounds = plot.getBoundingClientRect();
  draggingTimelinePointer = event.pointerId;
  els.timelineTrack.setPointerCapture(event.pointerId);
  els.timelineTrack.classList.add("dragging");
  setTimeFromTimeline(event.clientX);
});
els.timelineTrack.addEventListener("pointermove", (event) => {
  if (event.pointerId === draggingTimelinePointer) setTimeFromTimeline(event.clientX);
});
function endTimelineDrag(event) {
  if (event.pointerId !== draggingTimelinePointer) return;
  draggingTimelinePointer = null;
  timelineDragBounds = null;
  els.timelineTrack.classList.remove("dragging");
}
els.timelineTrack.addEventListener("pointerup", endTimelineDrag);
els.timelineTrack.addEventListener("pointercancel", endTimelineDrag);
els.timelineTrack.addEventListener("lostpointercapture", endTimelineDrag);
els.timelineTrack.addEventListener("keydown", (event) => {
  const steps = { ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1 };
  if (!(event.key in steps) && event.key !== "Home" && event.key !== "End") return;
  event.preventDefault();
  pause();
  dismissActiveCheckpoint();
  if (event.key === "Home") seekToTime(0);
  else if (event.key === "End") seekToTime(HORIZON);
  else seekToTime(currentTime + steps[event.key]);
});
document.addEventListener("keydown", (event) => {
  if (activeCheckpoint && (event.key === "Enter" || event.key === " ")) {
    event.preventDefault();
    continueTutorial();
  }
});

function openFeatureDialog() {
  if (!els.featureDialog.open) els.featureDialog.showModal();
}

function showCatalog(section) {
  const catalog = learningCatalog[section];
  if (!catalog) return;
  els.featureEyebrow.textContent = catalog.eyebrow;
  els.featureTitle.textContent = catalog.title;
  els.featureContent.innerHTML = `<div class="catalog-list">${catalog.items.map((item) => `
    <button class="catalog-item${item.current ? " current" : ""}" type="button" data-feature="${item.name}"${item.current ? " data-current=\"true\"" : ""}>
      <span>${item.number}</span>
      <span><strong>${item.name}</strong><small>${item.description}</small></span>
      <span class="catalog-status">${item.current ? "Current" : item.optional ? "Optional · coming soon" : "Coming soon"}</span>
    </button>`).join("")}</div>`;
  els.featureContent.querySelectorAll(".catalog-item").forEach((item) => {
    item.addEventListener("click", () => {
      if (item.dataset.current === "true") {
        hideChapterPages();
        els.coreWorkspace.hidden = false;
        els.featureDialog.close();
      }
      else showNotReady(item.dataset.feature);
    });
  });
  openFeatureDialog();
}

function showNotReady() {
  if (els.featureDialog.open) els.featureDialog.close();
  hideCheckpoint();
  hideChapterPages();
  els.coreWorkspace.hidden = true;
}

function hideChapterPages() {
  els.chapterHub.hidden = true;
  els.chapterVisualization.hidden = true;
  els.chapter2Hub.hidden = true;
  els.chapter2Visualization.hidden = true;
}

function showChapterHub() {
  hideCheckpoint();
  els.coreWorkspace.hidden = true;
  els.chapterVisualization.hidden = true;
  els.chapter2Hub.hidden = true;
  els.chapter2Visualization.hidden = true;
  els.chapterHub.hidden = false;
}

function showChapter2Hub() {
  hideCheckpoint();
  els.coreWorkspace.hidden = true;
  els.chapterHub.hidden = true;
  els.chapterVisualization.hidden = true;
  els.chapter2Visualization.hidden = true;
  els.chapter2Hub.hidden = false;
}

function openChapterVisualization(event, hub, visualization, frame, titleElement) {
  const card = event.target instanceof Element ? event.target.closest("[data-visualization]") : null;
  if (!card) return;
  titleElement.textContent = card.dataset.title;
  frame.title = card.dataset.title;
  frame.src = card.dataset.visualization;
  hub.hidden = true;
  visualization.hidden = false;
}

function currentLabState() {
  return {
    time_seconds: currentTime,
    playing,
    run_mode: runMode,
    active_checkpoint: activeCheckpoint?.id ?? null,
    completed_checkpoints: [...completedCheckpoints],
    source_order_ids: visibleOrders().map((order) => order.id),
    payment_order_ids: visiblePayments().map((payment) => payment.orderId),
    alert_order_ids: resultRows().map((order) => order.id),
  };
}

function registerWebMcpTools() {
  const context = document.modelContext;
  if (!context?.registerTool) return;
  const register = (definition) => {
    try { void Promise.resolve(context.registerTool(definition)).catch((error) => console.warn("WebMCP registration failed", error)); }
    catch (error) { console.warn("WebMCP registration failed", error); }
  };

  register({
    name: "set_tutorial_time",
    title: "Set tutorial time",
    description: "Pause the guided tutorial and move it to an exact second between 0 and 100.",
    inputSchema: { type: "object", properties: { time_seconds: { type: "integer", minimum: 0, maximum: 100 } }, required: ["time_seconds"], additionalProperties: false },
    annotations: { readOnlyHint: false, untrustedContentHint: false },
    execute(input) {
      if (!Number.isInteger(input?.time_seconds) || input.time_seconds < 0 || input.time_seconds > HORIZON) throw new Error("time_seconds must be an integer from 0 to 100.");
      pause();
      dismissActiveCheckpoint();
      seekToTime(input.time_seconds);
      return currentLabState();
    },
  });

  register({
    name: "read_time_lab_state",
    title: "Read tutorial state",
    description: "Read the visible source rows, payments, maintained alert rows, time, and guided-checkpoint state.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, untrustedContentHint: false },
    execute: currentLabState,
  });
}

registerWebMcpTools();
render();
