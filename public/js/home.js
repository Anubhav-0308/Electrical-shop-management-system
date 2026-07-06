
async function loadHome() {
  const track = document.getElementById("scroll-track");
  const categoryGrid = document.getElementById("category-grid");
  if (!track && !categoryGrid) return; // not the home page, only helper functions needed

  try {
    const featured = await api("/products?featured=true");
    const list = featured.length ? featured : await api("/products");
    const cards = list.map(productCardHtml).join("");
    if (track) track.innerHTML = cards + cards; // duplicate for seamless loop
  } catch (e) { console.error(e); }

  try {
    const categories = await api("/products/categories");
    if (categoryGrid) categoryGrid.innerHTML = categories
      .map((c) => `
        <a class="category-card" href="/products.html?category=${encodeURIComponent(c)}">
          <div class="cat-icon">${categoryIcon(c)}</div>
          <div class="cat-name">${categoryLabel(c)}</div>
        </a>`)
      .join("");
  } catch (e) { console.error(e); }

  try {
    const reviews = await api("/reviews?general=true");
    const host = document.getElementById("home-reviews");
    if (!reviews.length) {
      host.innerHTML = `<div class="empty-state">No reviews yet — be the first to rate the shop!</div>`;
    } else {
      host.innerHTML = reviews.slice(0, 5).map((r) => `
        <div class="review-item">
          <div class="review-name">${escapeHtml(r.userName)}</div>
          <div class="review-stars">${"★".repeat(r.rating)}${"☆".repeat(5 - r.rating)}</div>
          <div>${escapeHtml(r.comment || "")}</div>
        </div>`).join("");
    }
  } catch (e) { console.error(e); }
}

function productCardHtml(p) {
  const imgSrc = p.image || "/src/images/placeholder-product.svg";
  return `
    <div class="product-card" style="width:220px;flex-shrink:0;">
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
    </div>`;
}

document.addEventListener("DOMContentLoaded", loadHome);
