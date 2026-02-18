import { createClient } from "https://esm.sh/@supabase/supabase-js"

const supabase = createClient("https://hjghemoxbyexeemwpjrx.supabase.co", "sb_publishable_lByAZQ0ZtFEYN9_G13E7Tg_e4RXrQG6");

async function initProfile() {
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (!user || authError) {
        window.location.href = "login.html";
        return;
    }

    // Set UI Details
    document.getElementById('user-email').innerText = user.email;
    document.getElementById('member-since').innerText = new Date(user.created_at).toLocaleDateString('en-GB', {
        month: 'long', year: 'numeric'
    });

    fetchUserOrders(user.id);
}

async function fetchUserOrders(userId) {
    const { data: orders, error } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error fetching orders:", error);
        return;
    }

    const orderContainer = document.getElementById('order-list');
    document.getElementById('total-orders-count').innerText = orders.length;

    if (orders.length === 0) {
        orderContainer.innerHTML = `<p class="text-zinc-500 text-sm">No transactions found.</p>`;
        return;
    }

    // ... inside fetchUserOrders function ...

orderContainer.innerHTML = orders.map(order => {
    const statusColors = {
        'pending_transfer': 'text-yellow-600',
        'confirmed': 'text-emerald-500',
        'shipped': 'text-blue-400',
        'cancelled': 'text-red-500',
        'delivered': 'text-green-500'
    };

    const { address, city, phone } = order.shipping_details;
    
    // Status Logic Gates
    const isShipped = order.status === 'shipped';
    const isPending = order.status === 'pending_transfer';

    return `
        <div class="bg-zinc-950 border border-zinc-900 rounded-xl overflow-hidden hover:border-zinc-700 transition-all group mb-6">
            <div class="p-5 border-b border-zinc-900 flex justify-between items-center bg-zinc-900/30">
                <div>
                    <span class="text-[10px] text-zinc-500 font-mono tracking-tighter">REF: ${order.order_ref}</span>
                    <p class="text-xs text-white mt-1">${new Date(order.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                </div>
                <div class="text-right">
                    <span class="text-[9px] uppercase tracking-widest block mb-1 text-zinc-500">Status</span>
                    <span class="text-[10px] uppercase font-bold ${statusColors[order.status]}">${order.status.replace('_', ' ')}</span>
                </div>
            </div>

            <div class="p-6">
${isShipped ? `
    <div class="mb-4 p-5 bg-blue-500/5 border border-blue-500/20 rounded-xl">
        <div class="flex items-center gap-3 mb-4">
            <div class="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <p class="text-[10px] text-blue-500 font-bold uppercase tracking-[0.2em]">Package In Transit</p>
        </div>
        
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
            <div>
                <p class="text-[9px] text-zinc-600 uppercase tracking-widest mb-1">Waybill Reference</p>
                <p class="text-sm text-white font-mono">${order.tracking_number || 'FF-PENDING'}</p>
            </div>
            
            <div class="flex gap-2 w-full sm:w-auto">
                <a href="https://wa.me/2349073369485?text=Update on ${order.order_ref}" 
                   class="flex-1 text-center px-4 py-2 bg-zinc-900 border border-zinc-800 text-white text-[9px] font-bold uppercase rounded-lg">
                    Contact Support
                </a>
                <button onclick="window.shareWithRider('${order.order_ref}')"
                   class="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-[9px] font-bold uppercase rounded-lg transition-all flex items-center justify-center gap-2">
                    Share with Rider
                </button>
            </div>
        </div>
    </div>

    <div class="p-5 bg-yellow-600/10 border border-yellow-600/30 rounded-xl gold-glow">
        <div class="flex items-center justify-between mb-3">
            <p class="text-[10px] text-yellow-500 font-black uppercase tracking-[0.2em]">Handshake Verification</p>
            <svg class="w-4 h-4 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
            </svg>
        </div>
        
        <div class="flex items-center gap-6">
            <div class="flex-1">
                <p class="text-[11px] text-zinc-400 leading-tight">
                    Provide this code to the rider <span class="text-white font-bold italic">only after</span> you have received and confirmed your package.
                </p>
            </div>
            <div class="bg-black/40 px-6 py-3 rounded-lg border border-yellow-600/50">
                <p class="text-2xl font-mono font-black tracking-[0.3em] text-white">
                    ${order.delivery_code || '----'}
                </p>
            </div>
        </div>
    </div>
` : ''}
                ${isPending ? `
                    <div class="mb-8 p-5 bg-yellow-600/5 border border-yellow-600/20 rounded-xl flex justify-between items-center">
                        <div>
                            <div class="flex items-center gap-2 mb-1">
                                <p class="text-[10px] text-yellow-600 font-bold uppercase tracking-[0.2em]">Awaiting Transfer</p>
                            </div>
                            <p class="text-[11px] text-zinc-400">Complete payment to secure your reservation.</p>
                        </div>
                        <button onclick="window.showPaymentInfo('${order.order_ref}', '${order.amount}')" 
                                class="px-5 py-2 bg-yellow-600 hover:bg-yellow-500 text-black text-[9px] font-bold uppercase tracking-widest rounded-lg transition-all shadow-lg shadow-yellow-600/10">
                            Complete Payment
                        </button>
                    </div>
                ` : ''}

                <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div class="space-y-4">
                        <div>
                            <p class="text-[9px] uppercase text-zinc-600 tracking-widest mb-2">Shipment Destination</p>
                            <p class="text-sm text-zinc-300 leading-relaxed">${address}, ${city}</p>
                            <p class="text-[11px] text-zinc-500 mt-1">Contact: ${phone}</p>
                        </div>
                    </div>

                    <div class="flex flex-col justify-between">
                        <div class="text-left md:text-right">
                            <p class="text-[9px] uppercase text-zinc-600 tracking-widest mb-2">Total Value</p>
                            <p class="text-2xl font-serif text-white">${order.amount}</p>
                        </div>
                        
                        <div class="mt-4 pt-4 border-t border-zinc-900 flex justify-between md:justify-end gap-6 items-center">
                             <button onclick="window.openSupport('${order.order_ref}')" 
        class="text-[9px] uppercase tracking-widest text-zinc-500 hover:text-white transition-colors">
   Support
</button>
                             <button onclick='window.showInvoice(${JSON.stringify(order)})' 
                                     class="px-5 py-2 bg-zinc-900 border border-zinc-800 hover:bg-white hover:text-black text-white text-[9px] uppercase tracking-widest transition-all rounded-lg">
                                View Invoice
                             </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}).join('');}

window.showInvoice = (order) => {
    const modal = document.getElementById('invoiceModal');
    const content = document.getElementById('invoiceContent');

    content.innerHTML = `
        <div class="flex justify-between items-start">
            <div>
                <h2 class="text-xl tracking-[0.4em] font-light">FITFASHION</h2>
                <p class="text-[9px] text-zinc-600 mt-2 uppercase tracking-widest">Transaction Receipt</p>
            </div>
            <div class="text-right">
                <p class="text-[10px] text-zinc-500 font-mono">#${order.order_ref}</p>
                <p class="text-[10px] text-zinc-500">${new Date(order.created_at).toLocaleDateString()}</p>
            </div>
        </div>

        <div class="pt-8 border-t border-zinc-900 grid grid-cols-2 gap-8">
            <div>
                <p class="text-[9px] uppercase text-zinc-600 tracking-widest mb-2">Billed To</p>
                <p class="text-xs text-white">${order.shipping_details.firstName} ${order.shipping_details.lastName}</p>
                <p class="text-xs text-zinc-400 mt-1">${order.shipping_details.address}</p>
                <p class="text-xs text-zinc-400">${order.shipping_details.phone}</p>
            </div>
            <div class="text-right">
                <p class="text-[9px] uppercase text-zinc-600 tracking-widest mb-2">Payment Method</p>
                <p class="text-xs text-white">Bank Transfer</p>
                <p class="text-[10px] uppercase text-emerald-500 font-bold mt-1">${order.status.replace('_', ' ')}</p>
            </div>
        </div>

        <div class="py-8">
            <div class="flex justify-between items-center py-4 border-b border-zinc-900">
                <span class="text-xs text-zinc-300">Boutique Selection (Global)</span>
                <span class="text-sm font-serif text-white">${order.amount}</span>
            </div>
            </div>

        <div class="pt-4 flex justify-between items-center">
            <p class="text-[9px] text-zinc-600 italic">Thank you for your acquisition.</p>
            <div class="text-right">
                <p class="text-[9px] uppercase text-zinc-600 mb-1">Total Paid</p>
                <p class="text-xl font-serif text-yellow-600">${order.amount}</p>
            </div>
        </div>
    `;

    modal.classList.remove('hidden');
};

window.downloadInvoice = () => {
    const area = document.getElementById('invoiceCaptureArea');
    const orderRef = document.querySelector('#invoiceContent font-mono')?.innerText || "Order";

    // Show a "Processing" state on the button if you like
    const btn = document.querySelector('button[onclick="downloadInvoice()"]');
    const originalText = btn.innerText;
    btn.innerText = "GENERATING...";

    html2canvas(area, {
        backgroundColor: "#09090b", // Ensures the background isn't transparent
        scale: 2, // Higher quality
        logging: false,
        useCORS: true
    }).then(canvas => {
        const image = canvas.toDataURL("image/png");
        const link = document.createElement('a');
        link.download = `FitFashion-Receipt-${orderRef}.png`;
        link.href = image;
        link.click();
        
        btn.innerText = originalText;
    });
};

window.shareWithRider = (ref) => {
    const dispatchLink = `https://fit-fashion-inky.vercel.app/dispatch.html?ref=${ref}`;
    const shareMsg = window.encodeURIComponent(
        `*FITFASHION DELIVERY MANIFEST*\n` +
        `I am expecting a delivery. Here are my details and location:\n\n` +
        `${dispatchLink}`
    );
    
    // Opens WhatsApp contact selector
    window.open(`https://wa.me/?text=${shareMsg}`, '_blank');
};

window.showPaymentInfo = (ref, amount) => {
    document.getElementById('modal-pay-ref').innerText = ref;
    document.getElementById('modal-pay-amount').innerText = amount;
    document.getElementById('paymentModal').classList.remove('hidden');
}   

window.openSupport = (orderRef = '') => {
    document.getElementById('ticketSubject').value = orderRef ? `Inquiry regarding #${orderRef}` : '';
    document.getElementById('supportModal').classList.remove('hidden');
};

document.getElementById('supportForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    
    const ticket = {
        user_id: user.id,
        subject: document.getElementById('ticketSubject').value,
        message: document.getElementById('ticketMessage').value,
        status: 'open'
    };

    const { error } = await supabase.from('support_tickets').insert([ticket]);

    if (!error) {
        alert("Inquiry received. Our liaison will contact you shortly.");
        document.getElementById('supportModal').classList.add('hidden');
    } else {
        alert("Submission failed. Please try WhatsApp.");
    }
});

window.handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "login.html";
};

document.addEventListener('DOMContentLoaded', initProfile);