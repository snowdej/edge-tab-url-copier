const MENU_ID = "copy-tab-group-or-selection";

// ---------- Settings ----------

async function lineEnding() {
  const { eol } = await chrome.storage.sync.get("eol");
  if (eol === "crlf") return "\r\n";
  if (eol === "lf") return "\n";
  // No saved choice yet: match the operating system.
  const { os } = await chrome.runtime.getPlatformInfo();
  return os === "win" ? "\r\n" : "\n";
}

// ---------- Badge feedback ----------

let badgeTimer;
async function flashBadge(text, color, ms) {
  clearTimeout(badgeTimer);
  await chrome.action.setBadgeBackgroundColor({ color });
  await chrome.action.setBadgeText({ text });
  // The service worker stays alive well past this delay after an event.
  badgeTimer = setTimeout(() => chrome.action.setBadgeText({ text: "" }), ms);
}

// ---------- Choosing tabs ----------

async function tabsForTarget(targetTab) {
  const windowTabs = await chrome.tabs.query({ windowId: targetTab.windowId });
  const highlighted = windowTabs.filter((tab) => tab.highlighted);
  if (highlighted.length > 1) return highlighted;

  if (targetTab.groupId !== chrome.tabGroups.TAB_GROUP_ID_NONE) {
    return chrome.tabs.query({ groupId: targetTab.groupId, windowId: targetTab.windowId });
  }
  return [targetTab];
}

async function activeTabsToCopy() {
  const active = (await chrome.tabs.query({ active: true, lastFocusedWindow: true }))[0];
  if (!active) throw new Error("No active tab found.");
  return tabsForTarget(active);
}

// ---------- Clipboard (via offscreen document) ----------

async function writeClipboard(text) {
  await chrome.offscreen.createDocument({
    url: "clipboard.html",
    reasons: ["CLIPBOARD"],
    justification: "Copy tab URLs after the user clicks a copy command."
  });
  try {
    const result = await chrome.runtime.sendMessage({ target: "offscreen", type: "COPY_URLS", text });
    if (!result?.ok) throw new Error(result?.error || "Clipboard copy failed.");
  } finally {
    await chrome.offscreen.closeDocument().catch(() => {});
  }
}

// Copies run one at a time, so only one offscreen document ever exists.
let copyQueue = Promise.resolve();

function copyTabs(tabs) {
  const run = async () => {
    const urls = tabs.map((tab) => tab.url).filter(Boolean);
    if (!urls.length) throw new Error("No copyable URLs found.");
    await writeClipboard(urls.join(await lineEnding()));
    await flashBadge("OK", "#16803c", 1600);
    return urls.length;
  };
  const result = copyQueue.then(run, run);
  copyQueue = result.catch(() => {});
  return result;
}

async function copyWithBadgeOnError(getTabs) {
  try {
    await copyTabs(await getTabs());
  } catch (error) {
    console.error("Could not copy tab URLs:", error);
    await flashBadge("!", "#b42318", 2600);
  }
}

// ---------- Opening pasted URLs ----------

async function openUrls(urls, makeGroup, groupTitle) {
  if (!Array.isArray(urls) || urls.length === 0) throw new Error("No URLs to open.");
  const safeUrls = urls.map((value) => {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new Error(`Only http and https URLs are allowed: ${value}`);
    }
    return url.href;
  });

  const activeTab = (await chrome.tabs.query({ active: true, lastFocusedWindow: true }))[0];
  const windowId = activeTab?.windowId;
  let index = activeTab ? activeTab.index + 1 : undefined;
  const openedTabs = [];
  let failure;

  // Keep the popup alive while tabs are created; activate the first one only at the end.
  for (const url of safeUrls) {
    const options = { url, active: false };
    if (windowId !== undefined) options.windowId = windowId;
    if (index !== undefined) options.index = index++;
    try {
      openedTabs.push(await chrome.tabs.create(options));
    } catch (error) {
      failure = `Stopped at ${url}: ${error.message}`;
      break;
    }
  }

  // Tidy up whatever did open, even after a failure.
  const tabIds = openedTabs.map((tab) => tab.id);
  if (tabIds.length) {
    if (makeGroup) {
      const groupId = await chrome.tabs.group({ tabIds });
      const title = (groupTitle || "").trim() || "Pasted links";
      await chrome.tabGroups.update(groupId, { title });
    } else {
      // Explicitly keep pasted tabs out of any group Edge may have inherited.
      await chrome.tabs.ungroup(tabIds);
    }
    await chrome.tabs.update(tabIds[0], { active: true });
  }

  return { count: openedTabs.length, total: safeUrls.length, failure };
}

// ---------- Wiring ----------

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: MENU_ID,
    title: "Copy selected tabs or this tab group URLs",
    contexts: ["tab"]
  });
});

chrome.contextMenus.onClicked.addListener((info, clickedTab) => {
  if (info.menuItemId !== MENU_ID || !clickedTab) return;
  copyWithBadgeOnError(() => tabsForTarget(clickedTab));
});

chrome.commands.onCommand.addListener((command) => {
  if (command === "copy-urls") copyWithBadgeOnError(activeTabsToCopy);
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Only accept messages from this extension's own pages.
  if (sender.id !== chrome.runtime.id || message?.target === "offscreen") return;

  if (message?.type === "COPY_ACTIVE_SELECTION") {
    activeTabsToCopy()
      .then(copyTabs)
      .then((count) => sendResponse({ ok: true, count }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }
  if (message?.type === "OPEN_URL_LIST") {
    openUrls(message.urls, message.makeGroup, message.groupTitle)
      .then((result) => sendResponse({ ok: !result.failure, ...result }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }
});
