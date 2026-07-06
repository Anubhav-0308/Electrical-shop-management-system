let selectedRating = 0;

function requireCustomer() {
  const user = getUser();
  if (!user) { location.href = "/login.html"; return null; }
  if (user.role === "admin") { location.href = "/admin-dashboard.html"; return null; }
  return user;
}

async function initCustomerDashboard() {
  const user = requireCustomer();
  if (!user) return;

  document.getElementById("cust-name").textContent = user.name;
  document.getElementById("p-name").textContent = user.name;
  document.getElementById("p-email").textContent = "✉️ " + user.email;
  document.getElementById("p-phone").textContent = "📞 " + (user.phone || "-");

  wireTabs();
  wireLogout();
  wireStars();
  await loadOrders();
  await loadReviews();

  document.getElementById("submit-review").addEventListener("click", submitReview);

  if (location.hash === "#reviews") {
    document.querySelector('[data-tab="reviews"]').click();
  }
}

function wireTabs() {
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
      document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
      btn.classList.add("active");
      document.querySelector(`[data-panel="${btn.dataset.tab}"]`).classList.add("active");
    });
  });
}

function wireLogout() {
  document.getElementById("logout-btn").addEventListener("click", () => {
    clearSession();
    toast("Logged out successfully.", "success");
    setTimeout(() => { location.href = "/index.html"; }, 700);
  });
}

function wireStars() {
  const stars = document.querySelectorAll("#rating-stars .star");
  stars.forEach((star) => {
    star.addEventListener("click", () => {
      selectedRating = parseInt(star.dataset.val, 10);
      stars.forEach((s) => s.classList.toggle("filled", parseInt(s.dataset.val, 10) <= selectedRating));
    });
  });
}

async function loadOrders() {
  try {
    const orders = await api("/orders/my", { auth: true });
    const body = document.getElementById("orders-body");
    const empty = document.getElementById("orders-empty");
    if (!orders.length) { empty.classList.remove("hidden"); return; }
    body.innerHTML = orders.map((o) => `
      <tr>
        <td class="mono">#${o._id.slice(-6).toUpperCase()}</td>
        <td>${new Date(o.createdAt).toLocaleDateString()}</td>
        <td>${o.items.length} item(s)</td>
        <td class="mono">₹${o.total}</td>
        <td><span class="pill pill-${o.paymentStatus}">${o.paymentStatus}</span></td>
        <td><span class="pill pill-${o.orderStatus}">${o.orderStatus}</span></td>
        <td><a href="/api/orders/${o._id}/invoice" target="_blank" class="btn btn-small btn-outline">PDF</a></td>
      </tr>`).join("");
  } catch (e) { console.error(e); }
}

async function submitReview() {
  const msgEl = document.getElementById("review-msg");
  msgEl.textContent = ""; msgEl.className = "form-msg";
  if (!selectedRating) { msgEl.textContent = "Please select a star rating."; msgEl.classList.add("error"); return; }
  try {
    await api("/reviews", {
      method: "POST",
      auth: true,
      body: { rating: selectedRating, comment: document.getElementById("review-comment").value },
    });
    msgEl.textContent = "Thanks for your feedback!";
    msgEl.classList.add("success");
    document.getElementById("review-comment").value = "";
    selectedRating = 0;
    document.querySelectorAll("#rating-stars .star").forEach((s) => s.classList.remove("filled"));
    await loadReviews();
  } catch (err) {
    msgEl.textContent = err.message;
    msgEl.classList.add("error");
  }
}

async function loadReviews() {
  try {
    const reviews = await api("/reviews?general=true");
    const host = document.getElementById("all-reviews");
    if (!reviews.length) { host.innerHTML = `<div class="empty-state">No reviews yet.</div>`; return; }
    host.innerHTML = reviews.map((r) => `
      <div class="review-item">
        <div class="review-name">${escapeHtml(r.userName)}</div>
        <div class="review-stars">${"★".repeat(r.rating)}${"☆".repeat(5 - r.rating)}</div>
        <div>${escapeHtml(r.comment || "")}</div>
      </div>`).join("");
  } catch (e) { console.error(e); }
}

document.addEventListener("DOMContentLoaded", initCustomerDashboard);
