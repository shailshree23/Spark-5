// frontend/js/insights.js

// Store chart instances to destroy them before re-drawing
let chartInstances = {};

// Function to safely create a chart
function createChart(canvasId, type, data, options) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    
    // If a chart already exists on this canvas, destroy it
    if (chartInstances[canvasId]) {
        chartInstances[canvasId].destroy();
    }
    
    chartInstances[canvasId] = new Chart(ctx, { type, data, options });
}

// Main function to fetch data and update the entire page
async function loadInsights() {
    // Get filter values from the dropdowns
    const region = document.getElementById("region-filter").value;
    const category = document.getElementById("category-filter").value;
    const warehouse = document.getElementById("warehouse-filter").value;

    // Build the API URL with query parameters
    const url = new URL("http://127.0.0.1:8000/api/insights");
    const params = new URLSearchParams();
    if (region) params.append('region', region);
    if (category) params.append('category', category);
    if (warehouse) params.append('warehouse', warehouse);
    url.search = params.toString();

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.error) throw new Error(data.error);

        // --- Update UI elements with the new data ---
        
        // 1. Update Summary Cards
        document.getElementById("total-sales").textContent = `₹${data.summary.total_sales.toLocaleString()}`;
        document.getElementById("total-inventory").textContent = data.summary.total_inventory_items.toLocaleString();
        document.getElementById("total-trending").textContent = data.summary.total_trending_products.toLocaleString();

        // 2. Update Charts
        createChart('sales-by-region-chart', 'bar', data.charts.sales_by_region, {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: { 
                y: { beginAtZero: true, ticks: { color: '#C1B9A0' } },
                x: { ticks: { color: '#C1B9A0' } }
            }
        });

        createChart('sales-time-series-chart', 'line', data.charts.sales_time_series, {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, ticks: { color: '#C1B9A0' } },
                x: { ticks: { color: '#C1B9A0' } }
            }
        });

    } catch (error) {
        console.error("Failed to load insights:", error);
        alert("Error loading insights. Check console for details.");
    }
}

// Function to populate dropdowns on initial page load
async function populateFilters() {
    try {
        // Fetch data without any filters to get all possible options
        const response = await fetch("http://127.0.0.1:8000/api/insights");
        const data = await response.json();
        
        if (data.error) throw new Error(data.error);

        // Populate Region Dropdown
        const regionSelect = document.getElementById("region-filter");
        regionSelect.innerHTML = '<option value="">All Regions</option>';
        data.filters.regions.forEach(region => {
            regionSelect.innerHTML += `<option value="${region}">${region}</option>`;
        });

        // Populate Category Dropdown
        const categorySelect = document.getElementById("category-filter");
        categorySelect.innerHTML = '<option value="">All Categories</option>';
        data.filters.categories.forEach(cat => {
            categorySelect.innerHTML += `<option value="${cat}">${cat}</option>`;
        });

        // Populate Warehouse Dropdown
        const warehouseSelect = document.getElementById("warehouse-filter");
        warehouseSelect.innerHTML = '<option value="">All Warehouses</option>';
        data.filters.warehouses.forEach(wh => {
            warehouseSelect.innerHTML += `<option value="${wh}">${wh}</option>`;
        });

        // Enable dropdowns after they are populated
        regionSelect.disabled = false;
        categorySelect.disabled = false;
        warehouseSelect.disabled = false;
        
    } catch (error) {
        console.error("Failed to populate filters:", error);
    }
}

// --- Event Listeners to run the functions ---

// When the page is fully loaded, do two things:
document.addEventListener('DOMContentLoaded', () => {
    // 1. Get all possible filter options and populate the dropdowns
    populateFilters();

    // 2. Load the main dashboard with default (no) filters
    loadInsights(); 
    
    // 3. Make the "Show Insights" button clickable
    document.getElementById("show-insights-btn").addEventListener('click', loadInsights);
});