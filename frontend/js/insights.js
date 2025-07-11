let charts = {};

function replaceCanvas(id) {
  const oldCanvas = document.getElementById(id);
  if (oldCanvas) {
    const parent = oldCanvas.parentNode;
    const newCanvas = document.createElement('canvas');
    newCanvas.id = id;
    newCanvas.width = oldCanvas.width;
    newCanvas.height = oldCanvas.height;
    parent.replaceChild(newCanvas, oldCanvas);
  }
}

function setSectionVisibility(region, category, warehouse) {
  // Hide region breakdowns if a specific region is selected
  document.getElementById('section-inventory-region').style.display = region ? 'none' : '';
  document.getElementById('section-sales-region').style.display = region ? 'none' : '';
  // Hide category breakdowns if a specific category is selected
  document.getElementById('section-inventory-category').style.display = category ? 'none' : '';
  document.getElementById('section-sales-category').style.display = category ? 'none' : '';
  // Hide warehouse breakdown if a specific warehouse is selected
  document.getElementById('section-inventory-warehouse').style.display = warehouse ? 'none' : '';
}

function filterData(data, region, category, warehouse) {
  // Filter inventory
  let inventory = data.all_inventory;
  if (region) inventory = inventory.filter(row => row.region === region);
  if (category) inventory = inventory.filter(row => row.category === category);
  if (warehouse) inventory = inventory.filter(row => row.warehouse === warehouse);
  // Filter sales
  let sales = data.all_sales;
  if (region) sales = sales.filter(row => row.region === region);
  if (category) sales = sales.filter(row => row.category === category);
  // No warehouse in sales
  return { inventory, sales };
}

function summarize(filtered) {
  // Inventory summary by product
  const inventory_summary = {};
  filtered.inventory.forEach(row => {
    inventory_summary[row.product] = (inventory_summary[row.product] || 0) + parseInt(row.stock);
  });
  // Inventory by region
  const inventory_by_region = {};
  filtered.inventory.forEach(row => {
    if (!inventory_by_region[row.region]) inventory_by_region[row.region] = {};
    inventory_by_region[row.region][row.product] = (inventory_by_region[row.region][row.product] || 0) + parseInt(row.stock);
  });
  // Inventory by category
  const inventory_by_category = {};
  filtered.inventory.forEach(row => {
    if (!inventory_by_category[row.category]) inventory_by_category[row.category] = {};
    inventory_by_category[row.category][row.product] = (inventory_by_category[row.category][row.product] || 0) + parseInt(row.stock);
  });
  // Inventory by warehouse
  const inventory_by_warehouse = {};
  filtered.inventory.forEach(row => {
    if (!inventory_by_warehouse[row.warehouse]) inventory_by_warehouse[row.warehouse] = {};
    inventory_by_warehouse[row.warehouse][row.product] = (inventory_by_warehouse[row.warehouse][row.product] || 0) + parseInt(row.stock);
  });
  // Sales by region
  const sales_by_region = {};
  filtered.sales.forEach(row => {
    if (!sales_by_region[row.region]) sales_by_region[row.region] = {};
    sales_by_region[row.region][row.product] = (sales_by_region[row.region][row.product] || 0) + parseInt(row.sales);
  });
  // Sales by category
  const sales_by_category = {};
  filtered.sales.forEach(row => {
    if (!sales_by_category[row.category]) sales_by_category[row.category] = {};
    sales_by_category[row.category][row.product] = (sales_by_category[row.category][row.product] || 0) + parseInt(row.sales);
  });
  // Sales time series (monthly)
  const sales_time_series = {};
  filtered.sales.forEach(row => {
    const month = row.date.slice(0,7); // YYYY-MM
    if (!sales_time_series[month]) sales_time_series[month] = {};
    sales_time_series[month][row.product] = (sales_time_series[month][row.product] || 0) + parseInt(row.sales);
  });
  // Trending products
  const trending_products = [...new Set(filtered.sales.map(row => row.product))];
  // Total sales
  const total_sales = filtered.sales.reduce((sum, row) => sum + parseInt(row.sales), 0);
  return {
    inventory_summary,
    inventory_by_region,
    inventory_by_category,
    inventory_by_warehouse,
    sales_by_region,
    sales_by_category,
    sales_time_series,
    trending_products,
    total_sales
  };
}

async function loadInsights() {
  // Destroy all previous charts before reloading
  Object.keys(charts).forEach(id => {
    if (charts[id]) {
      try { charts[id].destroy(); } catch {}
      charts[id] = null;
    }
  });

  const region = document.getElementById("region").value;
  const category = document.getElementById("category").value;
  const warehouse = document.getElementById("warehouse").value;
  setSectionVisibility(region, category, warehouse);
  try {
    const res = await fetch("http://127.0.0.1:8000/api/insights");
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    // Filter and summarize
    const filtered = filterData(data, region, category, warehouse);
    const summary = summarize(filtered);
    document.getElementById("total-sales").textContent = `₹${summary.total_sales}`;
    document.getElementById("trend-count").textContent = summary.trending_products.length;
    document.getElementById("total-inventory").textContent = Object.keys(summary.inventory_summary).length;
    // Helper to destroy previous chart, replace canvas, and clear if no data
    function renderChart(id, type, chartData, chartOptions) {
      if (charts[id]) { try { charts[id].destroy(); } catch {} charts[id] = null; }
      replaceCanvas(id);
      if (!chartData.labels || chartData.labels.length === 0) {
        return;
      }
      const ctx = document.getElementById(id).getContext("2d");
      charts[id] = new Chart(ctx, { type, data: chartData, options: chartOptions });
    }
    // Inventory by Product
    renderChart("inventory-chart", 'bar', {
      labels: Object.keys(summary.inventory_summary),
      datasets: [{ label: 'Stock Count', data: Object.values(summary.inventory_summary), backgroundColor: '#4ade80' }]
    }, { responsive: true, scales: { y: { beginAtZero: true } } });
    // Inventory by Region
    const regionLabels = Object.keys(summary.inventory_by_region);
    const regionProducts = Object.keys(summary.inventory_summary);
    const regionDatasets = regionProducts.map((prod, i) => ({
      label: prod,
      data: regionLabels.map(r => (summary.inventory_by_region[r]||{})[prod]||0),
      backgroundColor: `hsl(${i*30},70%,60%)`
    }));
    renderChart("inventory-region-chart", 'bar', {
      labels: regionLabels, datasets: regionDatasets
    }, { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } });
    // Inventory by Category
    const catLabels = Object.keys(summary.inventory_by_category);
    const catProducts = Object.keys(summary.inventory_summary);
    const catDatasets = catProducts.map((prod, i) => ({
      label: prod,
      data: catLabels.map(c => (summary.inventory_by_category[c]||{})[prod]||0),
      backgroundColor: `hsl(${i*30+10},60%,70%)`
    }));
    renderChart("inventory-category-chart", 'bar', {
      labels: catLabels, datasets: catDatasets
    }, { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } });
    // Inventory by Warehouse
    const whLabels = Object.keys(summary.inventory_by_warehouse);
    const whProducts = Object.keys(summary.inventory_summary);
    const whDatasets = whProducts.map((prod, i) => ({
      label: prod,
      data: whLabels.map(w => (summary.inventory_by_warehouse[w]||{})[prod]||0),
      backgroundColor: `hsl(${i*30+20},80%,70%)`
    }));
    renderChart("inventory-warehouse-chart", 'bar', {
      labels: whLabels, datasets: whDatasets
    }, { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } });
    // Sales by Region Table
    const salesRegionTable = document.getElementById("sales-region-table").querySelector("tbody");
    salesRegionTable.innerHTML = "";
    let regionRows = 0;
    Object.entries(summary.sales_by_region).forEach(([region, prodObj]) => {
      Object.entries(prodObj).forEach(([prod, sales]) => {
        salesRegionTable.innerHTML += `<tr><td>${region}</td><td>${prod}</td><td>${sales}</td></tr>`;
        regionRows++;
      });
    });
    if (regionRows === 0) salesRegionTable.innerHTML = `<tr><td colspan='3' class='text-gray-400'>No data available</td></tr>`;
    // Sales by Category Table
    const salesCatTable = document.getElementById("sales-category-table").querySelector("tbody");
    salesCatTable.innerHTML = "";
    let catRows = 0;
    Object.entries(summary.sales_by_category).forEach(([cat, prodObj]) => {
      Object.entries(prodObj).forEach(([prod, sales]) => {
        salesCatTable.innerHTML += `<tr><td>${cat}</td><td>${prod}</td><td>${sales}</td></tr>`;
        catRows++;
      });
    });
    if (catRows === 0) salesCatTable.innerHTML = `<tr><td colspan='3' class='text-gray-400'>No data available</td></tr>`;
    // Sales Time Series (Monthly)
    const months = Object.keys(summary.sales_time_series);
    const timeProducts = Object.keys(summary.inventory_summary);
    const timeDatasets = timeProducts.map((prod, i) => ({
      label: prod,
      data: months.map(m => (summary.sales_time_series[m]||{})[prod]||0),
      borderColor: `hsl(${i*30+40},80%,40%)`,
      fill: false
    }));
    renderChart("sales-time-chart", 'line', {
      labels: months, datasets: timeDatasets
    }, { responsive: true, plugins: { legend: { display: true } }, scales: { y: { beginAtZero: true } } });
  } catch (error) {
    alert('Failed to load insights: ' + error.message);
  }
}

loadInsights();
