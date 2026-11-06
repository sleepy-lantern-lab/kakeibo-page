const STORAGE_KEY = "kakeibo.entries.v1";

const form = document.querySelector("form");
const dateInput = document.querySelector("#entry-date");
const itemInput = document.querySelector("#entry-item");
const typeInput = document.querySelector("#entry-type");
const amountInput = document.querySelector("#entry-amount");
const submitButton = form.querySelector('button[type="submit"]');
const entriesBody = document.querySelector("table tbody");
const balanceOutput = document.querySelector("output[aria-label='差引残高']");
const message = document.querySelector("#app-message");
const yenFormatter = new Intl.NumberFormat("ja-JP");

let entries = [];

function showError(text) {
  message.textContent = text;
  message.hidden = false;
}

function isEntry(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    typeof value.date === "string" &&
    typeof value.item === "string" &&
    (value.type === "income" || value.type === "expense") &&
    Number.isSafeInteger(value.amount) &&
    value.amount > 0
  );
}

function loadEntries() {
  const savedEntries = localStorage.getItem(STORAGE_KEY);
  if (savedEntries === null) {
    return [];
  }

  const parsedEntries = JSON.parse(savedEntries);
  if (!Array.isArray(parsedEntries) || !parsedEntries.every(isEntry)) {
    throw new Error("保存データの形式が正しくありません。");
  }
  return parsedEntries;
}

function renderEntries() {
  entriesBody.replaceChildren();

  if (entries.length === 0) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 4;
    cell.textContent = "登録データはありません";
    row.append(cell);
    entriesBody.append(row);
    balanceOutput.textContent = "0円";
    return;
  }

  let balance = 0n;
  for (const entry of entries) {
    const row = document.createElement("tr");
    const values = [
      entry.date,
      entry.item,
      entry.type === "income" ? "収入" : "支出",
      `${yenFormatter.format(entry.amount)}円`,
    ];

    for (const value of values) {
      const cell = document.createElement("td");
      cell.textContent = value;
      row.append(cell);
    }
    entriesBody.append(row);
    const amount = BigInt(entry.amount);
    balance += entry.type === "income" ? amount : -amount;
  }

  balanceOutput.textContent = `${yenFormatter.format(balance)}円`;
}

function getLocalDate() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

form.addEventListener("submit", (event) => {
  event.preventDefault();

  if (!form.reportValidity()) {
    return;
  }

  const amount = Number(amountInput.value);
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    showError("金額は1円以上の半角数字で入力してください。");
    amountInput.focus();
    return;
  }

  const newEntry = {
    date: dateInput.value,
    item: itemInput.value.trim(),
    type: typeInput.value,
    amount,
  };
  if (!newEntry.item) {
    showError("品目を入力してください。");
    itemInput.focus();
    return;
  }

  const updatedEntries = [...entries, newEntry];
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedEntries));
  } catch {
    showError("データを保存できませんでした。ブラウザーの保存容量や設定を確認してください。");
    return;
  }

  entries = updatedEntries;
  message.hidden = true;
  renderEntries();
  form.reset();
  dateInput.value = getLocalDate();
});

try {
  entries = loadEntries();
  renderEntries();
  dateInput.value = getLocalDate();
} catch {
  showError("保存データを読み込めませんでした。データを保護するため、登録を停止しています。");
  submitButton.disabled = true;
}
