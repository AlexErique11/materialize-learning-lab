const horizon = 90;
const delays = [10, 25];
const rowNames = ["Arrives with time left", "Arrives after expiry"];
const logicalTime = document.querySelector("#logicalTime");
const eventTime = document.querySelector("#eventTime");
const windowLength = document.querySelector("#windowLength");
const lanes = document.querySelector("#lanes");

function describe(now, arrival, event, expiry) {
  if (now < arrival) return ["Not arrived", ""];
  if (now < event) return ["Arrived · future-dated", ""];
  if (now < expiry) return [`Included · ${expiry - now}s left`, "active"];
  return ["Arrived expired · never entered", "expired"];
}

function render() {
  const now = Number(logicalTime.value);
  const event = Number(eventTime.value);
  const window = Number(windowLength.value);
  const expiry = event + window;
  document.querySelector("#logicalOutput").value = `+${now}s`;
  document.querySelector("#eventOutput").value = `+${event}s`;
  document.querySelector("#windowOutput").value = `${window}s`;
  lanes.innerHTML = delays.map((delay, index) => {
    const arrival = event + delay;
    const [status, stateClass] = describe(now, arrival, event, expiry);
    const left = event / horizon * 100;
    const width = Math.max(0, Math.min(expiry, horizon) - event) / horizon * 100;
    return `<div class="lane">
      <label class="lane-label"><strong>${rowNames[index]}</strong><output for="delay-${index}">delay ${delay}s · arrives ${arrival}s</output><input id="delay-${index}" data-delay="${index}" type="range" min="0" max="45" step="1" value="${delay}" aria-label="${rowNames[index]} arrival delay" /></label>
      <div class="track" aria-label="Event at ${event} seconds, arrival at ${arrival}, expires at ${expiry}">
        <span class="lifetime" style="left:${left}%;width:${width}%"></span>
        <span class="event-marker" style="left:${left}%"></span><span class="arrival-marker" style="left:${arrival / horizon * 100}%"></span><span class="expiry-marker" style="left:${Math.min(expiry, horizon) / horizon * 100}%"></span><span class="now-cursor" style="left:${now / horizon * 100}%"></span>
      </div>
      <span class="lane-status ${stateClass}">${status}</span>
    </div>`;
  }).join("");
  lanes.querySelectorAll("[data-delay]").forEach((input) => input.addEventListener("change", () => {
    delays[Number(input.dataset.delay)] = Number(input.value);
    render();
  }));
}

logicalTime.addEventListener("input", render);
eventTime.addEventListener("input", render);
windowLength.addEventListener("input", render);
render();
if (new URLSearchParams(window.location.search).has("embed")) document.body.classList.add("embedded");
