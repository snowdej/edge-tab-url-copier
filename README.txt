Group & Selected Tab URL Copier

Toolbar icon:
- Paste a plain list of URLs, one per line, and click Open pasted URLs to open a tab for each.
- Optionally tick “Put these tabs in a new group” and name the group. A plain URL list does not carry source-group information, so group creation is an explicit choice.
- Click Copy selected tabs or active group to copy multiple highlighted tabs, or the active tab's whole group when there is no multi-selection.

Tab context menu:
- Right-click a tab and choose “Copy selected tabs or this tab group URLs”. If multiple tabs are highlighted, those are copied. Otherwise, if the clicked tab belongs to a group, that whole group is copied. If neither applies, just that tab is copied.

Copied URLs are joined with Windows CRLF line endings (\r\n). Only http and https links are opened. Opening runs in the background so the popup closing on the first active tab does not stop the rest of the list. No clipboard-read permission is used; paste the list into the extension popup yourself. The extension makes no network requests and stores no data.

Install unpacked:
1. Extract this ZIP to a folder.
2. Open edge://extensions in Edge.
3. Turn on Developer mode.
4. Choose Load unpacked and select the extracted folder.
5. Pin the extension to the toolbar if desired.

Permissions:
- tabs and tabGroups: read URLs from the selected tabs or active group.
- contextMenus: add the right-click tab command.
- clipboardWrite and offscreen: write copied URLs to the clipboard after you trigger a copy action.
