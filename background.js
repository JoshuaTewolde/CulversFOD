chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "fetchFlavor") {
        fetch(message.url)
            .then(res => res.text())
            .then(text => sendResponse({ html: text }))
            .catch(err => sendResponse({ error: err.toString() }));
        return true; // keep message channel open for async sendResponse
    }
});
