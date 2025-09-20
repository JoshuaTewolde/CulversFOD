let locations = [];
let currentIndex = 0;

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


// Preload all images at startup --- important to prevent delays
// const preloadedImages = {};
// for (const flavor in FOD_IMAGES) {
//     const img = new Image();
//     img.src = FOD_IMAGES[flavor];
//     preloadedImages[flavor] = img;
// }

for (const flavor in FOD_IMAGES) {
    const img = new Image();
    img.src = FOD_IMAGES[flavor];
}



document.addEventListener("DOMContentLoaded", async () => {
    // Load saved locations
    chrome.storage.sync.get({ locations: [] }, async (data) => {
        locations = data.locations;
        if (locations.length === 0) {
            document.getElementById("flavorName").textContent = "No locations saved!";
            document.getElementById("flavorImage").style.display = "none";
            document.getElementById("locationName").textContent = "Add one in settings.";
            return;
        }
        loadFlavor(currentIndex);
    });

    // Setup nav buttons
    document.getElementById("prevBtn").addEventListener("click", () => {
        if (locations.length > 1) {
            currentIndex = (currentIndex - 1 + locations.length) % locations.length;
            loadFlavor(currentIndex);
        }
    });

    document.getElementById("nextBtn").addEventListener("click", () => {
        if (locations.length > 1) {
            currentIndex = (currentIndex + 1) % locations.length;
            loadFlavor(currentIndex);
        }
    });
});

async function loadFlavor(index) {
    const url = locations[index];
    document.getElementById("locationName").textContent = url.replace("https://www.culvers.com/restaurants/", "");

    // Show temporary "loading" state
    document.getElementById("flavorName").textContent = "Loading...";
    document.getElementById("flavorImage").src = "";
    document.getElementById("flavorImage").style.display = "none";

    try {
        // Fetch HTML
        const response = await fetch(url);
        const html = await response.text();

        // Extract flavor name with regex (Culver's has `<h2 class="Title">Flavor Name</h2>`)
        const flavorMatch = html.match(/<h2[^>]*>(.*?)<\/h2>/i);
        let flavorName = flavorMatch ? flavorMatch[1].trim() : "Unknown Flavor";

        // Look up image from our local dictionary
        const flavorImage = FOD_IMAGES[flavorName] || ""; //used to be FOD_IMAGES but changed to preloaded to prevent delays

        document.getElementById("flavorName").textContent = flavorName;
        if (flavorImage) {
            document.getElementById("flavorImage").src = flavorImage;
            document.getElementById("flavorImage").style.display = "block";
        } else {
            document.getElementById("flavorImage").style.display = "none";
        }

    } catch (err) {
        console.error("Error loading flavor:", err);
        document.getElementById("flavorName").textContent = "Error loading flavor.";
        document.getElementById("flavorImage").style.display = "none";
    }
}

function fetchFlavorHTML(url) {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ action: "fetchFlavor", url }, (response) => {
            if (response.error) {
                reject(response.error);
            } else {
                resolve(response.html);
            }
        });
    });
}

