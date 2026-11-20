const CONFIRM_ABOVE = 20;

const list = document.getElementById("url-list");
const status = document.getElementById("status");
const openButton = document.getElementById("open");
const makeGroup = document.getElementById("make-group");
const groupName = document.getElementById("group-name");
const eolSelect = document.getElementById("eol");

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

// ---------- Group name only matters when grouping ----------

makeGroup.addEventListener("change", () => {
  groupName.disabled = !makeGroup.checked;
  if (makeGroup.checked) groupName.select();
});

// ---------- Line-ending preference ----------

chrome.storage.sync.get("eol").then(({ eol }) => {
  eolSelect.value = eol || "auto";
});
eolSelect.addEventListener("change", () => {
  if (eolSelect.value === "auto") chrome.storage.sync.remove("eol");
  else chrome.storage.sync.set({ eol: eolSelect.value });
});

// ---------- Keyboard shortcut hint ----------

chrome.commands.getAll().then((commands) => {
  const shortcut = commands.find((c) => c.name === "copy-urls")?.shortcut;
  if (shortcut) {
    document.getElementById("shortcut").textContent = shortcut;
    document.getElementById("shortcut-hint").hidden = false;
  }
});

// ---------- Opening pasted URLs ----------

let pendingConfirm = null; // the exact list the user was asked to confirm

function resetConfirm() {
  pendingConfirm = null;
  openButton.classList.remove("confirm");
  openButton.textContent = "Open pasted URLs";
}
list.addEventListener("input", resetConfirm);

function parseUrls() {
  const lines = list.value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (!lines.length) throw new Error("Paste at least one URL first.");
  return lines.map((line) => {
    let url;
    try {
      url = new URL(line);
    } catch {
      throw new Error(`Not a valid web URL: ${line}`);
    }
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new Error(`Not a valid web URL: ${line}`);
    }
    return url.href;
  });
}

openButton.addEventListener("click", () => {
  let urls;
  try {
    urls = parseUrls();
  } catch (error) {
    status.textContent = error.message;
    return;
  }

  // Ask once before opening a large batch.
  if (urls.length > CONFIRM_ABOVE && pendingConfirm !== list.value) {
    pendingConfirm = list.value;
    openButton.classList.add("confirm");
    openButton.textContent = `Really open ${urls.length} tabs? Click again to confirm`;
    status.textContent = "";
    return;
  }
  resetConfirm();

  status.textContent = `Opening ${plural(urls.length, "tab")}…`;
  chrome.runtime.sendMessage({
    type: "OPEN_URL_LIST",
    urls,
    makeGroup: makeGroup.checked,
    groupTitle: groupName.value
  }, (result) => {
    if (chrome.runtime.lastError) {
      status.textContent = chrome.runtime.lastError.message;
    } else if (result?.failure) {
      status.textContent = `Opened ${result.count} of ${result.total}. ${result.failure}`;
    } else if (result?.ok) {
      status.textContent = `Opened ${plural(result.count, "tab")}.`;
    } else {
      status.textContent = result?.error || "Could not open URLs.";
    }
  });
});

// ---------- Copying ----------

document.getElementById("copy").addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "COPY_ACTIVE_SELECTION" }, (result) => {
    if (chrome.runtime.lastError) {
      status.textContent = chrome.runtime.lastError.message;
    } else if (result?.ok) {
      status.textContent = `Copied ${plural(result.count, "URL")}.`;
    } else {
      status.textContent = result?.error || "Could not copy URLs.";
    }
  });
});
