// ─────────────────────────────────────────────
//  Groq API Configuration
// ─────────────────────────────────────────────
const apiKey   = "ENTER YOUR API KEY";
const modelName = "llama-3.3-70b-versatile";

// ─────────────────────────────────────────────
//  Orders Database
// ─────────────────────────────────────────────
const orders = {
    "12345": { id: "12345", status: "Out for Delivery", location: "Ludhiana Hub",         eta: "Today by 7 PM",    courier: "Express Logistics", progress: 85  },
    "67890": { id: "67890", status: "Shipped",          location: "Mumbai Gateway",        eta: "Oct 15, 2 PM",     courier: "Blue Dart",         progress: 45  },
    "ABCDE": { id: "ABCDE", status: "In Transit",       location: "Delhi Dist. Center",    eta: "Oct 25, 2023",     courier: "FedEx",             progress: 65  },
    "98765": { id: "98765", status: "Delivered",        location: "Front Porch",           eta: "Delivered Yesterday", courier: "Amazon",          progress: 100 }
};

// ─────────────────────────────────────────────
//  System Prompt
// ─────────────────────────────────────────────
const systemPrompt = `
    You are "TrackBot Pro", a logistics AI assistant.
    Orders Database: ${JSON.stringify(orders)}

    Strict Rules:
    1. If the user mentions an ID present in the database, you MUST include the [[ORDER_CARD:ID]] tag in your reply.
    2. ALWAYS respond in English.
    3. Use emojis and maintain a professional yet friendly tone.
`;

// ─────────────────────────────────────────────
//  DOM References
// ─────────────────────────────────────────────
const chatBox   = document.getElementById('chat-box');
const chatForm  = document.getElementById('chat-form');
const userInput = document.getElementById('user-input');
const sendBtn   = document.getElementById('send-btn');

// ─────────────────────────────────────────────
//  Conversation History
// ─────────────────────────────────────────────
let messages = [
    { role: "system", content: systemPrompt }
];

// ─────────────────────────────────────────────
//  Initialise
// ─────────────────────────────────────────────
window.onload = () => {
    addBotMessage("Hello! I am **TrackBot Pro** (Powered by Groq). 📦 Please share your **Order ID** to get started!");
};

// ─────────────────────────────────────────────
//  Form Submit
// ─────────────────────────────────────────────
chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const message = userInput.value.trim();
    if (!message) return;

    addUserMessage(message);
    userInput.value = '';
    setLoading(true);

    const aiResponse = await getAIResponse(message);
    addBotMessage(aiResponse);
    setLoading(false);
});

// ─────────────────────────────────────────────
//  Groq API Call
// ─────────────────────────────────────────────
async function getAIResponse(userQuery) {
    const url = "https://api.groq.com/openai/v1/chat/completions";

    const payload = {
        model: modelName,
        messages: [...messages, { role: "user", content: userQuery }]
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify(payload)
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error?.message || "Groq API error");

        const text = result.choices[0].message.content;

        // Update conversation history (keep it trimmed)
        messages.push({ role: "user",      content: userQuery });
        messages.push({ role: "assistant", content: text });
        if (messages.length > 10) messages.splice(1, 2);

        return text;
    } catch (err) {
        console.error(err);
        return "⚠️ **Connection Error**: Unable to connect to Groq API. Please check your credentials.";
    }
}

// ─────────────────────────────────────────────
//  Quick-Action Buttons
// ─────────────────────────────────────────────
function handleQuickAction(text) {
    userInput.value = text;
    chatForm.dispatchEvent(new Event('submit'));
}

// Wire up buttons via event delegation (avoids inline onclick / global scope issues)
document.getElementById('quick-actions').addEventListener('click', (e) => {
    const btn = e.target.closest('.quick-btn');
    if (btn) handleQuickAction(btn.dataset.action);
});

// ─────────────────────────────────────────────
//  Loading State
// ─────────────────────────────────────────────
function setLoading(loading) {
    userInput.disabled = loading;
    sendBtn.disabled   = loading;
    document.getElementById('status-tag').textContent =
        loading ? "AI Thinking..." : "AI Active (Groq)";

    if (loading) showTyping(); else hideTyping();
}

// ─────────────────────────────────────────────
//  Message Renderers
// ─────────────────────────────────────────────
function addUserMessage(text) {
    const time = now();
    chatBox.insertAdjacentHTML('beforeend', `
        <div class="flex flex-col items-end animate-msg">
            <div class="bg-indigo-600 text-white px-5 py-3 rounded-[1.5rem] rounded-tr-[0.3rem] shadow-lg max-w-[85%] text-left">
                <p class="text-[13px] font-medium leading-relaxed">${escapeHtml(text)}</p>
            </div>
            <span class="text-[9px] font-bold text-slate-500 mt-2 uppercase tracking-tight">${time}</span>
        </div>
    `);
    scrollToBottom();
}

function addBotMessage(text) {
    const time = now();

    // Bold markdown → <strong>
    let finalHtml = text.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-white">$1</strong>');

    // Inject order card if present
    const cardMatch = text.match(/\[\[ORDER_CARD:(.*?)\]\]/);
    if (cardMatch) {
        const orderId = cardMatch[1].trim();
        finalHtml = finalHtml.replace(cardMatch[0], generateOrderCard(orderId));
    }

    chatBox.insertAdjacentHTML('beforeend', `
        <div class="flex flex-col items-start animate-msg">
            <div class="bg-slate-800/60 border border-white/5 px-5 py-4 rounded-[1.5rem] rounded-tl-[0.3rem] shadow-sm max-w-[90%] text-slate-200">
                <div class="text-[13px] leading-relaxed whitespace-pre-wrap">${finalHtml}</div>
            </div>
            <span class="text-[9px] font-bold text-slate-500 mt-2 uppercase tracking-tight">${time}</span>
        </div>
    `);
    scrollToBottom();
}

// ─────────────────────────────────────────────
//  Order Card Generator
// ─────────────────────────────────────────────
function generateOrderCard(id) {
    const data = orders[id];
    if (!data) return "";

    return `
        <div class="order-card mt-4 p-4 rounded-2xl w-full text-left">
            <div class="flex justify-between items-start mb-4">
                <div>
                    <p class="text-[9px] uppercase font-bold text-slate-500">Order ID</p>
                    <h3 class="font-bold text-indigo-400">#${data.id}</h3>
                </div>
                <div class="bg-indigo-500/10 px-2 py-1 rounded-lg">
                    <span class="text-[10px] font-bold text-indigo-400">${data.status}</span>
                </div>
            </div>
            <div class="relative h-1 bg-slate-700 rounded-full mb-4 overflow-hidden">
                <div class="absolute top-0 left-0 h-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)] transition-all duration-1000" style="width: ${data.progress}%"></div>
            </div>
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <p class="text-[8px] uppercase font-bold text-slate-500">Expected By</p>
                    <p class="text-[11px] font-semibold text-slate-200">${data.eta}</p>
                </div>
                <div>
                    <p class="text-[8px] uppercase font-bold text-slate-500">Hub</p>
                    <p class="text-[11px] font-semibold text-slate-200">${data.location}</p>
                </div>
            </div>
        </div>
    `;
}

// ─────────────────────────────────────────────
//  Typing Indicator
// ─────────────────────────────────────────────
function showTyping() {
    chatBox.insertAdjacentHTML('beforeend', `
        <div id="typing-ui" class="flex items-start">
            <div class="bg-slate-800/40 border border-white/5 px-5 py-4 rounded-[1.5rem] rounded-tl-[0.3rem]">
                <div class="flex gap-1.5">
                    <div class="typing-dot"></div>
                    <div class="typing-dot" style="animation-delay: 0.2s"></div>
                    <div class="typing-dot" style="animation-delay: 0.4s"></div>
                </div>
            </div>
        </div>
    `);
    scrollToBottom();
}

function hideTyping() {
    const el = document.getElementById('typing-ui');
    if (el) el.remove();
}

// ─────────────────────────────────────────────
//  Utilities
// ─────────────────────────────────────────────
function scrollToBottom() {
    chatBox.scrollTo({ top: chatBox.scrollHeight, behavior: 'smooth' });
}

function now() {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function escapeHtml(str) {
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}