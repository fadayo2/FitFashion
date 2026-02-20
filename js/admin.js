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
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session) {
            window.location.href = "../pages/login.html";
            return;
        }

        const user = session.user;
        const ADMIN_LIST = [
            "afadunmiye@gmail.com",
            "brosdipo@gmail.com"
        ];

        const isAuthorized = ADMIN_LIST.map(e => e.toLowerCase()).includes(user.email.toLowerCase());

        if (!isAuthorized) {
            console.error("Access denied for:", user.email);
            window.location.href = "../pages/login.html";
            return;
        }

        console.log("Welcome Admin:", user.email);
        window.fetchOrders('all');
        updateStats();

    } catch (err) {
        console.error("Init error:", err);
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

// --- VIEW FULL DOSSIER ---
window.viewFullDossier = (orderRef) => {
    const dossierUrl = `../pages/dossier.html?ref=${orderRef}`;
    window.open(dossierUrl, '_blank');
};

let currentOrderToShip = null;

// --- UPDATE ORDER STATUS ---
window.updateOrderStatus = async (id, status) => {
    if (status === 'shipped') {
        currentOrderToShip = id;
        document.getElementById('shipModal').classList.remove('hidden');
        document.getElementById('modalRiderName').focus();
        return; 
    }
    
    await processStatusUpdate(id, status);
};

async function processStatusUpdate(id, status, extraData = {}) {
    const btn = document.querySelector(`button[onclick*="'${id}'"][onclick*="'${status}'"]`);
    const originalContent = btn ? btn.innerHTML : status;

    if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<span class="animate-spin border-2 border-white/20 border-t-white rounded-full h-3 w-3 inline-block"></span>`;
    }

    try {
        const { data: order, error: fetchError } = await supabase
            .from('orders').select('*').eq('id', id).single();
        if (fetchError || !order) throw new Error("Order not found");

        const updateData = { status, ...extraData };
        const { error: updateError } = await supabase.from('orders').update(updateData).eq('id', id);
        if (updateError) throw updateError;

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

            if (status === 'confirmed') templateId = 'template_ui3k5e2';
            else if (status === 'shipped') templateId = 'YOUR_SHIPPED_TEMPLATE_ID';
            else if (status === 'delivered') templateId = 'template_delivered';
            else if (status === 'cancelled') templateId = 'YOUR_CANCELLED_TEMPLATE_ID';

            if (templateId) {
                await emailjs.send('service_bo8ugyi', templateId, params);
            }
        }

        if (window.showToast) window.showToast(`Order marked as ${status}`);
        else alert(`Order ${status} successfully.`);

        window.fetchOrders('all');

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

// --- SHIPPING MODAL CONFIRM ---
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
        const { data: order, error: fetchErr } = await supabase
            .from('orders')
            .select('order_ref')
            .eq('id', currentOrderToShip)
            .single();

        if (fetchErr) throw fetchErr;

        const deliveryCode = Math.floor(1000 + Math.random() * 9000).toString();

        await processStatusUpdate(currentOrderToShip, 'shipped', {
            rider_name: riderName,
            rider_phone: riderPhone,
            tracking_number: tracking || 'FF-TRANSIT',
            delivery_code: deliveryCode
        });

        const manifestLink = `https://fit-fashion-inky.vercel.app/dispatch.html?ref=${order.order_ref}`;

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

// --- UTILITIES ---
window.copyManifestLink = async (orderRef) => {
    const link = `https://fit-fashion-inky.vercel.app/dispatch.html?ref=${orderRef}`;
    await navigator.clipboard.writeText(link);
    if (window.showToast) window.showToast("Manifest link copied!");
    else alert("Link copied to clipboard");
};

function closeShipModal() {
    document.getElementById('shipModal').classList.add('hidden');
    document.getElementById('modalRiderName').value = '';
    document.getElementById('modalRiderPhone').value = '';
    document.getElementById('modalTracking').value = '';
}

// --- INVENTORY DEPLOYMENT ---
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

// --- LOGOUT ---
window.handleLogout = async () => {
    try {
        await supabase.auth.signOut();
        window.location.href = "login.html";
    } catch (err) {
        console.error("Logout error:", err);
    }
};

// --- NAVIGATION (support section removed) ---
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

    // Special handling for support
    if (section === 'support') {
        loadAdminSessions();
    }
};

// Initialize on load
document.addEventListener('DOMContentLoaded', initAdmin);