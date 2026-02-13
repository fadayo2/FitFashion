import { createClient } from "https://esm.sh/@supabase/supabase-js";

const supabase = createClient(
    "https://hjghemoxbyexeemwpjrx.supabase.co",
    "sb_publishable_lByAZQ0ZtFEYN9_G13E7Tg_e4RXrQG6"
);

const form = document.getElementById('supportForm');
const historyContainer = document.getElementById('ticketHistory');

// Load history on start
async function loadTickets() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return window.location.href = 'login.html';

    const { data: tickets, error } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    if (error) return console.error(error);

    if (!tickets || tickets.length === 0) {
        historyContainer.innerHTML = `<div class="text-center py-20"><p class="text-[10px] uppercase tracking-widest text-zinc-800">No active threads</p></div>`;
        return;
    }

    historyContainer.innerHTML = tickets.map(t => `
        <div class="ticket-card group space-y-6 relative">
            <div class="flex flex-col items-end">
                <div class="max-w-[85%] bg-zinc-900/50 border border-zinc-900 p-6 rounded-2xl rounded-tr-none relative shadow-xl">
                    <div class="flex justify-between gap-8 mb-3">
                        <span class="text-[8px] uppercase tracking-widest text-zinc-600">${new Date(t.created_at).toLocaleDateString()}</span>
                        <span class="text-[8px] uppercase tracking-widest ${t.status === 'open' ? 'text-yellow-600' : 'text-emerald-500'} font-bold">${t.status}</span>
                    </div>
                    <h4 class="text-[11px] text-white font-semibold mb-2 uppercase tracking-wider">${t.subject}</h4>
                    <p class="text-xs text-zinc-400 leading-relaxed font-light">${t.message}</p>
                    
                    ${t.status === 'open' ? `
                    <div class="action-btns opacity-0 flex gap-4 mt-4 pt-4 border-t border-zinc-800/50 transition-all duration-300">
                        <button onclick="window.editInquiry('${t.id}', '${t.message.replace(/'/g, "\\'")}')" class="text-[9px] uppercase tracking-widest text-zinc-500 hover:text-white">Edit</button>
                        <button onclick="window.deleteInquiry('${t.id}')" class="text-[9px] uppercase tracking-widest text-red-900 hover:text-red-500">Retract</button>
                    </div>
                    ` : ''}
                </div>
            </div>

            ${t.admin_note ? `
                <div class="flex flex-col items-start">
                    <div class="max-w-[85%] border-l border-yellow-600 pl-8 py-2">
                        <p class="text-[9px] uppercase text-yellow-600 tracking-[0.3em] mb-4 font-bold italic">Liaison Response</p>
                        <p class="text-sm text-white serif italic leading-relaxed">"${t.admin_note}"</p>
                        <p class="text-[8px] uppercase text-zinc-700 mt-4 tracking-widest">FITFASHION Atelier — Global Support</p>
                    </div>
                </div>
            ` : `
                <div class="flex items-center gap-4 text-[9px] text-zinc-800 italic px-6">
                    <div class="w-1.5 h-1.5 bg-zinc-900 rounded-full animate-pulse"></div>
                    Liaison is reviewing your inquiry...
                </div>
            `}
            <div class="h-[1px] bg-zinc-900/50 w-full mt-8"></div>
        </div>
    `).join('');
}

// Global Edit/Delete Functions
window.deleteInquiry = async (id) => {
    if (!confirm("Retract this inquiry? This cannot be undone.")) return;
    const { error } = await supabase.from('support_tickets').delete().eq('id', id);
    if (!error) loadTickets();
};

window.editInquiry = async (id, oldMsg) => {
    const newMsg = prompt("Update your inquiry:", oldMsg);
    if (!newMsg || newMsg === oldMsg) return;
    const { error } = await supabase.from('support_tickets').update({ message: newMsg }).eq('id', id);
    if (!error) loadTickets();
};

// Form Submission
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = document.getElementById('submitBtn');
    submitBtn.disabled = true;

    const { data: { user } } = await supabase.auth.getUser();
    const subject = document.getElementById('ticketSubject').value;
    const message = document.getElementById('ticketMessage').value;

    const { error } = await supabase.from('support_tickets').insert([{
        user_id: user.id,
        subject,
        message,
        status: 'open'
    }]);

    if (!error) {
        form.reset();
        loadTickets();
    }
    submitBtn.disabled = false;
});

loadTickets();