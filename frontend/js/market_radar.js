// File: frontend/js/market_radar.js

let map;
let geoJsonLayer;
let salesBubbleLayer;

const cityCentroids = {
    "Delhi": { lat: 28.7041, lng: 77.1025 }, "Bangalore": { lat: 12.9716, lng: 77.5946 }, 
    "Mumbai": { lat: 19.0760, lng: 72.8777 }, "Chennai": { lat: 13.0827, lng: 80.2707 }, 
    "Hyderabad": { lat: 17.3850, lng: 78.4867 }, "Kolkata": { lat: 22.5726, lng: 88.3639 },
    "Pune": { lat: 18.5204, lng: 73.8567 }, "Ahmedabad": { lat: 23.0225, lng: 72.5714 }
};

document.addEventListener('DOMContentLoaded', async () => {
    initializeMap();
    setupEventListeners();
    await populateInitialDropdowns(); 
    loadMarketData();
});

function initializeMap() {
    map = L.map('map', { zoomControl: false }).setView([22.5937, 78.9629], 5);
    L.control.zoom({ position: 'topright' }).addTo(map);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20
    }).addTo(map);
}

function setupEventListeners() {
    document.getElementById('sidebar-toggle')?.addEventListener('click', () => {
        document.getElementById('sidebar').classList.toggle('collapsed');
        setTimeout(() => map.invalidateSize(), 300);
    });

    document.getElementById('show-data-btn')?.addEventListener('click', loadMarketData);
    
    document.querySelectorAll('input[name="layer"]').forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            if (checkbox.value === 'external' && geoJsonLayer) {
                map.hasLayer(geoJsonLayer) ? map.removeLayer(geoJsonLayer) : map.addLayer(geoJsonLayer);
            }
            if (checkbox.value === 'internal' && salesBubbleLayer) {
                map.hasLayer(salesBubbleLayer) ? map.removeLayer(salesBubbleLayer) : map.addLayer(salesBubbleLayer);
            }
        });
    });

    document.getElementById('region').addEventListener('change', e => {
        const regionName = e.target.value;
        if (regionName && cityCentroids[regionName]) {
            map.setView([cityCentroids[regionName].lat, cityCentroids[regionName].lng], 8);
        } else {
            map.setView([22.5937, 78.9629], 5);
        }
    });

    document.getElementById('category').addEventListener('change', e => {
        const selectedCategory = e.target.value;
        updateProductDropdown(selectedCategory);
    });
}

const populateSelect = (selectId, options, defaultLabel) => {
    const select = document.getElementById(selectId);
    select.innerHTML = `<option value="">${defaultLabel}</option>`;
    options.forEach(opt => {
        const optionEl = document.createElement('option');
        optionEl.value = opt;
        optionEl.textContent = opt;
        select.appendChild(optionEl);
    });
};

async function populateInitialDropdowns() {
    try {
        const res = await fetch("http://127.0.0.1:8000/api/filters");
        const data = await res.json();
        if (data.error) throw new Error(data.error);

        populateSelect('region', data.regions, 'All Regions');
        populateSelect('category', data.categories, 'All Categories');
        populateSelect('product', data.products, 'All Products');

    } catch (error) {
        console.error("Failed to populate dropdowns:", error);
        alert("Could not load filters from the backend.");
    }
    
    const today = new Date();
    const thirtyDaysAgo = new Date(new Date().setDate(today.getDate() - 30));
    document.getElementById('end').valueAsDate = today;
    document.getElementById('start').valueAsDate = thirtyDaysAgo;
}

async function updateProductDropdown(category) {
    let url = "http://127.0.0.1:8000/api/filters";
    if (category) {
        url += `?category=${encodeURIComponent(category)}`;
    }
    try {
        const res = await fetch(url);
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        populateSelect('product', data.products, 'All Products');
    } catch (error) {
        console.error("Failed to update product dropdown:", error);
    }
}

async function loadMarketData() {
    if (geoJsonLayer) map.removeLayer(geoJsonLayer);
    if (salesBubbleLayer) map.removeLayer(salesBubbleLayer);
    document.querySelector('.insight-box.emerging').innerHTML = '<h3>Emerging Hotspots</h3><p>Loading...</p>';
    document.querySelector('.insight-box.mismatched').innerHTML = '<h3>Mismatched Opportunity</h3><p>Loading...</p>';

    const params = {
        region: document.getElementById('region').value,
        start: document.getElementById('start').value,
        end: document.getElementById('end').value,
        category: document.getElementById('category').value,
        product: document.getElementById('product').value,
    };
    
    const url = new URL("http://127.0.0.1:8000/api/market_radar");
    Object.keys(params).forEach(key => (params[key] ? url.searchParams.append(key, params[key]) : null));
    
    try {
        const [apiRes, geoJsonRes] = await Promise.all([fetch(url), fetch('/frontend/assets/india-states.json')]);
        if (!apiRes.ok || !geoJsonRes.ok) throw new Error('Network response was not ok.');
        
        const apiData = await apiRes.json();
        const geoJsonData = await geoJsonRes.json();
        if (apiData.error) throw new Error(apiData.error);
        
        drawSalesBubbles(apiData.internal_sales || []);
        drawPoliticalMap(geoJsonData, apiData.external_demand_by_state || []);

        if (document.querySelector('input[value="external"]').checked && geoJsonLayer) {
            map.addLayer(geoJsonLayer);
        }
        if (document.querySelector('input[value="internal"]').checked && salesBubbleLayer) {
            map.addLayer(salesBubbleLayer);
        }

        displayInsights(apiData.emerging_hotspots, apiData.mismatched_opportunities);

    } catch (error) {
        console.error("Failed to load market data:", error);
        alert("Error loading data: " + error.message);
    }
}

function displayInsights(hotspots, opportunities) {
    const hBox = document.querySelector('.insight-box.emerging');
    const oBox = document.querySelector('.insight-box.mismatched');

    hBox.innerHTML = '<h3>Emerging Hotspots</h3>';
    if (hotspots?.length) {
        hBox.innerHTML += `<ul class="list-disc list-inside text-left">${hotspots.map(i => `<li>${i}</li>`).join('')}</ul>`;
    } else {
        hBox.innerHTML += '<p>No hotspots found.</p>';
    }

    oBox.innerHTML = '<h3>Mismatched Opportunity</h3>';
    if (opportunities?.length) {
        oBox.innerHTML += `<ul class="list-disc list-inside text-left">${opportunities.map(i => `<li>${i}</li>`).join('')}</ul>`;
    } else {
        oBox.innerHTML += '<p>No opportunities found.</p>';
    }
}

function drawPoliticalMap(geoJsonData, demandByState) {
    const demandMap = new Map(demandByState.map(item => [item.state, item.demand_score]));
    const maxDemand = Math.max(...demandMap.values(), 1);

    const getColor = (score, max) => {
        if (score === 0) return 'transparent';
        const intensity = score / max;
        if (intensity > 0.8) return '#7a2c96';
        if (intensity > 0.6) return '#8e44ad';
        if (intensity > 0.4) return '#9b59b6';
        if (intensity > 0.2) return '#ab7ac4';
        return '#c4a6d3';
    };

    geoJsonLayer = L.geoJson(geoJsonData, {
        style: feature => ({
            fillColor: getColor(demandMap.get(feature.properties.st_nm) || 0, maxDemand),
            weight: 1,
            opacity: 1,
            color: '#6d28d9', // A purple border for states with any data
            fillOpacity: 0.7
        }),
        onEachFeature: (feature, layer) => {
            const stateName = feature.properties.st_nm;
            const score = demandMap.get(stateName) || 0;
            layer.bindPopup(`<strong>${stateName}</strong><br>Social Demand Score: ${score.toFixed(0)}`);
            layer.on({
                mouseover: e => e.target.setStyle({ weight: 3, color: '#c4b5fd' }),
                mouseout: e => geoJsonLayer.resetStyle(e.target)
            });
        }
    });
}

// This is a replacement for ONLY the drawSalesBubbles function
// in frontend/js/market_radar.js

function drawSalesBubbles(salesData) {
    if (!salesData || salesData.length === 0) {
        salesBubbleLayer = L.layerGroup([]);
        return;
    }

    // --- THE CRUCIAL FIX ---
    // Instead of a global max, find the max sales value *within the currently displayed data*.
    // This ensures that bubbles are always scaled relative to what's visible.
    const maxSalesInView = Math.max(...salesData.map(s => s.sales || 0), 1);
    
    const trendColors = {
        increasing: '#22c55e', // green-500
        decreasing: '#ef4444', // red-500
        stable: '#f59e0b'     // amber-500
    };

    const bubbles = salesData.map(sale => {
        const regionInfo = cityCentroids[sale.region];
        if (!regionInfo) return null;

        // The radius is now correctly scaled against the max value *in the current filter set*.
        const radius = 5 + (sale.sales / maxSalesInView) * 20;
        const color = trendColors[sale.trend] || trendColors.stable;

        return L.circleMarker([regionInfo.lat, regionInfo.lng], {
            radius: radius,
            fillColor: color,
            color: '#fff',
            weight: 1.5,
            opacity: 1,
            fillOpacity: 0.7
        }).bindPopup(
            `<strong>${sale.region} - ${sale.product}</strong><br>` +
            `Sales: ${sale.sales.toLocaleString()}<br>` + // Added formatting for readability
            `Trend: <span style="color:${color}; text-transform:capitalize;">${sale.trend}</span>`
        );
    }).filter(Boolean); // Remove any nulls if a region is not in our cityCentroids map
    
    salesBubbleLayer = L.layerGroup(bubbles);
}