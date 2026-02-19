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
        <div class="flex items-center justify-between mb-6">
            <div class="flex items-center gap-3">
                <div class="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <p class="text-[10px] text-blue-500 font-bold uppercase tracking-[0.2em]">Package In Transit</p>
            </div>
            <p class="text-[9px] text-zinc-600 font-mono">${order.tracking_number || 'FF-TRANSIT'}</p>
        </div>

        <div class="flex items-center gap-4 mb-6 bg-black/20 p-3 rounded-xl border border-blue-500/10">
            <div class="w-10 h-10 bg-blue-500/10 rounded-full flex items-center justify-center border border-blue-500/20">
                <svg class="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
            </div>
            <div class="flex-1">
                <p class="text-[8px] text-zinc-500 uppercase tracking-widest mb-0.5">Assigned Rider</p>
                <p class="text-white text-xs font-bold uppercase tracking-wider">${order.rider_name || 'FitFashion Courier'}</p>
            </div>
            <div class="flex gap-2">
                <a href="tel:${order.rider_phone}" class="p-2 bg-zinc-800 rounded-lg hover:bg-zinc-700 transition-all">
                    <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
                </a>
                <a href="https://wa.me/${order.rider_phone?.replace(/\+/g, '')}?text=Hello ${order.rider_name}, checking on my FitFashion order #${order.order_ref}" 
                   class="p-2 bg-emerald-600/20 rounded-lg hover:bg-emerald-600 transition-all group">
                    <svg class="w-4 h-4 text-emerald-500 group-hover:text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.414 0 0 5.415 0 12.05c0 2.122.554 4.197 1.604 6.033L0 24l6.135-1.61a11.802 11.802 0 005.911 1.603h.005c6.635 0 12.05-5.416 12.05-12.051a11.777 11.777 0 00-3.535-8.525z"/></svg>
                </a>
            </div>
        </div>

        <a href="https://wa.me/2349073369485?text=Update on Order ${order.order_ref}" 
           class="block w-full text-center py-3 bg-zinc-900 border border-zinc-800 text-zinc-400 text-[9px] font-bold uppercase tracking-[0.2em] rounded-xl hover:text-white transition-all">
            Contact Support Liaison
        </a>
    </div>

    <div class="p-5 bg-yellow-600/10 border border-yellow-600/30 rounded-xl gold-glow">
        <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-2">
                <svg class="w-4 h-4 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                </svg>
                <p class="text-[10px] text-yellow-500 font-black uppercase tracking-[0.2em]">Secure Handshake</p>
            </div>
            <span class="text-[8px] bg-yellow-500 text-black px-2 py-0.5 rounded-full font-bold uppercase tracking-tighter">Required</span>
        </div>
        
        <div class="flex items-center gap-4">
            <div class="flex-1">
                <p class="text-[11px] text-zinc-400 leading-tight">
                    Provide this code to <span class="text-white font-bold">${order.rider_name?.split(' ')[0] || 'the rider'}</span> only after you have confirmed your items.
                </p>
            </div>
            <div class="bg-black/60 px-5 py-3 rounded-xl border border-yellow-600/40 shadow-inner">
                <p class="text-2xl font-mono font-black tracking-[0.2em] text-white">
                    ${order.delivery_code || '----'}
                </p>
            </div>
        </div>
    </div>
` : ''}
${isPending ? `
    <div class="mb-8 p-5 bg-yellow-600/5 border border-yellow-600/20 rounded-xl">
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
            <div class="flex items-start gap-4">
                <div class="mt-1 flex-shrink-0">
                    <div class="relative">
                        <div class="w-3 h-3 bg-yellow-600 rounded-full animate-ping absolute opacity-20"></div>
                        <div class="w-3 h-3 bg-yellow-600 rounded-full relative border-2 border-black"></div>
                    </div>
                </div>
                <div>
                    <p class="text-[10px] text-yellow-600 font-black uppercase tracking-[0.2em] mb-1">Awaiting Transfer</p>
                    <p class="text-[11px] text-zinc-400 leading-tight">Secure your order by completing the transfer below.</p>
                </div>
            </div>
            
            <button onclick="window.showPaymentInfo('${order.order_ref}', '${order.amount}')" 
                    class="w-full sm:w-auto px-4 py-2 bg-zinc-900 border border-zinc-800 text-white text-[9px] font-bold uppercase tracking-widest rounded-lg hover:bg-zinc-800 transition-all">
                View Full Details
            </button>
        </div>

        <div class="grid grid-cols-2 gap-2 border-t border-yellow-600/10 pt-4">
            <button onclick="copyToClipboard('1234567890', 'Account Number')" 
                class="flex flex-col items-center justify-center p-3 bg-black/40 border border-zinc-800 rounded-xl hover:border-yellow-600/50 transition-all group">
                <p class="text-[7px] text-zinc-500 uppercase tracking-widest mb-1 group-hover:text-yellow-600">Account No.</p>
                <p class="text-xs text-white font-mono font-bold tracking-widest">1234567890</p>
            </button>

            <button onclick="copyToClipboard('${order.order_ref}', 'Reference')" 
                class="flex flex-col items-center justify-center p-3 bg-black/40 border border-zinc-800 rounded-xl hover:border-yellow-600/50 transition-all group">
                <p class="text-[7px] text-zinc-500 uppercase tracking-widest mb-1 group-hover:text-yellow-600">Reference</p>
                <p class="text-xs text-white font-mono font-bold tracking-widest uppercase">${order.order_ref}</p>
            </button>
        </div>
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

// Add this to your script
window.copyToClipboard = (text, label) => {
    if (!navigator.clipboard) {
        // Fallback for older browsers/non-HTTPS
        const textArea = document.createElement("textarea");
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            showToast(`${label} copied!`);
        } catch (err) {
            console.error('Fallback copy failed', err);
        }
        document.body.removeChild(textArea);
        return;
    }

    navigator.clipboard.writeText(text).then(() => {
        // This triggers your toast notification
        if (typeof showToast === 'function') {
            showToast(`${label} copied to clipboard`);
        } else {
            // Simple fallback if you don't have a toast function yet
            alert(`${label} copied!`);
        }
    }).catch(err => {
        console.error('Could not copy text: ', err);
    });
};

window.showToast = (message) => {
    const toast = document.getElementById("toast");
    toast.innerText = message;
    toast.className = "show";
    setTimeout(() => { toast.className = toast.className.replace("show", ""); }, 3000);
};

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