import { createClient } from "https://esm.sh/@supabase/supabase-js"

const supabase = createClient(
    "https://hjghemoxbyexeemwpjrx.supabase.co",
    "sb_publishable_lByAZQ0ZtFEYN9_G13E7Tg_e4RXrQG6"
);

// --- 1. SECURITY & INITIALIZATION ---
async function initAdmin() {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    // Safety Check: Ensure the user is actually you
    if (!user || error || user.email !== "afadunmiye@gmail.com") {
        console.error("Access Denied: Restricted to Master Admin");
        window.location.href = "login.html"; 
        return;
    }

    // Initialize all data
    fetchOrders();
    fetchTickets(); 
    initChart();

    // Real-time listener for Support Tickets
    supabase
      .channel('admin-updates')
      .on('postgres_changes', { event: '*', table: 'support_tickets' }, () => {
          console.log("Change detected in tickets...");
          fetchTickets();
      })
      .subscribe();
}

// --- 2. ORDER MANAGEMENT ---
async function fetchOrders() {
    const { data: orders, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Fetch Error:", error);
        return;
    }

    const tbody = document.getElementById('orderTableBody');
    tbody.innerHTML = orders.map(order => `
        <tr class="hover:bg-yellow-900/5 transition-colors border-b border-zinc-900/50">
            <td class="px-8 py-6 text-zinc-500 font-mono">#${order.order_ref}</td>
            <td class="px-8 py-6 text-white font-medium">
                ${order.shipping_details.firstName} ${order.shipping_details.lastName}
            </td>
            <td class="px-8 py-6 text-yellow-500 text-right font-serif">${order.amount}</td>
            <td class="px-8 py-6 text-center">
                <select onchange="window.updateOrderStatus('${order.id}', this.value)" 
    class="bg-zinc-900 text-[8px] px-3 py-2 rounded-full text-yellow-600 outline-none border border-yellow-900/30 cursor-pointer">
    <option value="pending_transfer" ${order.status === 'pending_transfer' ? 'selected' : ''}>⏳ Pending</option>
    <option value="confirmed" ${order.status === 'confirmed' ? 'selected' : ''}>✅ Confirmed</option>
    <option value="shipped" ${order.status === 'shipped' ? 'selected' : ''}>📦 Shipped</option>
    <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>✨ Delivered</option> <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>❌ Cancelled</option>
</select>
            </td>
            <td class="px-8 py-6 text-right">
                <button onclick="window.viewUserDetails('${order.shipping_details.firstName}', '${order.shipping_details.phone || 'No Phone'}', '${order.shipping_details.address}', '${order.order_ref}')" 
                    class="text-white hover:text-yellow-400 transition-all border-b border-zinc-800 hover:border-yellow-600 pb-1">
                    Review
                </button>
            </td>
        </tr>
    `).join('');
}

// 1. Fetch and Display Tickets
async function fetchTickets() {
    // We select the ticket AND the profile information of the sender
    // Note: This requires a foreign key relationship between support_tickets and profiles
   const { data: tickets, error } = await supabase
        .from('support_tickets')
        .select(`
            *,
            profiles (
                email,
                full_name
            )
        `)
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error fetching tickets:", error);
        return;
    }

    const container = document.getElementById('admin-tickets-list');
    const openCount = tickets.filter(t => t.status === 'open').length;
    document.getElementById('ticket-count').innerText = `${openCount} NEW`;

    container.innerHTML = tickets.map(t => `
        <div class="p-8 border-b border-zinc-900 hover:bg-zinc-900/20 transition-all group">
            <div class="flex justify-between items-start">
                <div class="space-y-4 w-full">
                    <div class="flex items-center gap-4">
                        <div class="h-8 w-8 rounded-full bg-yellow-600/10 border border-yellow-600/20 flex items-center justify-center text-yellow-600 text-[10px] font-bold uppercase">
                            ${t.profiles?.full_name?.charAt(0) || 'U'}
                        </div>
                        <div>
                            <p class="text-[10px] text-white font-medium uppercase tracking-widest">
                                ${t.profiles?.full_name || 'Anonymous Client'}
                            </p>
                            <p class="text-[9px] text-zinc-600 font-mono italic">${t.profiles?.email || 'No email provided'}</p>
                        </div>
                    </div>

                    <div class="pl-12">
                        <div class="flex items-center gap-3 mb-2">
                            <span class="text-[8px] font-bold uppercase tracking-widest ${t.status === 'open' ? 'text-yellow-600' : 'text-zinc-500'}">● ${t.status}</span>
                            <span class="text-[9px] text-zinc-700 font-mono">${new Date(t.created_at).toLocaleString()}</span>
                        </div>
                        <h4 class="text-sm text-white font-medium uppercase tracking-wider mb-1">${t.subject}</h4>
                        <p class="text-xs text-zinc-400 max-w-xl leading-relaxed bg-zinc-950/50 p-4 rounded-xl border border-zinc-900">${t.message}</p>
                        
                        ${t.admin_note ? `
                            <div class="mt-4 p-4 bg-emerald-900/5 border-l-2 border-emerald-500">
                                <p class="text-[8px] uppercase text-emerald-500 font-bold mb-1 tracking-widest">Your Liaison Response:</p>
                                <p class="text-xs text-zinc-300 italic">"${t.admin_note}"</p>
                            </div>
                        ` : ''}
                    </div>
                </div>

                <div class="flex flex-col gap-2">
                    <button onclick="openReplyModal('${t.id}', '${t.message.replace(/'/g, "\\'")}')" 
                            class="text-[9px] uppercase tracking-[0.2em] bg-white text-black px-6 py-2 rounded hover:bg-yellow-600 transition-all">
                        Reply
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// 2. Reply Functionality
window.openReplyModal = (id, message) => {
    window.currentTicketId = id;
    document.getElementById('original-message').innerText = `"${message}"`;
    document.getElementById('replyModal').classList.remove('hidden');
};

window.closeReplyModal = () => {
    document.getElementById('replyModal').classList.add('hidden');
};

document.getElementById('sendReplyBtn').addEventListener('click', async () => {
    const response = document.getElementById('adminResponseText').value;
    if (!response) return alert("Response cannot be empty");

    const { error } = await supabase
        .from('support_tickets')
        .update({ 
            admin_note: response, 
            status: 'resolved' // Automatically marks as resolved when you reply
        })
        .eq('id', window.currentTicketId);

    if (!error) {
        alert("Liaison response sent.");
        closeReplyModal();
        document.getElementById('adminResponseText').value = '';
        fetchTickets(); // Refresh the list
    } else {
        alert("Error sending response.");
    }
});

// Initial load
fetchTickets();

window.updateOrderStatus = async (id, status) => {
    // 1. Fetch order details to get customer info
    const { data: order } = await supabase.from('orders').select('*').eq('id', id).single();
    let trackingNum = null;

    // Inside your updateOrderStatus function in admin.js
// Inside your updateOrderStatus function in admin.js
if (status === 'shipped') {
    const riderPhone = prompt("Enter Rider's WhatsApp Number (with country code, e.g., 23480123...):");
    const trackingNum = prompt("Enter Waybill Number (optional):");

    if (riderPhone) {
        const dispatchLink = `https://fit-fashion-inky.vercel.app/dispatch.html?ref=${order.order_ref}`;
        
        const riderMsg = window.encodeURIComponent(
            `*FITFASHION DISPATCH ASSIGNMENT*\n\n` +
            `Order: #${order.order_ref}\n` +
            `Customer: ${order.shipping_details.firstName}\n\n` +
            `VIEW DELIVERY DETAILS & MAP:\n${dispatchLink}\n\n` +
            `Please confirm once picked up.`
        );
        
        // This opens WhatsApp directly to the rider's chat
        window.open(`https://wa.me/${riderPhone}?text=${riderMsg}`, '_blank');
    }
}

    // 3. Update the Database
    const updateData = { status };
    if (trackingNum) updateData.tracking_number = trackingNum;

    const { error } = await supabase.from('orders').update(updateData).eq('id', id);
    
    if (error) {
        alert("Error updating status");
        console.error(error);
    } else {
        // 4. Trigger specific EmailJS templates based on status
        try {
            if (status === 'confirmed') {
                // Payment Verified Template
                await emailjs.send('service_bo8ugyi', 'template_ui3k5e2', {
                    user_name: order.shipping_details.firstName,
                    user_email: order.shipping_details.email,
                    order_ref: order.order_ref,
                    amount: order.amount
                });
                alert("Confirmed: Payment receipt sent.");
            } 
            
            else if (status === 'shipped') {
                // Shipped Template (Make sure you create a new template ID for this in EmailJS)
                await emailjs.send('service_bo8ugyi', 'YOUR_SHIPPED_TEMPLATE_ID', {
                    user_name: order.shipping_details.firstName,
                    user_email: order.shipping_details.email,
                    order_ref: order.order_ref,
                    tracking_number: trackingNum
                });
                alert("Shipped: Tracking details sent.");
            } 

            else if (status === 'delivered') {
                await emailjs.send('service_bo8ugyi', 'template_delivered', {
                    user_name: order.shipping_details.firstName,
                    user_email: order.shipping_details.email,
                    order_ref: order.order_ref,
                    tracking_number: trackingNum
                });
                alert("Delivered: Completion email sent to client.");
            }
            
            else if (status === 'cancelled') {
                // Cancelled Template
                await emailjs.send('service_bo8ugyi', 'YOUR_CANCELLED_TEMPLATE_ID', {
                    user_name: order.shipping_details.firstName,
                    user_email: order.shipping_details.email,
                    order_ref: order.order_ref
                });
                alert("Cancelled: Notification sent.");
            }
        } catch (mailErr) {
            console.error("Email failed but DB updated:", mailErr);
            alert("Status updated in DB, but email failed to send.");
        }

        fetchOrders(); 
    }
};

// --- 3. MODAL & CLIENT DOSSIER ---
window.viewUserDetails = (name, phone, address, orderId) => {
    const content = document.getElementById('modalContent');
    content.innerHTML = `
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-8 border-l border-yellow-900/30 pl-6">
            <div class="space-y-1"><p class="text-[9px] text-zinc-600 uppercase">Client Name</p><p class="text-white text-sm">${name}</p></div>
            <div class="space-y-1"><p class="text-[9px] text-zinc-600 uppercase">Order Ref</p><p class="text-yellow-600 font-mono text-sm">${orderId}</p></div>
            <div class="sm:col-span-2 space-y-4">
                <div class="space-y-1"><p class="text-[9px] text-zinc-600 uppercase">Shipping Address</p><p class="text-white text-sm leading-relaxed">${address}</p></div>
                <div class="flex justify-between items-center">
                    <div class="space-y-1"><p class="text-[9px] text-zinc-600 uppercase">Contact</p><p class="text-white text-sm">${phone}</p></div>
                    <button onclick="window.prepareDirectMail('${phone}', '${name}')" class="px-6 py-2 bg-yellow-600 text-black text-[8px] font-bold uppercase tracking-widest rounded-full">Contact Liaison</button>
                </div>
            </div>
        </div>
    `;
    document.getElementById('userModal').classList.remove('hidden');
};

window.prepareDirectMail = (phone, name) => {
    document.getElementById('userModal').classList.add('hidden');
    window.showSection('mail');
    document.getElementById('mailSubject').value = `Order Update: ${name}`;
    document.getElementById('mailContent').value = `Hello ${name}, regarding your order...`;
    document.getElementById('mailContent').focus();
};

// --- 4. INVENTORY DEPLOYMENT ---
document.getElementById('productForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    const originalText = btn.innerText;
    btn.innerText = "DEPLOYING...";
    btn.disabled = true;

    const name = document.getElementById('p-name').value;
    const price = document.getElementById('p-price').value;
    const image_url = document.getElementById('p-image').value;
    const description = document.getElementById('p-desc').value;

    const { error } = await supabase.from('products').insert([{
        name,
        price: parseInt(price),
        image_url,
        description
    }]);

    if (error) {
        alert("System Error: Check console");
        console.error(error);
    } else {
        alert("Product successfully deployed to inventory.");
        e.target.reset();
    }
    
    btn.innerText = originalText;
    btn.disabled = false;
});

// --- 5. ANALYTICS CHART ---
function initChart() {
    const ctx = document.getElementById('revenueChart').getContext('2d');
    const goldGrad = ctx.createLinearGradient(0, 0, 0, 300);
    goldGrad.addColorStop(0, 'rgba(202, 138, 4, 0.3)');
    goldGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'],
            datasets: [{
                label: 'Revenue',
                data: [450000, 620000, 580000, 890000, 750000, 1200000, 1500000],
                borderColor: '#ca8a04',
                borderWidth: 2,
                pointBackgroundColor: '#ca8a04',
                tension: 0.4,
                fill: true,
                backgroundColor: goldGrad
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { grid: { color: '#18181b' }, ticks: { color: '#52525b', font: { size: 9 } } },
                x: { grid: { display: false }, ticks: { color: '#52525b', font: { size: 9 } } }
            }
        }
    });
}

// --- 6. UTILS ---
window.handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "login.html";
};

// Global Nav Access
// Change from: function showSection(section) { ... }
// To:
window.showSection = (section) => {
    // List all possible section IDs
    const sections = ['orders', 'products', 'mail', 'support'];
    
    sections.forEach(id => {
        const sec = document.getElementById(id + 'Section');
        const nav = document.getElementById('nav-' + id);
        
        if (sec) sec.classList.add('hidden');
        if (nav) nav.classList.remove('active');
    });
    
    // Show the targeted section
    const targetSec = document.getElementById(section + 'Section');
    const targetNav = document.getElementById('nav-' + section);
    
    if (targetSec) targetSec.classList.remove('hidden');
    if (targetNav) targetNav.classList.add('active');
};

// showSection();

document.addEventListener('DOMContentLoaded', initAdmin);