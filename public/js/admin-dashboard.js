let brandsCache = [];

function requireAdmin() {
  const user = getUser();
  if (!user) { location.href = "/login.html"; return null; }
  if (user.role !== "admin") { location.href = "/customer-dashboard.html"; return null; }
  return user;
}

async function initAdminDashboard() {
  const user = requireAdmin();
  if (!user) return;

  wireTabsAdmin();
  wireAdminLogout();
  await loadStats();
  await loadBrandsForForm();
  await loadProducts();
  await loadBrandsTable();
  await loadOrders();
  await loadMessages();

  document.getElementById("prod-save-btn").addEventListener("click", saveProduct);
  document.getElementById("prod-cancel-btn").addEventListener("click", resetProductForm);
  document.getElementById("brand-save-btn").addEventListener("click", saveBrand);
  wireImageUpload();
}

function wireAdminLogout() {
  const btn = document.getElementById("admin-logout-btn");
  if (!btn) return;
  btn.addEventListener("click", () => {
    clearSession();
    toast("Logged out successfully.", "success");
    setTimeout(() => { location.href = "/index.html"; }, 600);
  });
}

function wireTabsAdmin() {
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
      document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
      btn.classList.add("active");
      document.querySelector(`[data-panel="${btn.dataset.tab}"]`).classList.add("active");
    });
  });
}

async function loadStats() {
  try {
    const [orders, products, messages] = await Promise.all([
      api("/orders", { auth: true }),
      api("/products"),
      api("/contact", { auth: true }),
    ]);
    const revenue = orders.filter((o) => o.paymentStatus === "paid").reduce((s, o) => s + o.total, 0);
    document.getElementById("stat-grid").innerHTML = `
      <div class="stat-card"><div class="stat-num">${orders.length}</div><div class="stat-label">Total Bills</div></div>
      <div class="stat-card"><div class="stat-num">₹${revenue}</div><div class="stat-label">Paid Revenue</div></div>
      <div class="stat-card"><div class="stat-num">${products.length}</div><div class="stat-label">Products Listed</div></div>
      <div class="stat-card"><div class="stat-num">${messages.filter((m) => !m.seenByOwner).length}</div><div class="stat-label">Unread Messages</div></div>
    `;
  } catch (e) { console.error("Stats error:", e); }
}

/* ================= Image upload ================= */
function wireImageUpload() {
  const fileInput = document.getElementById("prod-image-file");
  const status    = document.getElementById("prod-image-status");
  const previewWrap = document.getElementById("prod-image-preview-wrap");
  const preview   = document.getElementById("prod-image-preview");
  const hiddenUrl = document.getElementById("prod-image");
  const clearBtn  = document.getElementById("prod-image-clear");

  fileInput.addEventListener("change", () => {
    const file = fileInput.files[0];
    if (!file) return;
    // Show local preview immediately
    status.textContent = file.name;
    preview.src = URL.createObjectURL(file);
    previewWrap.style.display = "block";
  });

  clearBtn.addEventListener("click", () => {
    fileInput.value = "";
    hiddenUrl.value = "";
    preview.src = "";
    previewWrap.style.display = "none";
    status.textContent = "No image chosen";
  });
}

// Upload the chosen file and return its server URL (or null if no file chosen)
async function uploadImageIfChosen() {
  const fileInput = document.getElementById("prod-image-file");
  if (!fileInput.files.length) return null;          // no new file chosen
  const formData = new FormData();
  formData.append("image", fileInput.files[0]);
  const token = getToken();
  const res = await fetch("/api/upload/product-image", {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Image upload failed.");
  return data.url; // e.g. "/src/images/1234-product-name.jpg"
}

/* ================= Products ================= */
async function loadBrandsForForm() {
  brandsCache = await api("/brands");
  document.getElementById("prod-brand").innerHTML =
    `<option value="">No brand</option>` + brandsCache.map((b) => `<option value="${b._id}">${escapeHtml(b.name)}</option>`).join("");
}

async function loadProducts() {
  try {
    const products = await api("/products");
    document.getElementById("products-body").innerHTML = products.map((p) => `
      <tr>
        <td style="display:flex;align-items:center;gap:8px;">
          <img src="${p.image || "/src/images/placeholder-product.svg"}" alt="" style="width:36px;height:36px;border-radius:6px;object-fit:cover;border:1px solid var(--border);flex-shrink:0;" />
          <span>${escapeHtml(p.name)}</span>
        </td>
        <td>${escapeHtml(p.category)}</td>
        <td>${p.brand ? escapeHtml(p.brand.name) : "-"}</td>
        <td class="mono">₹${p.price}</td>
        <td>${p.inStock ? "In stock" : "Out of stock"}</td>
        <td>${p.featured ? "⭐" : "-"}</td>
        <td style="display:flex;gap:6px;">
          <button class="btn btn-small btn-outline" data-edit="${p._id}">Edit</button>
          <button class="btn btn-small btn-outline" data-toggle="${p._id}">${p.inStock ? "Mark Out" : "Mark In"}</button>
          <button class="btn btn-small btn-danger" data-delete="${p._id}">Delete</button>
        </td>
      </tr>`).join("");

    document.querySelectorAll("[data-edit]").forEach((btn) => btn.addEventListener("click", () => editProduct(btn.dataset.edit, products)));
    document.querySelectorAll("[data-toggle]").forEach((btn) => btn.addEventListener("click", () => toggleStock(btn.dataset.toggle, products)));
    document.querySelectorAll("[data-delete]").forEach((btn) => btn.addEventListener("click", () => deleteProduct(btn.dataset.delete)));
  } catch (e) { console.error("Load products error:", e); }
}

function editProduct(id, products) {
  const p = products.find((x) => x._id === id);
  document.getElementById("product-form-title").textContent = `Editing: ${p.name}`;
  document.getElementById("prod-id").value = p._id;
  document.getElementById("prod-name").value = p.name;
  document.getElementById("prod-category").value = p.category;
  document.getElementById("prod-brand").value = p.brand ? p.brand._id : "";
  document.getElementById("prod-price").value = p.price;
  document.getElementById("prod-unit").value = p.unit;
  document.getElementById("prod-featured").value = String(p.featured);
  document.getElementById("prod-desc").value = p.description || "";
  // Populate existing image
  const existingImg = p.image || "";
  document.getElementById("prod-image").value = existingImg;
  const preview = document.getElementById("prod-image-preview");
  const previewWrap = document.getElementById("prod-image-preview-wrap");
  const status = document.getElementById("prod-image-status");
  if (existingImg && existingImg !== "/src/images/placeholder-product.svg") {
    preview.src = existingImg;
    previewWrap.style.display = "block";
    status.textContent = existingImg.split("/").pop();
  } else {
    preview.src = "";
    previewWrap.style.display = "none";
    status.textContent = "No image chosen";
  }
  document.getElementById("prod-cancel-btn").classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function resetProductForm() {
  document.getElementById("product-form-title").textContent = "Add a Product";
  document.getElementById("prod-id").value = "";
  ["prod-name", "prod-category", "prod-price", "prod-desc"].forEach((id) => (document.getElementById(id).value = ""));
  document.getElementById("prod-brand").value = "";
  document.getElementById("prod-unit").value = "pcs";
  document.getElementById("prod-featured").value = "false";
  document.getElementById("prod-cancel-btn").classList.add("hidden");
  // Reset image
  document.getElementById("prod-image-file").value = "";
  document.getElementById("prod-image").value = "";
  document.getElementById("prod-image-preview").src = "";
  document.getElementById("prod-image-preview-wrap").style.display = "none";
  document.getElementById("prod-image-status").textContent = "No image chosen";
}

async function saveProduct() {
  const id = document.getElementById("prod-id").value;
  const body = {
    name: document.getElementById("prod-name").value.trim(),
    category: document.getElementById("prod-category").value.trim().toLowerCase().replace(/\s+/g, "-"),
    brand: document.getElementById("prod-brand").value || undefined,
    price: parseFloat(document.getElementById("prod-price").value),
    unit: document.getElementById("prod-unit").value.trim() || "pcs",
    featured: document.getElementById("prod-featured").value === "true",
    description: document.getElementById("prod-desc").value.trim(),
  };
  if (!body.name || !body.category || isNaN(body.price) || body.price < 0) {
    toast("Name, category and a valid price are required.", "error");
    return;
  }

  // Upload new image if one was chosen, else keep existing URL from hidden field
  const saveBtn = document.getElementById("prod-save-btn");
  saveBtn.disabled = true;
  saveBtn.textContent = "Saving…";
  try {
    const uploadedUrl = await uploadImageIfChosen();
    if (uploadedUrl) {
      body.image = uploadedUrl;
    } else {
      const existingUrl = document.getElementById("prod-image").value;
      if (existingUrl) body.image = existingUrl;
    }

    if (id) {
      await api(`/products/${id}`, { method: "PUT", auth: true, body });
      toast("Product updated. New rate applies immediately.", "success");
    } else {
      await api("/products", { method: "POST", auth: true, body });
      toast("Product added.", "success");
    }
    resetProductForm();
    await loadProducts();
    await loadStats();
  } catch (err) { toast(err.message, "error"); }
  finally {
    saveBtn.disabled = false;
    saveBtn.textContent = "Save Product";
  }
}

async function toggleStock(id, products) {
  const p = products.find((x) => x._id === id);
  try {
    await api(`/products/${id}`, { method: "PUT", auth: true, body: { inStock: !p.inStock } });
    await loadProducts();
  } catch (err) { toast(err.message, "error"); }
}

async function deleteProduct(id) {
  if (!confirm("Delete this product? This cannot be undone.")) return;
  try {
    await api(`/products/${id}`, { method: "DELETE", auth: true });
    toast("Product deleted.", "success");
    await loadProducts();
    await loadStats();
  } catch (err) { toast(err.message, "error"); }
}

/* ================= Brands ================= */
async function loadBrandsTable() {
  try {
    const brands = await api("/brands");
    document.getElementById("brands-body").innerHTML = brands.map((b) => `
      <tr><td>${escapeHtml(b.name)}</td><td><button class="btn btn-small btn-danger" data-del-brand="${b._id}">Delete</button></td></tr>
    `).join("");
    document.querySelectorAll("[data-del-brand]").forEach((btn) => btn.addEventListener("click", async () => {
      if (!confirm("Delete this brand? Products using it will become unbranded.")) return;
      try {
        await api(`/brands/${btn.dataset.delBrand}`, { method: "DELETE", auth: true });
        toast("Brand deleted.", "success");
        await loadBrandsTable();
        await loadBrandsForForm();
      } catch (err) { toast(err.message, "error"); }
    }));
  } catch (e) { console.error("Load brands error:", e); }
}

async function saveBrand() {
  const name = document.getElementById("brand-name").value.trim();
  if (!name) { toast("Enter a brand name.", "error"); return; }
  try {
    await api("/brands", { method: "POST", auth: true, body: { name } });
    document.getElementById("brand-name").value = "";
    toast("Brand added.", "success");
    await loadBrandsTable();
    await loadBrandsForForm();
  } catch (err) { toast(err.message, "error"); }
}

/* ================= Orders ================= */
async function loadOrders() {
  try {
    const orders = await api("/orders", { auth: true });
    document.getElementById("admin-orders-body").innerHTML = orders.map((o) => `
      <tr>
        <td class="mono">#${o._id.slice(-6).toUpperCase()}</td>
        <td>${escapeHtml(o.customerDetails.name || "-")}</td>
        <td class="mono" style="font-size:0.78rem;">${escapeHtml(o.customerDetails.phone)}<br/>${escapeHtml(o.customerDetails.email)}</td>
        <td class="mono">₹${o.total}</td>
        <td><span class="pill pill-${o.paymentStatus}">${o.paymentStatus}</span></td>
        <td>
          <select data-status="${o._id}">
            ${["received", "processing", "ready", "completed", "cancelled"].map((s) => `<option value="${s}" ${s === o.orderStatus ? "selected" : ""}>${s}</option>`).join("")}
          </select>
        </td>
        <td><a href="/api/orders/${o._id}/invoice" target="_blank" class="btn btn-small btn-outline">PDF</a></td>
        <td><button class="btn btn-small btn-primary" data-save-status="${o._id}">Save</button></td>
      </tr>`).join("");

    document.querySelectorAll("[data-save-status]").forEach((btn) => btn.addEventListener("click", async () => {
      const id = btn.dataset.saveStatus;
      const select = document.querySelector(`[data-status="${id}"]`);
      try {
        await api(`/orders/${id}/status`, { method: "PUT", auth: true, body: { orderStatus: select.value } });
        toast("Order status updated.", "success");
        // Refresh both orders list and stats so the UI reflects the change
        await loadOrders();
        await loadStats();
      } catch (err) { toast(err.message, "error"); }
    }));
  } catch (e) { console.error("Load orders error:", e); }
}

/* ================= Messages ================= */
async function loadMessages() {
  try {
    const messages = await api("/contact", { auth: true });
    const host = document.getElementById("messages-list");
    if (!messages.length) { host.innerHTML = `<div class="empty-state">No messages yet.</div>`; return; }
    host.innerHTML = messages.map((m) => `
      <div class="card" style="margin-bottom:12px;">
        <strong>${escapeHtml(m.name)}</strong> ${m.seenByOwner ? "" : '<span class="pill pill-pending">new</span>'}
        <p class="mono" style="font-size:0.8rem;color:var(--muted);">${escapeHtml(m.phone)} · ${escapeHtml(m.email)} · ${new Date(m.createdAt).toLocaleString()}</p>
        <p>${escapeHtml(m.message)}</p>
        ${m.seenByOwner ? "" : `<button class="btn btn-small btn-outline" data-seen="${m._id}">Mark as read</button>`}
      </div>`).join("");

    document.querySelectorAll("[data-seen]").forEach((btn) => btn.addEventListener("click", async () => {
      try {
        await api(`/contact/${btn.dataset.seen}/seen`, { method: "PUT", auth: true });
        await loadMessages();
        await loadStats();
      } catch (err) { toast(err.message, "error"); }
    }));
  } catch (e) { console.error("Load messages error:", e); }
}

document.addEventListener("DOMContentLoaded", initAdminDashboard);
