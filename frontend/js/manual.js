document.getElementById("inventory-form").onsubmit = async function (e) {
  e.preventDefault();
  alert("✅ Inventory record submitted (simulated).\nTo save permanently, integrate a backend or write to CSV.");
};

document.getElementById("trend-form").onsubmit = async function (e) {
  e.preventDefault();
  alert("✅ Social trend submitted (simulated).\nTo persist data, update `social_trends.csv` or add database backend.");
};
