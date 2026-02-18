import { createClient } from "https://esm.sh/@supabase/supabase-js";

// Make supabase globally available (for inline handlers)
window.supabase = createClient(
  "https://hjghemoxbyexeemwpjrx.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhqZ2hlbW94YnlleGVlbXdwanJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5Nzg1MTksImV4cCI6MjA4NTU1NDUxOX0.N8_DlPNWXN733b0NrAg45-lN1NHMVJlDH63rDP9u86E"
);
const supabase = window.supabase;

// Make functions globally accessible
window.addToCart = addToCart;
window.toggleChat = toggleChat;
window.sendQuickTicket = sendQuickTicket;
window.loadChatHistory = loadChatHistory;
window.addToCartChat = addToCartChat;

// Flag to prevent double-sending messages
let isSendingMessage = false;

// Toast notification system (unchanged)
function showToast(message) {
  const container = document.getElementById("toast-container");
  if (!container) return;
  
  const toast = document.createElement("div");
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
  setTimeout(() => toast.classList.remove("translate-y-10", "opacity-0"), 10);
  setTimeout(() => {
    toast.classList.add("translate-y-[-10px]", "opacity-0");
    setTimeout(() => toast.remove(), 500);
  }, 3000);
}

// Simple popup (for real-time notifications) – reuses toast
function showPopup(title, message) {
  showToast(`${title}: ${message}`);
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Add to cart (main version)
async function addToCart(event, productId, name, price, imageUrl, size = 'M') {
    const btn = event?.currentTarget || event?.target;
    const originalContent = btn ? btn.innerHTML : "Add To Cart";
    
    try {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        if (btn) {
            btn.disabled = true;
            btn.classList.add('opacity-50', 'cursor-not-allowed');
            btn.innerHTML = `
                <span class="flex items-center gap-2">
                    <svg class="animate-spin h-3 w-3 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    Adding...
                </span>
            `;
        }

        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
            showToast("Please log in to add items to cart");
            setTimeout(() => window.location.href = "../pages/login.html", 1500);
            return;
        }

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
                .select().single();
            if (createError) throw createError;
            cart = newCart;
        }

        const { data: existingItem, error: existingError } = await supabase
            .from('cart_items')
            .select('id, qty')
            .eq('cart_id', cart.id)
            .eq('product_id', productId)
            .maybeSingle();
        if (existingError) throw existingError;

        if (existingItem) {
            const { error: updateError } = await supabase
                .from('cart_items')
                .update({ qty: existingItem.qty + 1 })
                .eq('id', existingItem.id);
            if (updateError) throw updateError;
            showToast(`${name} quantity updated`);
        } else {
            const { error: insertError } = await supabase
                .from('cart_items')
                .insert([{
                    cart_id: cart.id,
                    product_id: productId,
                    name: name,
                    price: price,
                    qty: 1,
                    image_url: imageUrl
                }]);
            if (insertError) throw insertError;
            showToast(`${name} added to cart`);

            // ✅ FIXED: Replace button with "View In Cart" link after successful insert
            if (btn) {
                btn.outerHTML = `
                    <a href="cart.html" class="border border-yellow-600 text-yellow-500 hover:bg-yellow-600 hover:text-black px-6 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all text-center">
                        View In Cart
                    </a>`;
            }
        }

        await updateNavCartCount();
        
    } catch (error) {
        console.error("Error adding to cart:", error);
        showToast("Failed to add item");
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.classList.remove('opacity-50', 'cursor-not-allowed');
            btn.innerHTML = originalContent;
        }
    }
}

// Chat version of addToCart (unchanged, but uses correct supabase)
async function addToCartChat(productId, size, quantity = 1) {
    try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
            showToast("Please log in to add items to cart");
            setTimeout(() => window.location.href = "../pages/login.html", 1500);
            return;
        }

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
                .select().single();
            if (createError) throw createError;
            cart = newCart;
        }

        const { data: product, error: productError } = await supabase
            .from('products')
            .select('*')
            .eq('id', productId)
            .single();
        if (productError) throw productError;

        const { data: existingItem, error: existingError } = await supabase
            .from('cart_items')
            .select('id, qty')
            .eq('cart_id', cart.id)
            .eq('product_id', productId)
            .eq('size', size)
            .maybeSingle();
        if (existingError) throw existingError;

        if (existingItem) {
            const { error: updateError } = await supabase
                .from('cart_items')
                .update({ qty: existingItem.qty + quantity })
                .eq('id', existingItem.id);
            if (updateError) throw updateError;
            showToast(`${product.name} quantity updated in cart`);
        } else {
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

let currentPage = 0;
const itemsPerPage = 8;

// Load products
async function loadProducts(page = 0) {
    const productsDiv = document.getElementById("products");
    if (!productsDiv) return;

    showSkeletons(productsDiv);
    currentPage = page;

    try {
        const { data: { user } } = await supabase.auth.getUser();
        let userCartItems = [];
        
        if (user) {
            const { data: cart } = await supabase
                .from('carts')
                .select('id')
                .eq('user_id', user.id)
                .maybeSingle();
            if (cart) {
                const { data: items } = await supabase
                    .from('cart_items')
                    .select('product_id')
                    .eq('cart_id', cart.id);
                userCartItems = items ? items.map(item => item.product_id) : [];
            }
        }

        const from = page * itemsPerPage;
        const to = from + itemsPerPage - 1;

        const response = await supabase
            .from("products")
            .select("*", { count: 'exact' })
            .order("created_at", { ascending: false })
            .range(from, to);
        if (response.error) throw response.error;

        const data = response.data || [];
        const totalCount = response.count || 0;

        if (!data || data.length === 0) {
            productsDiv.innerHTML = "<p class='col-span-full text-center text-zinc-500'>No products available.</p>";
            return;
        }

        productsDiv.innerHTML = data.map(p => {
            const stock = p.stock ?? 0;
            const isOutOfStock = stock <= 0;
            const isLowStock = stock > 0 && stock <= 5;
            const isInCart = userCartItems.includes(p.id);

            let stockBadge = '';
            if (isOutOfStock) {
                stockBadge = `<span class="absolute top-4 left-4 z-20 bg-red-600/90 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-tighter backdrop-blur-sm">Sold Out</span>`;
            } else if (isLowStock) {
                stockBadge = `<span class="absolute top-4 left-4 z-20 bg-orange-500/90 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-tighter backdrop-blur-sm animate-pulse">Low Stock: ${stock} left</span>`;
            }

            let buttonHTML = '';
            if (isOutOfStock) {
                buttonHTML = `
                    <button disabled class="bg-zinc-800 text-zinc-500 cursor-not-allowed px-6 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest">
                        Unavailable
                    </button>`;
            } else if (isInCart) {
                buttonHTML = `
                    <a href="cart.html" 
                       onclick="event.stopPropagation();" 
                       class="border border-yellow-600 text-yellow-500 hover:bg-yellow-600 hover:text-black px-6 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all text-center">
                        View In Cart
                    </a>`;
            } else {
                buttonHTML = `
                    <button 
                        onclick="addToCart(event, '${p.id}', '${escapeHtml(p.name)}', ${p.price}, '${p.image_url || ''}')"
                        class="bg-yellow-600 hover:bg-yellow-500 text-black px-6 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-yellow-900/20">
                        Add To Cart
                    </button>`;
            }

            const linkAttributes = isOutOfStock 
                ? `href="javascript:void(0)" class="absolute inset-0 z-10 cursor-default" onclick="event.preventDefault();"` 
                : `href="productPage.html?id=${p.id}" class="absolute inset-0 z-10"`;

            return `
                <div class="group bg-zinc-950/40 backdrop-blur-sm border border-zinc-900 rounded-2xl overflow-hidden transition-all duration-500 gold-glow relative ${isOutOfStock ? 'opacity-70 grayscale-[0.5]' : ''}">
                    
                    <a ${linkAttributes} aria-label="View ${escapeHtml(p.name)}"></a>

                    ${stockBadge}

                    <div class="relative overflow-hidden aspect-[4/5]">
                        <img src="${p.image_url || 'https://via.placeholder.com/600'}" 
                             alt="${escapeHtml(p.name)}"
                             class="h-full w-full object-cover transition-transform duration-700 ${isOutOfStock ? '' : 'group-hover:scale-110'}"
                             onerror="this.src='https://via.placeholder.com/600'">
                        <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                    </div>

                    <div class="p-6 relative">
                        <div class="flex justify-between items-start">
                             <h2 class="font-serif text-lg tracking-wider text-white uppercase">${escapeHtml(p.name)}</h2>
                             <span class="text-[10px] text-zinc-600 font-mono">QTY: ${stock}</span>
                        </div>
                        <p class="text-xs text-zinc-500 mt-1 font-light line-clamp-2">${escapeHtml(p.description) || 'Exclusive piece.'}</p>

                        <div class="flex justify-between items-center mt-6">
                            <span class="font-light tracking-widest text-yellow-500">₦${p.price?.toLocaleString() || '0'}</span>
                            
                            <div class="relative z-20">
                                ${buttonHTML}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join("");

        renderPagination(totalCount);
        
    } catch (error) {
        console.error("Error in loadProducts:", error);
        productsDiv.innerHTML = "<p class='col-span-full text-center text-red-500'>Error loading products.</p>";
    }
}

function showSkeletons(container) {
    const skeletonHTML = `
        <div class="bg-zinc-950/40 border border-zinc-900 rounded-2xl overflow-hidden animate-pulse">
            <div class="aspect-[4/5] bg-zinc-900"></div>
            <div class="p-6 space-y-4">
                <div class="h-4 bg-zinc-900 rounded w-3/4"></div>
                <div class="h-3 bg-zinc-900 rounded w-full"></div>
                <div class="flex justify-between items-center mt-6">
                    <div class="h-4 bg-zinc-900 rounded w-1/4"></div>
                    <div class="h-8 bg-zinc-900 rounded-full w-1/3"></div>
                </div>
            </div>
        </div>
    `.repeat(4);
    container.innerHTML = skeletonHTML;
}

function renderPagination(totalItems) {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const navContainer = document.getElementById("pagination-nav");
    if (!navContainer) return;

    let navHTML = `
        <div class="flex items-center justify-center gap-4 mt-12 py-8 border-t border-zinc-900">
            <button onclick="loadProducts(${currentPage - 1})" 
                    ${currentPage === 0 ? 'disabled' : ''} 
                    class="p-2 text-zinc-500 hover:text-yellow-500 disabled:opacity-30 disabled:hover:text-zinc-500 transition-colors">
                <svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7"/></svg>
            </button>
            
            <span class="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">
                Page <span class="text-white">${currentPage + 1}</span> of ${totalPages}
            </span>

            <button onclick="loadProducts(${currentPage + 1})" 
                    ${currentPage >= totalPages - 1 ? 'disabled' : ''} 
                    class="p-2 text-zinc-500 hover:text-yellow-500 disabled:opacity-30 disabled:hover:text-zinc-500 transition-colors">
                <svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg>
            </button>
        </div>
    `;
    navContainer.innerHTML = navHTML;
}

// Chat functionality
function toggleChat() {
    const chatWin = document.getElementById('chat-window');
    if (chatWin) {
        chatWin.classList.toggle('hidden');
        if (!chatWin.classList.contains('hidden')) {
            loadChatHistory();
        }
    }
}

async function sendQuickTicket() {
    if (isSendingMessage) return;
    
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
            setTimeout(() => window.location.href = "../pages/login.html", 1500);
            return;
        }

        isSendingMessage = true;

        // Ensure profile exists
        const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', user.id)
            .maybeSingle();

        if (!profile) {
            await supabase.from('profiles').insert([{ id: user.id, email: user.email }]);
        }

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

        const msgArea = document.getElementById('chat-messages');
        if (msgArea) {
            msgArea.innerHTML += `
                <div class="bg-yellow-600/10 border border-yellow-600/20 p-4 rounded-2xl rounded-br-none text-[11px] leading-relaxed text-white ml-auto max-w-[85%] mb-4">
                    ${escapeHtml(message)}
                    <div class="text-[8px] text-zinc-500 mt-1">${formatTime(new Date())}</div>
                </div>
            `;
            messageInput.value = '';
            msgArea.scrollTop = msgArea.scrollHeight;
        }
        
        showToast("Message sent");
        
    } catch (error) {
        console.error("Error in sendQuickTicket:", error);
        showToast("An error occurred");
    } finally {
        isSendingMessage = false;
    }
}

async function loadChatHistory() {
    try {
        const msgArea = document.getElementById('chat-messages');
        if (!msgArea) return;

        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) return;

        const { data: tickets, error } = await supabase
            .from('support_tickets')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: true });

        if (error) {
            console.error("Error loading chat history:", error);
            return;
        }

        msgArea.innerHTML = '';

        if (!tickets || tickets.length === 0) {
            msgArea.innerHTML = `
                <div class="bg-zinc-900/80 p-4 rounded-2xl rounded-bl-none text-[11px] text-zinc-300 max-w-[85%] border border-zinc-800/50 mb-4">
                    <p class="text-[8px] text-yellow-600 uppercase mb-1 font-bold">FITFASHION</p>
                    Hello! How can we help you today?
                </div>
            `;
            return;
        }

        tickets.forEach(ticket => {
            msgArea.innerHTML += `
                <div class="bg-yellow-600/10 border border-yellow-600/20 p-4 rounded-2xl rounded-br-none text-[11px] text-white ml-auto max-w-[85%] mb-4">
                    ${escapeHtml(ticket.message)}
                    <div class="text-[8px] text-zinc-500 mt-1">${formatTime(ticket.created_at)}</div>
                </div>
            `;

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
                { event: 'UPDATE', schema: 'public', table: 'support_tickets' }, 
                async (payload) => {
                    const { data: { user } } = await supabase.auth.getUser();
                    if (payload.new.admin_note && payload.new.user_id === user?.id) {
                        loadChatHistory();
                        showNotificationBadge();
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

function showNotificationBadge() {
    const chatBtn = document.querySelector('.chat-button');
    if (chatBtn) {
        let badge = chatBtn.querySelector('.notification-badge');
        if (!badge) {
            badge = document.createElement('span');
            badge.className = 'notification-badge absolute -top-1 -right-1 w-3 h-3 bg-yellow-600 rounded-full';
            chatBtn.style.position = 'relative';
            chatBtn.appendChild(badge);
            setTimeout(() => badge?.remove(), 5000);
        }
    }
}

async function checkUnreadMessages() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

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

// Real-time product changes
function subscribeToProductChanges() {
    supabase
        .channel('public:products')
        .on('postgres_changes', 
            { event: '*', schema: 'public', table: 'products' }, 
            () => {
                loadProducts(currentPage);
                showToast("Inventory updated");
            }
        )
        .subscribe();
}

// Real-time cart changes
async function subscribeToCartChanges() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    supabase
        .channel('public:cart_items')
        .on('postgres_changes', 
            { event: '*', schema: 'public', table: 'cart_items' }, 
            async () => {
                await updateNavCartCount();
                loadProducts(currentPage);
            }
        )
        .subscribe();
}

// Admin notifications (new tickets)
function subscribeAdminToNewMessages() {
    supabase
        .channel('admin-notifications')
        .on('postgres_changes', { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'support_tickets' 
        }, (payload) => {
            playNotificationSound();
            showPopup("New Message", `User ${payload.new.user_id.slice(0,5)}...: ${payload.new.message.substring(0, 40)}...`);
            // Safely call loadAllTickets if it exists (admin dashboard)
            if (typeof window.loadAllTickets === "function") window.loadAllTickets();
        })
        .subscribe();
}

// User notifications (replies from admin)
async function subscribeUserToReplies() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    supabase
        .channel('user-notifications')
        .on('postgres_changes', { 
            event: 'UPDATE', 
            schema: 'public', 
            table: 'support_tickets',
            filter: `user_id=eq.${user.id}` 
        }, (payload) => {
            if (payload.new.admin_note && payload.new.admin_note !== payload.old?.admin_note) {
                showPopup("Liaison Replied", "A response has been added to your inquiry.");
                loadChatHistory();
                showNotificationBadge();
            }
        })
        .subscribe();
}

function playNotificationSound() {
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3');
    audio.volume = 0.4;
    audio.play().catch(e => console.log("Audio play blocked until user interaction"));
}

// Initialize everything
document.addEventListener('DOMContentLoaded', () => {
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
        logoutBtn.onclick = async () => {
            await supabase.auth.signOut();
            window.location.href = "/pages/login.html";
        };
    }

    // Clean up and attach chat send button
    const sendBtn = document.getElementById('send-support-msg');
    if (sendBtn) {
        const newSendBtn = sendBtn.cloneNode(true);
        sendBtn.parentNode.replaceChild(newSendBtn, sendBtn);
        newSendBtn.addEventListener('click', sendQuickTicket);
    }

    // Clean up and attach chat input enter key
    const msgInput = document.getElementById('support-msg');
    if (msgInput) {
        const newMsgInput = msgInput.cloneNode(true);
        msgInput.parentNode.replaceChild(newMsgInput, msgInput);
        newMsgInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                e.stopPropagation();
                sendQuickTicket();
            }
        });
    }

    const chatForm = document.querySelector('.chat-input-container form, #chat-form');
    if (chatForm) {
        chatForm.addEventListener('submit', (e) => e.preventDefault());
    }

    const chatWin = document.getElementById('chat-window');
    if (chatWin && !chatWin.classList.contains('hidden')) {
        loadChatHistory();
    }

    loadProducts(0);
    updateNavCartCount();
    checkUnreadMessages();

    subscribeToSupport();
    subscribeToProductChanges();
    subscribeToCartChanges();
    subscribeAdminToNewMessages();
    subscribeUserToReplies();
});