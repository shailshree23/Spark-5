let map;
let cityLocations = {
  'Delhi': [28.6139, 77.2090],
  'Bangalore': [12.9716, 77.5946],
  'Mumbai': [19.0760, 72.8777],
  'Chennai': [13.0827, 80.2707],
  'Hyderabad': [17.3850, 78.4867],
  'Kolkata': [22.5726, 88.3639],
  'Pune': [18.5204, 73.8567],
  'Ahmedabad': [23.0225, 72.5714],
  'Jaipur': [26.9124, 75.7873],
  'Lucknow': [26.8467, 80.9462],
  'Kanpur': [26.4499, 80.3319],
  'Nagpur': [21.1458, 79.0882],
  'Indore': [22.7196, 75.8577]
};

function getIndiaCenter() {
  // Rough center for India
  return [22.5937, 78.9629];
}

document.addEventListener("DOMContentLoaded", function () {
  map = L.map("map").setView(getIndiaCenter(), 5);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap contributors",
  }).addTo(map);
  loadMapData();
  document.getElementById("category").addEventListener("change", updateProductDropdown);
});

async function updateProductDropdown() {
  const category = document.getElementById("category").value;
  const products = {
    Electronics: ["Smartphone", "Laptop"],
    Fashion: ["Sneakers", "T-Shirts"],
    Grocery: ["Rice", "Flour"]
  };
  const productSelect = document.getElementById("product");
  productSelect.innerHTML = '<option value="">All Products</option>';
  if (category && products[category]) {
    products[category].forEach(p => {
      productSelect.innerHTML += `<option value="${p}">${p}</option>`;
    });
  }
}

async function loadMapData() {
  const region = document.getElementById("region").value;
  const start = document.getElementById("start").value || "2023-01-01";
  const end = document.getElementById("end").value || "2023-12-31";
  const category = document.getElementById("category").value;
  const product = document.getElementById("product").value;

  const url = new URL("http://127.0.0.1:8000/api/map");
  url.searchParams.append("region", region);
  url.searchParams.append("start", start);
  url.searchParams.append("end", end);
  if (category) url.searchParams.append("category", category);
  if (product) url.searchParams.append("product", product);

  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    // Clear previous layers
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker || layer instanceof L.Circle) map.removeLayer(layer);
    });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
    }).addTo(map);

    // Group internal sales by region and product
    const salesByRegion = {};
    data.internal_sales.forEach(sale => {
      if (!salesByRegion[sale.region]) salesByRegion[sale.region] = [];
      salesByRegion[sale.region].push(sale);
    });

    // Group external demand by product (for India, show all; for city, show only for that city)
    const externalByProduct = {};
    data.external_demand.forEach(demand => {
      externalByProduct[demand.product] = demand.interest;
    });

    // Group demand hotspots by region
    const hotspotByRegion = {};
    data.demand_hotspots.forEach(hotspot => {
      if (!hotspotByRegion[hotspot.region]) hotspotByRegion[hotspot.region] = [];
      hotspotByRegion[hotspot.region].push(hotspot);
    });

    // If India, show all cities
    if (region === "India") {
      map.setView(getIndiaCenter(), 5);
      let indiaSalesTotal = 0;
      let indiaPopup = `<strong>India Summary</strong><br><u>Internal Sales</u><br>`;
      Object.keys(cityLocations).forEach(city => {
        const coords = cityLocations[city];
        let popup = `<strong>${city}</strong><br>`;
        // Internal sales
        if (salesByRegion[city]) {
          popup += `<u>Internal Sales</u><ul>`;
          salesByRegion[city].forEach(sale => {
            popup += `<li>${sale.product}: ${sale.sales}</li>`;
            indiaSalesTotal += sale.sales;
          });
          popup += `</ul>`;
        } else {
          popup += `<u>Internal Sales</u>: 0<br>`;
        }
        // Inventory
        if (data.inventory_overview[city]) {
          const inventory = data.inventory_overview[city];
          if (category) {
            // If category filter is set, show products
            popup += `<u>Inventory</u><ul>`;
            Object.entries(inventory).forEach(([prod, stock]) => {
              popup += `<li>${prod}: ${stock}</li>`;
            });
            popup += `</ul>`;
          } else {
            // Group inventory by category
            const catSums = {};
            Object.entries(inventory).forEach(([prod, stock]) => {
              // Find category for product
              let cat = null;
              if (prod.includes('Smartphone') || prod.includes('Laptop') || prod.includes('Smartwatch') || prod.includes('Wireless Earbuds')) cat = 'Electronics';
              else if (prod.includes('Kurta') || prod.includes('Guava Girl Dress') || prod.includes('Sneakers') || prod.includes('T-Shirts')) cat = 'Fashion';
              else if (prod.includes('Rice') || prod.includes('Flour')) cat = 'Grocery';
              else cat = 'Other';
              catSums[cat] = (catSums[cat] || 0) + stock;
            });
            popup += `<u>Inventory</u><ul>`;
            Object.entries(catSums).forEach(([cat, sum]) => {
              popup += `<li>${cat}: ${sum}</li>`;
            });
            popup += `</ul>`;
          }
        } else {
          popup += `<u>Inventory</u>: None<br>`;
        }
        // External demand
        popup += `<u>External Demand</u><ul>`;
        data.external_demand.forEach(demand => {
          popup += `<li>${demand.category}: ${demand.interest}</li>`;
        });
        popup += `</ul>`;
        // Hotspot
        if (hotspotByRegion[city]) {
          popup += `<span style='color:red;'>🔥 Demand Hotspot!</span><br>`;
        }
        L.marker(coords).addTo(map).bindPopup(popup);
      });
      indiaPopup += `Total Sales: ${indiaSalesTotal}<br><u>External Demand</u><ul>`;
      data.external_demand.forEach(demand => {
        indiaPopup += `<li>${demand.category}: ${demand.interest}</li>`;
      });
      indiaPopup += `</ul>`;
      L.marker(getIndiaCenter(), {icon: L.icon({iconUrl: 'https://cdn-icons-png.flaticon.com/512/197/197419.png', iconSize: [32,32]})}).addTo(map).bindPopup(indiaPopup);
    } else {
      // Show only selected city
      if (cityLocations[region]) {
        map.setView(cityLocations[region], 8);
        let popup = `<strong>${region}</strong><br>`;
        // Internal sales
        if (salesByRegion[region]) {
          popup += `<u>Internal Sales</u><ul>`;
          salesByRegion[region].forEach(sale => {
            popup += `<li>${sale.product}: ${sale.sales}</li>`;
          });
          popup += `</ul>`;
        } else {
          popup += `<u>Internal Sales</u>: 0<br>`;
        }
        // Inventory
        if (data.inventory_overview[region]) {
          popup += `<u>Inventory</u><ul>`;
          Object.entries(data.inventory_overview[region]).forEach(([prod, stock]) => {
            popup += `<li>${prod}: ${stock}</li>`;
          });
          popup += `</ul>`;
        } else {
          popup += `<u>Inventory</u>: None<br>`;
        }
        // External demand
        popup += `<u>External Demand</u><ul>`;
        data.external_demand.forEach(demand => {
          popup += `<li>${demand.category}: ${demand.interest}</li>`;
        });
        popup += `</ul>`;
        // Hotspot
        if (hotspotByRegion[region]) {
          popup += `<span style='color:red;'>🔥 Demand Hotspot!</span><br>`;
        }
        L.marker(cityLocations[region]).addTo(map).bindPopup(popup).openPopup();
      }
    }
    // Draw demand hotspots as red circles
    Object.keys(hotspotByRegion).forEach(city => {
      if (cityLocations[city]) {
        L.circle(cityLocations[city], {
          color: 'red',
          fillColor: '#f03',
          fillOpacity: 0.5,
          radius: 50000
        }).addTo(map).bindPopup(`<strong>${city}</strong><br>🔥 Demand Hotspot!`);
      }
    });
  } catch (error) {
    alert('Failed to load map data: ' + error.message);
  }
}
