async function loadLayout() {
  const headerHost = document.getElementById("layout-header");
  const footerHost = document.getElementById("layout-footer");

  if (headerHost) {
    headerHost.innerHTML = await (await fetch("/partials/header.html")).text();
  }
  if (footerHost) {
    footerHost.innerHTML = await (await fetch("/partials/footer.html")).text();
  }

  applyShopInfo();
  highlightActiveNav();
  wireSearch();
  wireSession();
  wireNotifications();
  wireBot();
  wireHamburger();
  updateCartBadge();
  const yearEl = document.getElementById("footer-year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();
}

async function applyShopInfo() {
  try {
    const info = await (await fetch("/api/shop-info")).json();
    const nameEl = document.getElementById("brand-shop-name");
    if (nameEl) nameEl.textContent = info.shopName;
    window.__shopInfo = info;
  } catch (e) { /* ignore, defaults already in HTML */ }
}

function highlightActiveNav() {
  const page = (location.pathname.split("/").pop() || "index.html").replace(".html", "") || "home";
  document.querySelectorAll("[data-nav]").forEach((a) => {
    const key = a.dataset.nav === "home" ? "index" : a.dataset.nav;
    if (key === page || (page === "index" && a.dataset.nav === "home")) a.classList.add("active");
  });
}

function wireSearch() {
  const input = document.getElementById("global-search");
  const btn = document.getElementById("global-search-btn");
  const results = document.getElementById("global-search-results");
  if (!input) return;

  let timer;
  async function runSearch() {
    const q = input.value.trim();
    if (!q) { results.classList.add("hidden"); results.innerHTML = ""; return; }
    try {
      const products = await api(`/products?search=${encodeURIComponent(q)}`);
      if (!products.length) {
        results.innerHTML = `<div style="padding:12px;color:var(--muted);font-size:0.85rem;">No products found for "${escapeHtml(q)}"</div>`;
      } else {
        results.innerHTML = products
          .slice(0, 8)
          .map((p) => `<a href="/products.html?highlight=${p._id}"><span>${escapeHtml(p.name)}</span><span class="price">₹${p.price}</span></a>`)
          .join("");
      }
      results.classList.remove("hidden");
    } catch (e) {
      results.classList.add("hidden");
    }
  }

  input.addEventListener("input", () => { clearTimeout(timer); timer = setTimeout(runSearch, 250); });
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); location.href = `/products.html?search=${encodeURIComponent(input.value.trim())}`; } });
  btn.addEventListener("click", () => { location.href = `/products.html?search=${encodeURIComponent(input.value.trim())}`; });
  document.addEventListener("click", (e) => { if (!e.target.closest(".header-search")) results.classList.add("hidden"); });
}

function wireSession() {
  const user = getUser();
  const link = document.getElementById("dashboard-link");
  if (!link) return;
  if (user) {
    link.textContent = user.role === "admin" ? "Owner Dashboard" : "My Dashboard";
    link.href = user.role === "admin" ? "/admin-dashboard.html" : "/customer-dashboard.html";
  } else {
    link.textContent = "Login";
    link.href = "/login.html";
  }
}

async function wireNotifications() {
  const btn = document.getElementById("notif-btn");
  const panel = document.getElementById("notif-panel");
  const countEl = document.getElementById("notif-count");
  if (!btn) return;
  const user = getUser();

  if (user && user.role === "admin") {
    try {
      const [orders, messages] = await Promise.all([
        api("/orders", { auth: true }),
        api("/contact", { auth: true }),
      ]);
      const unseenOrders = orders.filter((o) => !o.seenByOwner);
      const unseenMsgs = messages.filter((m) => !m.seenByOwner);
      const total = unseenOrders.length + unseenMsgs.length;
      if (total > 0) { countEl.textContent = total; countEl.classList.remove("hidden"); }
      panel.innerHTML =
        unseenOrders.map((o) => `<div class="notif-item">🧾 New bill from ${escapeHtml(o.customerDetails.name || o.customerDetails.phone)} — ₹${o.total}</div>`).join("") +
        unseenMsgs.map((m) => `<div class="notif-item">✉️ New message from ${escapeHtml(m.name)}</div>`).join("") +
        (total === 0 ? `<div class="notif-item">No new notifications.</div>` : "");
    } catch (e) { /* not logged in as admin or server error */ }
  } else {
    panel.innerHTML = `<div class="notif-item">Log in to see order &amp; message notifications.</div>`;
  }

  btn.addEventListener("click", () => panel.classList.toggle("hidden"));
  document.addEventListener("click", (e) => { if (!e.target.closest("#notif-btn") && !e.target.closest("#notif-panel")) panel.classList.add("hidden"); });
}

function wireBot() {
  const toggle = document.getElementById("bot-toggle");
  const win = document.getElementById("bot-window");
  const closeBtn = document.getElementById("bot-close");
  const form = document.getElementById("bot-form");
  const input = document.getElementById("bot-input");
  const messages = document.getElementById("bot-messages");
  if (!toggle) return;

  // In-memory conversation history for context
  const chatHistory = [];

  toggle.addEventListener("click", () => win.classList.toggle("hidden"));
  closeBtn.addEventListener("click", () => win.classList.add("hidden"));

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;

    // Show user message
    appendBotMsg(text, "user");
    chatHistory.push({ role: "user", content: text });
    input.value = "";
    input.disabled = true;

    // Show typing indicator
    const typingEl = appendBotMsg("⋯", "bot", true);

    try {
      const data = await api("/bot", {
        method: "POST",
        body: { message: text, history: chatHistory.slice(-10) },
      });
      typingEl.remove();
      const reply = data.reply || "Sorry, no reply received.";
      appendBotMsg(reply, "bot");
      chatHistory.push({ role: "assistant", content: reply });
    } catch (err) {
      typingEl.remove();
      appendBotMsg("Sorry, I couldn't reach the assistant right now.", "bot");
    } finally {
      input.disabled = false;
      input.focus();
    }
  });

  function appendBotMsg(text, who, isTyping = false) {
    const el = document.createElement("div");
    el.className = `bot-msg bot-msg-${who}`;
    if (isTyping) {
      el.style.opacity = "0.5";
      el.style.fontStyle = "italic";
    }
    // Support newlines in bot replies
    el.style.whiteSpace = "pre-wrap";
    el.textContent = text;
    messages.appendChild(el);
    messages.scrollTop = messages.scrollHeight;
    return el;
  }
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function wireHamburger() {
  const btn = document.getElementById("hamburger-btn");
  const nav = document.getElementById("main-nav");
  if (!btn || !nav) return;

  btn.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("nav-open");
    btn.classList.toggle("is-active", isOpen);
    btn.setAttribute("aria-expanded", String(isOpen));
  });

  // Close nav when a link is clicked
  nav.querySelectorAll("a").forEach((a) => {
    a.addEventListener("click", () => {
      nav.classList.remove("nav-open");
      btn.classList.remove("is-active");
      btn.setAttribute("aria-expanded", "false");
    });
  });

  // Close nav when clicking outside
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".site-header")) {
      nav.classList.remove("nav-open");
      btn.classList.remove("is-active");
      btn.setAttribute("aria-expanded", "false");
    }
  });
}

document.addEventListener("DOMContentLoaded", loadLayout);
