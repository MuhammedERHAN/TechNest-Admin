const supabase = window.supabase;

// ---------- TOAST ----------
function toast(message, type = "success") {
  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    container.className =
      "fixed bottom-6 inset-x-0 z-[999] flex flex-col items-center gap-2 px-4 pointer-events-none";
    document.body.appendChild(container);
  }
  const icons = {
    success: { color: "#34D399", path: "M5 13l4 4L19 7" },
    error: { color: "#FB7185", path: "M6 18L18 6M6 6l12 12" },
  };
  const s = icons[type] || icons.success;
  const el = document.createElement("div");
  el.className =
    "w-full max-w-[92vw] sm:max-w-sm bg-[#1F1F23] text-white px-4 py-3 rounded-lg shadow-xl flex items-center gap-3 text-sm animate-toast-in pointer-events-auto";
  el.innerHTML = `
    <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="${s.color}" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="${s.path}"/></svg>
    <span class="flex-1">${message}</span>
  `;
  container.appendChild(el);
  setTimeout(() => {
    el.style.transition = "opacity 0.25s ease, transform 0.25s ease";
    el.style.opacity = "0";
    el.style.transform = "translateY(10px)";
    setTimeout(() => el.remove(), 250);
  }, 2800);
}

// ---------- THEME TOGGLE ----------
const themeBtn = document.getElementById("theme-toggle");
const iconSun = document.getElementById("icon-sun");
const iconMoon = document.getElementById("icon-moon");

function syncThemeIcons() {
  const dark = document.documentElement.classList.contains("dark");
  iconSun.classList.toggle("hidden", dark);
  iconMoon.classList.toggle("hidden", !dark);
}
syncThemeIcons();

themeBtn.addEventListener("click", () => {
  const nowDark = !document.documentElement.classList.contains("dark");
  document.documentElement.classList.toggle("dark", nowDark);
  localStorage.setItem("technest-theme", nowDark ? "dark" : "light");
  syncThemeIcons();
});

// ---------- MOBILE SIDEBAR ----------
const mobileSidebar = document.getElementById("mobile-sidebar");

function closeMobileSidebar() {
  mobileSidebar?.classList.add("hidden");
  document.body.style.overflow = "";
}

document
  .getElementById("open-mobile-sidebar")
  ?.addEventListener("click", () => {
    mobileSidebar?.classList.remove("hidden");
    document.body.style.overflow = "hidden";
  });

document
  .getElementById("close-mobile-sidebar")
  ?.addEventListener("click", closeMobileSidebar);

mobileSidebar?.addEventListener("click", (e) => {
  if (e.target === mobileSidebar) closeMobileSidebar();
});

// ---------- LOGOUT ----------
async function handleLogout() {
  try {
    await supabase.auth.signOut();
    window.location.href = "./index.html";
  } catch (err) {
    console.error(err);
    toast("Failed to logout", "error");
  }
}
document.getElementById("logout-btn")?.addEventListener("click", handleLogout);
document
  .getElementById("mobile-logout-btn")
  ?.addEventListener("click", handleLogout);

// ---------- LOAD ADMIN INFO ----------
async function loadAdminInfo() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return;

  const name =
    session.user.user_metadata?.full_name || session.user.email.split("@")[0];
  const avatar = document.getElementById("admin-avatar");
  const nameEl = document.getElementById("admin-name");

  if (avatar) {
    avatar.src =
      session.user.user_metadata?.avatar_url ||
      `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`;
  }
  if (nameEl) nameEl.textContent = name;
}
loadAdminInfo();

// ---------- STATE ----------
let allProducts = [];
let categoriesMap = {};
let searchQuery = "";
let categoryFilter = "";
let stockFilter = "";
let searchDebounce;

// ---------- ELEMENTS ----------
const tableBody = document.getElementById("products-table-body");
const emptyState = document.getElementById("empty-state");
const resultsSummary = document.getElementById("results-summary");
const searchInput = document.getElementById("search-input");
const categorySelect = document.getElementById("filter-category");
const stockSelect = document.getElementById("filter-stock");

// ---------- LOAD CATEGORIES (for filter dropdown + name lookup) ----------
async function loadCategories() {
  try {
    const { data, error } = await supabase
      .from("categories")
      .select("id, name")
      .order("name");

    if (error) throw error;

    data.forEach((cat) => {
      categoriesMap[cat.id] = cat.name;
      const opt = document.createElement("option");
      opt.value = cat.id;
      opt.textContent = cat.name;
      categorySelect.appendChild(opt);
    });
  } catch (err) {
    console.error(err);
  }
}

// ---------- STOCK BADGE ----------
function stockBadge(stock) {
  if (stock === 0) {
    return `<span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-[#FB7185]/10 text-[#FB7185]">Out of stock</span>`;
  }
  if (stock <= 5) {
    return `<span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-[#FFB020]/10 text-[#FFB020]">${stock} left</span>`;
  }
  return `<span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-[#34D399]/10 text-[#34D399]">${stock} in stock</span>`;
}

// ---------- RENDER ROW ----------
function renderRow(product) {
  const categoryName = categoriesMap[product.category_id] || "Uncategorized";
  const hasDiscount = (product.discount_percent || 0) > 0;

  return `
    <tr class="border-b border-black/5 dark:border-white/10 last:border-0 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition">
      <td class="px-5 sm:px-6 py-3.5">
        <div class="flex items-center gap-3">
          <img src="${product.image_url}" alt="${product.name}" class="w-11 h-11 rounded-lg object-cover shrink-0">
          <div class="min-w-0">
            <p class="font-medium truncate max-w-[180px] sm:max-w-xs">${product.name}</p>
            ${hasDiscount ? `<p class="text-xs text-[#34D399]">${product.discount_percent}% off</p>` : ""}
          </div>
        </div>
      </td>
      <td class="px-5 sm:px-6 py-3.5 text-[#6B6980] dark:text-[#9C9AB3]">${categoryName}</td>
      <td class="px-5 sm:px-6 py-3.5 font-semibold">$${Number(product.price).toFixed(2)}</td>
      <td class="px-5 sm:px-6 py-3.5">${stockBadge(product.stock ?? 0)}</td>
      <td class="px-5 sm:px-6 py-3.5">
        <span class="flex items-center gap-1 text-[#FFB020] font-medium">
          <svg class="w-3.5 h-3.5 fill-[#FFB020]" viewBox="0 0 24 24"><path d="M12 2l2.9 6.26L21 9.27l-4.5 4.38L17.8 21 12 17.77 6.2 21l1.3-7.35L3 9.27l6.1-1.01L12 2z"/></svg>
          ${product.rating ?? 5}
        </span>
      </td>
      <td class="px-5 sm:px-6 py-3.5">
        <div class="flex items-center justify-end gap-2">
          <a href="./product-form.html?id=${product.id}" aria-label="Edit product"
            class="p-2 rounded-lg text-[#7C5CFC] hover:bg-[#7C5CFC]/10 transition">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
            </svg>
          </a>
          <button data-id="${product.id}" data-name="${product.name}" aria-label="Delete product"
            class="delete-btn p-2 rounded-lg text-[#FB7185] hover:bg-[#FB7185]/10 transition cursor-pointer">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3M4 7h16"/>
            </svg>
          </button>
        </div>
      </td>
    </tr>
  `;
}

// ---------- APPLY FILTERS + RENDER ----------
function applyFiltersAndRender() {
  let filtered = allProducts;

  if (searchQuery) {
    filtered = filtered.filter((p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }

  if (categoryFilter) {
    filtered = filtered.filter(
      (p) => String(p.category_id) === String(categoryFilter),
    );
  }

  if (stockFilter === "in") {
    filtered = filtered.filter((p) => (p.stock ?? 0) > 5);
  } else if (stockFilter === "low") {
    filtered = filtered.filter(
      (p) => (p.stock ?? 0) > 0 && (p.stock ?? 0) <= 5,
    );
  } else if (stockFilter === "out") {
    filtered = filtered.filter((p) => (p.stock ?? 0) === 0);
  }

  resultsSummary.textContent = `${filtered.length} of ${allProducts.length} products`;

  if (!filtered.length) {
    tableBody.innerHTML = "";
    emptyState.classList.remove("hidden");
    return;
  }

  emptyState.classList.add("hidden");
  tableBody.innerHTML = filtered.map(renderRow).join("");
}

// ---------- LOAD PRODUCTS ----------
async function loadProducts() {
  tableBody.innerHTML = Array(5)
    .fill(
      `<tr class="animate-pulse border-b border-black/5 dark:border-white/10">
        <td class="px-5 sm:px-6 py-4"><div class="h-11 bg-gray-200 dark:bg-white/10 rounded-lg w-11"></div></td>
        <td class="px-5 sm:px-6 py-4"><div class="h-4 bg-gray-200 dark:bg-white/10 rounded w-20"></div></td>
        <td class="px-5 sm:px-6 py-4"><div class="h-4 bg-gray-200 dark:bg-white/10 rounded w-14"></div></td>
        <td class="px-5 sm:px-6 py-4"><div class="h-4 bg-gray-200 dark:bg-white/10 rounded w-16"></div></td>
        <td class="px-5 sm:px-6 py-4"><div class="h-4 bg-gray-200 dark:bg-white/10 rounded w-10"></div></td>
        <td class="px-5 sm:px-6 py-4"><div class="h-4 bg-gray-200 dark:bg-white/10 rounded w-16 ml-auto"></div></td>
      </tr>`,
    )
    .join("");

  try {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    allProducts = data || [];
    applyFiltersAndRender();
  } catch (err) {
    console.error(err);
    tableBody.innerHTML = `<tr><td colspan="6" class="text-center py-10 text-[#FB7185]">Failed to load products</td></tr>`;
    resultsSummary.textContent = "Failed to load products";
  }
}

// ---------- INIT ----------
(async function init() {
  await loadCategories();
  await loadProducts();
})();

// ---------- FILTER EVENTS ----------
searchInput.addEventListener("input", (e) => {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => {
    searchQuery = e.target.value.trim();
    applyFiltersAndRender();
  }, 250);
});

categorySelect.addEventListener("change", (e) => {
  categoryFilter = e.target.value;
  applyFiltersAndRender();
});

stockSelect.addEventListener("change", (e) => {
  stockFilter = e.target.value;
  applyFiltersAndRender();
});

// ---------- DELETE FLOW ----------
const deleteModal = document.getElementById("delete-modal");
const deleteCancelBtn = document.getElementById("delete-cancel-btn");
const deleteConfirmBtn = document.getElementById("delete-confirm-btn");
let pendingDeleteId = null;

function openDeleteModal(id) {
  pendingDeleteId = id;
  deleteModal.classList.remove("hidden");
  deleteModal.classList.add("flex");
}

function closeDeleteModal() {
  pendingDeleteId = null;
  deleteModal.classList.add("hidden");
  deleteModal.classList.remove("flex");
}

tableBody.addEventListener("click", (e) => {
  const btn = e.target.closest(".delete-btn");
  if (!btn) return;
  openDeleteModal(btn.dataset.id);
});

deleteCancelBtn.addEventListener("click", closeDeleteModal);
deleteModal.addEventListener("click", (e) => {
  if (e.target === deleteModal) closeDeleteModal();
});

deleteConfirmBtn.addEventListener("click", async () => {
  if (!pendingDeleteId) return;

  const originalText = deleteConfirmBtn.textContent;
  deleteConfirmBtn.disabled = true;
  deleteConfirmBtn.textContent = "Deleting...";

  try {
    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", pendingDeleteId);

    if (error) throw error;

    allProducts = allProducts.filter(
      (p) => String(p.id) !== String(pendingDeleteId),
    );
    applyFiltersAndRender();
    toast("Product deleted successfully");
  } catch (err) {
    console.error(err);
    toast("Failed to delete product", "error");
  } finally {
    deleteConfirmBtn.disabled = false;
    deleteConfirmBtn.textContent = originalText;
    closeDeleteModal();
  }
});
