let offlineLocations = [];
let savedLocations = [];
let debounceTimer = null;
let draggedItemIndex = null;

document.addEventListener("DOMContentLoaded", async () => {
    // 1. Load offline locations database
    try {
        const res = await fetch("locations.json");
        offlineLocations = await res.json();
    } catch (err) {
        console.warn("Could not load local locations.json:", err);
    }

    // 2. Load saved locations from storage
    restoreSavedLocations();

    // 3. Bind search input events
    const searchInput = document.getElementById("searchInput");
    searchInput.addEventListener("input", (e) => {
        const query = e.target.value.trim();
        clearTimeout(debounceTimer);
        if (!query) {
            hideResults();
            return;
        }
        debounceTimer = setTimeout(() => performSearch(query), 300);
    });

    searchInput.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            hideResults();
            searchInput.value = "";
        }
    });

    // 4. Geolocation button
    document.getElementById("geoBtn").addEventListener("click", handleGeolocation);

    // 5. Manual URL accordion & button
    const manualToggle = document.getElementById("manualToggle");
    const manualContent = document.getElementById("manualContent");
    manualToggle.addEventListener("click", () => {
        const isOpen = manualContent.style.display === "block";
        manualContent.style.display = isOpen ? "none" : "block";
    });

    document.getElementById("addManualBtn").addEventListener("click", handleManualAdd);
    document.getElementById("manualInput").addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            handleManualAdd();
        }
    });
});

// Normalize location item
function normalizeLocation(item) {
    if (typeof item === "string") {
        const slug = item.replace("https://www.culvers.com/restaurants/", "").replace(/\/$/, "");
        const match = offlineLocations.find(l => l.slug === slug);
        return {
            slug: slug,
            name: match ? match.name : slug.replace(/-/g, " "),
            url: item.startsWith("http") ? item : `https://www.culvers.com/restaurants/${slug}`,
            address: ""
        };
    }
    return item;
}

// Restore saved locations from Chrome storage
function restoreSavedLocations() {
    chrome.storage.sync.get({ locations: [] }, (data) => {
        savedLocations = (data.locations || []).map(normalizeLocation);
        renderSavedLocations();
    });
}

// Render the list of saved locations with drag-and-drop & buttons
function renderSavedLocations() {
    const listContainer = document.getElementById("savedList");
    const emptyState = document.getElementById("emptyState");
    const countBadge = document.getElementById("savedCount");

    listContainer.innerHTML = "";
    countBadge.textContent = `(${savedLocations.length})`;

    if (savedLocations.length === 0) {
        emptyState.style.display = "block";
        listContainer.style.display = "none";
        return;
    }

    emptyState.style.display = "none";
    listContainer.style.display = "flex";

    savedLocations.forEach((loc, index) => {
        const item = document.createElement("div");
        item.className = "saved-item";
        item.draggable = true;
        item.setAttribute("data-idx", index);

        item.innerHTML = `
            <div class="saved-left">
                <div class="drag-handle" title="Drag to reorder">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                        <circle cx="9" cy="6" r="1.5"></circle>
                        <circle cx="15" cy="6" r="1.5"></circle>
                        <circle cx="9" cy="12" r="1.5"></circle>
                        <circle cx="15" cy="12" r="1.5"></circle>
                        <circle cx="9" cy="18" r="1.5"></circle>
                        <circle cx="15" cy="18" r="1.5"></circle>
                    </svg>
                </div>
                <div class="saved-badge">${index + 1}</div>
                <div class="saved-details">
                    <div class="saved-name">${escapeHtml(loc.name || loc.slug)}</div>
                    <a href="${escapeHtml(loc.url)}" target="_blank" class="saved-link">Store page</a>
                </div>
            </div>
            <div class="saved-actions">
                ${index > 0 ? `<button class="btn btn-secondary btn-sm move-up-btn" title="Move Up" data-idx="${index}">↑</button>` : ''}
                ${index < savedLocations.length - 1 ? `<button class="btn btn-secondary btn-sm move-down-btn" title="Move Down" data-idx="${index}">↓</button>` : ''}
                <button class="btn btn-danger btn-sm remove-btn" data-idx="${index}">Remove</button>
            </div>
        `;

        // HTML5 Drag and Drop Handlers
        item.addEventListener("dragstart", (e) => {
            draggedItemIndex = index;
            e.dataTransfer.effectAllowed = "move";
            e.dataTransfer.setData("text/plain", index);
            setTimeout(() => item.classList.add("dragging"), 0);
        });

        item.addEventListener("dragover", (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
            item.classList.add("drag-over");
        });

        item.addEventListener("dragleave", () => {
            item.classList.remove("drag-over");
        });

        item.addEventListener("drop", (e) => {
            e.preventDefault();
            item.classList.remove("drag-over");
            const targetIndex = index;
            if (draggedItemIndex !== null && draggedItemIndex !== targetIndex) {
                const movedItem = savedLocations.splice(draggedItemIndex, 1)[0];
                savedLocations.splice(targetIndex, 0, movedItem);
                saveAndSync();
            }
        });

        item.addEventListener("dragend", () => {
            item.classList.remove("dragging");
            document.querySelectorAll(".saved-item").forEach(el => el.classList.remove("drag-over"));
            draggedItemIndex = null;
        });

        listContainer.appendChild(item);
    });

    // Button event listeners
    listContainer.querySelectorAll(".remove-btn").forEach(btn => {
        btn.addEventListener("click", (e) => {
            const idx = parseInt(e.target.getAttribute("data-idx"), 10);
            removeLocation(idx);
        });
    });

    listContainer.querySelectorAll(".move-up-btn").forEach(btn => {
        btn.addEventListener("click", (e) => {
            const idx = parseInt(e.target.getAttribute("data-idx"), 10);
            moveLocation(idx, -1);
        });
    });

    listContainer.querySelectorAll(".move-down-btn").forEach(btn => {
        btn.addEventListener("click", (e) => {
            const idx = parseInt(e.target.getAttribute("data-idx"), 10);
            moveLocation(idx, 1);
        });
    });
}

// Move location up/down
function moveLocation(index, delta) {
    const newIdx = index + delta;
    if (newIdx < 0 || newIdx >= savedLocations.length) return;
    const temp = savedLocations[index];
    savedLocations[index] = savedLocations[newIdx];
    savedLocations[newIdx] = temp;
    saveAndSync();
}

// Remove location
function removeLocation(index) {
    const removed = savedLocations.splice(index, 1)[0];
    saveAndSync();
    showToast(`Removed ${removed.name || "location"}`);
    refreshSearchResultButtons();
}

// Save to chrome.storage.sync
function saveAndSync() {
    chrome.storage.sync.set({ locations: savedLocations }, () => {
        renderSavedLocations();
    });
}

// Add location object
function addLocation(locationObj) {
    const isAlreadySaved = savedLocations.some(l => l.slug === locationObj.slug || l.url === locationObj.url);
    if (isAlreadySaved) {
        showToast("Location is already in your saved list");
        return;
    }

    savedLocations.push(locationObj);
    saveAndSync();
    showToast(`Added ${locationObj.name}`);
    refreshSearchResultButtons();
}

// Perform hybrid search (Culver's Live Locator API + Offline Dataset)
async function performSearch(query) {
    const spinner = document.getElementById("searchSpinner");
    spinner.style.display = "block";

    let liveResults = [];
    try {
        const res = await fetch(`https://www.culvers.com/api/locator/getLocations?location=${encodeURIComponent(query)}`);
        if (res.ok) {
            const data = await res.json();
            if (data.isSuccessful && data.data && data.data.geofences) {
                liveResults = data.data.geofences.map(g => ({
                    slug: g.metadata.slug,
                    name: g.description,
                    address: `${g.metadata.street || ''}, ${g.metadata.city || ''}, ${g.metadata.state || ''} ${g.metadata.postalCode || ''}`.replace(/^, /, '').trim(),
                    url: `https://www.culvers.com/restaurants/${g.metadata.slug}`,
                    flavor: g.metadata.flavorOfDayName || null
                }));
            }
        }
    } catch (err) {
        console.warn("Live locator search failed, falling back to offline search:", err);
    }

    // Offline dataset search
    const qLower = query.toLowerCase();
    const offlineMatches = offlineLocations.filter(loc => {
        return (
            (loc.name && loc.name.toLowerCase().includes(qLower)) ||
            (loc.city && loc.city.toLowerCase().includes(qLower)) ||
            (loc.state && loc.state.toLowerCase() === qLower) ||
            (loc.slug && loc.slug.toLowerCase().includes(qLower))
        );
    }).slice(0, 10).map(loc => ({
        slug: loc.slug,
        name: loc.name,
        address: `${loc.city}, ${loc.state}`,
        url: loc.url,
        flavor: null
    }));

    // Merge results, giving preference to live results
    const combinedMap = new Map();
    liveResults.forEach(item => combinedMap.set(item.slug, item));
    offlineMatches.forEach(item => {
        if (!combinedMap.has(item.slug)) {
            combinedMap.set(item.slug, item);
        }
    });

    const finalResults = Array.from(combinedMap.values());
    renderSearchResults(finalResults, query);
    spinner.style.display = "none";
}

// Render search results
function renderSearchResults(results, query) {
    const container = document.getElementById("resultsContainer");
    const list = document.getElementById("resultsList");
    list.innerHTML = "";

    if (results.length === 0) {
        list.innerHTML = `
            <div style="padding: 16px; text-align: center; color: #64748b; font-size: 13px;">
                No locations found matching "<strong>${escapeHtml(query)}</strong>".<br>
                Try searching by city, 2-letter state code, or 5-digit ZIP code.
            </div>
        `;
        container.style.display = "block";
        return;
    }

    results.forEach(item => {
        const isSaved = savedLocations.some(l => l.slug === item.slug || l.url === item.url);
        const card = document.createElement("div");
        card.className = "result-item";
        card.setAttribute("data-slug", item.slug);

        card.innerHTML = `
            <div class="result-info">
                <div class="result-name">${escapeHtml(item.name)}</div>
                <div class="result-address">${escapeHtml(item.address || '')}</div>
                ${item.flavor ? `<div class="result-flavor-badge">Today: ${escapeHtml(item.flavor)}</div>` : ''}
            </div>
            <div>
                <button class="btn btn-sm ${isSaved ? 'btn-added' : 'btn-primary'} add-result-btn" data-slug="${item.slug}">
                    ${isSaved ? 'Added' : 'Add'}
                </button>
            </div>
        `;

        const addBtn = card.querySelector(".add-result-btn");
        if (!isSaved) {
            addBtn.addEventListener("click", () => {
                addLocation({
                    slug: item.slug,
                    name: item.name,
                    address: item.address,
                    url: item.url
                });
            });
        }

        list.appendChild(card);
    });

    container.style.display = "block";
}

// Update add button states in search list
function refreshSearchResultButtons() {
    const buttons = document.querySelectorAll(".add-result-btn");
    buttons.forEach(btn => {
        const slug = btn.getAttribute("data-slug");
        const isSaved = savedLocations.some(l => l.slug === slug);
        if (isSaved) {
            btn.className = "btn btn-sm btn-added add-result-btn";
            btn.textContent = "Added";
            btn.disabled = true;
        } else {
            btn.className = "btn btn-sm btn-primary add-result-btn";
            btn.textContent = "Add";
            btn.disabled = false;
        }
    });
}

function hideResults() {
    document.getElementById("resultsContainer").style.display = "none";
}

// Geolocation
function handleGeolocation() {
    const geoBtn = document.getElementById("geoBtn");
    const originalText = geoBtn.textContent;

    if (!navigator.geolocation) {
        showToast("Geolocation is not supported by your browser");
        return;
    }

    geoBtn.textContent = "Locating...";
    geoBtn.disabled = true;

    navigator.geolocation.getCurrentPosition(
        async (position) => {
            const lat = position.coords.latitude;
            const long = position.coords.longitude;
            geoBtn.textContent = originalText;
            geoBtn.disabled = false;

            const searchInput = document.getElementById("searchInput");
            searchInput.value = "Nearby Locations";

            const spinner = document.getElementById("searchSpinner");
            spinner.style.display = "block";

            try {
                const res = await fetch(`https://www.culvers.com/api/locator/getLocations?lat=${lat}&long=${long}`);
                let results = [];
                if (res.ok) {
                    const data = await res.json();
                    if (data.isSuccessful && data.data && data.data.geofences) {
                        results = data.data.geofences.map(g => ({
                            slug: g.metadata.slug,
                            name: g.description,
                            address: `${g.metadata.street || ''}, ${g.metadata.city || ''}, ${g.metadata.state || ''} ${g.metadata.postalCode || ''}`.replace(/^, /, '').trim(),
                            url: `https://www.culvers.com/restaurants/${g.metadata.slug}`,
                            flavor: g.metadata.flavorOfDayName || null
                        }));
                    }
                }
                spinner.style.display = "none";
                renderSearchResults(results, "My Location");
            } catch (err) {
                spinner.style.display = "none";
                showToast("Could not find locations for your coordinates");
            }
        },
        (err) => {
            geoBtn.textContent = originalText;
            geoBtn.disabled = false;
            console.error("Geolocation error:", err);
            showToast("Location permission denied or unavailable");
        },
        { timeout: 10000, enableHighAccuracy: false }
    );
}

// Manual URL Add Handler
function handleManualAdd() {
    const input = document.getElementById("manualInput");
    const url = input.value.trim();

    if (!url.startsWith("https://www.culvers.com/restaurants/")) {
        showToast("Please enter a valid Culver's restaurant URL");
        return;
    }

    const slug = url.replace("https://www.culvers.com/restaurants/", "").replace(/\/$/, "");
    const match = offlineLocations.find(l => l.slug === slug);
    const locObj = {
        slug: slug,
        name: match ? match.name : slug.replace(/-/g, " "),
        address: match ? `${match.city}, ${match.state}` : "",
        url: url
    };

    addLocation(locObj);
    input.value = "";
}

// Toast notification helper
let toastTimer = null;
function showToast(message) {
    const toast = document.getElementById("toast");
    toast.textContent = message;
    toast.className = "toast show";
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
        toast.className = "toast";
    }, 2500);
}

function escapeHtml(str) {
    if (!str) return '';
    return str.toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
