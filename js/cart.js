import { createClient } from "https://esm.sh/@supabase/supabase-js"

const supabase = createClient(
  "https://hjghemoxbyexeemwpjrx.supabase.co",
  "sb_publishable_lByAZQ0ZtFEYN9_G13E7Tg_e4RXrQG6"
);

// --- Make functions global so HTML onclick can see them ---
window.updateQty = updateQty;
window.removeItem = removeItem;

async function getUserCart() {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    window.location.href = "../pages/login.html";
    return null;
  }

  let { data: cart } = await supabase
    .from("carts")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!cart) {
    const { data: newCart } = await supabase
      .from("carts")
      .insert({ user_id: user.id })
      .select()
      .single();

    cart = newCart;
  }

  return cart;
}

async function renderCartPage() {
  const cart = await getUserCart();
  if (!cart) return;

  const container = document.getElementById("cartItemsList");
  const subtotalEl = document.getElementById("subtotalAmount");
  const totalEl = document.getElementById("totalAmount");

  const { data: items } = await supabase
    .from("cart_items")
    .select("*")
    .eq("cart_id", cart.id);

  let total = 0;

  if (!items || items.length === 0) {
    container.innerHTML = `
      <div class="py-20 text-center border border-dashed border-zinc-800 rounded-2xl">
        <p class="text-zinc-600 uppercase tracking-widest text-xs">
          Your Cart is currently empty.
        </p>
        <a href="../pages/store.html"
          class="inline-block mt-6 text-yellow-600 uppercase tracking-widest text-[10px]
                 border-b border-yellow-600 pb-1">
          Begin Browsing
        </a>
      </div>
    `;
    subtotalEl.innerText = "₦0";
    totalEl.innerText = "₦0";
    return;
  }

  container.innerHTML = items.map((item) => {
    total += item.price * item.qty;

    return `
      <div class="flex flex-col sm:flex-row gap-8 items-center py-8 border-b border-zinc-900 group">
        <div class="w-full sm:w-40 aspect-[4/5] bg-zinc-900 rounded-xl overflow-hidden border border-zinc-800">
          <img src="${item.image_url}"
            class="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700">
        </div>

        <div class="flex-1 text-center sm:text-left">
          <div class="flex flex-col sm:flex-row justify-between items-start gap-4">
            <div>
              <h3 class="font-serif text-xl text-white uppercase tracking-wider">
                ${item.name}
              </h3>
            </div>
            <p class="text-lg text-yellow-500 font-light">
              ₦${item.price.toLocaleString()}
            </p>
          </div>

          <div class="mt-8 flex items-center justify-center sm:justify-start gap-8">
            <div class="flex items-center border border-zinc-800 rounded-full px-4 py-1">
              <button onclick="updateQty('${item.id}', -1)" class="px-2 text-white">-</button>
              <span class="mx-4 text-xs text-white">${item.qty}</span>
              <button onclick="updateQty('${item.id}', 1)" class="px-2 text-white">+</button>
            </div>

            <button onclick="removeItem('${item.id}')"
              class="text-[9px] uppercase tracking-widest text-red-900 hover:text-red-500">
              Remove
            </button>
          </div>
        </div>
      </div>
    `;
  }).join("");

  console.log(items)

  subtotalEl.innerText = `₦${total.toLocaleString()}`;
  totalEl.innerText = `₦${total.toLocaleString()}`;
}

async function updateQty(itemId, change) {
  const { data: item } = await supabase
    .from("cart_items")
    .select("qty")
    .eq("id", itemId)
    .single();

  const newQty = Math.max(1, item.qty + change);

  await supabase
    .from("cart_items")
    .update({ qty: newQty })
    .eq("id", itemId);

  renderCartPage();
}

async function removeItem(itemId) {
  if(!confirm("Are you sure you want to remove this item?")) return;
  
  await supabase
    .from("cart_items")
    .delete()
    .eq("id", itemId);

  renderCartPage();
}

document.addEventListener("DOMContentLoaded", renderCartPage);