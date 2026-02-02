import { createClient } from "https://esm.sh/@supabase/supabase-js";

export const supabase = createClient(
  "https://hjghemoxbyexeemwpjrx.supabase.co",
  "sb_publishable_lByAZQ0ZtFEYN9_G13E7Tg_e4RXrQG6"
);

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

      productsDiv.innerHTML = "";

      data.forEach(p => {
        productsDiv.innerHTML += `
          <div class="group bg-zinc-950/40 backdrop-blur-sm border border-zinc-900 rounded-2xl overflow-hidden transition-all duration-500 gold-glow">
            <div class="relative overflow-hidden aspect-[4/5]">
                <img src="${p.image_url || 'https://via.placeholder.com/600'}"
                  class="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
                <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
            </div>

            <div class="p-6 relative">
                <h2 class="font-serif text-lg tracking-wider text-white uppercase">${p.name}</h2>
                <p class="text-xs text-zinc-500 mt-1 font-light line-clamp-2">${p.description || 'Exclusive FitFashion piece.'}</p>

                <div class="flex justify-between items-center mt-6">
                  <span class="font-light tracking-widest text-yellow-500">₦${p.price.toLocaleString()}</span>
                  <button
                    onclick="addToCart('${p.id}', '${p.name}', ${p.price})"
                    class="bg-yellow-600 hover:bg-yellow-500 text-black px-6 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-yellow-900/20">
                    Add To Cart
                  </button>
                </div>
            </div>
          </div>
        `;
      });
    }

    loadProducts();

    window.addToCart = (id, name, price) => {
      const cart = JSON.parse(localStorage.getItem("cart")) || [];
      cart.push({ id, name, price, qty: 1 });
      localStorage.setItem("cart", JSON.stringify(cart));
      
      // Modern replacement for alert
      const toast = document.createElement('div');
      toast.className = "fixed bottom-10 left-1/2 -translate-x-1/2 bg-yellow-600 text-black px-8 py-3 rounded-full text-xs font-bold uppercase tracking-widest z-50 animate-bounce";
      toast.innerText = "Item added to vault";
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 2000);
    };