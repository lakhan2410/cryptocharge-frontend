// =========================
// Supabase init (same project as app.js)
// =========================

const SUPABASE_URL = "https://beuwhycxtozapwbbrbqc.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJldXdoeWN4dG96YXB3YmJyYnFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3MTI1NjIsImV4cCI6MjA3OTI4ODU2Mn0.ACw3j3HkAaXGt8SdJw11t0Ld54zhUCYKd9Jb3Rygv4U";

let supabaseClient = null;

try {
  if (window.supabase && typeof window.supabase.createClient === "function") {
    supabaseClient = window.supabase.createClient(
      SUPABASE_URL,
      SUPABASE_ANON_KEY
    );
    console.log("Supabase (wallet.js) initialised.");
  } else {
    console.warn("Supabase not found – wallet history using localStorage only.");
  }
} catch (err) {
  console.warn("Supabase init failed in wallet.js:", err);
  supabaseClient = null;
}

// Same anonymous user id as main page
const userId = localStorage.getItem("cryptocharge_user_id");

// =========================
// Constants & DOM
// =========================

const STORAGE_BALANCE_KEY = "cc_wallet_balance_usdt";
const STORAGE_ACTIVITY_KEY = "cc_activity_log";

const walletBalanceValue = document.getElementById("walletBalanceValue");
const activityListEl = document.getElementById("activityList");
const filterButtons = document.querySelectorAll(".filter-pill");
const toastEl = document.getElementById("toast");
const yearEl = document.getElementById("year");

if (yearEl) {
  yearEl.textContent = new Date().getFullYear().toString();
}

// =========================
// Toast helper
// =========================

let toastTimer = null;

function showToast(message, type) {
  if (!toastEl) return;

  toastEl.className = "toast"; // reset
  if (type === "success") toastEl.classList.add("toast-success");
  if (type === "error") toastEl.classList.add("toast-error");

  toastEl.textContent = message;
  toastEl.classList.add("show");

  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2500);
}

// =========================
// Local helpers
// =========================

function loadBalanceLocal() {
  const stored = localStorage.getItem(STORAGE_BALANCE_KEY);
  const val = parseFloat(stored);
  return isNaN(val) ? 50.0 : val;
}

function loadActivityLocal() {
  const raw = localStorage.getItem(STORAGE_ACTIVITY_KEY);
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

// =========================
// Render balance
// =========================

function renderBalance() {
  if (!walletBalanceValue) return;
  const bal = loadBalanceLocal();
  walletBalanceValue.textContent = bal.toFixed(4) + " USDT";
}

// =========================
// Activity meta & rendering
// =========================

function getKindMeta(kind) {
  if (kind === "Deposit") {
    return { icon: "⬆", cls: "txn-deposit", sign: "+", label: "Deposit" };
  }
  if (kind === "Recharge") {
    return { icon: "📱", cls: "txn-recharge", sign: "-", label: "Recharge" };
  }
  if (kind === "Withdraw") {
    return { icon: "⬇", cls: "txn-withdraw", sign: "-", label: "Withdraw" };
  }
  return { icon: "•", cls: "", sign: "", label: kind || "Activity" };
}

// Extract first number from "Added 10.0000 USDT"
function extractAmount(desc) {
  if (!desc) return null;
  const m = desc.match(/([0-9]+(\.[0-9]+)?)/);
  if (!m) return null;
  const n = parseFloat(m[1]);
  return isNaN(n) ? null : n;
}

// This will hold the "normalized" activity items we render
// Each item: { kind, desc, timeLabel, amount }
let currentActivityLog = [];

// Renders list according to filterKind ("ALL" / "Deposit" / "Recharge" / "Withdraw")
function renderActivity(filterKind) {
  if (!activityListEl) return;

  let list = currentActivityLog;

  if (filterKind && filterKind !== "ALL") {
    list = list.filter((item) => item.kind === filterKind);
  }

  if (!list.length) {
    activityListEl.innerHTML =
      '<li class="activity-empty">No matching activity yet. Try a demo deposit, recharge or withdrawal on the main page.</li>';
    return;
  }

  const html = list
    .map((item) => {
      const meta = getKindMeta(item.kind);
      const amountStr =
        item.amount != null ? meta.sign + item.amount.toFixed(4) : "—";

      return `
        <li class="txn-row ${meta.cls}">
          <div class="txn-left">
            <div class="txn-icon">${meta.icon}</div>
            <div class="txn-main">
              <div class="txn-title">${meta.label}</div>
              <div class="txn-desc">${item.desc}</div>
            </div>
          </div>
          <div class="txn-right">
            <div class="txn-amount">${amountStr} USDT</div>
            <div class="txn-time">${item.timeLabel || ""}</div>
          </div>
        </li>
      `;
    })
    .join("");

  activityListEl.innerHTML = html;
}

// =========================
// Load from Supabase (preferred)
// =========================

async function loadHistoryFromSupabase() {
  if (!supabaseClient || !userId) {
    console.warn("No Supabase or userId – falling back to local activity log.");
    loadHistoryFromLocal();
    return;
  }

  try {
    const { data, error } = await supabaseClient
      .from("transactions")
      .select("*")
      .eq("user_id", userId)
      .order("id", { ascending: false })
      .limit(20);

    if (error) {
      console.error("Supabase transactions error:", error);
      loadHistoryFromLocal();
      return;
    }

    currentActivityLog = data.map((t) => {
      const kind =
        t.type === "deposit"
          ? "Deposit"
          : t.type === "withdraw"
          ? "Withdraw"
          : "Recharge";

      const d = t.created_at ? new Date(t.created_at) : null;
      const timeLabel =
        d && !isNaN(d.getTime())
          ? d.toLocaleString([], {
              month: "short",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            })
          : "";

      let desc;
      if (kind === "Deposit") {
        desc = `Added ${Number(t.amount).toFixed(4)} USDT`;
      } else if (kind === "Withdraw") {
        desc = `Withdrew ${Number(t.amount).toFixed(4)} USDT`;
      } else {
        desc = `Paid ${Number(t.amount).toFixed(4)} USDT for mobile recharge.`;
      }

      return {
        kind,
        desc,
        timeLabel, // <-- always a formatted string, never "Invalid Date"
        amount: Number(t.amount),
      };
    });

    renderActivity("ALL");
  } catch (err) {
    console.error("loadHistoryFromSupabase exception:", err);
    loadHistoryFromLocal();
  }
}

// =========================
// Fallback: localStorage activity
// =========================

function loadHistoryFromLocal() {
  const rawLog = loadActivityLocal();

  currentActivityLog = rawLog.map((item) => ({
    kind: item.kind,
    desc: item.desc,
    timeLabel: item.time || "", // already formatted (e.g. "10:08 PM")
    amount: extractAmount(item.desc),
  }));

  renderActivity("ALL");
}

// =========================
// Filters
// =========================

function filterLabel(kind) {
  if (kind === "Deposit") return "Deposits";
  if (kind === "Recharge") return "Recharges";
  if (kind === "Withdraw") return "Withdrawals";
  return "All activity";
}

filterButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const filter = btn.getAttribute("data-filter") || "ALL";

    filterButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");

    renderActivity(filter);

    const hasActivity =
      filter === "ALL"
        ? currentActivityLog.length > 0
        : currentActivityLog.some((i) => i.kind === filter);

    if (!hasActivity) {
      const msg =
        filter === "Deposit"
          ? "No Deposits yet — try a demo deposit on main page."
          : filter === "Recharge"
          ? "No Recharges yet — simulate one on main page."
          : filter === "Withdraw"
          ? "No Withdrawals yet — try a demo withdrawal."
          : "No activity yet — use the main prototype to create some.";
      showToast(msg, "error");
    } else {
      showToast("Showing " + filterLabel(filter) + ".", "success");
    }
  });
});

// =========================
// Initial load
// =========================

renderBalance();
loadHistoryFromSupabase(); // will fallback to local if needed

setTimeout(() => {
  showToast("Wallet synced with main prototype.", "success");
}, 500);
