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


/* ================= Cart drawer ================= */
function wireCart() {
  const openBtn = document.getElementById("open-cart");
  const closeBtn = document.getElementById("close-cart");
  const drawer = document.getElementById("cart-drawer");
  const overlay = document.getElementById("cart-overlay");

  openBtn.addEventListener("click", () => { renderCartItems(); drawer.classList.add("open"); overlay.classList.remove("hidden"); });
  closeBtn.addEventListener("click", closeCart);
  overlay.addEventListener("click", closeCart);
  function closeCart() { drawer.classList.remove("open"); overlay.classList.add("hidden"); }

  document.getElementById("checkout-btn").addEventListener("click", () => {
    if (!getCart().length) { toast("Your bill is empty. Add a product first.", "error"); return; }
    const user = getUser();
    if (user) {
      document.getElementById("co-name").value = user.name || "";
      document.getElementById("co-phone").value = user.phone || "";
      document.getElementById("co-email").value = user.email || "";
    }
    document.getElementById("checkout-modal").classList.remove("hidden");
    document.getElementById("checkout-overlay").classList.remove("hidden");
  });

  document.getElementById("checkout-overlay").addEventListener("click", closeCheckout);
  function closeCheckout() {
    document.getElementById("checkout-modal").classList.add("hidden");
    document.getElementById("checkout-overlay").classList.add("hidden");
  }

  const confirmBtn = document.getElementById("confirm-checkout");
  confirmBtn.addEventListener("click", async () => {
    const msgEl = document.getElementById("checkout-msg");
    msgEl.textContent = ""; msgEl.className = "form-msg";
    const phone = document.getElementById("co-phone").value.trim();
    const email = document.getElementById("co-email").value.trim();
    if (!phone || !email) { msgEl.textContent = "Phone and email are required."; msgEl.classList.add("error"); return; }

    // Disable button to prevent duplicate order on double-click
    confirmBtn.disabled = true;
    confirmBtn.textContent = "Generating Bill…";
    try {
      const order = await api("/orders", {
        method: "POST",
        auth: true,
        body: {
          items: getCart().map((i) => ({ productId: i.productId, quantity: i.quantity })),
          customerDetails: {
            name: document.getElementById("co-name").value.trim(),
            phone, email,
            address: document.getElementById("co-address").value.trim(),
          },
          paymentMethod: document.getElementById("co-payment").value,
        },
      });
      closeCheckout();
      closeCart();
      clearCart();
      showBillResult(order);
    } catch (err) {
      msgEl.textContent = err.message;
      msgEl.classList.add("error");
      confirmBtn.disabled = false;
      confirmBtn.textContent = "Confirm & Generate Bill";
    }
  });

  document.getElementById("bill-overlay").addEventListener("click", closeBill);
  document.getElementById("bill-close").addEventListener("click", closeBill);
  function closeBill() {
    document.getElementById("bill-modal").classList.add("hidden");
    document.getElementById("bill-overlay").classList.add("hidden");
  }
}

function renderCartItems() {
  const cart = getCart();
  const host = document.getElementById("cart-items");
  if (!cart.length) {
    host.innerHTML = `<div class="empty-state">No items added yet.</div>`;
  } else {
    host.innerHTML = cart.map((i) => `
      <div class="cart-item">
        <div>
          <div>${escapeHtml(i.name)}</div>
          <div class="mono" style="color:var(--muted);font-size:0.78rem;">${escapeHtml(i.brandName || "")} · ₹${i.price} × ${i.quantity}</div>
        </div>
        <div style="text-align:right;">
          <div class="mono">₹${i.price * i.quantity}</div>
          <button class="btn btn-small btn-outline" data-remove="${i.productId}" style="margin-top:4px;">Remove</button>
        </div>
      </div>`).join("");
    host.querySelectorAll("[data-remove]").forEach((btn) => {
      btn.addEventListener("click", () => { removeFromCart(btn.dataset.remove); renderCartItems(); });
    });
  }
  document.getElementById("cart-total").textContent = `₹${cartTotal()}`;
}

function showBillResult(order) {
  document.getElementById("bill-summary").textContent =
    `Bill #${order._id.slice(-6).toUpperCase()} — Total ₹${order.total} (${order.paymentMethod.toUpperCase()})`;
  document.getElementById("bill-invoice-link").href = `/api/orders/${order._id}/invoice`;
  const payBtn = document.getElementById("bill-pay-btn");
  payBtn.style.display = order.paymentStatus === "paid" ? "none" : "inline-flex";
  payBtn.onclick = async () => {
    try {
      await api(`/orders/${order._id}/pay`, { method: "POST" });
      toast("Payment successful!", "success");
      payBtn.style.display = "none";
    } catch (e) { toast("Payment failed. Please try again.", "error"); }
  };
  document.getElementById("bill-modal").classList.remove("hidden");
  document.getElementById("bill-overlay").classList.remove("hidden");
}

document.addEventListener("DOMContentLoaded", initProductsPage);
