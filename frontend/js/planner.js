// File: frontend/js/planner.js (FINAL & COMPLETE)

document.addEventListener('DOMContentLoaded', () => {
    // --- STATE MANAGEMENT ---
    let fullPlannerData = []; // This will hold the master list of products from the API
    let forecastChart;      // To hold the Chart.js instance
    let insightInterval;      // To manage the rolling animation timer

    // --- DOM ELEMENT REFERENCES ---
    const getForecastBtn = document.getElementById('get-forecast-btn');
    const regionFilter = document.getElementById('region-filter');
    const warehouseFilter = document.getElementById('warehouse-filter');
    const categoryFilter = document.getElementById('category-filter');
    const daysFilter = document.getElementById('days-filter');
    const productSearch = document.getElementById('product-search');
    const statusCheckboxes = document.querySelectorAll('input[name="status"]');
    const stockLastsFilter = document.getElementById('stock-lasts-filter');
    const plannerBody = document.getElementById('planner-body');
    const forecastCanvas = document.getElementById('forecast-graph');
    const forecastPlaceholder = document.getElementById('forecast-placeholder');
    const recommendedActionEl = document.getElementById('recommended-action');
    const productInsightsContainer = document.getElementById('product-insights-container');
    const insightsPlaceholder = document.getElementById('insights-placeholder');

    // --- INITIALIZATION ---
    const initialize = async () => {
        await populateFilters();
        setupEventListeners();
    };

    // --- EVENT LISTENERS SETUP ---
    function setupEventListeners() {
        getForecastBtn.addEventListener('click', loadPlannerData);

        // Add listeners for all client-side filters
        productSearch.addEventListener('input', applyTableFilters);
        stockLastsFilter.addEventListener('change', applyTableFilters);
        statusCheckboxes.forEach(checkbox => checkbox.addEventListener('change', applyTableFilters));

        // Add a single, efficient event listener to the table body for row clicks
        plannerBody.addEventListener('click', (e) => {
            const row = e.target.closest('tr');
            if (!row || row.classList.contains('no-data')) return;

            // Highlight the selected row
            document.querySelectorAll('#planner-body tr').forEach(r => r.classList.remove('selected'));
            row.classList.add('selected');

            // Find the data associated with the clicked product
            const productName = row.dataset.product;
            const productData = fullPlannerData.find(p => p.product === productName);
            if (productData) {
                updateDetailsPanels(productData);
            }
        });
    }

    // --- DATA FETCHING & FILTER POPULATION ---
    async function populateFilters() {
        try {
            // Using the isolated endpoint for safety
            const res = await fetch("http://127.0.0.1:8000/api/planner-filters");
            const data = await res.json();
            if(data.error) throw new Error(data.error);

            const populate = (select, options, defaultLabel) => {
                select.innerHTML = `<option value="">${defaultLabel}</option>`;
                options.forEach(opt => select.innerHTML += `<option value="${opt}">${opt}</option>`);
            };
            
            populate(regionFilter, data.regions, 'All Regions');
            populate(warehouseFilter, data.warehouses, 'All Warehouses');
            populate(categoryFilter, data.categories, 'All Categories');

        } catch (error) {
            console.error("Failed to populate filters:", error);
        }
    }
    
    async function loadPlannerData() {
        const url = new URL("http://127.0.0.1:8000/api/planner");
        const params = {
            region: regionFilter.value,
            warehouse: warehouseFilter.value,
            category: categoryFilter.value,
            timeframe: daysFilter.value || 30
        };
        Object.keys(params).forEach(key => params[key] && url.searchParams.append(key, params[key]));

        plannerBody.innerHTML = `<tr><td colspan="5" class="placeholder-text">Loading forecast data...</td></tr>`;
        resetDetailsPanels(); // Clear details when loading new data

        try {
            const res = await fetch(url);
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            fullPlannerData = data;
            applyTableFilters(); // Render the table with the new data
        } catch (error) {
            console.error("Failed to load planner data:", error);
            plannerBody.innerHTML = `<tr><td colspan="5" class="placeholder-text" style="color: var(--trend-decreasing);">Failed to load data.</td></tr>`;
        }
    }

    // --- TABLE FILTERING AND RENDERING ---
    function applyTableFilters() {
        let filteredData = [...fullPlannerData];

        // 1. Search filter
        const searchTerm = productSearch.value.toLowerCase();
        if (searchTerm) {
            filteredData = filteredData.filter(item => item.product.toLowerCase().includes(searchTerm));
        }

        // 2. Status checkbox filter
        const selectedStatuses = Array.from(statusCheckboxes)
                                      .filter(i => i.checked)
                                      .map(i => i.value);
        if (selectedStatuses.length > 0) {
             filteredData = filteredData.filter(item => selectedStatuses.includes(item.inventory_status));
        }

        // 3. Stock lasting filter
        const stockLasting = stockLastsFilter.value;
        if (stockLasting) {
            filteredData = filteredData.filter(item => {
                const daysLeft = calculateStockDays(item);
                if (stockLasting === 'lt30') return daysLeft <= 30;
                if (stockLasting === 'gt30') return daysLeft > 30;
                return true;
            });
        }

        renderTable(filteredData);
    }

    function calculateStockDays(item) {
        let stockLeft = item.current_stock;
        if (!Array.isArray(item.forecast_series) || item.forecast_series.length === 0) return 999;
        for (let i = 0; i < item.forecast_series.length; i++) {
            stockLeft -= item.forecast_series[i];
            if (stockLeft < 0) return i + 1;
        }
        return 999; // Represents > timeframe
    }

    function renderTable(data) {
        if (data.length === 0) {
            plannerBody.innerHTML = `<tr class="no-data"><td colspan="5" class="placeholder-text">No products match the current filters.</td></tr>`;
            return;
        }

        plannerBody.innerHTML = data.map(item => {
            const daysLeft = calculateStockDays(item);
            const timeframe = parseInt(daysFilter.value, 10) || 30;
            const lastsTillText = daysLeft > timeframe ? `> ${timeframe} days` : `${daysLeft} days`;
            return `
                <tr data-product="${item.product}">
                    <td>${item.product}</td>
                    <td>${item.current_stock.toLocaleString()}</td>
                    <td>${item.forecast_demand.toLocaleString()}</td>
                    <td>${lastsTillText}</td>
                    <td>${item.inventory_status}</td>
                </tr>
            `;
        }).join('');
    }
    
    // --- RIGHT-SIDE PANELS UPDATE LOGIC ---
    function resetDetailsPanels() {
        forecastPlaceholder.style.display = 'flex';
        forecastCanvas.style.display = 'none';
        recommendedActionEl.textContent = 'Select a product.';
        insightsPlaceholder.style.display = 'flex';
        productInsightsContainer.innerHTML = '';
        productInsightsContainer.appendChild(insightsPlaceholder);
        if(insightInterval) clearInterval(insightInterval);
    }

    function updateDetailsPanels(item) {
        updateForecastGraph(item);
        recommendedActionEl.textContent = item.recommended_action;
        updateInsightCards(item.product_insights);
    }

    function updateForecastGraph(item) {
        forecastPlaceholder.style.display = 'none';
        forecastCanvas.style.display = 'block';

        if (forecastChart) forecastChart.destroy();
        
        const labels = item.forecast_series.map((_, i) => `Day ${i + 1}`);
        forecastChart = new Chart(forecastCanvas.getContext('2d'), {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Forecasted Demand',
                    data: item.forecast_series,
                    borderColor: 'var(--primary-accent)',
                    backgroundColor: 'rgba(125, 91, 166, 0.2)',
                    fill: false,
                    tension: 0.3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, ticks: { color: 'var(--text-secondary)' }, grid: { color: 'rgba(255,255,255,0.1)' } },
                    x: { ticks: { color: 'var(--text-secondary)' }, grid: { color: 'rgba(255,255,255,0.1)' } }
                }
            }
        });
    }
    
    function updateInsightCards(insights) {
        if(insightInterval) clearInterval(insightInterval);
        insightsPlaceholder.style.display = 'none';
        productInsightsContainer.innerHTML = ''; 
        
        if (!insights || insights.length === 0) {
             insightsPlaceholder.textContent = 'No specific insights available.';
             insightsPlaceholder.style.display = 'flex';
             productInsightsContainer.appendChild(insightsPlaceholder);
             return;
        }

        insights.forEach((text, i) => {
            const card = document.createElement('div');
            card.className = 'card';
            card.textContent = text;
            if (i === 0) card.classList.add('active');
            productInsightsContainer.appendChild(card);
        });
        
        let currentIndex = 0;
        if(insights.length > 1) {
            insightInterval = setInterval(() => {
                const cards = productInsightsContainer.querySelectorAll('.card');
                if (cards.length === 0) return;
                const nextIndex = (currentIndex + 1) % cards.length;
                
                cards[currentIndex].classList.remove('active');
                cards[currentIndex].classList.add('exit');
                
                cards[nextIndex].classList.add('active');
                
                setTimeout(() => {
                    if (cards[currentIndex]) cards[currentIndex].classList.remove('exit');
                }, 700); // Transition duration

                currentIndex = nextIndex;
            }, 4000); // Roll every 4 seconds
        }
    }

    // --- START THE APP ---
    initialize();
});