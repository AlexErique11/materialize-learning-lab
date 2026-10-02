const controls = {
  source: document.querySelector("#sourceLag"),
  transform: document.querySelector("#transformDelay"),
  join: document.querySelector("#joinDelay"),
  query: document.querySelector("#queryDelay"),
  target: document.querySelector("#target"),
};

function render() {
  const source = Number(controls.source.value);
  const transform = Number(controls.transform.value);
  const join = Number(controls.join.value);
  const query = Number(controls.query.value);
  const cleanLag = source + transform;
  const joinedLag = cleanLag + join;
  const nodes = [
    { id:"source", name:"Orders source", type:"Input", lag:source, local:source },
    { id:"clean", name:"Clean orders", type:"Maintained view", lag:cleanLag, local:transform },
    { id:"joined", name:"Joined dashboard", type:"Materialized output", lag:joinedLag, local:join },
    { id:"served", name:"Dashboard response", type:"Serving query", lag:joinedLag, local:0 },
  ];
  const selected = controls.target.value;
  document.querySelector("#sourceLagValue").textContent = source;
  document.querySelector("#transformDelayValue").textContent = transform;
  document.querySelector("#joinDelayValue").textContent = join;
  document.querySelector("#queryDelayValue").textContent = query;
  document.querySelector("#graph").innerHTML = nodes.map((node) => `<article class="node${node.id === selected ? " selected" : ""}"><small>${node.type}</small><strong>${node.name}</strong><span class="metric">data lag ≈ ${node.lag}s</span></article>`).join("");
  const selectedNode = nodes.find((node) => node.id === selected);
  let inherited = 0;
  let local = 0;
  if (selected === "clean") { inherited = source; local = transform; }
  if (selected === "joined") { inherited = cleanLag; local = join; }
  if (selected === "served") { inherited = joinedLag; local = 0; }
  document.querySelector("#inheritedLag").textContent = `≈ ${inherited} sec`;
  document.querySelector("#localLag").textContent = selected === "served" ? "0 sec in data (query is separate)" : `≈ ${local} sec`;
  document.querySelector("#queryReadout").textContent = selected === "served"
    ? `The response contains data about ${selectedNode.lag} seconds behind the simulated wall clock and takes about ${query} ms to return.`
    : `This output's data is about ${selectedNode.lag} seconds behind. Serving-query latency is ${query} ms, but it does not change the data frontier.`;
}

Object.values(controls).forEach((control) => control.addEventListener("input", render));
controls.target.addEventListener("change", render);
if (new URLSearchParams(location.search).has("embed")) document.body.classList.add("embedded");
render();
