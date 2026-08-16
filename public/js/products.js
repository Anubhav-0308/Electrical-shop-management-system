let allCategories = [];

async function initProductsPage() {
  const params = new URLSearchParams(location.search);
  const activeCategory = params.get("category") || "";
  const search = params.get("search") || "";
  const highlight = params.get("highlight") || "";

  document.getElementById("products-title").textContent = activeCategory
    ? `${categoryLabel(activeCategory)}`
    : search
    ? `Search results for "${search}"`
    : "All Products";

  try {
    allCategories = await api("/products/categories");
  } catch (e) { allCategories = []; }

  renderTabs(activeCategory);
  await renderProducts({ category: activeCategory, search });

  if (highlight) {
    setTimeout(() => {
      const el = document.getElementById(`product-${highlight}`);
      if (el) { el.scrollIntoView({ behavior: "smooth", block: "center" }); el.style.borderColor = "var(--amber)"; }
    }, 300);
  }

  wireCart();
}

function renderTabs(activeCategory) {
  const tabs = document.getElementById("category-tabs");
  const allTab = `<button class="tab-btn ${!activeCategory ? "active" : ""}" data-cat="">All</button>`;
  const catTabs = allCategories
    .map((c) => `<button class="tab-btn ${c === activeCategory ? "active" : ""}" data-cat="${c}">${categoryIcon(c)} ${categoryLabel(c)}</button>`)
    .join("");
  tabs.innerHTML = allTab + catTabs;
  tabs.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const cat = btn.dataset.cat;
      const url = cat ? `/products.html?category=${encodeURIComponent(cat)}` : "/products.html";
      location.href = url;
    });
  });
}

async function renderProducts({ category, search }) {
  const grid = document.getElementById("product-grid");
  const empty = document.getElementById("empty-products");
  let query = "";
  if (category) query += `&category=${encodeURIComponent(category)}`;
  if (search) query += `&search=${encodeURIComponent(search)}`;

  try {
    const products = await api(`/products?${query.slice(1)}`);
    if (!products.length) {
      grid.innerHTML = "";
      empty.classList.remove("hidden");
      return;
    }
    empty.classList.add("hidden");
    grid.innerHTML = products.map(fullProductCard).join("");

    grid.querySelectorAll(".add-to-cart-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.id;
        const product = products.find((p) => p._id === id);
        const qtyInput = document.getElementById(`qty-${id}`);
        const qty = Math.max(1, parseInt(qtyInput.value, 10) || 1);
        addToCart(product, qty);
        toast(`${product.name} added to bill`, "success");
        renderCartItems();
      });
    });
  } catch (err) {
    grid.innerHTML = `<div class="empty-state" style="color:var(--danger);">Could not load products. Please refresh the page or check your connection.<br/><small>${escapeHtml(err.message)}</small></div>`;
    empty.classList.add("hidden");
  }
}

function fullProductCard(p) {
  const imgSrc = p.image || "/src/images/placeholder-product.svg";
  return `
    <div class="product-card" id="product-${p._id}">
      <div class="product-thumb" style="padding:0;overflow:hidden;background:var(--surface-2);">
        <img src="${imgSrc}" alt="${escapeHtml(p.name)}"
          style="width:100%;height:100%;object-fit:cover;display:block;"
          onerror="this.src='/src/images/placeholder-product.svg'" />
        <span class="stock-dot ${p.inStock ? "" : "out"}" style="position:absolute;top:8px;right:8px;"></span>
      </div>
      <div class="product-body">
        <div class="product-brand">${p.brand ? escapeHtml(p.brand.name) : "Generic"}</div>
        <div class="product-name">${escapeHtml(p.name)}</div>
        <div class="product-price">₹${p.price} / ${p.unit}</div>
      </div>
      <div class="product-actions">
        <input type="number" min="1" value="1" class="qty-input" id="qty-${p._id}" ${p.inStock ? "" : "disabled"} />
        <button class="btn btn-primary btn-small add-to-cart-btn" data-id="${p._id}" ${p.inStock ? "" : "disabled"}>${p.inStock ? "Add" : "Out of stock"}</button>
      </div>
    </div>`;
}




document.addEventListener("DOMContentLoaded", initProductsPage);
