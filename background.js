chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "fetchFlavor") {
        fetch(message.url)
            .then(res => res.text())
            .then(text => sendResponse({ html: text }))
            .catch(err => sendResponse({ error: err.toString() }));
        return true; // keep message channel open for async sendResponse
    }

    if (message.action === "searchLocations") {
        const queryUrl = message.query
            ? `https://www.culvers.com/api/locator/getLocations?location=${encodeURIComponent(message.query)}`
            : `https://www.culvers.com/api/locator/getLocations?lat=${message.lat}&long=${message.long}`;

        fetch(queryUrl)
            .then(res => res.json())
            .then(data => sendResponse({ data }))
            .catch(err => sendResponse({ error: err.toString() }));
        return true;
    }
});
