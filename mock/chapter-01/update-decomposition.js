const priceInput = document.querySelector("#priceInput");
const applyButton = document.querySelector("#applyButton");
const resetButton = document.querySelector("#resetButton");
const currentRow = document.querySelector("#currentRow");
const changeRecords = document.querySelector("#changeRecords");
const timeLabel = document.querySelector("#timeLabel");
const statusMessage = document.querySelector("#statusMessage");
const resultMessage = document.querySelector("#resultMessage");
let currentPrice = 20;
let logicalTime = 0;

function renderUpdate(oldPrice, newPrice) {
  currentRow.textContent = `(7, Widget, $${newPrice})`;
  timeLabel.textContent = `time ${logicalTime}`;
  changeRecords.innerHTML = `
    <div class="same-time">
      <span class="time-chip">t = ${logicalTime}</span>
      <div class="same-time-rows">
        <span class="record-row retract">−1 (7, Widget, $${oldPrice})</span>
        <span class="record-row insert">+1 (7, Widget, $${newPrice})</span>
      </div>
    </div>`;
  statusMessage.textContent = `At time ${logicalTime}, the old row was retracted and the new row inserted.`;
  resultMessage.hidden = false;
}

applyButton.addEventListener("click", () => {
  const nextPrice = Number(priceInput.value);
  if (!Number.isFinite(nextPrice) || nextPrice < 0 || priceInput.value.trim() === "") {
    statusMessage.textContent = "Enter a valid price of zero or more.";
    statusMessage.dataset.kind = "error";
    return;
  }
  if (nextPrice === currentPrice) {
    statusMessage.textContent = "The price is unchanged, so there is no update to emit.";
    delete statusMessage.dataset.kind;
    return;
  }
  const oldPrice = currentPrice;
  currentPrice = nextPrice;
  logicalTime += 1;
  renderUpdate(oldPrice, currentPrice);
  delete statusMessage.dataset.kind;
});

resetButton.addEventListener("click", () => {
  currentPrice = 20;
  logicalTime = 0;
  priceInput.value = "25";
  currentRow.textContent = "(7, Widget, $20)";
  timeLabel.textContent = "time 0";
  changeRecords.innerHTML = '<p class="ledger-empty">Apply an edit to reveal its two changes.</p>';
  statusMessage.textContent = "Edit the price and apply the update.";
  delete statusMessage.dataset.kind;
  resultMessage.hidden = true;
});

if (new URLSearchParams(window.location.search).has("embed")) {
  document.querySelector(".back-link").hidden = true;
  document.body.classList.add("embedded");
}
