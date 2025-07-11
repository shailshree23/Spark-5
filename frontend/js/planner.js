async function loadPlanner() {
  const region = document.getElementById("region").value;
  const warehouse = document.getElementById("warehouse").value;
  const category = document.getElementById("category").value;
  const timeframe = document.getElementById("timeframe").value || 30;

  const url = new URL("http://127.0.0.1:8000/api/planner");
  if (region) url.searchParams.append("region", region);
  if (warehouse) url.searchParams.append("warehouse", warehouse);
  if (category) url.searchParams.append("category", category);
  url.searchParams.append("timeframe", timeframe);

  try {
    const res = await fetch(url);
    const data = await res.json();
    const body = document.getElementById("planner-body");
    body.innerHTML = "";
    if (data.error) throw new Error(data.error);
    // Only show unique products (first occurrence)
    const seenProducts = new Set();
    data.forEach(row => {
      if (seenProducts.has(row.product)) return;
      seenProducts.add(row.product);
      // Calculate how many days stock will last using forecast_series
      let stockLeft = row.current_stock;
      let lastsDay = null;
      if (Array.isArray(row.forecast_series)) {
        for (let i = 0; i < row.forecast_series.length; i++) {
          stockLeft -= row.forecast_series[i];
          if (stockLeft < 0 && lastsDay === null) {
            lastsDay = i + 1; // Show as 1-based day count
          }
        }
      }
      // Always show a number: if lastsDay is null, show forecast_series.length
      let lastsTill = lastsDay !== null ? lastsDay : (row.forecast_series ? row.forecast_series.length : 0);
      body.innerHTML += `
        <tr class="hover:bg-blue-50 transition duration-200">
          <td class="px-4 py-2">${row.product}</td>
          <td class="px-4 py-2">${row.current_stock}</td>
          <td class="px-4 py-2">${row.forecast_demand}</td>
          <td class="px-4 py-2"><button class='bg-blue-500 text-white px-2 py-1 rounded' onclick="showForecastGraph('${row.product}')">Graph</button></td>
          <td class="px-4 py-2">${lastsTill}</td>
          <td class="px-4 py-2">${row.inventory_status}</td>
        </tr>
      `;
    });
    // Store forecast series for modal use
    window._forecastSeriesMap = {};
    data.forEach(row => { window._forecastSeriesMap[row.product] = row.forecast_series; });
    if (data.length === 0) {
      body.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-gray-400">No data found for the selected filters.</td></tr>`;
    }
  } catch (error) {
    alert('Failed to load planner data: ' + error.message);
  }
}

// Add modal for forecast graph
if (!document.getElementById('forecast-modal')) {
  const modal = document.createElement('div');
  modal.id = 'forecast-modal';
  modal.style.display = 'none';
  modal.innerHTML = `
    <div class="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg shadow-lg p-6 w-full max-w-md relative">
        <button id="close-forecast-modal" class="absolute top-2 right-2 text-gray-500 hover:text-gray-800">&times;</button>
        <h2 class="text-lg font-semibold mb-4">Forecast Graph</h2>
        <canvas id="forecast-graph-canvas" height="180"></canvas>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  document.getElementById('close-forecast-modal').onclick = () => {
    document.getElementById('forecast-modal').style.display = 'none';
  };
}
window.showForecastGraph = function(product) {
  document.getElementById('forecast-modal').style.display = '';
  const ctx = document.getElementById('forecast-graph-canvas').getContext('2d');
  if (window.forecastChart) window.forecastChart.destroy();
  // Use real forecast series if available (from ML models if present)
  const series = (window._forecastSeriesMap && window._forecastSeriesMap[product]) || [0];
  window.forecastChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: series.map((_, i) => 'Day ' + (i+1)),
      datasets: [{
        label: product + ' Forecast',
        data: series,
        borderColor: '#2563eb',
        fill: false
      }]
    },
    options: { responsive: true, plugins: { legend: { display: true } }, scales: { y: { beginAtZero: true } } }
  });
}
