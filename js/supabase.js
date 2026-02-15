import { createClient } from "https://esm.sh/@supabase/supabase-js";

export const supabase = createClient(
  "https://hjghemoxbyexeemwpjrx.supabase.co",
  "sb_publishable_lByAZQ0ZtFEYN9_G13E7Tg_e4RXrQG6"
);

// Make functions globally accessible for onclick attributes
window.addToCart = addToCart;
window.toggleChat = toggleChat;
window.sendQuickTicket = sendQuickTicket;
window.loadChatHistory = loadChatHistory;

// Flag to prevent double-sending messages
let isSendingMessage = false;

// Toast notification system
function showToast(message) {
  const container = document.getElementById("toast-container");
  if (!container) return;
  
  const toast = document.createElement("div");

  // Styling to match your zinc/gold aesthetic
  toast.className = `
    bg-zinc-900 border border-yellow-600/50 text-white px-6 py-4 rounded-xl 
    shadow-2xl shadow-yellow-900/20 translate-y-10 opacity-0 
    transition-all duration-500 flex items-center gap-3 min-w-[280px] mb-3
  `;
  
  toast.innerHTML = `
    <div class="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
    <p class="text-xs uppercase tracking-widest font-medium">${escapeHtml(message)}</p>
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

// Helper function to escape HTML and prevent XSS
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Add to cart function (main version for product cards)
async function addToCart(event, productId, name, price, imageUrl, size = 'M') {
    try {
        // Prevent navigating to the product page when clicking the button
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
            showToast("Please log in to add items to cart");
            setTimeout(() => {
                window.location.href = "../pages/login.html";
            }, 1500);
            return;
        }

        // Get or create user's cart
        let { data: cart, error: cartError } = await supabase
            .from('carts')
            .select('id')
            .eq('user_id', user.id)
            .maybeSingle();

        if (cartError) throw cartError;

        if (!cart) {
            // Create new cart
            const { data: newCart, error: createError } = await supabase
                .from('carts')
                .insert([{ user_id: user.id }])
                .select()
                .single();

            if (createError) throw createError;
            cart = newCart;
        }

        // Check if item already exists in cart with same size
        const { data: existingItem, error: existingError } = await supabase
            .from('cart_items')
            .select('id, qty')
            .eq('cart_id', cart.id)
            .eq('product_id', productId)
            .eq('size', size)
            .maybeSingle();

        if (existingError) throw existingError;

        if (existingItem) {
            // Update quantity
            const { error: updateError } = await supabase
                .from('cart_items')
                .update({ qty: existingItem.qty + 1 })
                .eq('id', existingItem.id);

            if (updateError) throw updateError;
            
            showToast(`${name} quantity updated in cart`);
        } else {
            // Insert new row
            const { error: insertError } = await supabase
                .from('cart_items')
                .insert([{
                    cart_id: cart.id,
                    product_id: productId,
                    name: name,
                    price: price,
                    size: size,
                    qty: 1,
                    image_url: imageUrl
                }]);

            if (insertError) throw insertError;
            
            showToast(`${name} added to cart`);
        }

        // Update cart count in navigation
        await updateNavCartCount();
        
    } catch (error) {
        console.error("Error adding to cart:", error);
        showToast("Failed to add item to cart");
    }
}

// Alternative addToCart for chat system (with different signature)
async function addToCartChat(productId, size, quantity = 1) {
    try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
            showToast("Please log in to add items to cart");
            setTimeout(() => {
                window.location.href = "../pages/login.html";
            }, 1500);
            return;
        }

        // Get or create user's cart
        let { data: cart, error: cartError } = await supabase
            .from('carts')
            .select('id')
            .eq('user_id', user.id)
            .maybeSingle();

        if (cartError) throw cartError;

        if (!cart) {
            const { data: newCart, error: createError } = await supabase
                .from('carts')
                .insert([{ user_id: user.id }])
                .select()
                .single();

            if (createError) throw createError;
            cart = newCart;
        }

        // Get product details
        const { data: product, error: productError } = await supabase
            .from('products')
            .select('*')
            .eq('id', productId)
            .single();

        if (productError) throw productError;

        // Check if item already exists in cart with same size
        const { data: existingItem, error: existingError } = await supabase
            .from('cart_items')
            .select('id, qty')
            .eq('cart_id', cart.id)
            .eq('product_id', productId)
            .eq('size', size)
            .maybeSingle();

        if (existingError) throw existingError;

        if (existingItem) {
            // Update quantity
            const { error: updateError } = await supabase
                .from('cart_items')
                .update({ qty: existingItem.qty + quantity })
                .eq('id', existingItem.id);

            if (updateError) throw updateError;
            
            showToast(`${product.name} quantity updated in cart`);
        } else {
            // Insert new row
            const { error: insertError } = await supabase
                .from('cart_items')
                .insert([{
                    cart_id: cart.id,
                    product_id: productId,
                    name: product.name,
                    price: product.price,
                    size: size,
                    qty: quantity,
                    image_url: product.image_url
                }]);

            if (insertError) throw insertError;
            
            showToast(`${product.name} added to cart`);
        }

        // Update cart count in navigation
        await updateNavCartCount();
        
    } catch (error) {
        console.error("Error adding to cart:", error);
        showToast("Failed to add item to cart");
    }
}

// Update cart count in navigation
async function updateNavCartCount() {
    try {
        const badge = document.getElementById("cartCount");
        if (!badge) return;

        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
            badge.classList.add("opacity-0");
            return;
        }

        const { data: cart, error: cartError } = await supabase
            .from("carts")
            .select("id")
            .eq("user_id", user.id)
            .maybeSingle();
            
        if (cartError || !cart) {
            badge.classList.add("opacity-0");
            return;
        }

        const { count, error: countError } = await supabase
            .from("cart_items")
            .select("*", { count: 'exact', head: true })
            .eq("cart_id", cart.id);

        if (countError) throw countError;

        if (count && count > 0) {
            badge.innerText = count;
            badge.classList.remove("opacity-0");
            badge.classList.add("opacity-100");
        } else {
            badge.classList.add("opacity-0");
            badge.classList.remove("opacity-100");
        }
    } catch (error) {
        console.error("Error updating cart count:", error);
    }
}

// Load products on homepage
async function loadProducts() {
    const productsDiv = document.getElementById("products");
    if (!productsDiv) return;

    try {
        const { data, error } = await supabase
            .from("products")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Error loading products:", error);
            productsDiv.innerHTML = "<p class='col-span-full text-center text-red-500'>Error loading collection.</p>";
            return;
        }

        if (!data || data.length === 0) {
            productsDiv.innerHTML = "<p class='col-span-full text-center text-zinc-500'>No products available.</p>";
            return;
        }

        productsDiv.innerHTML = data.map(p => `
            <div class="group bg-zinc-950/40 backdrop-blur-sm border border-zinc-900 rounded-2xl overflow-hidden transition-all duration-500 gold-glow relative">
                <a href="productPage.html?id=${p.id}" class="block">
                    <div class="relative overflow-hidden aspect-[4/5]">
                        <img src="${p.image_url || 'https://via.placeholder.com/600'}" 
                             alt="${escapeHtml(p.name)}"
                             class="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                             onerror="this.src='https://via.placeholder.com/600'">
                        <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                    </div>
                </a>

                <div class="p-6 relative">
                    <h2 class="font-serif text-lg tracking-wider text-white uppercase">${escapeHtml(p.name)}</h2>
                    <p class="text-xs text-zinc-500 mt-1 font-light line-clamp-2">${escapeHtml(p.description) || 'Exclusive piece.'}</p>

                    <div class="flex justify-between items-center mt-6">
                        <span class="font-light tracking-widest text-yellow-500">₦${p.price?.toLocaleString() || '0'}</span>
                        <button
                            onclick="addToCart(event, '${p.id}', '${escapeHtml(p.name)}', ${p.price}, '${p.image_url || ''}')"
                            class="bg-yellow-600 hover:bg-yellow-500 text-black px-6 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-yellow-900/20">
                            Add To Cart
                        </button>
                    </div>
                </div>
            </div>
        `).join("");
        
    } catch (error) {
        console.error("Error in loadProducts:", error);
        if (productsDiv) {
            productsDiv.innerHTML = "<p class='col-span-full text-center text-red-500'>Error loading products.</p>";
        }
    }
}

// Chat functionality
function toggleChat() {
    const chatWin = document.getElementById('chat-window');
    if (chatWin) {
        chatWin.classList.toggle('hidden');
        
        // Load chat history when opening
        if (!chatWin.classList.contains('hidden')) {
            loadChatHistory();
        }
    }
}

// Fixed sendQuickTicket with double-sending prevention
async function sendQuickTicket() {
    // Prevent double-sending
    if (isSendingMessage) {
        console.log("Message already sending, please wait");
        return;
    }
    
    try {
        const messageInput = document.getElementById('support-msg');
        if (!messageInput) return;
        
        const message = messageInput.value.trim();
        if (!message) {
            showToast("Please enter a message");
            return;
        }

        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
            showToast("Please log in to send a message");
            setTimeout(() => {
                window.location.href = "../pages/login.html";
            }, 1500);
            return;
        }

        // Set sending flag to prevent double-sending
        isSendingMessage = true;

        // Insert support ticket
        const { error: insertError } = await supabase
            .from('support_tickets')
            .insert([{
                user_id: user.id,
                subject: "Chat Inquiry",
                message: message,
                status: 'open',
                created_at: new Date().toISOString()
            }]);

        if (insertError) {
            console.error("Support Error:", insertError);
            showToast("Failed to send message");
            return;
        }

        // Add User Message to UI
        const msgArea = document.getElementById('chat-messages');
        if (msgArea) {
            msgArea.innerHTML += `
                <div class="bg-yellow-600/10 border border-yellow-600/20 p-4 rounded-2xl rounded-br-none text-[11px] leading-relaxed text-white ml-auto max-w-[85%] mb-4">
                    ${escapeHtml(message)}
                    <div class="text-[8px] text-zinc-500 mt-1">${formatTime(new Date())}</div>
                </div>
            `;
            
            // Clear input and scroll to bottom
            messageInput.value = '';
            msgArea.scrollTop = msgArea.scrollHeight;
        }
        
        showToast("Message sent");
        
    } catch (error) {
        console.error("Error in sendQuickTicket:", error);
        showToast("An error occurred");
    } finally {
        // Reset sending flag after a short delay
        setTimeout(() => {
            isSendingMessage = false;
        }, 1000);
    }
}

async function loadChatHistory() {
    try {
        const msgArea = document.getElementById('chat-messages');
        if (!msgArea) return;

        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
            console.log("User not logged in");
            return;
        }

        const { data: tickets, error } = await supabase
            .from('support_tickets')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: true });

        if (error) {
            console.error("Error loading chat history:", error);
            return;
        }

        // Clear existing messages
        msgArea.innerHTML = '';

        if (!tickets || tickets.length === 0) {
            // Add welcome message if no history
            msgArea.innerHTML = `
                <div class="bg-zinc-900/80 p-4 rounded-2xl rounded-bl-none text-[11px] text-zinc-300 max-w-[85%] border border-zinc-800/50 mb-4">
                    <p class="text-[8px] text-yellow-600 uppercase mb-1 font-bold">FITFASHION</p>
                    Hello! How can we help you today?
                </div>
            `;
            return;
        }

        tickets.forEach(ticket => {
            // User Message
            msgArea.innerHTML += `
                <div class="bg-yellow-600/10 border border-yellow-600/20 p-4 rounded-2xl rounded-br-none text-[11px] text-white ml-auto max-w-[85%] mb-4">
                    ${escapeHtml(ticket.message)}
                    <div class="text-[8px] text-zinc-500 mt-1">${formatTime(ticket.created_at)}</div>
                </div>
            `;

            // Admin Response (if exists)
            if (ticket.admin_note) {
                msgArea.innerHTML += `
                    <div class="bg-zinc-900/80 p-4 rounded-2xl rounded-bl-none text-[11px] text-zinc-300 max-w-[85%] border border-zinc-800/50 mb-4">
                        <p class="text-[8px] text-yellow-600 uppercase mb-1 font-bold">Liaison</p>
                        ${escapeHtml(ticket.admin_note)}
                        <div class="text-[8px] text-zinc-600 mt-1">${formatTime(ticket.updated_at || ticket.created_at)}</div>
                    </div>
                `;
            }
        });
        
        msgArea.scrollTop = msgArea.scrollHeight;
        
    } catch (error) {
        console.error("Error in loadChatHistory:", error);
    }
}

// Helper function to format time
function formatTime(timestamp) {
    if (!timestamp) return '';
    try {
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
        return '';
    }
}

function subscribeToSupport() {
    try {
        const channel = supabase
            .channel('support-updates')
            .on('postgres_changes', 
                { 
                    event: 'UPDATE', 
                    schema: 'public', 
                    table: 'support_tickets' 
                }, 
                async (payload) => {
                    // Verify this update is for the current user
                    const { data: { user } } = await supabase.auth.getUser();
                    
                    // If the admin added a note and it's for current user, refresh chat
                    if (payload.new.admin_note && payload.new.user_id === user?.id) {
                        loadChatHistory();
                        
                        // Show notification badge
                        showNotificationBadge();
                        
                        // Show toast notification
                        showToast("New message from liaison");
                    }
                }
            )
            .subscribe();

        return channel;
    } catch (error) {
        console.error("Error subscribing to support updates:", error);
    }
}

// Show notification badge on chat button
function showNotificationBadge() {
    const chatBtn = document.querySelector('.chat-button');
    if (chatBtn) {
        let badge = chatBtn.querySelector('.notification-badge');
        if (!badge) {
            badge = document.createElement('span');
            badge.className = 'notification-badge absolute -top-1 -right-1 w-3 h-3 bg-yellow-600 rounded-full';
            chatBtn.style.position = 'relative';
            chatBtn.appendChild(badge);
            
            // Remove after 5 seconds
            setTimeout(() => {
                if (badge) badge.remove();
            }, 5000);
        }
    }
}

// Check for unread messages on page load
async function checkUnreadMessages() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Get tickets with admin responses
        const { data: tickets } = await supabase
            .from('support_tickets')
            .select('*')
            .eq('user_id', user.id)
            .not('admin_note', 'is', null)
            .order('created_at', { ascending: false })
            .limit(1);

        if (tickets && tickets.length > 0) {
            showNotificationBadge();
        }
    } catch (error) {
        console.error("Error checking unread messages:", error);
    }
}

// Initialize everything on page load
document.addEventListener('DOMContentLoaded', () => {
    // Set up logout button
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
        logoutBtn.onclick = async () => {
            await supabase.auth.signOut();
            window.location.href = "/pages/login.html";
        };
    }

    // Set up chat send button
    const sendBtn = document.getElementById('send-support-msg');
    if (sendBtn) {
        // Remove any existing listeners to prevent duplicates
        const newSendBtn = sendBtn.cloneNode(true);
        sendBtn.parentNode.replaceChild(newSendBtn, sendBtn);
        newSendBtn.addEventListener('click', sendQuickTicket);
    }

    // Set up enter key in chat input - FIXED VERSION
    const msgInput = document.getElementById('support-msg');
    if (msgInput) {
        // Remove any existing listeners to prevent duplicates
        const newMsgInput = msgInput.cloneNode(true);
        msgInput.parentNode.replaceChild(newMsgInput, msgInput);
        
        // Add the new listener with proper event handling
        newMsgInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault(); // Prevent default form submission
                e.stopPropagation(); // Stop event from bubbling
                sendQuickTicket();
            }
        });
    }

    // Prevent any form submission if input is in a form
    const chatForm = document.querySelector('.chat-input-container form, #chat-form');
    if (chatForm) {
        chatForm.addEventListener('submit', (e) => {
            e.preventDefault();
        });
    }

    // Load chat history if chat is visible
    const chatWin = document.getElementById('chat-window');
    if (chatWin && !chatWin.classList.contains('hidden')) {
        loadChatHistory();
    }

    // Load products
    loadProducts();
    
    // Update cart count
    updateNavCartCount();
    
    // Check for unread messages
    checkUnreadMessages();

    // Subscribe to support updates
    subscribeToSupport();
});

// Make functions available globally
window.addToCart = addToCart;
window.addToCartChat = addToCartChat;
window.toggleChat = toggleChat;
window.sendQuickTicket = sendQuickTicket;
window.loadChatHistory = loadChatHistory;
window.showToast = showToast;