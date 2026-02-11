import { createClient } from "https://esm.sh/@supabase/supabase-js";

export const supabase = createClient(
  "https://hjghemoxbyexeemwpjrx.supabase.co",
  "sb_publishable_lByAZQ0ZtFEYN9_G13E7Tg_e4RXrQG6"
);

// Global access for the edit buttons
window.toggleEdit = toggleEdit;
window.updateCheckoutQty = updateCheckoutQty;

// Add these to your window object for access in HTML
window.openReview = openReview;
window.closeReview = closeReview;

function openReview() {
    // 1. Gather input data
    const firstName = document.querySelector('input[placeholder="First Name"]').value;
    const lastName = document.querySelector('input[placeholder="Last Name"]').value;
    const address = document.querySelector('input[placeholder="Shipping Address"]').value;
    const city = document.querySelector('input[placeholder="City"]').value;
    const phone = document.querySelector('input[placeholder="Phone Number"]').value;
    const total = document.getElementById("total").innerText;

    // 2. Simple Validation Check
    if (!firstName || !address || !phone) {
        alert("Please fill in your shipping details first.");
        return;
    }

    // 3. Inject into Modal
    const reviewDetails = document.getElementById("reviewDetails");
    reviewDetails.innerHTML = `
        <div class="grid grid-cols-1 gap-6">
            <div class="bg-zinc-900/40 p-5 rounded-2xl border border-zinc-800">
                <p class="text-[8px] uppercase tracking-[0.3em] text-yellow-600 mb-2">Recipient</p>
                <p class="text-white text-xs uppercase tracking-widest">${firstName} ${lastName}</p>
            </div>
            
            <div class="bg-zinc-900/40 p-5 rounded-2xl border border-zinc-800">
                <p class="text-[8px] uppercase tracking-[0.3em] text-yellow-600 mb-2">Delivery Address</p>
                <p class="text-white text-xs leading-loose">${address}, ${city}</p>
                <p class="text-zinc-500 text-[10px] mt-2">${phone}</p>
            </div>

            <div class="bg-zinc-900/40 p-5 rounded-2xl border border-zinc-800">
                <p class="text-[8px] uppercase tracking-[0.3em] text-yellow-600 mb-2">Total Amount Due</p>
                <p class="text-white text-xl font-serif">${total}</p>
                <p class="text-zinc-600 text-[9px] uppercase tracking-widest mt-1">Payment via Paystack</p>
            </div>
        </div>
    `;

    // 4. Show Modal
    document.getElementById("reviewModal").classList.remove("hidden");
}

function closeReview() {
    document.getElementById("reviewModal").classList.add("hidden");
}

// 5. Update your main button listener
document.getElementById("placeOrderBtn").onclick = openReview;

// 6. Final confirmation (Integration Point)
document.getElementById("finalConfirmBtn").onclick = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const total = document.getElementById("total").innerText;
    const orderRef = `FF-${Math.floor(10000 + Math.random() * 90000)}`;

    // 1. Save order to your 'orders' table in Supabase
    const { error } = await supabase.from("orders").insert({
        user_id: user.id,
        order_ref: orderRef,
        amount: total,
        status: "pending_transfer",
        shipping_details: {
            name: document.querySelector('input[placeholder="First Name"]').value,
            address: document.querySelector('input[placeholder="Shipping Address"]').value,
            phone: document.querySelector('input[placeholder="Phone Number"]').value
        }
    });

    if (error) {
        alert("Error processing order. Please try again.");
        return;
    }

    // 2. Clear the cart (Optional but recommended)
    // await supabase.from("cart_items").delete().eq("cart_id", cartId);

    // 3. Show Transfer Instructions
    showTransferInstructions(orderRef, total);
};

function showTransferInstructions(ref, amount) {
    const modalContent = document.querySelector('#reviewModal > div:last-child');
    
    modalContent.innerHTML = `
        <div class="text-center animate-bounce-in">
            <div class="w-16 h-16 bg-yellow-600/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg class="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
            </div>
            
            <h2 class="font-serif text-2xl tracking-[0.3em] text-white uppercase mb-2">Order Reserved</h2>
            <p class="text-zinc-500 text-[10px] uppercase tracking-widest mb-8">Reference: ${ref}</p>

            <div class="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 space-y-6 mb-8 text-left">
                <div>
                    <p class="text-[8px] uppercase tracking-[0.3em] text-zinc-500 mb-1">Bank Name</p>
                    <p class="text-white text-xs tracking-widest">ZENITH BANK PLC</p>
                </div>
                <div>
                    <p class="text-[8px] uppercase tracking-[0.3em] text-zinc-500 mb-1">Account Name</p>
                    <p class="text-white text-xs tracking-widest uppercase">FitFashion Global Limited</p>
                </div>
                <div class="flex justify-between items-center">
                    <div>
                        <p class="text-[8px] uppercase tracking-[0.3em] text-zinc-500 mb-1">Account Number</p>
                        <p id="accNumber" class="text-xl text-yellow-500 font-serif tracking-widest">1234567890</p>
                    </div>
                    <button onclick="navigator.clipboard.writeText('1234567890')" class="text-[8px] text-zinc-400 border border-zinc-700 px-3 py-1 rounded-full hover:text-white transition-all">COPY</button>
                </div>
                <div class="pt-4 border-t border-zinc-800">
                    <p class="text-[8px] uppercase tracking-[0.3em] text-zinc-500 mb-1">Total Amount</p>
                    <p class="text-white text-lg">${amount}</p>
                </div>
            </div>

            <p class="text-[9px] text-zinc-500 leading-loose mb-8">
                Please include your reference <span class="text-white">${ref}</span> in the transfer notes.<br>
                Once payment is received, your items will be dispatched.
            </p>

            <button onclick="window.location.href='../index.html'" class="w-full py-4 bg-white text-black text-[10px] font-bold uppercase tracking-widest rounded-full hover:bg-zinc-200 transition-all">
                Return to Home
            </button>
        </div>
    `;
};

async function loadCheckoutSummary() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: items } = await supabase
        .from("cart_items")
        .select("*, carts(user_id)")
        .eq("carts.user_id", user.id);

    const container = document.getElementById("checkoutItems");
    let total = 0;

    if (!items || items.length === 0) {
        container.innerHTML = "<p class='text-xs text-zinc-500'>Your cart is empty</p>";
        return;
    }

    container.innerHTML = items.map(item => {
        total += item.price * item.qty;
        return `
            <div class="group relative bg-zinc-900/20 p-4 rounded-2xl border border-transparent hover:border-zinc-800 transition-all">
                <div class="flex gap-4 items-center">
                    <div class="w-16 h-20 bg-zinc-800 rounded-lg overflow-hidden flex-shrink-0">
                        <img src="${item.image_url}" class="w-full h-full object-cover">
                    </div>
                    <div class="flex-1">
                        <h4 class="text-[10px] text-white uppercase tracking-wider">${item.name}</h4>
                        <p id="qty-display-${item.id}" class="text-[9px] text-zinc-500 mt-1">QTY: ${item.qty}</p>
                        
                        <div id="edit-controls-${item.id}" class="hidden flex items-center gap-4 mt-2">
                            <button onclick="updateCheckoutQty('${item.id}', -1, ${item.qty})" class="text-zinc-400 hover:text-white text-lg">-</button>
                            <span class="text-xs text-yellow-600 font-bold">${item.qty}</span>
                            <button onclick="updateCheckoutQty('${item.id}', 1, ${item.qty})" class="text-zinc-400 hover:text-white text-lg">+</button>
                        </div>
                    </div>
                    <div class="text-right">
                        <p class="text-xs text-white mb-2">₦${(item.price * item.qty).toLocaleString()}</p>
                        <button onclick="toggleEdit('${item.id}')" class="text-[8px] uppercase tracking-[0.2em] text-yellow-600 hover:text-yellow-400 transition-colors">
                            Edit
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join("");

    document.getElementById("subtotal").innerText = `₦${total.toLocaleString()}`;
    document.getElementById("total").innerText = `₦${total.toLocaleString()}`;
}

function toggleEdit(itemId) {
    const display = document.getElementById(`qty-display-${itemId}`);
    const controls = document.getElementById(`edit-controls-${itemId}`);
    
    const isHidden = controls.classList.contains('hidden');
    
    if (isHidden) {
        controls.classList.remove('hidden');
        display.classList.add('hidden');
    } else {
        controls.classList.add('hidden');
        display.classList.remove('hidden');
    }
}

async function updateCheckoutQty(itemId, change, currentQty) {
    const newQty = currentQty + change;

    if (newQty <= 0) {
        const confirmDelete = confirm("Remove this item from your selection?");
        if (confirmDelete) {
            await supabase.from("cart_items").delete().eq("id", itemId);
        } else {
            return;
        }
    } else {
        await supabase.from("cart_items").update({ qty: newQty }).eq("id", itemId);
    }
    
    // Refresh the summary
    loadCheckoutSummary();
}

document.addEventListener("DOMContentLoaded", loadCheckoutSummary);

async function processBankOrder() {
    const { data: { user } } = await supabase.auth.getUser();
    
    const shippingData = {
        firstName: document.querySelector('input[placeholder="First Name"]').value,
        lastName: document.querySelector('input[placeholder="Last Name"]').value,
        address: document.querySelector('input[placeholder="Shipping Address"]').value,
        city: document.querySelector('input[placeholder="City"]').value,
        phone: document.querySelector('input[placeholder="Phone Number"]').value,
        email: user.email 
    };

    const totalAmount = document.getElementById("total").innerText;
    const orderRef = `FF-${Math.floor(100000 + Math.random() * 900000)}`;

    // 1. SAVE TO DATABASE
    const { error: orderError } = await supabase
        .from("orders")
        .insert([{
            user_id: user.id,
            order_ref: orderRef,
            amount: totalAmount,
            shipping_details: shippingData,
            status: 'pending_transfer'
        }]);

    if (orderError) {
        alert("Database error. Please try again.");
        return;
    }

    // 2. TRIGGER EMAILJS
    const emailParams = {
        user_name: shippingData.firstName,
        user_email: shippingData.email,
        order_ref: orderRef,
        amount: totalAmount,
        address: `${shippingData.address}, ${shippingData.city}`,
        phone: shippingData.phone
    };

    emailjs.send('service_bo8ugyi', 'template_8je7jjs', emailParams)
        .then(() => {
            console.log('Email sent successfully to customer and admin!');
        }, (error) => {
            console.error('EmailJS Error:', error);
        });

    // 3. UI UPDATES
    const { data: cart } = await supabase.from("carts").select("id").eq("user_id", user.id).single();
    if (cart) {
        await supabase.from("cart_items").delete().eq("cart_id", cart.id);
    }

    showTransferInstructions(orderRef, totalAmount);
}

// Connect this to your Final Review button
document.getElementById("finalConfirmBtn").onclick = processBankOrder;