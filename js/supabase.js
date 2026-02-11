import { createClient } from "https://esm.sh/@supabase/supabase-js";

export const supabase = createClient(
  "https://hjghemoxbyexeemwpjrx.supabase.co",
  "sb_publishable_lByAZQ0ZtFEYN9_G13E7Tg_e4RXrQG6"
);

// Make addToCart globally accessible for the onclick attribute
window.addToCart = addToCart;

function showToast(message) {
  const container = document.getElementById("toast-container");
  const toast = document.createElement("div");

  // Styling to match your zinc/gold aesthetic
  toast.className = `
    bg-zinc-900 border border-yellow-600/50 text-white px-6 py-4 rounded-xl 
    shadow-2xl shadow-yellow-900/20 translate-y-10 opacity-0 
    transition-all duration-500 flex items-center gap-3 min-w-[280px]
  `;
  
  toast.innerHTML = `
    <div class="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
    <p class="text-xs uppercase tracking-widest font-medium">${message}</p>
  `;

  container.appendChild(toast);

  // Trigger animation (Next tick)
  setTimeout(() => {
    toast.classList.remove("translate-y-10", "opacity-0");
  }, 10);

  // Auto-remove after 3 seconds
  setTimeout(() => {
    toast.classList.add("translate-y-[-10px]", "opacity-0");
    setTimeout(() => toast.remove(), 500);
  }, 3000);
}

const productsDiv = document.getElementById("products");
const logoutBtn = document.getElementById("logoutBtn");

logoutBtn.onclick = async () => {
  await supabase.auth.signOut();
  window.location.href = "/pages/login.html";
};

async function loadProducts() {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    productsDiv.innerHTML = "<p class='col-span-full text-center text-red-500'>Error loading collection.</p>";
    return;
  }

  productsDiv.innerHTML = data.map(p => `
    <div class="group bg-zinc-950/40 backdrop-blur-sm border border-zinc-900 rounded-2xl overflow-hidden transition-all duration-500 gold-glow relative">
      <a href="productPage.html?id=${p.id}" class="block">
        <div class="relative overflow-hidden aspect-[4/5]">
            <img src="${p.image_url || 'https://via.placeholder.com/600'}"
              class="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
            <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
        </div>
      </a>

      <div class="p-6 relative">
          <h2 class="font-serif text-lg tracking-wider text-white uppercase">${p.name}</h2>
          <p class="text-xs text-zinc-500 mt-1 font-light line-clamp-2">${p.description || 'Exclusive piece.'}</p>

          <div class="flex justify-between items-center mt-6">
            <span class="font-light tracking-widest text-yellow-500">₦${p.price.toLocaleString()}</span>
            <button
              onclick="addToCart(event, '${p.id}', '${p.name}', ${p.price}, '${p.image_url}')"
              class="bg-yellow-600 hover:bg-yellow-500 text-black px-6 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-yellow-900/20">
              Add To Cart
            </button>
          </div>
      </div>
    </div>
  `).join("");
}

async function addToCart(event, productId, name, price, imageUrl) {
  // Prevent navigating to the product page when clicking the button
  event.preventDefault();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    alert("Please log in to add items to your cart.");
    window.location.href = "/pages/login.html";
    return;
  }

  // 1. Get or Create Cart
  let { data: cart } = await supabase.from("carts").select("id").eq("user_id", user.id).single();
  
  if (!cart) {
    const { data: newCart } = await supabase.from("carts").insert({ user_id: user.id }).select().single();
    cart = newCart;
  }

  // 2. Check if item already exists in cart
  const { data: existingItem } = await supabase
    .from("cart_items")
    .select("id, qty")
    .eq("cart_id", cart.id)
    .eq("product_id", productId) // Ensure you have a product_id column in cart_items
    .single();

  if (existingItem) {
    // Update quantity
    await supabase
      .from("cart_items")
      .update({ qty: existingItem.qty + 1 })
      .eq("id", existingItem.id);
  } else {
    // Insert new row
    await supabase.from("cart_items").insert({
      cart_id: cart.id,
      product_id: productId,
      name: name,
      price: price,
      image_url: imageUrl,
      qty: 1
    });
  }

  showToast(`${name} added to cart`);
  updateNavCartCount();
}

async function updateNavCartCount() {
    const badge = document.getElementById("cartCount");
    if (!badge) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        badge.classList.add("opacity-0");
        return;
    }

    const { data: cart } = await supabase.from("carts").select("id").eq("user_id", user.id).single();
    if (!cart) return;

    const { count } = await supabase
        .from("cart_items")
        .select("*", { count: 'exact', head: true })
        .eq("cart_id", cart.id);

    if (count > 0) {
        badge.innerText = count;
        badge.classList.replace("opacity-0", "opacity-100");
    } else {
        badge.classList.replace("opacity-100", "opacity-0");
    }
}

// Initial Loads
loadProducts();
updateNavCartCount();