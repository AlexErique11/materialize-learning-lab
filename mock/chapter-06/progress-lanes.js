const sliders = {
  a: document.querySelector("#frontierA"),
  b: document.querySelector("#frontierB"),
  compute: document.querySelector("#computeFrontier"),
};
const laneHost = document.querySelector("#lanes");
const maxTime = 20;
const pct = (value) => `${Math.max(0, Math.min(100, value / maxTime * 100))}%`;

function lane(name, subtitle, frontier, observed, kind, status) {
  const observedMarker = observed === null ? "" : `<i class="marker observed" style="left:${pct(observed)}" title="Highest timestamp observed: ${observed}"></i>`;
  return `<div class="lane"><div class="lane-name"><strong>${name}</strong><small>${subtitle}</small></div><div class="track"><i class="progress" style="width:${pct(frontier)}"></i>${observedMarker}<i class="marker" style="left:${pct(frontier)}" title="Frontier: ${frontier}"></i></div><div class="lane-status">${status}</div></div>`;
}

function render() {
  const a = Number(sliders.a.value);
  const b = Number(sliders.b.value);
  const compute = Number(sliders.compute.value);
  const inputMin = Math.min(a, b);
  const output = Math.min(inputMin, compute);
  const limiter = a === b ? "Inputs A and B (tie)" : a < b ? "Input A" : "Input B";
  document.querySelector("#frontierAValue").textContent = a;
  document.querySelector("#frontierBValue").textContent = b;
  document.querySelector("#computeValue").textContent = compute;
  document.querySelector("#limiting").textContent = limiter;
  document.querySelector("#inputBound").textContent = inputMin;
  document.querySelector("#outputFrontier").textContent = output;
  laneHost.innerHTML = lane("Input A", "arrivals · max seen 19", a, 19, "input", `frontier <strong>${a}</strong>`)
    + lane("Input B", "arrivals · max seen 16", b, 16, "input", `frontier <strong>${b}</strong>`)
    + lane("Join inputs", "minimum input frontier", inputMin, null, "input-bound", `held by <strong>${limiter}</strong>`)
    + lane("Join output", "input bound + compute", output, null, "output", `complete only before <strong>${output}</strong>`);
}

Object.values(sliders).forEach((slider) => slider.addEventListener("input", render));
if (new URLSearchParams(location.search).has("embed")) document.body.classList.add("embedded");
render();
