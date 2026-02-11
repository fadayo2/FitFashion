import { createClient } from "https://esm.sh/@supabase/supabase-js"

const supabase = createClient(
    "https://hjghemoxbyexeemwpjrx.supabase.co",
    "sb_publishable_lByAZQ0ZtFEYN9_G13E7Tg_e4RXrQG6"
);

// --- 1. SECURITY & INITIALIZATION ---
async function initAdmin() {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    // 1. Check if logged in
    if (!user || error) {
        window.location.href = "login.html";
        return;
    }

    // 2. HARD CHECK: Is this the admin?
    const ADMIN_EMAIL = "afadunmiye@gmail.com"; // Your specific email
    
    if (user.email !== ADMIN_EMAIL) {
        console.error("Access Denied: Unauthorized User.");
        // Redirect to a "Not Authorized" page or back to home
        document.body.innerHTML = `
            <div style="background:#000; color:#fff; height:100vh; display:flex; align-items:center; justify-content:center; flex-direction:column; font-family:serif;">
                <h1 style="letter-spacing:5px;">ACCESS DENIED</h1>
                <p style="color:#52525b; font-size:12px; margin-top:10px;">Security Protocol 403: You do not have administrative clearance.</p>
                <a href="index.html" style="color:#ca8a04; margin-top:20px; text-decoration:none; border:1px solid #ca8a04; padding:10px 20px;">Return Home</a>
            </div>
        `;
        return;
    }

        // Add this inside initAdmin()
supabase
  .channel('admin-order-updates')
  .on('postgres_changes', { event: 'INSERT', table: 'orders' }, payload => {
      console.log('New order received!', payload.new);
      fetchOrders(); // Refresh the list automatically
  })
  .subscribe();

    // 3. If it is the admin, proceed
    fetchOrders();
    initChart();
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
                    <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>❌ Cancelled</option>
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

window.updateOrderStatus = async (id, status) => {
    // 1. Get the order details first to get the customer's email
    const { data: order } = await supabase.from('orders').select('*').eq('id', id).single();

    const { error } = await supabase.from('orders').update({ status }).eq('id', id);
    
    if (error) {
        alert("Error updating status");
    } else {
        // 2. If confirmed, send the "Payment Received" email via EmailJS
        if (status === 'confirmed') {
            emailjs.send('service_bo8ugyi', 'template_ui3k5e2', {
                user_name: order.shipping_details.firstName,
                user_email: order.shipping_details.email,
                order_ref: order.order_ref
            });
            alert("Status updated and confirmation email sent!");
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
window.showSection = (section) => {
    ['orders', 'products', 'mail'].forEach(id => {
        document.getElementById(id + 'Section').classList.add('hidden');
        document.getElementById('nav-' + id).classList.remove('active');
    });
    document.getElementById(section + 'Section').classList.remove('hidden');
    document.getElementById('nav-' + section).classList.add('active');
};

document.addEventListener('DOMContentLoaded', initAdmin);