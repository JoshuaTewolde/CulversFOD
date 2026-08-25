let locations = [];
let currentIndex = 0;
const flavorCache = new Map(); // url -> { flavorName, flavorImage }

const FOD_IMAGES = {
    "Andes Mint Avalanche": "images/img-Andes-Mint-Avalanche-updated.avif",
    "Butter Pecan": "images/img-Butter-Pecan-New.avif",
    "Caramel Cashew": "images/img-Caramel-Cashew.avif",
    "Caramel Chocolate Pecan": "images/img-Caramel-Chocolate-Pecan3.avif",
    "Caramel Fudge Cookie Dough": "images/img-Caramel-Fudge-CookieDough.avif",
    "Caramel Peanut Buttercup": "images/img-Caramel-PB-Cup.Waffle-Cone.avif",
    "Caramel Pecan": "images/img-Caramel-Pecan.avif",
    "Caramel Turtle": "images/img-Caramel-Turtle.Waffle-Cone.avif",
    "Chocolate Caramel Twist": "images/img-Chocolate-Caramel-Twist2.avif",
    "Chocolate Covered Strawberry": "images/img-Chocolate-Covered-Strawberry1.avif",
    "Chocolate Heath Crunch": "images/img-Choc-Heath-Crunch.Cake-Cone.avif",
    "Chocolate Volcano": "images/img-Chocolate-Volcano2.avif",
    "Crazy for Cookie Dough": "images/img-Crazy-for-Cookie-Dough.Waffle-Cone1.avif",
    "Dark Chocolate Decadence": "images/img-Dark-Chocolate-Decadence1.avif",
    "Dark Chocolate PB Crunch": "images/img-Dark-Chocolate-PB-Crunch12.avif",
    "Devil's Food Cake": "images/img-Devils-Food-Cake.avif",
    "Double Strawberry": "images/img-Double-Strawberry.Waffle-Cone.avif",
    "Georgia Peach": "images/img-Georgia-Peach1.avif",
    "Mint Cookie": "images/img-Mint-Oreo-updated.avif",
    "Mint Explosion": "images/img-Mint-Explosion.Cake-Cone-updated.avif",
    "OREO® Cookie Cheesecake": "images/img-Oreo-Cheesecake.Waffle-Cone1.avif",
    "OREO® Cookie Overload": "images/img-Oreo-Overload.avif",
    "Pumpkin Pecan": "images/img-pumpkin-pecan.avif",
    "Raspberry Cheesecake": "images/img-Raspberry-Cheesecake.Waffle-Cone.avif",
    "Really Reese's": "images/img-Really-Reeses.Cake-Cone.avif",
    "Salted Double Caramel Pecan": "images/img-Salted-Double-Caramel-Pecan.Cake-Cone.avif",
    "Snickers Swirl": "images/img-Snicker-Swirl.avif",
    "Turtle": "images/img-Turtle.avif",
    "Turtle Cheesecake": "images/img-Turtle-Cheesecake.Cake-Cone2.avif",
    "Turtle Dove": "images/img-Turtle-Dove2.avif",
};

// Normalize legacy string URLs vs new location objects
function normalizeLocation(item) {
    if (typeof item === "string") {
        const slug = item.replace("https://www.culvers.com/restaurants/", "").replace(/\/$/, "");
        const formatted = slug.split("-").map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(" ");
        return {
            slug: slug,
            name: formatted,
            url: item.startsWith("http") ? item : `https://www.culvers.com/restaurants/${slug}`
        };
    }
    return item;
}

// Preload local images
for (const flavor in FOD_IMAGES) {
    const img = new Image();
    img.src = FOD_IMAGES[flavor];
}

document.addEventListener("DOMContentLoaded", async () => {
    chrome.storage.sync.get({ locations: [] }, async (data) => {
        locations = (data.locations || []).map(normalizeLocation);
        
        if (locations.length === 0) {
            document.getElementById("locationNav").style.display = "none";
            document.getElementById("flavorContent").style.display = "none";
            document.getElementById("popupFooter").style.display = "none";
            document.getElementById("emptyState").style.display = "flex";
            return;
        }

        document.getElementById("locationNav").style.display = "flex";
        document.getElementById("flavorContent").style.display = "flex";
        document.getElementById("popupFooter").style.display = "flex";
        document.getElementById("emptyState").style.display = "none";

        updateNavButtonsState();
        loadFlavor(currentIndex);
    });

    document.getElementById("prevBtn").addEventListener("click", () => {
        if (locations.length > 1) {
            currentIndex = (currentIndex - 1 + locations.length) % locations.length;
            updateNavButtonsState();
            loadFlavor(currentIndex);
        }
    });

    document.getElementById("nextBtn").addEventListener("click", () => {
        if (locations.length > 1) {
            currentIndex = (currentIndex + 1) % locations.length;
            updateNavButtonsState();
            loadFlavor(currentIndex);
        }
    });
});

function updateNavButtonsState() {
    const prevBtn = document.getElementById("prevBtn");
    const nextBtn = document.getElementById("nextBtn");
    const countEl = document.getElementById("locationCount");

    if (locations.length <= 1) {
        prevBtn.disabled = true;
        nextBtn.disabled = true;
        countEl.textContent = "";
    } else {
        prevBtn.disabled = false;
        nextBtn.disabled = false;
        countEl.textContent = `${currentIndex + 1} of ${locations.length}`;
    }
}

async function loadFlavor(index) {
    const loc = locations[index];
    const baseUrl = loc.url || `https://www.culvers.com/restaurants/${loc.slug}`;
    const slug = loc.slug || baseUrl.replace("https://www.culvers.com/restaurants/", "").replace(/\/$/, "");
    const calendarUrl = `https://www.culvers.com/restaurants/${slug}?tab=current`;
    const displayName = loc.name || slug.replace(/-/g, " ");

    document.getElementById("locationName").textContent = displayName;
    document.getElementById("calendarLink").href = calendarUrl;

    // Check cache
    if (flavorCache.has(baseUrl)) {
        const cached = flavorCache.get(baseUrl);
        renderFlavor(cached.flavorName, cached.flavorImage);
        return;
    }

    // Show loading state
    document.getElementById("flavorName").textContent = "Loading...";
    const imgEl = document.getElementById("flavorImage");
    imgEl.style.display = "none";
    imgEl.src = "";

    try {
        const response = await fetch(baseUrl);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const html = await response.text();

        // 1. Extract flavor name from HTML
        const flavorMatch = html.match(/<h2[^>]*>(.*?)<\/h2>/i);
        let flavorName = flavorMatch ? flavorMatch[1].trim() : "Flavor of the Day";

        // Clean HTML entities
        flavorName = decodeHTMLEntities(flavorName);

        // 2. Look up image from our local dictionary
        let flavorImage = FOD_IMAGES[flavorName] || "";

        // Fallback: check if CDN image URL is present in the HTML
        if (!flavorImage) {
            const cdnMatch = html.match(/https:\/\/cdn\.culvers\.com\/menu-item-detail\/([^"'\s>]+)/i);
            if (cdnMatch) {
                flavorImage = `https://cdn.culvers.com/menu-item-detail/${cdnMatch[1]}`;
            }
        }

        // Cache result
        flavorCache.set(baseUrl, { flavorName, flavorImage });

        renderFlavor(flavorName, flavorImage);

    } catch (err) {
        console.error("Error loading flavor:", err);
        document.getElementById("flavorName").textContent = "Unable to load flavor";
        document.getElementById("flavorImage").style.display = "none";
    }
}

function renderFlavor(name, imgSrc) {
    document.getElementById("flavorName").textContent = name;
    const imgEl = document.getElementById("flavorImage");
    if (imgSrc) {
        imgEl.src = imgSrc;
        imgEl.style.display = "block";
    } else {
        imgEl.style.display = "none";
    }
}

function decodeHTMLEntities(text) {
    const el = document.createElement("textarea");
    el.innerHTML = text;
    return el.value;
}
