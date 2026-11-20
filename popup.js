const list = document.getElementById("url-list");
const status = document.getElementById("status");

document.getElementById("open").addEventListener("click", async () => {
  const lines = list.value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (!lines.length) {
    status.textContent = "Paste at least one URL first.";
    return;
  }

  const urls = [];
  for (const line of lines) {
    try {
      const url = new URL(line);
      if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error();
      urls.push(url.href);
    } catch {
      status.textContent = `Not a valid web URL: ${line}`;
      return;
    }
  }

  status.textContent = `Opening ${urls.length} tab${urls.length === 1 ? "" : "s"}…`;
  chrome.runtime.sendMessage({
    type: "OPEN_URL_LIST",
    urls,
    makeGroup: document.getElementById("make-group").checked,
    groupTitle: document.getElementById("group-name").value
  }, (result) => {
    if (chrome.runtime.lastError) {
      status.textContent = chrome.runtime.lastError.message;
    } else if (result?.ok) {
      status.textContent = `Opened ${result.count} tabs.`;
    } else {
      status.textContent = result?.error || "Could not open URLs.";
    }
  });
});

document.getElementById("copy").addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "COPY_ACTIVE_SELECTION" }, (result) => {
    if (chrome.runtime.lastError) {
      status.textContent = chrome.runtime.lastError.message;
    } else if (result?.ok) {
      status.textContent = `Copied ${result.count} URL${result.count === 1 ? "" : "s"}.`;
    } else {
      status.textContent = result?.error || "Could not copy URLs.";
    }
  });
});
