const byId = (id) => document.getElementById(id);
const controls = ["retainA", "frontierA", "retainB", "frontierB", "requested", "bound", "policy"].map(byId);
const horizon = 20;
const pos = (value) => `${Math.max(0, Math.min(100, value / horizon * 100))}%`;

function row(name, retained, frontier, requested, common = false) {
  const width = Math.max(0, frontier - retained);
  return `<div class="lane"><div class="lane-name"><strong>${name}</strong><small>readable from ${retained} to before ${frontier}</small></div><div class="track"><i class="range${common ? " common" : ""}" style="left:${pos(retained)};width:${pos(width)}"></i><i class="edge" style="left:${pos(retained)}" title="retained history begins at ${retained}"></i><i class="edge frontier" style="left:${pos(frontier)}" title="write frontier ${frontier}"></i>${requested === null ? "" : `<i class="request" style="left:${pos(requested)}" title="selected timestamp ${requested}"></i>`}</div><div class="lane-status">${common ? "shared range" : `retained ≥ ${retained}; complete &lt; ${frontier}`}</div></div>`;
}

function render() {
  const ra = Number(byId("retainA").value), fa = Number(byId("frontierA").value);
  const rb = Number(byId("retainB").value), fb = Number(byId("frontierB").value);
  const requested = Number(byId("requested").value), bound = Number(byId("bound").value);
  const policy = byId("policy").value;
  const oldest = Math.max(ra, rb);
  const frontier = Math.min(fa, fb);
  const newest = frontier - 1;
  const noOverlap = oldest > newest;
  byId("retainAValue").textContent = ra; byId("frontierAValue").textContent = fa;
  byId("retainBValue").textContent = rb; byId("frontierBValue").textContent = fb;
  byId("requestedValue").textContent = requested; byId("boundValue").textContent = bound;
  byId("requestedControl").hidden = policy === "bounded";
  byId("boundControl").hidden = policy !== "bounded";
  const marker = policy === "requested" ? requested : null;
  byId("lanes").innerHTML = row("Input A", ra, fa, marker) + row("Input B", rb, fb, marker) + row("Shared readable times", oldest, frontier, marker, true);
  const result = byId("result");
  result.className = "result";
  if (policy === "bounded") {
    if (noOverlap) {
      result.classList.add("error");
      result.textContent = "No timestamp is currently readable by both inputs, so bounded staleness errors immediately; it does not wait for the frontiers.";
    } else {
      const age = horizon - newest;
      if (age > bound) {
        result.classList.add("error");
        result.textContent = `Bounded-staleness error: freshest shared timestamp is ${newest}, about ${age} units behind now (${horizon}), exceeding the ${bound}-unit limit. No waiting.`;
      } else {
        result.textContent = `Served at the freshest shared timestamp, ${newest} (about ${age} units behind now). This is within the ${bound}-unit bound; no waiting.`;
      }
    }
  } else if (noOverlap || requested < oldest) {
    result.classList.add("error");
    result.textContent = `Too old: timestamp ${requested} is outside the retained shared range, which starts at ${oldest}.`;
  } else if (requested >= frontier) {
    result.classList.add("wait");
    result.textContent = `Waiting: timestamp ${requested} is not complete for both inputs; the limiting frontier is ${frontier}.`;
  } else {
    result.textContent = `Available now: both inputs retain timestamp ${requested}, and it is strictly below the limiting frontier ${frontier}.`;
  }
}

controls.forEach((control) => { control.addEventListener("input", render); control.addEventListener("change", render); });
if (new URLSearchParams(location.search).has("embed")) document.body.classList.add("embedded");
render();
