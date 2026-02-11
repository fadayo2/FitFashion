import { createClient } from "https://esm.sh/@supabase/supabase-js"

const supabase = createClient(
  "https://hjghemoxbyexeemwpjrx.supabase.co",
  "sb_publishable_lByAZQ0ZtFEYN9_G13E7Tg_e4RXrQG6"
);

// Global access for HTML onclicks
window.handleIncrement = handleIncrement;

const params = new URLSearchParams(window.location.search);
const productId = params.get("id");
let currentProduct = null;
const btnContainer = document.getElementById("addToCartBtn").parentElement;

if (!productId) {
  window.location.href = "shop.html";
}

async function init() {
  // 1. Load Product
  const { data, error } = await supabase.from("products").select("*").eq("id", productId).single();
  if (error) return console.error(error);
  
  currentProduct = data;
  renderProduct(data);
  
  // 2. Check if already in cart to show right UI
  updateButtonUI();
}

function renderProduct(product) {
  document.getElementById("productImage").src = product.image_url;
  document.getElementById("productName").textContent = product.name;
  document.getElementById("productN").textContent = product.name;
  document.getElementById("productPrice").textContent = `₦${product.price.toLocaleString()}`;
  document.getElementById("productDescription").textContent = product.description;
}

async function updateButtonUI() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data: item } = await supabase
    .from("cart_items")
    .select("id, qty")
    .eq("product_id", productId)
    .maybeSingle();

  if (item) {
    // Show Quantity Selector
    btnContainer.innerHTML = `
      <div class="flex items-center justify-between w-full bg-zinc-900 border border-yellow-600/30 rounded-full p-1 h-[60px] animate-bounce-in">
        <button onclick="handleIncrement('${item.id}', -1, ${item.qty})" class="w-12 h-12 flex items-center justify-center rounded-full bg-zinc-800 hover:bg-zinc-700 text-white transition-all active:scale-90">-</button>
        <div class="flex flex-col items-center">
          <span class="text-sm text-yellow-500 font-bold">${item.qty}</span>
          <span class="text-[8px] uppercase tracking-widest text-zinc-500">In Cart</span>
        </div>
        <button onclick="handleIncrement('${item.id}', 1, ${item.qty})" class="w-12 h-12 flex items-center justify-center rounded-full bg-yellow-600 hover:bg-yellow-500 text-black transition-all active:scale-90">+</button>
      </div>
    `;
  } else {
    // Show Default Button
    btnContainer.innerHTML = `
      <button id="addToCartBtn" class="w-full py-5 bg-yellow-600 text-black font-bold uppercase tracking-[0.3em] text-[10px] rounded-full hover:bg-yellow-500 transition-all shadow-xl shadow-yellow-900/10 active:scale-95">
        Add to Cart
      </button>
    `;
    document.getElementById("addToCartBtn").addEventListener("click", addToCart);
  }
}

async function addToCart() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return showToast("Please login first");

  let { data: cart } = await supabase.from("carts").select("id").eq("user_id", user.id).single();
  if (!cart) {
    const { data: newCart } = await supabase.from("carts").insert({ user_id: user.id }).select().single();
    cart = newCart;
  }

  await supabase.from("cart_items").insert({
    cart_id: cart.id,
    product_id: currentProduct.id,
    name: currentProduct.name,
    price: currentProduct.price,
    image_url: currentProduct.image_url,
    qty: 1,
  });

  showToast(`${currentProduct.name} added to cart`);
  updateButtonUI();
  if (window.updateNavCartCount) window.updateNavCartCount();
}

async function handleIncrement(itemId, change, currentQty) {
  const newQty = currentQty + change;

  if (newQty <= 0) {
    await supabase.from("cart_items").delete().eq("id", itemId);
    showToast("Removed from cart");
  } else {
    await supabase.from("cart_items").update({ qty: newQty }).eq("id", itemId);
  }
  
  updateButtonUI();
  if (window.updateNavCartCount) window.updateNavCartCount();
}

function showToast(message) {
  const container = document.getElementById("toast-container");
  if (!container) return;
  const toast = document.createElement("div");
  toast.className = "bg-zinc-900 border border-yellow-600/50 text-white px-6 py-4 rounded-xl shadow-2xl transition-all duration-500 flex items-center gap-3 animate-bounce-in mb-4";
  toast.innerHTML = `<div class="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div><p class="text-[10px] uppercase tracking-widest">${message}</p>`;
  container.appendChild(toast);
  setTimeout(() => { 
    toast.classList.add("opacity-0", "translate-x-10");
    setTimeout(() => toast.remove(), 500); 
  }, 3000);
}

init();