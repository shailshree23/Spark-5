// Function is defined in the global scope
async function loadPlanner() {
  const region = document.getElementById("region").value;
  const warehouse = document.getElementById("warehouse").value;
  const category = document.getElementById("category").value;
  const timeframe = document.getElementById("timeframe").value || 30;

  const url = new URL("http://127.0.0.1:8000/api/planner");
  const params = { timeframe: timeframe };
  if (region) params.region = region;
  if (warehouse) params.warehouse = warehouse;
  if (category) params.category = category;
  url.search = new URLSearchParams(params).toString();

  try {
    const res = await fetch(url);
    if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
    }
    const data = await res.json();
    const body = document.getElementById("planner-body");
    body.innerHTML = "";

    if (data.error) throw new Error(data.error);

    let rowsHtml = '';
    const uniqueProducts = {};

    data.forEach(row => {
        // Prevent duplicate products from showing
        if (uniqueProducts[row.product]) return;
        uniqueProducts[row.product] = true;

        let stockLeft = parseInt(row.current_stock, 10);
        let dayStockRunsOut = null;

        if (Array.isArray(row.forecast_series) && row.forecast_series.length > 0) {
            for (let i = 0; i < row.forecast_series.length; i++) {
                stockLeft -= row.forecast_series[i];
                if (stockLeft < 0) {
                    dayStockRunsOut = i + 1;
                    break;
                }
            }
        }
      
        let lastsTillText;
        if (dayStockRunsOut !== null) {
            lastsTillText = `${dayStockRunsOut} days`;
        } else {
            lastsTillText = `> ${timeframe} days`;
        }

        // Handle case where backend might not provide the series
        if (!row.forecast_series) {
            lastsTillText = 'N/A';
        }
        
        rowsHtml += `
            <tr class="hover:bg-blue-50 transition duration-200">
                <td class="px-4 py-2">${row.product}</td>
                <td class="px-4 py-2">${row.current_stock}</td>
                <td class="px-4 py-2">${row.forecast_demand}</td>
                <td class="px-4 py-2">
                    <button class='bg-blue-500 text-white px-2 py-1 rounded' 
                            onclick="showForecastGraph('${row.product.replace(/'/g, "\\'")}', JSON.stringify(${JSON.stringify(row.forecast_series || [])}))">
                        Graph
                    </button>
                </td>
                <td class="px-4 py-2">${lastsTillText}</td> 
                <td class="px-4 py-2">${row.inventory_status}</td>
            </tr>
        `;
    });
    
    body.innerHTML = rowsHtml;
    
    if (Object.keys(uniqueProducts).length === 0) {
      body.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-gray-400">No data found.</td></tr>`;
    }
  } catch (error) {
    console.error('Failed to load planner data:', error);
    alert('Failed to load planner data: ' + error.message);
  }
}

function showForecastGraph(product, seriesJson) {
  let modal = document.getElementById('forecast-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'forecast-modal';
    document.body.appendChild(modal);
    modal.innerHTML = `
        <div class="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50" onclick="this.parentNode.style.display='none'">
            <div class="bg-white rounded-lg shadow-lg p-6 w-full max-w-md relative" onclick="event.stopPropagation()">
                <button onclick="document.getElementById('forecast-modal').style.display='none'" class="absolute top-2 right-2 text-gray-500 hover:text-gray-800 text-2xl font-bold">×</button>
                <h2 id="forecast-modal-title" class="text-lg font-semibold mb-4">Forecast Graph</h2>
                <canvas id="forecast-graph-canvas" height="180"></canvas>
            </div>
        </div>
    `;
  }
  
  modal.style.display = 'flex';
  document.getElementById('forecast-modal-title').innerText = `Forecast Graph for ${product}`;
  const ctx = document.getElementById('forecast-graph-canvas').getContext('2d');
  
  if (window.forecastChart) window.forecastChart.destroy();
  
  const series = JSON.parse(seriesJson);

  window.forecastChart = new Chart(ctx, {
    type: 'line', 
    data: { 
      labels: series.map((_, i) => 'Day ' + (i+1)), 
      datasets: [{ 
        label: product + ' Forecast', 
        data: series, 
        borderColor: '#2563eb', 
        backgroundColor: 'rgba(37, 99, 235, 0.1)', 
        fill: true, 
        tension: 0.1 
      }] 
    },
    options: { 
      responsive: true, 
      plugins: { legend: { display: false } }, 
      scales: { y: { beginAtZero: true } } 
    }
  });
}

// Attach the loadPlanner function to the button after the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const plannerButton = Array.from(document.getElementsByTagName('button')).find(btn => btn.innerText === 'Get Forecast Plan');
    if (plannerButton) {
        plannerButton.onclick = loadPlanner;
    }
    // Also load it once automatically when the page is ready
    loadPlanner();
});