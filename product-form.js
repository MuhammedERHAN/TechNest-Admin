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
    window.location.href = "./login.html";
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

// ---------- FORM STATE (Add vs Edit) ----------
const urlParams = new URLSearchParams(window.location.search);
const editId = urlParams.get("id");
const isEditMode = Boolean(editId);

const pageTitle = document.getElementById("page-title");
const btnText = document.getElementById("btn-text");

if (isEditMode) {
  pageTitle.textContent = "Edit Product";
  btnText.textContent = "Save Changes";
} else {
  pageTitle.textContent = "Add Product";
  btnText.textContent = "Add Product";
}

// ---------- FORM ELEMENTS ----------
const form = document.getElementById("product-form");
const submitBtn = document.getElementById("submit-btn");
const btnSpinner = document.getElementById("btn-spinner");

const nameInput = document.getElementById("name");
const descriptionInput = document.getElementById("description");
const categorySelect = document.getElementById("category_id");
const priceInput = document.getElementById("price");
const discountInput = document.getElementById("discount_percent");
const stockInput = document.getElementById("stock");
const ratingInput = document.getElementById("rating");
const imageUrlInput = document.getElementById("image_url");
const imagePreview = document.getElementById("image-preview");
const imagePlaceholder = document.getElementById("image-placeholder");

// ---------- IMAGE PREVIEW ----------
imageUrlInput.addEventListener("input", () => {
  const url = imageUrlInput.value.trim();
  if (!url) {
    imagePreview.classList.add("hidden");
    imagePlaceholder.classList.remove("hidden");
    return;
  }
  imagePreview.src = url;
  imagePreview.onload = () => {
    imagePreview.classList.remove("hidden");
    imagePlaceholder.classList.add("hidden");
  };
  imagePreview.onerror = () => {
    imagePreview.classList.add("hidden");
    imagePlaceholder.classList.remove("hidden");
  };
});

// ---------- LOAD CATEGORIES DROPDOWN ----------
async function loadCategoryOptions() {
  try {
    const { data, error } = await supabase
      .from("categories")
      .select("id, name")
      .order("name");

    if (error) throw error;

    data.forEach((cat) => {
      const opt = document.createElement("option");
      opt.value = cat.id;
      opt.textContent = cat.name;
      categorySelect.appendChild(opt);
    });
  } catch (err) {
    console.error(err);
    toast("Failed to load categories", "error");
  }
}

// ---------- VALIDATION ----------
function setFieldError(input, errorEl, message) {
  if (message) {
    input.classList.remove("border-black/5", "dark:border-white/10");
    input.classList.add("border-red-500");
    errorEl.textContent = message;
    errorEl.classList.remove("hidden");
  } else {
    input.classList.remove("border-red-500");
    input.classList.add("border-black/5", "dark:border-white/10");
    errorEl.classList.add("hidden");
  }
  return !message;
}

function validateForm() {
  let valid = true;

  if (!nameInput.value.trim()) {
    setFieldError(
      nameInput,
      document.getElementById("name-error"),
      "Product name is required",
    );
    valid = false;
  } else {
    setFieldError(nameInput, document.getElementById("name-error"), "");
  }

  if (!imageUrlInput.value.trim()) {
    setFieldError(
      imageUrlInput,
      document.getElementById("image_url-error"),
      "Image URL is required",
    );
    valid = false;
  } else {
    setFieldError(
      imageUrlInput,
      document.getElementById("image_url-error"),
      "",
    );
  }

  if (!categorySelect.value) {
    setFieldError(
      categorySelect,
      document.getElementById("category_id-error"),
      "Please select a category",
    );
    valid = false;
  } else {
    setFieldError(
      categorySelect,
      document.getElementById("category_id-error"),
      "",
    );
  }

  const price = Number(priceInput.value);
  if (!priceInput.value || isNaN(price) || price < 0) {
    setFieldError(
      priceInput,
      document.getElementById("price-error"),
      "Enter a valid price",
    );
    valid = false;
  } else {
    setFieldError(priceInput, document.getElementById("price-error"), "");
  }

  const stock = Number(stockInput.value);
  if (stockInput.value === "" || isNaN(stock) || stock < 0) {
    setFieldError(
      stockInput,
      document.getElementById("stock-error"),
      "Enter a valid stock quantity",
    );
    valid = false;
  } else {
    setFieldError(stockInput, document.getElementById("stock-error"), "");
  }

  return valid;
}

// ---------- LOAD EXISTING PRODUCT (Edit Mode) ----------
async function loadExistingProduct() {
  if (!isEditMode) return;

  try {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("id", editId)
      .single();

    if (error || !data) throw error || new Error("Product not found");

    nameInput.value = data.name || "";
    descriptionInput.value = data.description || "";
    categorySelect.value = data.category_id || "";
    priceInput.value = data.price ?? "";
    discountInput.value = data.discount_percent ?? 0;
    stockInput.value = data.stock ?? "";
    ratingInput.value = data.rating ?? 5;
    imageUrlInput.value = data.image_url || "";

    // Trigger preview manually
    imageUrlInput.dispatchEvent(new Event("input"));
  } catch (err) {
    console.error(err);
    toast("Failed to load product details", "error");
    setTimeout(() => {
      window.location.href = "./product-table.html";
    }, 1200);
  }
}

// ---------- INIT ----------
(async function init() {
  await loadCategoryOptions();
  await loadExistingProduct();
})();

// ---------- SUBMIT (Add / Edit) ----------
function setLoading(loading) {
  submitBtn.disabled = loading;
  btnSpinner.classList.toggle("hidden", !loading);
  btnText.textContent = loading
    ? "Saving..."
    : isEditMode
      ? "Save Changes"
      : "Add Product";
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!validateForm()) {
    toast("Please fix the highlighted fields", "error");
    return;
  }

  setLoading(true);

  const payload = {
    name: nameInput.value.trim(),
    description: descriptionInput.value.trim(),
    category_id: categorySelect.value,
    price: Number(priceInput.value),
    discount_percent: Number(discountInput.value) || 0,
    stock: Number(stockInput.value),
    rating: Number(ratingInput.value) || 5,
    image_url: imageUrlInput.value.trim(),
  };

  try {
    let error;

    if (isEditMode) {
      const res = await supabase
        .from("products")
        .update(payload)
        .eq("id", editId);
      error = res.error;
    } else {
      const res = await supabase.from("products").insert(payload);
      error = res.error;
    }

    if (error) throw error;

    toast(
      isEditMode
        ? "Product updated successfully!"
        : "Product added successfully!",
    );

    setTimeout(() => {
      window.location.href = "./product-table.html";
    }, 800);
  } catch (err) {
    console.error(err);
    toast(err.message || "Something went wrong. Please try again.", "error");
    setLoading(false);
  }
});
