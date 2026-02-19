import { createClient } from "https://esm.sh/@supabase/supabase-js";

export const supabase = createClient(
  "https://hjghemoxbyexeemwpjrx.supabase.co",
  "sb_publishable_lByAZQ0ZtFEYN9_G13E7Tg_e4RXrQG6"
);

// Global access for the edit buttons
window.toggleEdit = toggleEdit;
window.updateCheckoutQty = updateCheckoutQty;
window.openReview = openReview;
window.closeReview = closeReview;

// Store cart items globally for order processing
let currentCartItems = [];

function openReview() {
    try {
        // 1. Gather input data with null checks
        const firstNameInput = document.querySelector('input[placeholder="First Name"]');
        const lastNameInput = document.querySelector('input[placeholder="Last Name"]');
        const addressInput = document.querySelector('input[placeholder="Shipping Address"]');
        const cityInput = document.querySelector('input[placeholder="City"]');
        const phoneInput = document.querySelector('input[placeholder="Phone Number"]');
        const totalEl = document.getElementById("total");

        if (!firstNameInput || !addressInput || !phoneInput || !totalEl) {
            alert("Required form fields not found.");
            return;
        }

        const firstName = firstNameInput.value;
        const lastName = lastNameInput?.value || '';
        const address = addressInput.value;
        const city = cityInput?.value || '';
        const phone = phoneInput.value;
        const total = totalEl.innerText;

        // 2. Simple Validation Check
        if (!firstName || !address || !phone) {
            alert("Please fill in your shipping details first.");
            return;
        }

        // 3. Inject into Modal
        const reviewDetails = document.getElementById("reviewDetails");
        if (!reviewDetails) return;

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
                    <p class="text-zinc-600 text-[9px] uppercase tracking-widest mt-1">Payment via Bank Transfer</p>
                </div>
            </div>
        `;

        // 4. Show Modal
        const reviewModal = document.getElementById("reviewModal");
        if (reviewModal) reviewModal.classList.remove("hidden");
    } catch (error) {
        console.error("Error in openReview:", error);
        alert("Something went wrong. Please try again.");
    }
}

function closeReview() {
    const reviewModal = document.getElementById("reviewModal");
    if (reviewModal) reviewModal.classList.add("hidden");
}

// Process bank order (called by finalConfirmBtn)
async function processBankOrder() {
    try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
            alert("Please log in to continue.");
            window.location.href = "../pages/login.html";
            return;
        }

        // Get form values with null checks
        const firstNameInput = document.querySelector('input[placeholder="First Name"]');
        const lastNameInput = document.querySelector('input[placeholder="Last Name"]');
        const addressInput = document.querySelector('input[placeholder="Shipping Address"]');
        const cityInput = document.querySelector('input[placeholder="City"]');
        const phoneInput = document.querySelector('input[placeholder="Phone Number"]');
        const totalEl = document.getElementById("total");

        if (!firstNameInput || !addressInput || !phoneInput || !totalEl) {
            alert("Please fill in all required fields.");
            return;
        }

        const shippingData = {
            firstName: firstNameInput.value,
            lastName: lastNameInput?.value || '',
            address: addressInput.value,
            city: cityInput?.value || '',
            phone: phoneInput.value,
            email: user.email 
        };

        // Validate shipping data
        if (!shippingData.firstName || !shippingData.address || !shippingData.phone) {
            alert("Please fill in all required shipping fields.");
            return;
        }

        const totalAmount = totalEl.innerText;
        const orderRef = `FF-${Math.floor(100000 + Math.random() * 900000)}`;

        // Check if we have cart items
        if (!currentCartItems || currentCartItems.length === 0) {
            alert("Your cart is empty. Please add items before checking out.");
            return;
        }

        // 1. SAVE TO DATABASE
        const { error: orderError } = await supabase
            .from("orders")
            .insert([{
                user_id: user.id,
                order_ref: orderRef,
                amount: totalAmount,
                shipping_details: shippingData,
                items: currentCartItems, // Using the stored cart items
                status: 'pending_transfer',
                created_at: new Date().toISOString()
            }]);

        if (orderError) {
            console.error("Order insert error:", orderError);
            alert("Database error. Please try again.");
            return;
        }

        // 2. TRIGGER EMAILJS (if available)
        if (typeof emailjs !== 'undefined') {
            try {
                const emailParams = {
                    user_name: shippingData.firstName,
                    user_email: shippingData.email,
                    order_ref: orderRef,
                    amount: totalAmount,
                    address: `${shippingData.address}, ${shippingData.city}`,
                    phone: shippingData.phone
                };

                await emailjs.send('service_bo8ugyi', 'template_8je7jjs', emailParams);
                console.log('Email sent successfully to customer and admin!');
            } catch (emailError) {
                console.error('EmailJS Error:', emailError);
                // Don't block order if email fails
            }
        }

        // 3. Clear cart from database
        try {
            const { data: cart } = await supabase
                .from("carts")
                .select("id")
                .eq("user_id", user.id)
                .single();
                
            if (cart) {
                await supabase
                    .from("cart_items")
                    .delete()
                    .eq("cart_id", cart.id);
            }
        } catch (cartError) {
            console.error("Error clearing cart:", cartError);
            // Continue even if cart clear fails
        }

        // 4. Show transfer instructions
        showTransferInstructions(orderRef, totalAmount);
        
    } catch (error) {
        console.error("Error in processBankOrder:", error);
        alert("An error occurred while processing your order. Please try again.");
    }
}

function showTransferInstructions(ref, amount) {
    try {
        const reviewModal = document.getElementById('reviewModal');
        if (!reviewModal) return;
        
        const modalContent = reviewModal.querySelector('div:last-child');
        if (!modalContent) return;
        
        modalContent.innerHTML = `
    <div class="text-center">
        <div class="w-16 h-16 bg-yellow-600/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg class="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        </div>
        <span class="px-3 py-1 bg-zinc-900 border border-zinc-800 text-[8px] text-yellow-500 tracking-[0.2em] uppercase rounded-full">Waiting for Payment</span>
        
        <h2 class="font-serif text-2xl tracking-[0.3em] text-white uppercase mt-4 mb-2">Order Reserved</h2>
        
        <div class="flex items-center justify-center gap-2 mb-8 group">
            <p class="text-zinc-500 text-[10px] uppercase tracking-widest">Ref:</p>
            <span id="orderRef" class="text-white text-xs font-bold tracking-widest uppercase">${ref}</span>
            <button onclick="copyToClipboard('${ref}', 'Reference')" class="opacity-40 hover:opacity-100 transition-all">
                <svg class="w-3 h-3 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" /></svg>
            </button>
        </div>

        <div class="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-5 mb-8 text-left">
            <div class="flex justify-between items-start">
                <div>
                    <p class="text-[8px] uppercase tracking-[0.3em] text-zinc-500 mb-1">Bank Name</p>
                    <p class="text-white text-[11px] tracking-widest">ZENITH BANK PLC</p>
                </div>
                <div class="text-right">
                    <p class="text-[8px] uppercase tracking-[0.3em] text-zinc-500 mb-1">Total Amount</p>
                    <p class="text-yellow-500 text-sm font-bold">${amount}</p>
                </div>
            </div>

            <div>
                <p class="text-[8px] uppercase tracking-[0.3em] text-zinc-500 mb-1">Account Name</p>
                <p class="text-white text-[11px] tracking-widest uppercase">FitFashion Global Limited</p>
            </div>

            <div class="flex justify-between items-center bg-black/40 p-3 rounded-xl border border-zinc-800/50">
                <div>
                    <p class="text-[8px] uppercase tracking-[0.3em] text-zinc-500 mb-1">Account Number</p>
                    <p id="accNumber" class="text-xl text-white font-serif tracking-[0.2em]">1234567890</p>
                </div>
                <button onclick="copyToClipboard('1234567890', 'Account Number')" class="bg-zinc-800 text-[8px] text-white px-4 py-2 rounded-lg font-bold hover:bg-zinc-700 transition-all">COPY</button>
            </div>
        </div>

        <p class="text-[10px] text-zinc-500 leading-relaxed mb-8 px-4">
            Include <span class="text-white font-bold">${ref}</span> as your payment description. 
            Your order will be processed immediately after verification.
        </p>

        <div class="space-y-4">
            <button onclick="window.location.href='user.html'" class="w-full py-4 bg-white text-black text-[10px] font-bold uppercase tracking-widest rounded-full hover:bg-yellow-500 transition-all shadow-lg shadow-white/5">
                Track My Order
            </button>
            
            <button onclick="window.location.href='store.html'" class="text-[9px] text-zinc-600 uppercase tracking-widest hover:text-zinc-400 transition-all">
                Continue Shopping
            </button>
        </div>
    </div>
`;
    } catch (error) {
        console.error("Error in showTransferInstructions:", error);
    }
}

window.copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text).then(() => {
        // Assuming you have a toast function, if not, alert works
        if (typeof showToast === 'function') {
            showToast(`${label} copied!`);
        } else {
            alert(`${label} copied to clipboard`);
        }
    });
};

async function loadCheckoutSummary() {
    try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
            console.log("User not logged in");
            return;
        }

        // First get the user's cart
        const { data: cart, error: cartError } = await supabase
            .from("carts")
            .select("id")
            .eq("user_id", user.id)
            .single();

        if (cartError || !cart) {
            console.log("No cart found");
            return;
        }

        // Then get cart items
        const { data: items, error: itemsError } = await supabase
            .from("cart_items")
            .select("*")
            .eq("cart_id", cart.id);

        if (itemsError) {
            console.error("Error fetching cart items:", itemsError);
            return;
        }

        const container = document.getElementById("checkoutItems");
        if (!container) return;

        let total = 0;

        if (!items || items.length === 0) {
            container.innerHTML = "<p class='text-xs text-zinc-500 py-8 text-center'>Your cart is empty</p>";
            document.getElementById("subtotal").innerText = "₦0";
            document.getElementById("total").innerText = "₦0";
            return;
        }

        // Store items globally for order processing
        currentCartItems = items.map(item => ({
            id: item.id,
            product_id: item.product_id,
            name: item.name,
            price: item.price,
            quantity: item.qty,
            size: item.size,
            image: item.image_url
        }));

        container.innerHTML = items.map(item => {
            const itemTotal = item.price * item.qty;
            total += itemTotal;
            
            return `
                <div class="group relative bg-zinc-900/20 p-4 rounded-2xl border border-transparent hover:border-zinc-800 transition-all">
                    <div class="flex gap-4 items-center">
                        <div class="w-16 h-20 bg-zinc-800 rounded-lg overflow-hidden flex-shrink-0">
                            <img src="${item.image_url || 'https://via.placeholder.com/50'}" 
                                 class="w-full h-full object-cover"
                                 onerror="this.src='https://via.placeholder.com/50'">
                        </div>
                        <div class="flex-1">
                            <h4 class="text-[10px] text-white uppercase tracking-wider">${item.name || 'Product'}</h4>
                            <p class="text-[9px] text-zinc-500 mt-1">Size: ${item.size || 'N/A'}</p>
                            <p id="qty-display-${item.id}" class="text-[9px] text-zinc-500">QTY: ${item.qty}</p>
                            
                            <div id="edit-controls-${item.id}" class="hidden flex items-center gap-4 mt-2">
                                <button onclick="updateCheckoutQty('${item.id}', -1, ${item.qty})" class="text-zinc-400 hover:text-white text-lg w-6 h-6 flex items-center justify-center border border-zinc-700 rounded">-</button>
                                <span class="text-xs text-yellow-600 font-bold">${item.qty}</span>
                                <button onclick="updateCheckoutQty('${item.id}', 1, ${item.qty})" class="text-zinc-400 hover:text-white text-lg w-6 h-6 flex items-center justify-center border border-zinc-700 rounded">+</button>
                            </div>
                        </div>
                        <div class="text-right">
                            <p class="text-xs text-white mb-2">₦${itemTotal.toLocaleString()}</p>
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
        
    } catch (error) {
        console.error("Error in loadCheckoutSummary:", error);
    }
}

function toggleEdit(itemId) {
    try {
        const display = document.getElementById(`qty-display-${itemId}`);
        const controls = document.getElementById(`edit-controls-${itemId}`);
        
        if (!display || !controls) return;
        
        const isHidden = controls.classList.contains('hidden');
        
        if (isHidden) {
            controls.classList.remove('hidden');
            display.classList.add('hidden');
        } else {
            controls.classList.add('hidden');
            display.classList.remove('hidden');
        }
    } catch (error) {
        console.error("Error in toggleEdit:", error);
    }
}

async function updateCheckoutQty(itemId, change, currentQty) {
    try {
        const newQty = currentQty + change;

        if (newQty <= 0) {
            const confirmDelete = confirm("Remove this item from your selection?");
            if (confirmDelete) {
                const { error } = await supabase
                    .from("cart_items")
                    .delete()
                    .eq("id", itemId);
                    
                if (error) {
                    console.error("Error deleting item:", error);
                    alert("Failed to remove item");
                    return;
                }
            } else {
                return;
            }
        } else {
            const { error } = await supabase
                .from("cart_items")
                .update({ qty: newQty })
                .eq("id", itemId);
                
            if (error) {
                console.error("Error updating quantity:", error);
                alert("Failed to update quantity");
                return;
            }
        }
        
        // Refresh the summary
        await loadCheckoutSummary();
        
    } catch (error) {
        console.error("Error in updateCheckoutQty:", error);
        alert("Failed to update cart");
    }
}

// Initialize on load
document.addEventListener("DOMContentLoaded", () => {
    loadCheckoutSummary();
    
    // Set up button listeners
    const placeOrderBtn = document.getElementById("placeOrderBtn");
    if (placeOrderBtn) {
        placeOrderBtn.onclick = openReview;
    }
    
    const finalConfirmBtn = document.getElementById("finalConfirmBtn");
    if (finalConfirmBtn) {
        finalConfirmBtn.onclick = processBankOrder;
    }
});