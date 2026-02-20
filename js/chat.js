import { createClient } from "https://esm.sh/@supabase/supabase-js";

// Initialize Supabase
const supabase = createClient(
    "https://hjghemoxbyexeemwpjrx.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhqZ2hlbW94YnlleGVlbXdwanJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5Nzg1MTksImV4cCI6MjA4NTU1NDUxOX0.N8_DlPNWXN733b0NrAg45-lN1NHMVJlDH63rDP9u86E"
);
window.supabase = supabase;

// ---------- Helper Functions ----------
let isSendingMessage = false;
let unreadCount = 0;          // for user unread messages
let userChannel = null;       // user realtime channel

function showToast(message, duration = 3000) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, duration);
}

function escapeHtml(unsafe) {
    return unsafe.replace(/[&<>"']/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        if (m === '"') return '&quot;';
        return '&#039;';
    });
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

// NEW: Update unread badge on chat button
function updateUnreadBadge(count) {
    const chatBtn = document.querySelector('.chat-button');
    if (!chatBtn) return;

    let badge = chatBtn.querySelector('.unread-badge');
    if (count > 0) {
        if (!badge) {
            badge = document.createElement('span');
            badge.className = 'unread-badge absolute -top-2 -right-2 min-w-[20px] h-5 bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1';
            chatBtn.style.position = 'relative';
            chatBtn.appendChild(badge);
        }
        badge.textContent = count > 9 ? '9+' : count;
    } else {
        if (badge) badge.remove();
    }
}

// ---------- User Chat Functions ----------
function toggleChat() {
    const chatWin = document.getElementById('chat-window');
    if (chatWin) {
        chatWin.classList.toggle('hidden');
        if (!chatWin.classList.contains('hidden')) {
            loadCurrentSession();
            // Reset unread count when chat is opened
            unreadCount = 0;
            updateUnreadBadge(0);
        }
    }
}

async function sendChatMessage() {
    if (isSendingMessage) return;
    
    const sendBtn = document.getElementById('send-chat-btn');
    const originalText = sendBtn?.innerHTML;
    
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
        
        if (sendBtn) {
            sendBtn.disabled = true;
            sendBtn.innerHTML = 'Sending...';
        }

        let sessionId = await getOrCreateActiveSession(user.id);

        const { error: insertError } = await supabase
            .from('chat_messages')
            .insert([{
                session_id: sessionId,
                sender_type: 'user',
                message: message,
                created_at: new Date().toISOString()
            }]);

        if (insertError) {
            console.error("Chat error:", insertError);
            showToast("Failed to send message");
            return;
        }

        appendMessageToUI('user', message);
        messageInput.value = '';
        showToast("Message sent");
        
    } catch (error) {
        console.error("Error in sendChatMessage:", error);
        showToast("An error occurred");
    } finally {
        isSendingMessage = false;
        if (sendBtn) {
            sendBtn.disabled = false;
            sendBtn.innerHTML = originalText || 'Send';
        }
    }
}

async function getOrCreateActiveSession(userId) {
    const { data: sessions, error } = await supabase
        .from('chat_sessions')
        .select('id')
        .eq('user_id', userId)
        .eq('status', 'active')
        .limit(1);

    if (error) throw error;

    if (sessions && sessions.length > 0) {
        return sessions[0].id;
    }

    const { data: newSession, error: insertError } = await supabase
        .from('chat_sessions')
        .insert([{
            user_id: userId,
            status: 'active',
            created_at: new Date().toISOString()
        }])
        .select('id')
        .single();

    if (insertError) throw insertError;
    return newSession.id;
}

async function loadCurrentSession() {
    try {
        const msgArea = document.getElementById('chat-messages');
        if (!msgArea) return;

        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) return;

        let sessionId = null;
        let sessionStatus = null;

        const { data: sessions, error: sessError } = await supabase
            .from('chat_sessions')
            .select('id, status')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (sessError) {
            console.error("Error loading sessions:", sessError);
            return;
        }

        if (!sessions || sessions.length === 0) {
            msgArea.innerHTML = `
                <div class="bg-zinc-900/80 p-4 rounded-2xl rounded-bl-none text-[11px] text-zinc-300 max-w-[85%] border border-zinc-800/50 mb-4">
                    <p class="text-[8px] text-yellow-600 uppercase mb-1 font-bold">FITFASHION</p>
                    Hello! How can we help you today?
                </div>
            `;
            return;
        }

        const active = sessions.find(s => s.status === 'active');
        if (active) {
            sessionId = active.id;
            sessionStatus = 'active';
        } else {
            sessionId = sessions[0].id;
            sessionStatus = sessions[0].status;
        }

        const { data: messages, error: msgError } = await supabase
            .from('chat_messages')
            .select('*')
            .eq('session_id', sessionId)
            .order('created_at', { ascending: true });

        if (msgError) {
            console.error("Error loading messages:", msgError);
            return;
        }

        msgArea.innerHTML = '';

        if (!messages || messages.length === 0) {
            msgArea.innerHTML = `
                <div class="bg-zinc-900/80 p-4 rounded-2xl rounded-bl-none text-[11px] text-zinc-300 max-w-[85%] border border-zinc-800/50 mb-4">
                    <p class="text-[8px] text-yellow-600 uppercase mb-1 font-bold">FITFASHION</p>
                    Hello! How can we help you today?
                </div>
            `;
        } else {
            messages.forEach(msg => {
                const sender = msg.sender_type === 'user' ? 'user' : 'admin';
                const time = formatTime(msg.created_at);
                if (sender === 'user') {
                    msgArea.innerHTML += `
                        <div class="bg-yellow-600/10 border border-yellow-600/20 p-4 rounded-2xl rounded-br-none text-[11px] text-white ml-auto max-w-[85%] mb-4">
                            ${escapeHtml(msg.message)}
                            <div class="text-[8px] text-zinc-500 mt-1">${time}</div>
                        </div>
                    `;
                } else {
                    msgArea.innerHTML += `
                        <div class="bg-zinc-900/80 p-4 rounded-2xl rounded-bl-none text-[11px] text-zinc-300 max-w-[85%] border border-zinc-800/50 mb-4">
                            <p class="text-[8px] text-yellow-600 uppercase mb-1 font-bold">Liaison</p>
                            ${escapeHtml(msg.message)}
                            <div class="text-[8px] text-zinc-600 mt-1">${time}</div>
                        </div>
                    `;
                }
            });
        }

        if (sessionStatus === 'closed') {
            msgArea.innerHTML += `
                <div class="text-center text-[10px] text-zinc-600 mt-2 mb-2">
                    — This session has ended —
                </div>
            `;
            showDownloadTranscriptButton(sessionId);
            // Hide input area when session is closed
            const inputArea = document.querySelector('.chat-input-area');
            if (inputArea) inputArea.style.display = 'none';
        } else {
            // Show input area if session is active
            const inputArea = document.querySelector('.chat-input-area');
            if (inputArea) inputArea.style.display = 'flex';
        }

        msgArea.scrollTop = msgArea.scrollHeight;
        
    } catch (error) {
        console.error("Error in loadCurrentSession:", error);
    }
}

function appendMessageToUI(sender, message, timestamp = new Date()) {
    const msgArea = document.getElementById('chat-messages');
    if (!msgArea) return;

    const time = formatTime(timestamp);
    const html = sender === 'user' 
        ? `<div class="bg-yellow-600/10 border border-yellow-600/20 p-4 rounded-2xl rounded-br-none text-[11px] text-white ml-auto max-w-[85%] mb-4">
            ${escapeHtml(message)}
            <div class="text-[8px] text-zinc-500 mt-1">${time}</div>
           </div>`
        : `<div class="bg-zinc-900/80 p-4 rounded-2xl rounded-bl-none text-[11px] text-zinc-300 max-w-[85%] border border-zinc-800/50 mb-4">
            <p class="text-[8px] text-yellow-600 uppercase mb-1 font-bold">Liaison</p>
            ${escapeHtml(message)}
            <div class="text-[8px] text-zinc-600 mt-1">${time}</div>
           </div>`;

    msgArea.innerHTML += html;
    msgArea.scrollTop = msgArea.scrollHeight;
}

// End session for user
async function endCurrentSession() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: sessions } = await supabase
            .from('chat_sessions')
            .select('id')
            .eq('user_id', user.id)
            .eq('status', 'active')
            .limit(1);

        if (!sessions || sessions.length === 0) {
            showToast("No active session");
            return;
        }

        const sessionId = sessions[0].id;

        const { error } = await supabase
            .from('chat_sessions')
            .update({ status: 'closed', closed_at: new Date().toISOString() })
            .eq('id', sessionId);

        if (error) throw error;

        showToast("Session ended");
        loadCurrentSession();
    } catch (error) {
        console.error("Error ending session:", error);
        showToast("Failed to end session");
    }
}

function showDownloadTranscriptButton(sessionId) {
    const msgArea = document.getElementById('chat-messages');
    if (!msgArea) return;

    if (document.getElementById('download-transcript-btn')) return;

    const btn = document.createElement('button');
    btn.id = 'download-transcript-btn';
    btn.className = 'mt-4 text-[10px] bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-600 px-3 py-1 rounded-full transition-colors';
    btn.innerText = 'Download Transcript';
    btn.onclick = () => downloadTranscript(sessionId);
    msgArea.appendChild(btn);
}

async function downloadTranscript(sessionId) {
    try {
        const { data: messages, error } = await supabase
            .from('chat_messages')
            .select('sender_type, message, created_at')
            .eq('session_id', sessionId)
            .order('created_at', { ascending: true });

        if (error) throw error;

        let transcript = `Chat Session #${sessionId}\n`;
        transcript += `Date: ${new Date().toLocaleDateString()}\n`;
        transcript += `================================\n\n`;

        messages.forEach(msg => {
            const sender = msg.sender_type === 'user' ? 'You' : 'Liaison';
            const time = formatTime(msg.created_at);
            transcript += `[${time}] ${sender}: ${msg.message}\n`;
        });

        const blob = new Blob([transcript], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `chat-transcript-${sessionId}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error("Error downloading transcript:", error);
        showToast("Failed to download transcript");
    }
}

// ---------- User Realtime Subscription (with unread badge) ----------
function subscribeToUserChat() {
    if (userChannel) supabase.removeChannel(userChannel);

    userChannel = supabase
        .channel('user-chat')
        .on('postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'chat_messages' },
            async (payload) => {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                const { data: session } = await supabase
                    .from('chat_sessions')
                    .select('id, status')
                    .eq('id', payload.new.session_id)
                    .eq('user_id', user.id)
                    .single();

                if (session && session.status === 'active' && payload.new.sender_type === 'admin') {
                    const chatWin = document.getElementById('chat-window');
                    // If chat window is closed, increment unread count
                    if (chatWin && chatWin.classList.contains('hidden')) {
                        unreadCount++;
                        updateUnreadBadge(unreadCount);
                    }
                    // Always add message to UI (it will be visible if chat is open)
                    appendMessageToUI('admin', payload.new.message, payload.new.created_at);
                    showToast("New message from liaison");
                }
            }
        )
        .subscribe();
}

// ==================== ADMIN CHAT SYSTEM ====================
let currentAdminSessionId = null;
let currentAdminUserId = null;
let adminChannel = null;

// Highlight a user in the left panel when a new message arrives
function highlightUserInList(sessionId) {
    const userDiv = document.querySelector(`#admin-user-list div[onclick*="selectSession(${sessionId},"]`);
    if (userDiv) {
        userDiv.classList.add('bg-yellow-900/20', 'border-l-4', 'border-yellow-600');
        setTimeout(() => {
            userDiv.classList.remove('bg-yellow-900/20', 'border-l-4', 'border-yellow-600');
        }, 2000);
    }
}

// Load all active sessions into the left panel
async function loadAdminSessions() {
    const listEl = document.getElementById('admin-user-list');
    if (!listEl) return;

    try {
        const { data: sessions, error } = await supabase
            .from('chat_sessions')
            .select('id, user_id, created_at')
            .eq('status', 'active')
            .order('created_at', { ascending: false });

        if (error) throw error;

        const ticketCountEl = document.getElementById('ticket-count');
        if (!sessions || sessions.length === 0) {
            listEl.innerHTML = '<div class="p-8 text-center"><p class="text-[9px] text-zinc-600 uppercase tracking-widest">No active conversations</p></div>';
            if (ticketCountEl) ticketCountEl.innerText = '0 ACTIVE CHATS';
            return;
        }

        if (ticketCountEl) ticketCountEl.innerText = `${sessions.length} ACTIVE CHATS`;

        const userIds = sessions.map(s => s.user_id);
        const { data: profiles, error: profileError } = await supabase
            .from('profiles')
            .select('id, email, full_name')
            .in('id', userIds);

        const profileMap = {};
        if (!profileError && profiles) {
            profiles.forEach(p => { profileMap[p.id] = p; });
        }

        listEl.innerHTML = sessions.map(session => {
            const profile = profileMap[session.user_id] || {};
            const displayName = profile.full_name || profile.email || `User ${session.user_id.slice(0,6)}`;
            const isActive = currentAdminSessionId === session.id ? 'bg-zinc-900/80' : '';
            return `
                <div onclick="window.selectSession(${session.id}, '${session.user_id}')" 
                    class="p-4 hover:bg-zinc-900/50 cursor-pointer transition-colors ${isActive}">
                    <p class="text-xs font-bold text-white">${escapeHtml(displayName)}</p>
                    <p class="text-[8px] text-zinc-500 uppercase tracking-widest mt-1">Started ${formatTime(session.created_at)}</p>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error("Error loading admin sessions:", error);
        showToast("Failed to load sessions");
    }
}

// Select a session and load its messages
async function selectSession(sessionId, userId) {
    currentAdminSessionId = sessionId;
    currentAdminUserId = userId;

    await loadAdminSessions();

    const msgArea = document.getElementById('admin-chat-messages');
    if (!msgArea) return;

    try {
        const { data: messages, error } = await supabase
            .from('chat_messages')
            .select('*')
            .eq('session_id', sessionId)
            .order('created_at', { ascending: true });

        if (error) throw error;

        const headerUserEl = document.getElementById('active-chat-user');
        const headerStatusEl = document.getElementById('active-chat-status');
        const chatActions = document.getElementById('chat-actions');
        const endSessionBtn = document.getElementById('admin-end-session-btn');
        
        const { data: profile } = await supabase
            .from('profiles')
            .select('email, full_name')
            .eq('id', userId)
            .maybeSingle();

        const displayName = profile?.full_name || profile?.email || `User ${userId.slice(0,6)}`;
        if (headerUserEl) headerUserEl.innerText = displayName;
        if (headerStatusEl) headerStatusEl.innerText = 'Active Chat';
        if (chatActions) chatActions.classList.remove('hidden');
        if (endSessionBtn) endSessionBtn.classList.remove('hidden');
        window.currentChatUserId = userId;

        if (!messages || messages.length === 0) {
            msgArea.innerHTML = '<div class="m-auto text-center opacity-20"><p class="text-[10px] uppercase tracking-[0.4em]">No messages yet</p></div>';
        } else {
            msgArea.innerHTML = messages.map(msg => {
                const time = formatTime(msg.created_at);
                if (msg.sender_type === 'user') {
                    return `
                        <div class="flex justify-start">
                            <div class="bg-zinc-900/80 p-4 rounded-2xl rounded-bl-none text-[11px] text-zinc-300 max-w-[70%] border border-zinc-800/50">
                                ${escapeHtml(msg.message)}
                                <div class="text-[8px] text-zinc-600 mt-1">${time}</div>
                            </div>
                        </div>
                    `;
                } else {
                    return `
                        <div class="flex justify-end">
                            <div class="bg-yellow-600/10 border border-yellow-600/20 p-4 rounded-2xl rounded-br-none text-[11px] text-white max-w-[70%]">
                                ${escapeHtml(msg.message)}
                                <div class="text-[8px] text-zinc-500 mt-1">${time}</div>
                            </div>
                        </div>
                    `;
                }
            }).join('');
        }

        msgArea.scrollTop = msgArea.scrollHeight;
        setupAdminRealtime(sessionId);

    } catch (error) {
        console.error("Error loading session messages:", error);
        showToast("Failed to load conversation");
    }
}

// Real-time subscription for new messages (admin)
function setupAdminRealtime(sessionId) {
    if (adminChannel) supabase.removeChannel(adminChannel);

    adminChannel = supabase
        .channel(`admin-session-${sessionId}`)
        .on('postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `session_id=eq.${sessionId}` },
            (payload) => {
                if (payload.new.sender_type === 'user') {
                    appendAdminMessageToUI('user', payload.new.message, payload.new.created_at);
                    // Highlight the user in the list
                    highlightUserInList(sessionId);
                    showToast("New message from user");
                }
            }
        )
        .subscribe();
}

// Send an admin reply
async function sendAdminReply() {
    if (!currentAdminSessionId) {
        showToast("No session selected");
        return;
    }

    const input = document.getElementById('admin-reply-input');
    if (!input) return;

    const message = input.value.trim();
    if (!message) {
        showToast("Please enter a message");
        return;
    }

    try {
        const { error } = await supabase
            .from('chat_messages')
            .insert([{
                session_id: currentAdminSessionId,
                sender_type: 'admin',
                message: message,
                created_at: new Date().toISOString()
            }]);

        if (error) throw error;

        appendAdminMessageToUI('admin', message);
        input.value = '';
        showToast("Reply sent");
    } catch (error) {
        console.error("Error sending admin reply:", error);
        showToast("Failed to send reply");
    }
}

// Append a message to the admin chat UI
function appendAdminMessageToUI(sender, message, timestamp = new Date()) {
    const msgArea = document.getElementById('admin-chat-messages');
    if (!msgArea) return;

    const time = formatTime(timestamp);
    const html = sender === 'admin' 
        ? `<div class="flex justify-end">
            <div class="bg-yellow-600/10 border border-yellow-600/20 p-4 rounded-2xl rounded-br-none text-[11px] text-white max-w-[70%]">
                ${escapeHtml(message)}
                <div class="text-[8px] text-zinc-500 mt-1">${time}</div>
            </div>
           </div>`
        : `<div class="flex justify-start">
            <div class="bg-zinc-900/80 p-4 rounded-2xl rounded-bl-none text-[11px] text-zinc-300 max-w-[70%] border border-zinc-800/50">
                ${escapeHtml(message)}
                <div class="text-[8px] text-zinc-600 mt-1">${time}</div>
            </div>
           </div>`;

    msgArea.innerHTML += html;
    msgArea.scrollTop = msgArea.scrollHeight;
}

// Admin close session
async function adminCloseSession() {
    if (!currentAdminSessionId) {
        showToast("No active session");
        return;
    }

    try {
        const { error } = await supabase
            .from('chat_sessions')
            .update({ status: 'closed', closed_at: new Date().toISOString() })
            .eq('id', currentAdminSessionId);

        if (error) throw error;

        showToast("Session closed");
        
        currentAdminSessionId = null;
        currentAdminUserId = null;
        
        await loadAdminSessions();
        
        const msgArea = document.getElementById('admin-chat-messages');
        if (msgArea) {
            msgArea.innerHTML = '<div class="m-auto text-center opacity-20"><p class="text-[10px] uppercase tracking-[0.4em]">Select a dossier to begin transmission</p></div>';
        }
        
        const headerUserEl = document.getElementById('active-chat-user');
        const headerStatusEl = document.getElementById('active-chat-status');
        const chatActions = document.getElementById('chat-actions');
        const endSessionBtn = document.getElementById('admin-end-session-btn');
        if (headerUserEl) headerUserEl.innerText = 'Select a Client';
        if (headerStatusEl) headerStatusEl.innerText = 'Awaiting Selection';
        if (chatActions) chatActions.classList.add('hidden');
        if (endSessionBtn) endSessionBtn.classList.add('hidden');
        
        if (adminChannel) {
            supabase.removeChannel(adminChannel);
            adminChannel = null;
        }
    } catch (error) {
        console.error("Error closing session:", error);
        showToast("Failed to close session");
    }
}

// View user details (dossier)
window.viewUserDetails = async function(userId) {
    const targetId = userId || currentAdminUserId;
    if (!targetId) {
        showToast("No user selected");
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
        showToast("No orders found for this user");
        return;
    }

    window.viewFullDossier(order.order_ref);
};

// Expose admin functions to global scope
window.loadAdminSessions = loadAdminSessions;
window.selectSession = selectSession;
window.sendAdminReply = sendAdminReply;
window.adminCloseSession = adminCloseSession;

// ---------- Expose User Functions to Global Scope ----------
window.toggleChat = toggleChat;
window.sendChatMessage = sendChatMessage;
window.sendChatTicket = sendChatMessage;
window.endCurrentSession = endCurrentSession;
window.sendQuickTicket = sendChatMessage; // optional alias

// ---------- Initialization ----------
document.addEventListener('DOMContentLoaded', async () => {
    await loadCurrentSession();
    subscribeToUserChat();
});