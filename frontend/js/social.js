let barChart, pieChartCat, lineChartProducts, areaChartCategories;

function getEl(id) {
  const el = document.getElementById(id);
  if (!el) {
    alert(`Element with id '${id}' not found in HTML!`);
    throw new Error(`Element with id '${id}' not found`);
  }
  return el;
}

async function loadSocial() {
  const source = getEl("source").value;
  const days = getEl("days").value || 7;
  const url = new URL("http://127.0.0.1:8000/api/social");
  url.searchParams.append("source", source);
  url.searchParams.append("days", days);
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    // Robust summary cards
    if (data.most_popular && typeof data.most_popular === 'string' && data.most_popular !== '-') {
      getEl("most-popular").textContent = data.most_popular;
    } else {
      getEl("most-popular").textContent = "-";
      console.warn("most_popular missing or empty from API response");
    }
    if (data.most_popular_category && typeof data.most_popular_category === 'string' && data.most_popular_category !== '-') {
      getEl("most-popular-category").textContent = data.most_popular_category;
    } else {
      getEl("most-popular-category").textContent = "-";
      console.warn("most_popular_category missing or empty from API response");
    }
    if (data.total_trend_volume !== undefined && data.total_trend_volume !== null && data.total_trend_volume !== '-') {
      getEl("total-trend-volume").textContent = data.total_trend_volume;
    } else {
      getEl("total-trend-volume").textContent = "-";
      console.warn("total_trend_volume missing or empty from API response");
    }
    // Bar chart for top products
    showBarChart(data.top_products || []);
    // Pie chart for category distribution
    showPieChartCat(data.category_distribution || {});
    // Line chart for top products over time
    showLineChartProducts(data.product_time_series || {});
    // Area chart for categories over time
    showAreaChartCategories(data.category_time_series || {});
    // Recommendations
    showRecommended(data.top_products || [], data.trends || []);
  } catch (error) {
    alert('Failed to load social trends: ' + error.message);
  }
}

function showBarChart(topProducts) {
  const ctx = getEl("bar-chart").getContext("2d");
  if (barChart) barChart.destroy();
  barChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: topProducts.map(p => p.product),
      datasets: [{
        label: 'Trend Score',
        data: topProducts.map(p => p.score),
        backgroundColor: [
          '#2563eb', '#10b981', '#fbbf24', '#6366f1', '#f59e42', '#3b82f6', '#a21caf', '#eab308', '#14b8a6', '#ef4444'
        ],
        borderRadius: 8,
        hoverBackgroundColor: '#2563eb',
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function(context) {
              return `Score: ${context.parsed.y}`;
            }
          }
        }
      },
      animation: {
        duration: 1200,
        easing: 'easeOutBounce'
      },
      scales: {
        y: { beginAtZero: true }
      }
    }
  });
}

function showPieChartCat(catDist) {
  const ctx = getEl("pie-chart-cat").getContext("2d");
  if (pieChartCat) pieChartCat.destroy();
  pieChartCat = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: Object.keys(catDist),
      datasets: [{
        data: Object.values(catDist),
        backgroundColor: ['#2563eb', '#10b981', '#fbbf24', '#6366f1', '#f59e42'],
        borderWidth: 2,
        borderColor: '#fff',
        hoverOffset: 12
      }]
    },
    options: {
      responsive: true,
      cutout: '70%',
      plugins: {
        legend: { position: 'bottom', labels: { color: getComputedStyle(document.body).color } },
      },
      animation: {
        animateScale: true,
        duration: 1200,
        easing: 'easeOutElastic'
      }
    }
  });
}

function showLineChartProducts(productTimeSeries) {
  const ctx = getEl("line-chart-products").getContext("2d");
  if (lineChartProducts) lineChartProducts.destroy();
  const datasets = Object.entries(productTimeSeries).map(([prod, series], i) => ({
    label: prod,
    data: series.map(pt => ({ x: pt.date, y: pt.score })),
    borderColor: `hsl(${i*40}, 80%, 50%)`,
    backgroundColor: `hsl(${i*40}, 80%, 90%)`,
    fill: false,
    tension: 0.3,
    pointRadius: 2
  }));
  lineChartProducts = new Chart(ctx, {
    type: 'line',
    data: { datasets },
    options: {
      responsive: true,
      plugins: { legend: { position: 'bottom', labels: { color: getComputedStyle(document.body).color } } },
      scales: {
        x: { type: 'time', time: { unit: 'day' }, title: { display: true, text: 'Date' }, ticks: { color: getComputedStyle(document.body).color } },
        y: { beginAtZero: true, title: { display: true, text: 'Score' }, ticks: { color: getComputedStyle(document.body).color } }
      }
    }
  });
}

function showAreaChartCategories(categoryTimeSeries) {
  const ctx = getEl("area-chart-categories").getContext("2d");
  if (areaChartCategories) areaChartCategories.destroy();
  // Get all unique dates
  const allDates = Array.from(new Set(Object.values(categoryTimeSeries).flatMap(series => series.map(pt => pt.date)))).sort();
  const datasets = Object.entries(categoryTimeSeries).map(([cat, series], i) => {
    // Map scores to all dates (fill missing with 0)
    const dateMap = Object.fromEntries(series.map(pt => [pt.date, pt.score]));
    return {
      label: cat,
      data: allDates.map(date => dateMap[date] || 0),
      backgroundColor: `hsl(${i*60}, 80%, 80%)`,
      borderColor: `hsl(${i*60}, 80%, 40%)`,
      fill: true,
      tension: 0.3,
      pointRadius: 0
    };
  });
  areaChartCategories = new Chart(ctx, {
    type: 'line',
    data: { labels: allDates, datasets },
    options: {
      responsive: true,
      plugins: { legend: { position: 'bottom', labels: { color: getComputedStyle(document.body).color } } },
      elements: { line: { fill: true } },
      scales: {
        x: { title: { display: true, text: 'Date' }, ticks: { color: getComputedStyle(document.body).color } },
        y: { beginAtZero: true, title: { display: true, text: 'Score' }, ticks: { color: getComputedStyle(document.body).color } }
      }
    }
  });
}

function showRecommended(topProducts, trends) {
  const recommendList = getEl("recommend-list");
  recommendList.innerHTML = "";
  // Simulate inventory check: if trending product is missing or low (< 50), recommend to stock more
  const inventory = {
    Smartphone: 40, Laptop: 60, Smartwatch: 20, 'Wireless Earbuds': 30, Kurta: 80, 'Guava Girl Dress': 10, Sneakers: 90, 'T-Shirts': 120, Rice: 200, Flour: 70
  };
  let any = false;
  topProducts.slice(0, 5).forEach(prod => {
    const stock = inventory[prod.product] || 0;
    if (stock < 50) {
      recommendList.innerHTML += `<li>${prod.product}: Trending! Only ${stock} in inventory. <span class='text-blue-600 font-semibold'>Order More</span></li>`;
      any = true;
    } else {
      recommendList.innerHTML += `<li>${prod.product}: Inventory healthy (${stock})</li>`;
    }
  });
  if (!any) {
    recommendList.innerHTML += `<li class='text-gray-400'>No urgent recommendations at this time.</li>`;
  }
}
