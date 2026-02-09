import { createClient } from "https://esm.sh/@supabase/supabase-js"

const supabase = createClient(
  "https://hjghemoxbyexeemwpjrx.supabase.co",
  "sb_publishable_lByAZQ0ZtFEYN9_G13E7Tg_e4RXrQG6"
);

// GET PRODUCT ID FROM URL
const params = new URLSearchParams(window.location.search);
const productId = params.get("id");

if (!productId) {
  alert("Product not found");
  throw new Error("No product ID in URL");
}

let currentProduct = null;
//  LOAD PRODUCT
async function loadProduct() {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", productId)
    .single();

  if (error) {
    console.error(error);
    alert("Failed to load product");
    return;
  }

  currentProduct = data;
  renderProduct(data);
}

loadProduct();

// RENDER PRODUCT
function renderProduct(product) {
  document.getElementById("productImage").src = product.image_url;
  document.getElementById("productName").textContent = product.name;
  document.getElementById("productN").textContent = product.name;
  document.getElementById("productPrice").textContent = `₦${product.price.toLocaleString()}`;
  document.getElementById("productDescription").textContent = product.description;
}

console.log(productId);

var btn = document.getElementById("addToCartBtn")
btn.addEventListener("click", addToCart);

async function addToCart() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    alert("Please login to add items to cart");
    return;
  }

  // 1️⃣ Get or create cart
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

  // 2️⃣ Check if product already in cart
  const { data: existingItem } = await supabase
    .from("cart_items")
    .select("*")
    .eq("cart_id", cart.id)
    .eq("product_id", currentProduct.id)
    .single();

  if (existingItem) {
    await supabase
      .from("cart_items")
      .update({ qty: existingItem.qty + 1 })
      .eq("id", existingItem.id);
  } else {
    await supabase.from("cart_items").insert({
      cart_id: cart.id,
      product_id: currentProduct.id,
      name: currentProduct.name,
      price: currentProduct.price,
      image_url: currentProduct.image_url,
      qty: 1,
    });
  }

  alert("Added to cart 🛒");
}