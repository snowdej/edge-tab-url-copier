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
  const active = (await chrome.tabs.query({ active: true, currentWindow: true }))[0];
  if (!active) throw new Error("No active tab found.");
  return tabsForTarget(active);
}

async function ensureOffscreenDocument() {
  const contexts = await chrome.runtime.getContexts({ contextTypes: ["OFFSCREEN_DOCUMENT"] });
  if (contexts.length) return;
  await chrome.offscreen.createDocument({
    url: "clipboard.html",
    reasons: ["CLIPBOARD"],
    justification: "Copy tab URLs after the user clicks a copy command."
  });
}

async function copyTabs(tabs) {
  const urls = tabs.map((tab) => tab.url).filter(Boolean);
  if (!urls.length) throw new Error("No copyable URLs found.");
  await ensureOffscreenDocument();
  const result = await chrome.runtime.sendMessage({
    target: "offscreen",
    type: "COPY_URLS",
    text: urls.join("\r\n")
  });
  if (!result?.ok) throw new Error(result?.error || "Clipboard copy failed.");
  await chrome.action.setBadgeBackgroundColor({ color: "#16803c" });
  await chrome.action.setBadgeText({ text: "OK" });
  setTimeout(() => chrome.action.setBadgeText({ text: "" }), 1600);
  return urls.length;
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "copy-tab-group-or-selection",
    title: "Copy selected tabs or this tab group URLs",
    contexts: ["tab"]
  });
});

chrome.contextMenus.onClicked.addListener(async (info, clickedTab) => {
  if (info.menuItemId !== "copy-tab-group-or-selection" || !clickedTab) return;
  try {
    await copyTabs(await tabsForTarget(clickedTab));
  } catch (error) {
    console.error("Could not copy tab URLs:", error);
    await chrome.action.setBadgeBackgroundColor({ color: "#b42318" });
    await chrome.action.setBadgeText({ text: "!" });
    setTimeout(() => chrome.action.setBadgeText({ text: "" }), 2600);
  }
});

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

  // Keep the popup alive while tabs are created; activate the first one only at the end.
  for (const url of safeUrls) {
    const options = { url, active: false };
    if (windowId !== undefined) options.windowId = windowId;
    if (index !== undefined) options.index = index++;
    openedTabs.push(await chrome.tabs.create(options));
  }

  const tabIds = openedTabs.map((tab) => tab.id);
  if (makeGroup) {
    const groupId = await chrome.tabs.group({ tabIds });
    const title = (groupTitle || "Pasted links").trim() || "Pasted links";
    await chrome.tabGroups.update(groupId, { title });
  } else {
    // Explicitly keep pasted tabs out of any group Edge may have inherited.
    await chrome.tabs.ungroup(tabIds);
  }

  await chrome.tabs.update(tabIds[0], { active: true });
  return openedTabs.length;
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "COPY_ACTIVE_SELECTION") {
    activeTabsToCopy()
      .then(copyTabs)
      .then((count) => sendResponse({ ok: true, count }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }
  if (message?.type === "OPEN_URL_LIST") {
    openUrls(message.urls, message.makeGroup, message.groupTitle)
      .then((count) => sendResponse({ ok: true, count }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }
});
