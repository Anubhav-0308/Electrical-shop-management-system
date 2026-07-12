// Small wrapper around fetch() so every page talks to the API the same way.
const API_BASE = "/api";

// ---- Category helpers (shared across home, products, etc.) ----
const CATEGORY_ICONS = {
  "switch": `<img src="/src/images/cat-switch.png" alt="Switch" style="width:48px;height:48px;object-fit:contain;margin:0 auto;display:block;" onerror="this.outerHTML='🔘'" />`,
  "5-pin-socket": `<img src="/src/images/product-5pin-socket.png" alt="Socket" style="width:48px;height:48px;object-fit:contain;margin:0 auto;display:block;" onerror="this.outerHTML='🔌'" />`,
  "3-pin-socket": `<img src="/src/images/product-3pin-socket.png" alt="Socket" style="width:48px;height:48px;object-fit:contain;margin:0 auto;display:block;" onerror="this.outerHTML='🔌'" />`,
  "wire": `<img src="/src/images/cat-wire.jpeg" alt="Wire" style="width:48px;height:48px;object-fit:contain;margin:0 auto;display:block;" onerror="this.outerHTML='🧵'" />`,
  "mcb": `<img src="/src/images/cat-mcb.jpeg" alt="MCB" style="width:48px;height:48px;object-fit:contain;margin:0 auto;display:block;" onerror="this.outerHTML='🛡️'" />`,
  "led-bulb": `<img src="/src/images/cat-bulb.jpg" alt="LED Bulb" style="width:48px;height:48px;object-fit:contain;margin:0 auto;display:block;" onerror="this.outerHTML='💡'" />`,
  "tube-light": `<img src="/src/images/cat-tube.jpeg" alt="Tube Light" style="width:48px;height:48px;object-fit:contain;margin:0 auto;display:block;" onerror="this.outerHTML='💡'" />`,
  "fan": `<img src="/src/images/cat-fan.jpeg" alt="Fan" style="width:48px;height:48px;object-fit:contain;margin:0 auto;display:block;" onerror="this.outerHTML='🌀'" />`,
  "extension-board": `<img src="/src/images/cat-extension.jpeg" alt="Extension Board" style="width:48px;height:48px;object-fit:contain;margin:0 auto;display:block;" onerror="this.outerHTML='🔗'" />`,
};

function categoryIcon(cat) {
  return CATEGORY_ICONS[cat] || "⚡";
}
function categoryLabel(cat) {
  return cat.replace(/-/g, " ");
}

function getToken() {
  return localStorage.getItem("skl_token");
}

function getUser() {
  const raw = localStorage.getItem("skl_user");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (e) {
    // Corrupted session data — clear it and treat as logged-out
    clearSession();
    return null;
  }
}

function setSession(token, user) {
  localStorage.setItem("skl_token", token);
  localStorage.setItem("skl_user", JSON.stringify(user));
}

function clearSession() {
  localStorage.removeItem("skl_token");
  localStorage.removeItem("skl_user");
}

async function api(path, { method = "GET", body, auth = false } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch (e) { /* no body */ }
  if (!res.ok) {
    throw new Error((data && data.message) || "Something went wrong. Please try again.");
  }
  return data;
}

// ---- Simple cart, stored in memory + localStorage so it survives a refresh ----
const CART_KEY = "skl_cart";

function getCart() {
  const raw = localStorage.getItem(CART_KEY);
  return raw ? JSON.parse(raw) : [];
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartBadge();
}

function addToCart(product, quantity) {
  const cart = getCart();
  const existing = cart.find((i) => i.productId === product._id);
  if (existing) {
    existing.quantity += quantity;
  } else {
    cart.push({
      productId: product._id,
      name: product.name,
      brandName: product.brand ? product.brand.name : "",
      price: product.price,
      quantity,
    });
  }
  saveCart(cart);
}

function removeFromCart(productId) {
  saveCart(getCart().filter((i) => i.productId !== productId));
}

function clearCart() {
  saveCart([]);
}

function cartTotal() {
  return getCart().reduce((sum, i) => sum + i.price * i.quantity, 0);
}

function updateCartBadge() {
  const badge = document.getElementById("cart-count");
  if (!badge) return;
  const count = getCart().reduce((s, i) => s + i.quantity, 0);
  badge.textContent = count;
  badge.classList.toggle("hidden", count === 0);
}

// ---- Toasts ----
function toast(message, type = "info") {
  let container = document.querySelector(".toast-container");
  if (!container) {
    container = document.createElement("div");
    container.className = "toast-container";
    document.body.appendChild(container);
  }
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.textContent = message;
  container.appendChild(el);
  setTimeout(() => el.remove(), 4000);
}
