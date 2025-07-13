let charts = {};

function replaceCanvas(id) {
    const oldCanvas = document.getElementById(id);
    if (oldCanvas) {
        const parent = oldCanvas.parentNode;
        const newCanvas = document.createElement('canvas');
        newCanvas.id = id;
        newCanvas.height = 120; // Maintain a default height
        parent.replaceChild(newCanvas, oldCanvas);
    }
}

function setSectionVisibility(region, category, warehouse) {
    document.getElementById('section-inventory-region').style.display = region ? 'none' : 'block';
    document.getElementById('section-sales-region').style.display = region ? 'none' : 'block';
    document.getElementById('section-inventory-category').style.display = category ? 'none' : 'block';
    document.getElementById('section-sales-category').style.display = category ? 'none' : 'block';
    document.getElementById('section-inventory-warehouse').style.display = warehouse ? 'none' : 'block';
}

async function loadInsights() {
    // Destroy all previous charts before reloading
    Object.values(charts).forEach(chart => {
        if (chart) {
            try { chart.destroy(); } catch (e) { console.error("Error destroying chart:", e); }
        }
    });
    charts = {};

    const region = document.getElementById("region").value;
    const category = document.getElementById("category").value;
    const warehouse = document.getElementById("warehouse").value;
    
    setSectionVisibility(region, category, warehouse);

    // --- START OF NEW FETCH LOGIC ---
    const url = new URL("http://127.0.0.1:8000/api/insights");
    const params = {};
    if (region) params.region = region;
    if (category) params.category = category;
    if (warehouse) params.warehouse = warehouse;
    url.search = new URLSearchParams(params).toString();
    // --- END OF NEW FETCH LOGIC ---

    try {
        const res = await fetch(url);
        const data = await res.json();
        if (data.error) throw new Error(data.error);

        // The data is now pre-summarized by the backend!
        document.getElementById("total-sales").textContent = `₹${data.total_sales}`;
        document.getElementById("trend-count").textContent = data.trending_products.length;
        const inventoryCount = Object.keys(data.inventory_summary).length;
        document.getElementById("total-inventory").textContent = inventoryCount;

        // Helper to destroy previous chart, replace canvas, and render a new one
        function renderChart(id, type, chartData, chartOptions) {
            replaceCanvas(id);
            if (!chartData || !chartData.labels || chartData.labels.length === 0) {
                return; // Don't render empty charts
            }
            const ctx = document.getElementById(id).getContext("2d");
            charts[id] = new Chart(ctx, { type, data: chartData, options: chartOptions });
        }
        
        // Render all charts and tables using the data directly from the API
        // Inventory by Product
        renderChart("inventory-chart", 'bar', {
            labels: Object.keys(data.inventory_summary),
            datasets: [{ label: 'Stock Count', data: Object.values(data.inventory_summary), backgroundColor: '#4ade80' }]
        }, { responsive: true, scales: { y: { beginAtZero: true } } });
        
        // Inventory by Region (only if no specific region is selected)
        if (!region) {
            const regionLabels = Object.keys(data.inventory_by_region);
            const regionProducts = [...new Set(Object.values(data.inventory_by_region).flatMap(obj => Object.keys(obj)))];
            const regionDatasets = regionProducts.map((prod, i) => ({
                label: prod,
                data: regionLabels.map(r => (data.inventory_by_region[r] || {})[prod] || 0),
                backgroundColor: `hsl(${i * 30}, 70%, 60%)`
            }));
            renderChart("inventory-region-chart", 'bar', { labels: regionLabels, datasets: regionDatasets }, 
                { responsive: true, scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true } } });
        }
        
        // Inventory by Category
        if (!category) {
            const catLabels = Object.keys(data.inventory_by_category);
            const catProducts = [...new Set(Object.values(data.inventory_by_category).flatMap(obj => Object.keys(obj)))];
            const catDatasets = catProducts.map((prod, i) => ({
                label: prod,
                data: catLabels.map(c => (data.inventory_by_category[c] || {})[prod] || 0),
                backgroundColor: `hsl(${i * 30 + 10}, 60%, 70%)`
            }));
            renderChart("inventory-category-chart", 'bar', { labels: catLabels, datasets: catDatasets }, 
                { responsive: true, scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true } } });
        }

        // Inventory by Warehouse
        if (!warehouse) {
            const whLabels = Object.keys(data.inventory_by_warehouse);
            const whProducts = [...new Set(Object.values(data.inventory_by_warehouse).flatMap(obj => Object.keys(obj)))];
            const whDatasets = whProducts.map((prod, i) => ({
                label: prod,
                data: whLabels.map(w => (data.inventory_by_warehouse[w] || {})[prod] || 0),
                backgroundColor: `hsl(${i * 30 + 20}, 80%, 70%)`
            }));
            renderChart("inventory-warehouse-chart", 'bar', { labels: whLabels, datasets: whDatasets }, 
                { responsive: true, scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true } } });
        }

        // Sales by Region Table
        if (!region) {
            const salesRegionTable = document.getElementById("sales-region-table").querySelector("tbody");
            salesRegionTable.innerHTML = "";
            let rowCount = 0;
            Object.entries(data.sales_by_region).forEach(([r, prodObj]) => {
                Object.entries(prodObj).forEach(([prod, sales]) => {
                    salesRegionTable.innerHTML += `<tr><td class="border px-4 py-2">${r}</td><td class="border px-4 py-2">${prod}</td><td class="border px-4 py-2">${sales}</td></tr>`;
                    rowCount++;
                });
            });
            if (rowCount === 0) salesRegionTable.innerHTML = `<tr><td colspan='3' class='text-center py-4 text-gray-400'>No data available</td></tr>`;
        }
        
        // Sales by Category Table
        if (!category) {
            const salesCatTable = document.getElementById("sales-category-table").querySelector("tbody");
            salesCatTable.innerHTML = "";
            let rowCount = 0;
            Object.entries(data.sales_by_category).forEach(([c, prodObj]) => {
                Object.entries(prodObj).forEach(([prod, sales]) => {
                    salesCatTable.innerHTML += `<tr><td class="border px-4 py-2">${c}</td><td class="border px-4 py-2">${prod}</td><td class="border px-4 py-2">${sales}</td></tr>`;
                    rowCount++;
                });
            });
            if (rowCount === 0) salesCatTable.innerHTML = `<tr><td colspan='3' class='text-center py-4 text-gray-400'>No data available</td></tr>`;
        }

        // Sales Time Series
        const months = Object.keys(data.sales_time_series).sort();
        const timeProducts = [...new Set(Object.values(data.sales_time_series).flatMap(obj => Object.keys(obj)))];
        const timeDatasets = timeProducts.map((prod, i) => ({
            label: prod,
            data: months.map(m => (data.sales_time_series[m] || {})[prod] || 0),
            borderColor: `hsl(${i * 40 + 40}, 80%, 40%)`,
            fill: false
        }));
        renderChart("sales-time-chart", 'line', { labels: months, datasets: timeDatasets }, 
            { responsive: true, plugins: { legend: { display: true } }, scales: { y: { beginAtZero: true } } });

    } catch (error) {
        alert('Failed to load insights: ' + error.message);
    }
}

// Initial load
window.onload = loadInsights;

// Re-assign the button click event after the page loads
document.addEventListener('DOMContentLoaded', (event) => {
    const button = document.querySelector('button[onclick="loadInsights()"]');
    if (button) {
       button.onclick = loadInsights;
    }
});

// Make sure we re-render on initial load
loadInsights();