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
let allCategories = [];
let searchQuery = "";
let searchDebounce;

// ---------- ELEMENTS ----------
const tableBody = document.getElementById("categories-table-body");
const emptyState = document.getElementById("empty-state");
const resultsSummary = document.getElementById("results-summary");
const searchInput = document.getElementById("search-input");

// ---------- RENDER ROW ----------
function renderRow(category) {
  const count = category.productCount ?? 0;

  return `
    <tr class="border-b border-black/5 dark:border-white/10 last:border-0 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition">
      <td class="px-5 sm:px-6 py-3.5">
        <div class="flex items-center gap-3">
          <img src="${category.image_url}" alt="${category.name}" class="w-11 h-11 rounded-lg object-cover shrink-0">
          <p class="font-medium truncate max-w-[200px] sm:max-w-xs">${category.name}</p>
        </div>
      </td>
      <td class="px-5 sm:px-6 py-3.5">
        <span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-[#7C5CFC]/10 text-[#7C5CFC]">
          ${count} product${count === 1 ? "" : "s"}
        </span>
      </td>
      <td class="px-5 sm:px-6 py-3.5">
        <div class="flex items-center justify-end gap-2">
          <a href="./categories-form.html?id=${category.id}" aria-label="Edit category"
            class="p-2 rounded-lg text-[#7C5CFC] hover:bg-[#7C5CFC]/10 transition">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
            </svg>
          </a>
          <button data-id="${category.id}" data-name="${category.name}" data-count="${count}" aria-label="Delete category"
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

// ---------- APPLY FILTER + RENDER ----------
function applyFilterAndRender() {
  let filtered = allCategories;

  if (searchQuery) {
    filtered = filtered.filter((c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }

  resultsSummary.textContent = `${filtered.length} of ${allCategories.length} categories`;

  if (!filtered.length) {
    tableBody.innerHTML = "";
    emptyState.classList.remove("hidden");
    return;
  }

  emptyState.classList.add("hidden");
  tableBody.innerHTML = filtered.map(renderRow).join("");
}

// ---------- LOAD CATEGORIES (+ product count per category) ----------
async function loadCategories() {
  tableBody.innerHTML = Array(5)
    .fill(
      `<tr class="animate-pulse border-b border-black/5 dark:border-white/10">
        <td class="px-5 sm:px-6 py-4"><div class="h-11 bg-gray-200 dark:bg-white/10 rounded-lg w-11"></div></td>
        <td class="px-5 sm:px-6 py-4"><div class="h-4 bg-gray-200 dark:bg-white/10 rounded w-20"></div></td>
        <td class="px-5 sm:px-6 py-4"><div class="h-4 bg-gray-200 dark:bg-white/10 rounded w-16 ml-auto"></div></td>
      </tr>`,
    )
    .join("");

  try {
    const { data: categories, error } = await supabase
      .from("categories")
      .select("*")
      .order("name");

    if (error) throw error;

    // Har category ke liye uske products ki ginti nikalna
    const withCounts = await Promise.all(
      (categories || []).map(async (cat) => {
        const { count } = await supabase
          .from("products")
          .select("id", { count: "exact", head: true })
          .eq("category_id", cat.id);
        return { ...cat, productCount: count || 0 };
      }),
    );

    allCategories = withCounts;
    applyFilterAndRender();
  } catch (err) {
    console.error(err);
    tableBody.innerHTML = `<tr><td colspan="3" class="text-center py-10 text-[#FB7185]">Failed to load categories</td></tr>`;
    resultsSummary.textContent = "Failed to load categories";
  }
}
loadCategories();

// ---------- SEARCH ----------
searchInput.addEventListener("input", (e) => {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => {
    searchQuery = e.target.value.trim();
    applyFilterAndRender();
  }, 250);
});

// ---------- DELETE FLOW ----------
const deleteModal = document.getElementById("delete-modal");
const deleteModalText = document.getElementById("delete-modal-text");
const deleteCancelBtn = document.getElementById("delete-cancel-btn");
const deleteConfirmBtn = document.getElementById("delete-confirm-btn");
let pendingDeleteId = null;

function openDeleteModal(id, name, count) {
  pendingDeleteId = id;

  if (count > 0) {
    deleteModalText.innerHTML = `<span class="text-[#FFB020] font-medium">"${name}"</span> has ${count} product${count === 1 ? "" : "s"} linked to it. Deleting it may leave those products without a category.`;
  } else {
    deleteModalText.textContent = `This will permanently delete "${name}". This action cannot be undone.`;
  }

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
  openDeleteModal(btn.dataset.id, btn.dataset.name, Number(btn.dataset.count));
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
      .from("categories")
      .delete()
      .eq("id", pendingDeleteId);

    if (error) throw error;

    allCategories = allCategories.filter(
      (c) => String(c.id) !== String(pendingDeleteId),
    );
    applyFilterAndRender();
    toast("Category deleted successfully");
  } catch (err) {
    console.error(err);
    toast("Failed to delete category", "error");
  } finally {
    deleteConfirmBtn.disabled = false;
    deleteConfirmBtn.textContent = originalText;
    closeDeleteModal();
  }
});
