# Group & Selected Tab URL Copier

A small Microsoft Edge extension (Manifest V3) for moving lists of tab URLs in and out of the browser.

- **Copy** the URLs of your selected tabs, or of a whole tab group, to the clipboard.
- **Open** a pasted list of URLs as tabs, optionally in a new named tab group.

No network requests, no tracking, no data stored except your line-ending preference.

## Usage

### Copying URLs

Use any of these three ways to copy:

- **Toolbar popup:** click **Copy selected tabs or active group**.
- **Keyboard:** press <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>C</kbd> (change it at `edge://extensions/shortcuts`).
- **Tab right-click menu:** choose **Copy selected tabs or this tab group URLs**.

The extension picks which tabs to copy in this order:

1. If several tabs are highlighted (Ctrl/Shift-click), it copies those.
2. Otherwise, if the tab is in a group, it copies the whole group.
3. Otherwise, it copies just that tab.

URLs are copied one per line. The popup lets you choose Windows (CRLF) or Unix (LF) line endings. The default matches your operating system. The toolbar badge briefly shows **OK** on success or **!** on failure.

### Opening URLs

1. Click the toolbar icon and paste a list of URLs, one per line.
2. Optionally tick **Put these tabs in a new group** and name the group.
3. Click **Open pasted URLs**.

Only `http` and `https` links are accepted. If you paste more than 20 URLs, the button asks you to confirm. Tabs open next to the current tab.

## Install

**From source (developer mode):**

1. Open `edge://extensions` and turn on **Developer mode**.
2. Click **Load unpacked** and select this folder.
3. Optionally pin the extension to the toolbar.

## Permissions

| Permission | Why |
|---|---|
| `tabs`, `tabGroups` | Read the URLs of the tabs you choose to copy; open and group pasted URLs. |
| `contextMenus` | Add the right-click tab command. |
| `clipboardWrite`, `offscreen` | Write to the clipboard, only when you trigger a copy. The clipboard is never read. |
| `storage` | Remember your line-ending preference. |

Edge describes the `tabs` permission as "read your browsing history". The extension only reads the URLs of tabs you ask it to copy, at the moment you ask. See [PRIVACY.md](PRIVACY.md).

## Packaging for the Edge Add-ons store

```powershell
Compress-Archive -Force -DestinationPath ..\tab-url-copier.zip -Path manifest.json,background.js,popup.html,popup.js,clipboard.html,clipboard.js,icons
```

## License

[MIT](LICENSE)
