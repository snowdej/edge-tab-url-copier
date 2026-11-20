// Writes text to the clipboard from the offscreen document.
// Uses a copy-event handler with setData so the text goes to the clipboard
// exactly as given (copying a textarea selection would rewrite line endings).
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.target !== "offscreen" || message?.type !== "COPY_URLS") return;

  let written = false;
  const onCopy = (event) => {
    event.clipboardData.setData("text/plain", message.text);
    event.preventDefault();
    written = true;
  };

  document.addEventListener("copy", onCopy, { once: true });
  try {
    const ok = document.execCommand("copy");
    if (!ok || !written) throw new Error("The browser refused the clipboard write.");
    sendResponse({ ok: true });
  } catch (error) {
    sendResponse({ ok: false, error: error.message });
  } finally {
    document.removeEventListener("copy", onCopy);
  }
});
