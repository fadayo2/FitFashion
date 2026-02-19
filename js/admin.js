import { createClient } from "https://esm.sh/@supabase/supabase-js";

const supabase = createClient(
    "https://hjghemoxbyexeemwpjrx.supabase.co",
    "sb_publishable_lByAZQ0ZtFEYN9_G13E7Tg_e4RXrQG6"
);

let currentOrders = []; 

function showLoader(elementId) {
    const container = document.getElementById(elementId);
    if (container) {
        container.innerHTML = `
            <tr>
                <td colspan="5" class="py-20 text-center">
                    <div class="loader-container">
                        <span class="loader"></span>
                        <span class="ml-3 text-[9px] uppercase tracking-[0.2em] text-zinc-500">Connecting to Dossier...</span>
                    </div>
                </td>
            </tr>
        `;
    }
}

// Initialize EmailJS if you're using it
if (typeof emailjs !== 'undefined') {
    emailjs.init('YOUR_PUBLIC_KEY'); // Add your EmailJS public key
}

// --- 1. SECURITY & INITIALIZATION ---
async function initAdmin() {
    try {
        // 1. Get the current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session) {
            window.location.href = "../pages/login.html";
            return;
        }

        const user = session.user;
        const ADMIN_LIST = [
            "afadunmiye@gmail.com",
            "brosdipo@gmail.com" // Ensure this is exactly as it appears in Supabase Auth
        ];

        // 2. Case-insensitive check
        const isAuthorized = ADMIN_LIST.map(e => e.toLowerCase()).includes(user.email.toLowerCase());

        if (!isAuthorized) {
            console.error("Access denied for:", user.email);
            // Optional: Sign them out so they can try a different account
            // await supabase.auth.signOut(); 
            window.location.href = "../pages/login.html";
            return;
        }

        // 3. Success - Proceed with data loading
        console.log("Welcome Admin:", user.email);
        window.fetchOrders('all');
        updateStats();
        loadConversations();

        // Real-time listener: Listen for new messages
        supabase
          .channel('admin-updates')
          .on('postgres_changes', { 
              event: '*', 
              schema: 'public', 
              table: 'support_tickets' 
          }, () => {
              console.log("Updates detected in support tickets...");
              loadConversations(); // Refresh the sidebar list
              
              if (currentChatUserId) {
                  // Re-open/Refresh current chat if one is active
                  openChatRoom(currentChatUserId, document.getElementById('active-chat-user').innerText);
              }
          })
          .subscribe();

    } catch (err) {
        console.error("Init error:", err);
        // Optional: Redirect on critical error
        // window.location.href = "../pages/login.html";
    }
}

// --- 2. STATS CALCULATOR ---
async function updateStats() {
    try {
        const { data: orders } = await supabase.from('orders').select('amount, status');
        if (!orders) return;

        const securedRevenue = orders
            .filter(o => ['confirmed', 'shipped', 'delivered'].includes(o.status))
            .reduce((sum, o) => {
                const val = parseFloat(o.amount.toString().replace(/[^0-9.]/g, ""));
                return sum + (isNaN(val) ? 0 : val);
            }, 0);

        const activeCount = orders.filter(o => ['pending_transfer', 'confirmed', 'shipped'].includes(o.status)).length;

        const revenueEl = document.getElementById('total-revenue');
        const activeEl = document.getElementById('active-orders-count');
        
        if (revenueEl) revenueEl.innerText = `₦${securedRevenue.toLocaleString()}`;
        if (activeEl) activeEl.innerText = `${activeCount} ACTIVE`;
    } catch (err) {
        console.error("Stats update error:", err);
    }
}

// --- 3. ORDER MANAGEMENT ---
window.fetchOrders = async (statusFilter = 'all') => {
    const tbody = document.getElementById('orderTableBody');
    if (!tbody) return;
    
    showLoader('orderTableBody');

    try {
        let query = supabase.from('orders').select('*').order('created_at', { ascending: false });
        if (statusFilter !== 'all') {
            query = query.eq('status', statusFilter);
        }

        const { data: orders, error } = await query;

        if (error) {
            console.error("Fetch Error:", error);
            return;
        }

        // UPDATE MASTER STORE
        currentOrders = orders || []; 
        console.log("Master Store Updated. Total Orders:", currentOrders.length);
        
        renderOrderTable(orders || []);
        updateStats();
    } catch (err) {
        console.error("Fetch orders error:", err);
    }
};

// --- TABLE RENDERING ---
function renderOrderTable(orders) {
    const tbody = document.getElementById('orderTableBody');
    if (!tbody) return;
    
    if (!orders || orders.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="py-20 text-center text-zinc-600 uppercase text-[10px] tracking-widest">No Dossiers Found</td></tr>`;
        return;
    }

    tbody.innerHTML = orders.map(order => `
        <tr class="hover:bg-yellow-900/5 border-b border-zinc-900/50">
            <td class="px-8 py-6 text-zinc-500 font-mono">#${order.order_ref || 'N/A'}</td>
            <td class="px-8 py-6 text-white font-medium uppercase text-[10px]">
                ${order.shipping_details?.firstName || ''} ${order.shipping_details?.lastName || ''}
            </td>
            <td class="px-8 py-6 text-yellow-500 text-right font-serif">${order.amount || '₦0'}</td>
            <td class="px-8 py-6 text-center">
                <select onchange="window.updateOrderStatus('${order.id}', this.value)" 
                    class="bg-zinc-950 text-[8px] px-3 py-2 rounded-full text-yellow-600 border border-yellow-900/30">
                    <option value="pending_transfer" ${order.status === 'pending_transfer' ? 'selected' : ''}>⏳ Pending</option>
                    <option value="confirmed" ${order.status === 'confirmed' ? 'selected' : ''}>✅ Confirmed</option>
                    <option value="shipped" ${order.status === 'shipped' ? 'selected' : ''}>📦 Shipped</option>
                    <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>✨ Delivered</option>
                    <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>❌ Cancelled</option>
                </select>
            </td>
            <td class="px-8 py-6 text-right">
                <button onclick="window.viewFullDossier('${order.order_ref}')" 
                    class="text-white hover:text-yellow-400 border-b border-zinc-800 pb-1 text-[9px] uppercase tracking-widest">
                    View Full Dossier →
                </button>
            </td>
        </tr>
    `).join('');
}

// Global Search Logic
window.filterOrders = async (searchTerm) => {
    if (!searchTerm) {
        window.fetchOrders('all');
        return;
    }

    try {
        const { data: orders, error } = await supabase
            .from('orders')
            .select('*')
            .or(`order_ref.ilike.%${searchTerm}%, shipping_details->>firstName.ilike.%${searchTerm}%, shipping_details->>lastName.ilike.%${searchTerm}%`)
            .order('created_at', { ascending: false });

        if (!error) renderOrderTable(orders || []);
    } catch (err) {
        console.error("Filter error:", err);
    }
};

// --- NEW: VIEW FULL DOSSIER IN NEW PAGE ---
window.viewFullDossier = (orderRef) => {
    // Open new page with dossier details
    const dossierUrl = `../pages/dossier.html?ref=${orderRef}`;
    window.open(dossierUrl, '_blank');
};


// let currentChatUserId = null;

// --- UPDATED CHAT ROOM LOGIC ---

// 0. Global State
window.currentChatUserId = null;

// 1. Load User List
async function loadConversations() {
    const userList = document.getElementById('admin-user-list');
    if (!userList) return;

    const { data: tickets, error } = await supabase
        .from('support_tickets')
        .select(`
            *,
            profiles (
                full_name
            )
        `)
        .order('created_at', { ascending: false });

    if (error) return console.error("Inbox Error:", error);

    const groups = {};
    tickets.forEach(t => {
        if (!groups[t.user_id]) groups[t.user_id] = t;
    });

    const uniqueUsers = Object.values(groups);
    
    userList.innerHTML = uniqueUsers.map(chat => {
        const userName = chat.profiles?.full_name || `Client_${chat.user_id.slice(0, 5)}`;
        // Highlight active chat
        const isActive = window.currentChatUserId === chat.user_id;
        
        return `
            <div onclick="openChatRoom('${chat.user_id}', '${userName}')" 
                 class="p-5 cursor-pointer hover:bg-zinc-900/50 transition-all border-l-2 ${isActive ? 'border-yellow-600 bg-zinc-900/30' : 'border-transparent'}">
                <div class="flex justify-between items-start mb-1">
                    <span class="text-[10px] text-white font-bold tracking-widest uppercase">${userName}</span>
                    <span class="text-[7px] text-zinc-600">${new Date(chat.created_at).toLocaleTimeString()}</span>
                </div>
                <p class="text-[9px] text-zinc-500 truncate lowercase">${chat.message}</p>
            </div>
        `;
    }).join("");
}

// 2. Open Chat history
async function openChatRoom(userId, displayName) {
    // Update global state
    window.currentChatUserId = userId;
    
    const headerName = document.getElementById('active-chat-user');
    const headerStatus = document.getElementById('active-chat-status');
    const chatActions = document.getElementById('chat-actions');
    const chatArea = document.getElementById('admin-chat-messages');

    // UI Updates
    if (headerName) {
        headerName.innerText = displayName;
        headerName.dataset.userId = userId;
    }
    if (headerStatus) headerStatus.innerText = "SECURE CHANNEL ACTIVE";
    if (chatActions) chatActions.classList.remove('hidden');

    // Fetch History
    const { data: history, error } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

    if (error || !chatArea) return;

    chatArea.innerHTML = history.map(msg => `
        <div class="flex flex-col ${msg.admin_note ? 'items-end' : 'items-start'} mb-4">
            <div class="max-w-[80%] bg-zinc-800/50 border border-zinc-800 p-3 rounded-2xl rounded-bl-none text-[11px] text-zinc-300">
                ${msg.message}
            </div>
            <p class="text-[7px] text-zinc-600 mt-1 uppercase ml-1">${new Date(msg.created_at).toLocaleTimeString()}</p>
            
            ${msg.admin_note ? `
                <div class="max-w-[80%] mt-2 bg-yellow-600 text-black p-3 rounded-2xl rounded-br-none text-[11px] font-medium text-right">
                    ${msg.admin_note}
                </div>
                <p class="text-[7px] text-yellow-700 mt-1 uppercase mr-1 text-right">Transmitted</p>
            ` : ''}
        </div>
    `).join("");

    chatArea.scrollTop = chatArea.scrollHeight;
    
    // Refresh the list to update the "active" highlight
    loadConversations();
}

// 3. Send Reply
async function sendAdminReply() {
    const input = document.getElementById('admin-reply-input');
    const message = input.value.trim();
    const userId = window.currentChatUserId;
    
    if (!message || !userId) {
        console.error("Missing message or User ID");
        return;
    }

    try {
        const { data: latest, error: fetchError } = await supabase
            .from('support_tickets')
            .select('id')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (fetchError || !latest) {
            alert("No active ticket found.");
            return;
        }

        const { error: updateError } = await supabase
            .from('support_tickets')
            .update({ 
                admin_note: message, 
                status: 'resolved'
            })
            .eq('id', latest.id);

        if (updateError) throw updateError;

        input.value = '';
        const currentName = document.getElementById('active-chat-user')?.innerText || "User";
        openChatRoom(userId, currentName);
        loadConversations();

    } catch (err) {
        console.error("Transmission Error:", err.message);
        alert("Failed to deliver reply.");
    }
}

// 4. Dossier Integration
window.viewUserDetails = async (userId) => {
    const targetId = userId || window.currentChatUserId;
    if (!targetId) {
        alert("Identify client before accessing dossier.");
        return;
    }

    const { data: order, error } = await supabase
        .from('orders')
        .select('order_ref')
        .eq('user_id', targetId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error || !order) {
        alert("OFFLINE: No recorded orders for this subject.");
        return;
    }

    window.viewFullDossier(order.order_ref);
};

// Map functions to window for HTML access
window.openChatRoom = openChatRoom;
window.sendAdminReply = sendAdminReply;
window.loadConversations = loadConversations;

// Initial Load
loadConversations();
// Globalize
window.openChatRoom = openChatRoom;
window.sendAdminReply = sendAdminReply;
window.loadConversations = loadConversations;


let currentOrderToShip = null;

// Update Order Status

/**
 * Main Status Trigger
 */
window.updateOrderStatus = async (id, status) => {
    // 1. If shipping, open the form and wait for the "Confirm" click
    if (status === 'shipped') {
        currentOrderToShip = id;
        document.getElementById('shipModal').classList.remove('hidden');
        document.getElementById('modalRiderName').focus();
        return; 
    }
    
    // 2. For all other statuses, update immediately
    await processStatusUpdate(id, status);
};

/**
 * Core Logic: Updates DB, Sends Emails, and Prevents Double-Clicks
 */
async function processStatusUpdate(id, status, extraData = {}) {
    // Select the button that was clicked to show loading state
    const btn = document.querySelector(`button[onclick*="'${id}'"][onclick*="'${status}'"]`);
    const originalContent = btn ? btn.innerHTML : status;

    if (btn) {
        btn.disabled = true; // DOUBLE CLICK PROTECTION
        btn.innerHTML = `<span class="animate-spin border-2 border-white/20 border-t-white rounded-full h-3 w-3 inline-block"></span>`;
    }

    try {
        // Fetch current order data for EmailJS
        const { data: order, error: fetchError } = await supabase
            .from('orders').select('*').eq('id', id).single();
        if (fetchError || !order) throw new Error("Order not found");

        // Update Database
        const updateData = { status, ...extraData };
        const { error: updateError } = await supabase.from('orders').update(updateData).eq('id', id);
        if (updateError) throw updateError;

        // EmailJS Implementation
        if (typeof emailjs !== 'undefined' && order.shipping_details?.email) {
            let templateId = '';
            let params = {
                user_name: order.shipping_details.firstName || 'Customer',
                user_email: order.shipping_details.email,
                order_ref: order.order_ref,
                amount: order.amount,
                tracking_number: extraData.tracking_number || 'FF-STANDARD',
                delivery_code: extraData.delivery_code || ''
            };

            // Status Template Mapping
            if (status === 'confirmed') templateId = 'template_ui3k5e2';
            else if (status === 'shipped') templateId = 'YOUR_SHIPPED_TEMPLATE_ID'; // Replace with yours
            else if (status === 'delivered') templateId = 'template_delivered';
            else if (status === 'cancelled') templateId = 'YOUR_CANCELLED_TEMPLATE_ID'; // Replace with yours

            if (templateId) {
                await emailjs.send('service_bo8ugyi', templateId, params);
            }
        }

        // Final UI Feedback
        if (window.showToast) window.showToast(`Order marked as ${status}`);
        else alert(`Order ${status} successfully.`);

        window.fetchOrders('all'); // Refresh the table list

    } catch (err) {
        console.error("Critical Admin Error:", err);
        alert("Operation Failed: " + err.message);
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = originalContent;
        }
    }
}

/**
 * Modal "Confirm" Button Logic
 */
/**
 * Modal "Confirm" Button Logic (Updated for FF-Reference Links)
 */
/**
 * Modal "Confirm" Button Logic (Fixed for FF-Reference Links)
 */
document.getElementById('confirmShipBtn').onclick = async function() {
    const riderName = document.getElementById('modalRiderName').value;
    const riderPhoneRaw = document.getElementById('modalRiderPhone').value;
    const tracking = document.getElementById('modalTracking').value;
    const btn = this;

    if (!riderName || !riderPhoneRaw) return alert("Rider name and phone are required.");

    const riderPhone = riderPhoneRaw.replace(/[^0-9]/g, '');
    btn.disabled = true;
    const originalText = btn.innerText;
    btn.innerHTML = `<span class="animate-spin h-4 w-4 border-2 border-black/20 border-t-black rounded-full"></span>`;

    try {
        // 1. Get the FF-Ref from Supabase using the ID
        const { data: order, error: fetchErr } = await supabase
            .from('orders')
            .select('order_ref')
            .eq('id', currentOrderToShip)
            .single();

        if (fetchErr) throw fetchErr;

        const deliveryCode = Math.floor(1000 + Math.random() * 9000).toString();

        // 2. Process the update in DB
        await processStatusUpdate(currentOrderToShip, 'shipped', {
            rider_name: riderName,
            rider_phone: riderPhone,
            tracking_number: tracking || 'FF-TRANSIT',
            delivery_code: deliveryCode
        });

        // 3. Build the specific Manifest Link
        const manifestLink = `https://fit-fashion-inky.vercel.app/dispatch.html?ref=${order.order_ref}`;

        // 4. Open WhatsApp
        const riderMsg = encodeURIComponent(
            `*FITFASHION DISPATCH*\n\n` +
            `Order: #${order.order_ref}\n` +
            `Rider: ${riderName}\n\n` +
            `Access Manifest Here:\n${manifestLink}`
        );
        
        window.open(`https://wa.me/${riderPhone}?text=${riderMsg}`, '_blank');

        closeShipModal();
    } catch (err) {
        alert("Dispatch Error: " + err.message);
    } finally {
        btn.disabled = false;
        btn.innerText = originalText;
    }
};

/**
 * Helper to copy manifest link (Add this to your utility functions)
 */
window.copyManifestLink = async (orderRef) => {
    const link = `https://fit-fashion-inky.vercel.app/dispatch.html?ref=${orderRef}`;
    await navigator.clipboard.writeText(link);
    if (window.showToast) window.showToast("Manifest link copied!");
    else alert("Link copied to clipboard");
};

/**
 * Close and Reset Modal
 */
function closeShipModal() {
    document.getElementById('shipModal').classList.add('hidden');
    document.getElementById('modalRiderName').value = '';
    document.getElementById('modalRiderPhone').value = '';
    document.getElementById('modalTracking').value = '';
}

// --- 4. INVENTORY DEPLOYMENT ---
document.addEventListener('DOMContentLoaded', function() {
    const productForm = document.getElementById('productForm');
    if (productForm) {
        productForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = e.target.querySelector('button[type="submit"]');
            if (!btn) return;
            
            const originalText = btn.innerText;
            btn.innerText = "DEPLOYING...";
            btn.disabled = true;

            try {
                const name = document.getElementById('p-name')?.value;
                const price = document.getElementById('p-price')?.value;
                const image_url = document.getElementById('p-image')?.value;
                const description = document.getElementById('p-desc')?.value;

                if (!name || !price) {
                    alert("Name and price are required");
                    return;
                }

                const { error } = await supabase.from('products').insert([{
                    name,
                    price: parseInt(price),
                    image_url: image_url || null,
                    description: description || null
                }]);

                if (error) {
                    alert("System Error: Check console");
                    console.error(error);
                } else {
                    alert("Product successfully deployed to inventory.");
                    e.target.reset();
                }
            } catch (err) {
                console.error("Product insert error:", err);
                alert("Error adding product");
            } finally {
                btn.innerText = originalText;
                btn.disabled = false;
            }
        });
    }
});

// --- 6. UTILS ---
window.handleLogout = async () => {
    try {
        await supabase.auth.signOut();
        window.location.href = "login.html";
    } catch (err) {
        console.error("Logout error:", err);
    }
};

// Global Nav Access
window.showSection = (section) => {
    const sections = ['orders', 'products', 'mail', 'support'];
    
    sections.forEach(id => {
        const sec = document.getElementById(id + 'Section');
        const nav = document.getElementById('nav-' + id);
        
        if (sec) sec.classList.add('hidden');
        if (nav) nav.classList.remove('active');
    });
    
    const targetSec = document.getElementById(section + 'Section');
    const targetNav = document.getElementById('nav-' + section);
    
    if (targetSec) targetSec.classList.remove('hidden');
    if (targetNav) targetNav.classList.add('active');
};
// Initialize on load
document.addEventListener('DOMContentLoaded', initAdmin);