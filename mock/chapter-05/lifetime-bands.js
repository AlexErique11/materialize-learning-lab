const horizon = 60;
const rows = [
  { id: "A", label: "Event A", eventTime: 10 },
  { id: "B", label: "Event B", eventTime: 25 },
  { id: "C", label: "Event C", eventTime: 40 },
];
const logicalTime = document.querySelector("#logicalTime");
const windowLength = document.querySelector("#windowLength");
const lanes = document.querySelector("#lanes");

function statusFor(row, now, expiry) {
  if (now < row.eventTime) return ["Not yet eligible", ""];
  if (now < expiry) return [`Included · ${expiry - now}s left`, "active"];
  return ["Expired · retracted", "expired"];
}

function render() {
  const now = Number(logicalTime.value);
  const window = Number(windowLength.value);
  document.querySelector("#logicalOutput").value = `+${now}s`;
  document.querySelector("#windowOutput").value = `${window}s`;
  lanes.innerHTML = rows.map((row, index) => {
    const expiry = row.eventTime + window;
    const width = Math.max(0, Math.min(window, horizon - row.eventTime));
    const left = row.eventTime / horizon * 100;
    const cursor = now / horizon * 100;
    const end = Math.min(expiry, horizon) / horizon * 100;
    const [status, stateClass] = statusFor(row, now, expiry);
    return `<div class="lane">
      <label class="lane-label"><strong>${row.label}</strong><output for="event-${row.id}">event ${row.eventTime}s</output><input id="event-${row.id}" data-event-time="${index}" type="range" min="0" max="60" step="1" value="${row.eventTime}" aria-label="${row.label} event time" /></label>
      <div class="track" aria-label="${row.label} eligible from ${row.eventTime} to ${expiry} seconds">
        <span class="lifetime" style="left:${left}%;width:${width / horizon * 100}%"></span>
        <span class="event-marker" style="left:${left}%"></span><span class="expiry-marker" style="left:${end}%"></span><span class="now-cursor" style="left:${cursor}%"></span>
      </div>
      <span class="lane-status ${stateClass}">${status}</span>
    </div>`;
  }).join("");
  lanes.querySelectorAll("[data-event-time]").forEach((input) => input.addEventListener("change", () => {
    rows[Number(input.dataset.eventTime)].eventTime = Number(input.value);
    render();
  }));
}

logicalTime.addEventListener("input", render);
windowLength.addEventListener("input", render);
render();
if (new URLSearchParams(window.location.search).has("embed")) document.body.classList.add("embedded");
