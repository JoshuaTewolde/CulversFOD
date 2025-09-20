document.addEventListener("DOMContentLoaded", restoreOptions);
document.getElementById("addLocation").addEventListener("click", addLocation);
document.getElementById("locationInput").addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
        e.preventDefault();
        addLocation();
    }
});


function addLocation() {
    const input = document.getElementById("locationInput");
    const url = input.value.trim();

    // Simple validation
    if (!url.startsWith("https://www.culvers.com/restaurants/")) {
        alert("Please enter a valid Culver's restaurant URL");
        return;
    }

    chrome.storage.sync.get({ locations: [] }, (data) => {
        const locations = data.locations;
        if (!locations.includes(url)) {
            locations.push(url);
            chrome.storage.sync.set({ locations }, () => {
                input.value = "";
                restoreOptions();
            });
        } else {
            alert("That location is already saved.");
        }
    });
}

function restoreOptions() {
    chrome.storage.sync.get({ locations: [] }, (data) => {
        const container = document.getElementById("locationsList");
        container.innerHTML = "";

        data.locations.forEach((loc, index) => {
            const div = document.createElement("div");
            div.className = "location-item";
            div.textContent = loc.replace("https://www.culvers.com/restaurants/", "");

            const removeBtn = document.createElement("button");
            removeBtn.textContent = "Remove";
            removeBtn.addEventListener("click", () => removeLocation(index));

            div.appendChild(removeBtn);
            container.appendChild(div);
        });
    });
}

function removeLocation(index) {
    chrome.storage.sync.get({ locations: [] }, (data) => {
        const locations = data.locations;
        locations.splice(index, 1);
        chrome.storage.sync.set({ locations }, restoreOptions);
    });
}
