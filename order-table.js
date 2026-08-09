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
let allOrders = [];
let searchQuery = "";
let statusFilter = "";
let searchDebounce;

const STATUS_OPTIONS = [
  "pending",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
];

// ---------- ELEMENTS ----------
const tableBody = document.getElementById("orders-table-body");
const emptyState = document.getElementById("empty-state");
const resultsSummary = document.getElementById("results-summary");
const searchInput = document.getElementById("search-input");
const statusSelect = document.getElementById("filter-status");

// ---------- STATUS BADGE COLORS (dropdown ki border/text color ke liye) ----------
function statusColorClasses(status) {
  const map = {
    pending: "text-[#FFB020] border-[#FFB020]/30 bg-[#FFB020]/10",
    processing: "text-[#7C5CFC] border-[#7C5CFC]/30 bg-[#7C5CFC]/10",
    shipped: "text-[#34E4EA] border-[#34E4EA]/30 bg-[#34E4EA]/10",
    delivered: "text-[#34D399] border-[#34D399]/30 bg-[#34D399]/10",
    cancelled: "text-[#FB7185] border-[#FB7185]/30 bg-[#FB7185]/10",
  };
  return (
    map[status?.toLowerCase()] ||
    "text-gray-400 border-gray-400/30 bg-gray-400/10"
  );
}

// ---------- RENDER ROW ----------
function renderRow(order) {
  const customer =
    order.profiles?.full_name || order.profiles?.email || "Guest";
  const date = new Date(order.created_at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const itemCount = order.order_items?.length || 0;
  const colorCls = statusColorClasses(order.status);

  const options = STATUS_OPTIONS.map(
    (s) =>
      `<option value="${s}" ${order.status?.toLowerCase() === s ? "selected" : ""}>${s.charAt(0).toUpperCase() + s.slice(1)}</option>`,
  ).join("");

  return `
    <tr class="border-b border-black/5 dark:border-white/10 last:border-0 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition">
      <td class="px-5 sm:px-6 py-3.5 font-medium">#${String(order.id).slice(0, 8)}</td>
      <td class="px-5 sm:px-6 py-3.5 text-[#6B6980] dark:text-[#9C9AB3]">${customer}</td>
      <td class="px-5 sm:px-6 py-3.5 text-[#6B6980] dark:text-[#9C9AB3]">${itemCount} item${itemCount === 1 ? "" : "s"}</td>
      <td class="px-5 sm:px-6 py-3.5 font-semibold">$${Number(order.total_amount || 0).toFixed(2)}</td>
      <td class="px-5 sm:px-6 py-3.5">
        <select
          data-id="${order.id}"
          class="status-select text-xs font-semibold rounded-full px-3 py-1.5 border cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#7C5CFC] transition ${colorCls}"
        >
          ${options}
        </select>
      </td>
      <td class="px-5 sm:px-6 py-3.5 text-[#6B6980] dark:text-[#9C9AB3]">${date}</td>
      <td class="px-5 sm:px-6 py-3.5 text-right">
        <button data-id="${order.id}" aria-label="View order details"
          class="view-btn p-2 rounded-lg text-[#7C5CFC] hover:bg-[#7C5CFC]/10 transition cursor-pointer">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
          </svg>
        </button>
      </td>
    </tr>
  `;
}

// ---------- APPLY FILTERS + RENDER ----------
function applyFiltersAndRender() {
  let filtered = allOrders;

  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter((o) => {
      const customer = (
        o.profiles?.full_name ||
        o.profiles?.email ||
        ""
      ).toLowerCase();
      return String(o.id).toLowerCase().includes(q) || customer.includes(q);
    });
  }

  if (statusFilter) {
    filtered = filtered.filter((o) => o.status?.toLowerCase() === statusFilter);
  }

  resultsSummary.textContent = `${filtered.length} of ${allOrders.length} orders`;

  if (!filtered.length) {
    tableBody.innerHTML = "";
    emptyState.classList.remove("hidden");
    return;
  }

  emptyState.classList.add("hidden");
  tableBody.innerHTML = filtered.map(renderRow).join("");
}

// ---------- LOAD ORDERS ----------
async function loadOrders() {
  tableBody.innerHTML = Array(5)
    .fill(
      `<tr class="animate-pulse border-b border-black/5 dark:border-white/10">
        <td class="px-5 sm:px-6 py-4"><div class="h-4 bg-gray-200 dark:bg-white/10 rounded w-16"></div></td>
        <td class="px-5 sm:px-6 py-4"><div class="h-4 bg-gray-200 dark:bg-white/10 rounded w-24"></div></td>
        <td class="px-5 sm:px-6 py-4"><div class="h-4 bg-gray-200 dark:bg-white/10 rounded w-12"></div></td>
        <td class="px-5 sm:px-6 py-4"><div class="h-4 bg-gray-200 dark:bg-white/10 rounded w-14"></div></td>
        <td class="px-5 sm:px-6 py-4"><div class="h-6 bg-gray-200 dark:bg-white/10 rounded-full w-20"></div></td>
        <td class="px-5 sm:px-6 py-4"><div class="h-4 bg-gray-200 dark:bg-white/10 rounded w-20"></div></td>
        <td class="px-5 sm:px-6 py-4"><div class="h-4 bg-gray-200 dark:bg-white/10 rounded w-8 ml-auto"></div></td>
      </tr>`,
    )
    .join("");

  try {
    const { data, error } = await supabase
      .from("orders")
      .select(
        "*, profiles ( full_name, email ), order_items ( id, quantity, price, products ( name, image_url ) )",
      )
      .order("created_at", { ascending: false });

    if (error) throw error;

    allOrders = data || [];
    applyFiltersAndRender();
  } catch (err) {
    console.error(err);
    tableBody.innerHTML = `<tr><td colspan="7" class="text-center py-10 text-[#FB7185]">Failed to load orders</td></tr>`;
    resultsSummary.textContent = "Failed to load orders";
  }
}
loadOrders();

// ---------- FILTER EVENTS ----------
searchInput.addEventListener("input", (e) => {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => {
    searchQuery = e.target.value.trim();
    applyFiltersAndRender();
  }, 250);
});

statusSelect.addEventListener("change", (e) => {
  statusFilter = e.target.value;
  applyFiltersAndRender();
});

// ---------- STATUS UPDATE (inline dropdown per row) ----------
tableBody.addEventListener("change", async (e) => {
  const select = e.target.closest(".status-select");
  if (!select) return;

  const orderId = select.dataset.id;
  const newStatus = select.value;
  const originalClasses = select.className;

  select.disabled = true;

  try {
    const { error } = await supabase
      .from("orders")
      .update({ status: newStatus })
      .eq("id", orderId);

    if (error) throw error;

    // Local state bhi update karo taake filter/summary sahi rahe...
    const order = allOrders.find((o) => String(o.id) === String(orderId));
    if (order) order.status = newStatus;

    // Dropdown ki color bhi naye status ke hisaab se update karo
    const colorCls = statusColorClasses(newStatus);
    select.className = `status-select text-xs font-semibold rounded-full px-3 py-1.5 border cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#7C5CFC] transition ${colorCls}`;

    toast(`Order status updated to "${newStatus}"`);
  } catch (err) {
    console.error(err);
    toast("Failed to update status", "error");
    select.className = originalClasses;
  } finally {
    select.disabled = false;
  }
});

// ---------- ORDER DETAILS MODAL ----------
const orderModal = document.getElementById("order-modal");
const modalOrderId = document.getElementById("modal-order-id");
const modalBody = document.getElementById("modal-body");

function openOrderModal(order) {
  modalOrderId.textContent = `#${String(order.id).slice(0, 8)}`;

  const customer =
    order.profiles?.full_name || order.profiles?.email || "Guest";
  const date = new Date(order.created_at).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const items = order.order_items || [];

  const itemsHTML = items.length
    ? items
        .map(
          (item) => `
        <div class="flex items-center gap-3 py-2.5 border-b border-black/5 dark:border-white/10 last:border-0">
          <img src="${item.products?.image_url || ""}" alt="${item.products?.name || "Product"}" class="w-12 h-12 rounded-lg object-cover shrink-0 bg-black/5 dark:bg-white/5">
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium truncate">${item.products?.name || "Unknown product"}</p>
            <p class="text-xs text-[#6B6980] dark:text-[#9C9AB3]">Qty: ${item.quantity}</p>
          </div>
          <p class="text-sm font-semibold shrink-0">$${(Number(item.price) * item.quantity).toFixed(2)}</p>
        </div>
      `,
        )
        .join("")
    : `<p class="text-sm text-[#6B6980] dark:text-[#9C9AB3] text-center py-4">No items found for this order.</p>`;

  modalBody.innerHTML = `
    <div class="grid grid-cols-2 gap-4 text-sm">
      <div>
        <p class="text-xs text-[#6B6980] dark:text-[#9C9AB3] mb-1">Customer</p>
        <p class="font-medium">${customer}</p>
      </div>
      <div>
        <p class="text-xs text-[#6B6980] dark:text-[#9C9AB3] mb-1">Order Date</p>
        <p class="font-medium">${date}</p>
      </div>
      <div>
        <p class="text-xs text-[#6B6980] dark:text-[#9C9AB3] mb-1">Status</p>
        <span class="inline-block px-2.5 py-1 rounded-full text-xs font-semibold border ${statusColorClasses(order.status)}">${order.status || "—"}</span>
      </div>
      <div>
        <p class="text-xs text-[#6B6980] dark:text-[#9C9AB3] mb-1">Total Amount</p>
        <p class="font-semibold text-[#7C5CFC]">$${Number(order.total_amount || 0).toFixed(2)}</p>
      </div>
    </div>

    <div>
      <p class="text-xs text-[#6B6980] dark:text-[#9C9AB3] mb-2 uppercase tracking-wider font-semibold">Items</p>
      <div class="bg-black/[0.02] dark:bg-white/[0.02] rounded-xl px-4">
        ${itemsHTML}
      </div>
    </div>
  `;

  orderModal.classList.remove("hidden");
  orderModal.classList.add("flex");
}

function closeOrderModal() {
  orderModal.classList.add("hidden");
  orderModal.classList.remove("flex");
}

tableBody.addEventListener("click", (e) => {
  const btn = e.target.closest(".view-btn");
  if (!btn) return;

  const order = allOrders.find((o) => String(o.id) === String(btn.dataset.id));
  if (order) openOrderModal(order);
});

document
  .getElementById("modal-close-btn")
  ?.addEventListener("click", closeOrderModal);

orderModal.addEventListener("click", (e) => {
  if (e.target === orderModal) closeOrderModal();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !orderModal.classList.contains("hidden")) {
    closeOrderModal();
  }
});
