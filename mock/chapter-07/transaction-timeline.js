const base = document.querySelector("#baseFrontier");
const view = document.querySelector("#viewFrontier");
const bound = document.querySelector("#stalenessBound");
const policy = document.querySelector("#isolation");
const now = 20;
const point = (value, state = "") => `<i class="point ${state}" style="left:${Math.max(0, Math.min(100, value / now * 100))}%"></i>`;

function render() {
  const bf = Number(base.value), vf = Number(view.value), maxStale = Number(bound.value), mode = policy.value;
  const latest = Math.min(bf, vf) - 1;
  const age = now - latest;
  document.querySelector("#baseValue").textContent = bf;
  document.querySelector("#viewValue").textContent = vf;
  document.querySelector("#boundValue").textContent = maxStale;
  let secondRead, state, result;
  if (mode === "strict") {
    if (vf > 8 && bf > 8) { secondRead = 8; state = ""; result = "B can read at or after time 8, preserving the real-time order after A. The shown frontiers have advanced far enough, so no wait is needed."; }
    else { secondRead = 8; state = "wait"; result = "B must wait: the derived view has not completed time 8, which it needs to preserve A-before-B ordering."; }
  } else if (mode === "serializable") {
    secondRead = latest;
    state = secondRead < 8 ? "stale" : "";
    result = secondRead < 8
      ? `B reads a consistent available snapshot at time ${secondRead}, which may not include A's observation at time 8. Serializable does not promise real-time ordering.`
      : `The available snapshot is time ${secondRead}; in this fixture it includes time 8. Serializable guarantees a consistent snapshot, not a freshness bound.`;
  } else {
    if (age > maxStale) { secondRead = latest; state = "stale"; result = `Bounded-staleness error: freshest common time ${latest} is ${age} units old, beyond the ${maxStale}-unit limit. It errors instead of waiting.`; }
    else { secondRead = latest; state = ""; result = `B reads the freshest common snapshot at time ${latest} (${age} units old), within the ${maxStale}-unit bound. It does not wait for time 8.`; }
  }
  document.querySelector("#timeline").innerHTML = [
    `<div class="event"><div><strong>Tx A · base table</strong><br><small>reads the row</small></div><div class="event-track">${point(8)}<span class="wall-line"></span></div><div class="event-outcome">read timestamp <strong>8</strong> · commit</div></div>`,
    `<div class="event"><div><strong>Base table</strong><br><small>frontier boundary</small></div><div class="event-track">${point(bf, "wait")}</div><div class="event-outcome">complete strictly before <strong>${bf}</strong></div></div>`,
    `<div class="event"><div><strong>Derived view</strong><br><small>query input</small></div><div class="event-track">${point(vf, "wait")}</div><div class="event-outcome">complete strictly before <strong>${vf}</strong></div></div>`,
    `<div class="event"><div><strong>Tx B · derived view</strong><br><small>starts after Tx A</small></div><div class="event-track">${point(secondRead, state)}<span class="wall-line"></span></div><div class="event-outcome">${mode === "strict" && state === "wait" ? "waits for time ≥ 8" : `reads at <strong>${secondRead}</strong>`}</div></div>`,
  ].join("");
  const outcome = document.querySelector("#outcome");
  outcome.className = `result${state === "wait" ? " wait" : state === "stale" && mode === "bounded" ? " error" : ""}`;
  outcome.textContent = result;
}

[base, view, bound].forEach((input) => input.addEventListener("input", render));
policy.addEventListener("change", render);
if (new URLSearchParams(location.search).has("embed")) document.body.classList.add("embedded");
render();
