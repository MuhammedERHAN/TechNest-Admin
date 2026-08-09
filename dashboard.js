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

// ---------- SCROLL REVEAL ----------
const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("revealed");
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.01 },
);
document
  .querySelectorAll("[data-reveal]")
  .forEach((el) => revealObserver.observe(el));

// ---------- STAT CARD TEMPLATE ----------
function statCard({ label, value, icon, color, bg }) {
  return `
    <div class="bg-white/60 dark:bg-white/[0.03] backdrop-blur-xl border border-black/5 dark:border-white/10 rounded-2xl p-5 hover:-translate-y-1 hover:shadow-lg transition-all duration-300">
      <div class="w-10 h-10 rounded-xl ${bg} ${color} flex items-center justify-center mb-4">
        ${icon}
      </div>
      <p class="text-2xl font-bold font-['Poppins']">${value}</p>
      <p class="text-xs text-[#6B6980] dark:text-[#9C9AB3] mt-1">${label}</p>
    </div>
  `;
}

const icons = {
  products: `<svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M20 7L12 3 4 7m16 0-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>`,
  orders: `<svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 7h6m-6 4h6"/></svg>`,
  revenue: `<svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V6m0 10v2m9-8a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`,
  users: `<svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 100-8 4 4 0 000 8zm6 4v-2a4 4 0 00-3-3.87m-4-8.13a4 4 0 11-8 0 4 4 0 018 0z"/></svg>`,
};

// ---------- LOAD STATS ----------
async function loadStats() {
  const statsGrid = document.getElementById("stats-grid");
  statsGrid.innerHTML = Array(4)
    .fill(
      `<div class="animate-pulse bg-white/60 dark:bg-white/[0.03] rounded-2xl p-5 h-[104px]"></div>`,
    )
    .join("");

  try {
    const [productsRes, ordersRes, usersRes] = await Promise.all([
      supabase.from("products").select("id", { count: "exact", head: true }),
      supabase.from("orders").select("id, total_amount", { count: "exact" }),
      supabase.from("profiles").select("id", { count: "exact", head: true }),
    ]);

    const totalProducts = productsRes.count || 0;
    const totalOrders = ordersRes.count || 0;
    const totalUsers = usersRes.count || 0;
    const totalRevenue = (ordersRes.data || []).reduce(
      (sum, o) => sum + Number(o.total_amount || 0),
      0,
    );

    statsGrid.innerHTML = [
      statCard({
        label: "Total Products",
        value: totalProducts,
        icon: icons.products,
        color: "text-[#7C5CFC]",
        bg: "bg-[#7C5CFC]/10",
      }),
      statCard({
        label: "Total Orders",
        value: totalOrders,
        icon: icons.orders,
        color: "text-[#34E4EA]",
        bg: "bg-[#34E4EA]/10",
      }),
      statCard({
        label: "Total Revenue",
        value: `$${totalRevenue.toFixed(2)}`,
        icon: icons.revenue,
        color: "text-[#34D399]",
        bg: "bg-[#34D399]/10",
      }),
      statCard({
        label: "Registered Users",
        value: totalUsers,
        icon: icons.users,
        color: "text-[#FFB020]",
        bg: "bg-[#FFB020]/10",
      }),
    ].join("");
  } catch (err) {
    console.error(err);
    statsGrid.innerHTML = `<p class="col-span-full text-center text-[#FB7185] py-6">Failed to load stats</p>`;
  }
}
loadStats();

// ---------- STATUS BADGE ----------
function statusBadge(status) {
  const map = {
    pending: "bg-[#FFB020]/10 text-[#FFB020]",
    processing: "bg-[#7C5CFC]/10 text-[#7C5CFC]",
    shipped: "bg-[#34E4EA]/10 text-[#34E4EA]",
    delivered: "bg-[#34D399]/10 text-[#34D399]",
    cancelled: "bg-[#FB7185]/10 text-[#FB7185]",
  };
  const cls = map[status?.toLowerCase()] || "bg-gray-500/10 text-gray-400";
  return `<span class="px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${cls}">${status || "—"}</span>`;
}

// ---------- RECENT ORDERS ----------
async function loadRecentOrders() {
  const tbody = document.getElementById("recent-orders-body");
  const emptyState = document.getElementById("recent-orders-empty");

  tbody.innerHTML = Array(4)
    .fill(
      `<tr class="animate-pulse border-b border-black/5 dark:border-white/10">
        <td class="px-5 sm:px-6 py-4"><div class="h-4 bg-gray-200 dark:bg-white/10 rounded w-16"></div></td>
        <td class="px-5 sm:px-6 py-4"><div class="h-4 bg-gray-200 dark:bg-white/10 rounded w-24"></div></td>
        <td class="px-5 sm:px-6 py-4"><div class="h-4 bg-gray-200 dark:bg-white/10 rounded w-16"></div></td>
        <td class="px-5 sm:px-6 py-4"><div class="h-4 bg-gray-200 dark:bg-white/10 rounded w-14"></div></td>
        <td class="px-5 sm:px-6 py-4"><div class="h-4 bg-gray-200 dark:bg-white/10 rounded w-20"></div></td>
      </tr>`,
    )
    .join("");

  try {
    const { data, error } = await supabase
      .from("orders")
      .select(
        "id, status, total_amount, created_at, profiles ( full_name, email )",
      )
      .order("created_at", { ascending: false })
      .limit(5);

    if (error) throw error;

    if (!data.length) {
      tbody.innerHTML = "";
      emptyState.classList.remove("hidden");
      return;
    }

    emptyState.classList.add("hidden");
    tbody.innerHTML = data
      .map((order) => {
        const customer =
          order.profiles?.full_name || order.profiles?.email || "Guest";
        const date = new Date(order.created_at).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        });
        return `
          <tr class="border-b border-black/5 dark:border-white/10 last:border-0 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition">
            <td class="px-5 sm:px-6 py-4 font-medium">#${String(order.id).slice(0, 8)}</td>
            <td class="px-5 sm:px-6 py-4 text-[#6B6980] dark:text-[#9C9AB3]">${customer}</td>
            <td class="px-5 sm:px-6 py-4">${statusBadge(order.status)}</td>
            <td class="px-5 sm:px-6 py-4 font-semibold">$${Number(order.total_amount || 0).toFixed(2)}</td>
            <td class="px-5 sm:px-6 py-4 text-[#6B6980] dark:text-[#9C9AB3]">${date}</td>
          </tr>
        `;
      })
      .join("");
  } catch (err) {
    console.error(err);
    tbody.innerHTML = `<tr><td colspan="5" class="text-center py-10 text-[#FB7185]">Failed to load orders</td></tr>`;
  }
}
loadRecentOrders();

// ---------- LOW STOCK PRODUCTS ----------
async function loadLowStock() {
  const list = document.getElementById("low-stock-list");
  const emptyState = document.getElementById("low-stock-empty");

  try {
    const { data, error } = await supabase
      .from("products")
      .select("id, name, image_url, stock")
      .lte("stock", 5)
      .order("stock", { ascending: true })
      .limit(5);

    if (error) throw error;

    if (!data.length) {
      list.innerHTML = "";
      emptyState.classList.remove("hidden");
      return;
    }

    emptyState.classList.add("hidden");
    list.innerHTML = data
      .map(
        (p) => `
        <a href="./product-table.html" class="flex items-center gap-4 px-5 sm:px-6 py-3.5 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition">
          <img src="${p.image_url}" alt="${p.name}" class="w-11 h-11 rounded-lg object-cover shrink-0">
          <span class="flex-1 min-w-0 truncate text-sm font-medium">${p.name}</span>
          <span class="shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full ${p.stock === 0 ? "bg-[#FB7185]/10 text-[#FB7185]" : "bg-[#FFB020]/10 text-[#FFB020]"}">
            ${p.stock === 0 ? "Out of stock" : `${p.stock} left`}
          </span>
        </a>
      `,
      )
      .join("");
  } catch (err) {
    console.error(err);
    list.innerHTML = `<p class="text-center py-10 text-[#FB7185]">Failed to load stock data</p>`;
  }
}
loadLowStock();
