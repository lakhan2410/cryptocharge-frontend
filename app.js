// =========================
// Supabase Init
// =========================
const SUPABASE_URL = "https://beuwhycxtozapwbbrbqc.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJldXdoeWN4dG96YXB3YmJyYnFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3MTI1NjIsImV4cCI6MjA3OTI4ODU2Mn0.ACw3j3HkAaXGt8SdJw11t0Ld54zhUCYKd9Jb3Rygv4U";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

// Temporary guest user (no auth yet)
let userId = localStorage.getItem("cryptocharge_user_id");
if (!userId) {
  userId = crypto.randomUUID();
  localStorage.setItem("cryptocharge_user_id", userId);
  console.log("New guest user created:", userId);
}

// =========================
// Shared constants / keys
// =========================
var STORAGE_BALANCE_KEY = "cc_wallet_balance_usdt";
var STORAGE_ACTIVITY_KEY = "cc_activity_log";

var RATE_INR_PER_USD = 90; // demo FX rate
var PLATFORM_FEE_PERCENT = 0.5; // %

// =========================
// Basic helpers
// =========================

// Smooth scroll to app card
function scrollToApp() {
  var section = document.getElementById("app-section");
  if (section) {
    section.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

// Set current year in footer (if present)
var yearEl = document.getElementById("year");
if (yearEl) {
  yearEl.textContent = new Date().getFullYear().toString();
}

// =========================
// Toast helper
// =========================

var toastEl = document.getElementById("toast");
var toastTimer = null;

function showToast(message, type) {
  if (!toastEl) return;

  toastEl.className = "toast";
  if (type === "success") {
    toastEl.classList.add("toast-success");
  } else if (type === "error") {
    toastEl.classList.add("toast-error");
  }

  toastEl.textContent = message;
  toastEl.classList.add("show");

  if (toastTimer) {
    clearTimeout(toastTimer);
  }
  toastTimer = setTimeout(function () {
    toastEl.classList.remove("show");
  }, 3000);
}

// =========================
// DOM references
// =========================

// Recharge form
var amountInput = document.getElementById("amountInr");
var tokenSelect = document.getElementById("tokenSelect");
var sumAmountInr = document.getElementById("sumAmountInr");
var sumAmountCrypto = document.getElementById("sumAmountCrypto");
var sumTotalCrypto = document.getElementById("sumTotalCrypto");
var sumFee = document.getElementById("sumFee");
var payBtn = document.getElementById("payBtn");

// Order info (demo)
var walletBox = document.getElementById("walletBox");
var orderIdEl = document.getElementById("orderId");
var orderNoteEl = document.getElementById("orderNote");

// Wallet UI
var walletBalanceValue = document.getElementById("walletBalanceValue"); // may be null
var navWalletBalance = document.getElementById("navWalletBalance"); // header chip

// Deposit / withdraw panels & controls
var depositPanel = document.getElementById("depositPanel");
var withdrawPanel = document.getElementById("withdrawPanel");
var depositAmountInput = document.getElementById("depositAmount");
var confirmDepositBtn = document.getElementById("confirmDeposit");
var withdrawAmountInput = document.getElementById("withdrawAmount");
var withdrawAddressInput = document.getElementById("withdrawAddress");
var confirmWithdrawBtn = document.getElementById("confirmWithdraw");

// Buttons that open panels
var openDepositBtn = document.getElementById("openDeposit"); // might not exist
var openWithdrawBtn = document.getElementById("openWithdraw"); // might not exist
var hwDepositBtn = document.getElementById("hwDepositBtn"); // header chip
var hwWithdrawBtn = document.getElementById("hwWithdrawBtn");

// Success overlay (shared)
var successOverlay = document.getElementById("successOverlay");
var successCloseBtn = document.getElementById("successCloseBtn");
var successIcon = document.getElementById("successIcon");
var successTitle = document.getElementById("successTitle");
var successText = document.getElementById("successText");
var successAmountLabel = document.getElementById("successAmountLabel");
var successExtraLabel = document.getElementById("successExtraLabel");

// =========================
/** LocalStorage helpers (still used for local demo history) **/
// =========================

function loadBalance() {
  var stored = localStorage.getItem(STORAGE_BALANCE_KEY);
  if (!stored) return 50.0; // default demo balance
  var val = parseFloat(stored);
  if (isNaN(val)) return 50.0;
  return val;
}

function saveBalance(val) {
  localStorage.setItem(STORAGE_BALANCE_KEY, String(val));
}

function loadActivity() {
  var raw = localStorage.getItem(STORAGE_ACTIVITY_KEY);
  if (!raw) return [];
  try {
    var arr = JSON.parse(raw);
    if (Array.isArray(arr)) return arr;
    return [];
  } catch (e) {
    return [];
  }
}

function saveActivity(arr) {
  localStorage.setItem(STORAGE_ACTIVITY_KEY, JSON.stringify(arr));
}

function addActivity(kind, desc) {
  var log = loadActivity();
  var now = new Date();
  var time = now.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  log.unshift({
    kind: kind,
    desc: desc,
    time: time,
  });

  if (log.length > 20) {
    log = log.slice(0, 20);
  }
  saveActivity(log);
}

// =========================
// Wallet balance state
// =========================

var walletBalance = loadBalance(); // initial fallback; will be overridden by DB

function renderWalletBalance() {
  if (walletBalanceValue) {
    walletBalanceValue.textContent = walletBalance.toFixed(4) + " USDT";
  }
  if (navWalletBalance) {
    navWalletBalance.textContent = walletBalance.toFixed(4) + " USDT";
  }
}

// =========================
// Supabase wallet helpers
// =========================

async function ensureUserAndWallet() {
  try {
    // Ensure user row exists
    const { error: userErr } = await supabaseClient
      .from("users")
      .upsert({ id: userId }, { onConflict: "id" });
    if (userErr) {
      console.error("Supabase user upsert error:", userErr);
    }

    // Try to get wallet row
    let { data, error } = await supabaseClient
      .from("wallet_balances")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error && error.code !== "PGRST116") {
      // not "no rows"
      console.error("Supabase wallet select error:", error);
    }

    if (!data) {
      // Create with default demo balance
      const defaultBal = 50.0;
      const { data: inserted, error: insertErr } = await supabaseClient
        .from("wallet_balances")
        .insert({
          user_id: userId,
          balance: defaultBal,
        })
        .select()
        .single();

      if (insertErr) {
        console.error("Supabase wallet insert error:", insertErr);
        return defaultBal;
      }
      return inserted.balance ?? defaultBal;
    }

    return parseFloat(data.balance ?? 0);
  } catch (err) {
    console.error("ensureUserAndWallet exception:", err);
    return loadBalance();
  }
}

async function updateWalletBalanceInDB(newBalance) {
  try {
    const { error } = await supabaseClient
      .from("wallet_balances")
      .update({
        balance: newBalance,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    if (error) {
      console.error("Supabase wallet update error:", error);
    }
  } catch (err) {
    console.error("updateWalletBalanceInDB exception:", err);
  }
}

async function recordTransaction(type, amount, status) {
  try {
    const { error } = await supabaseClient.from("transactions").insert({
      user_id: userId,
      type: type,
      amount: amount,
      status: status || "success",
    });

    if (error) {
      console.error("Supabase tx insert error:", error);
    }
  } catch (err) {
    console.error("recordTransaction exception:", err);
  }
}

async function initWalletFromSupabase() {
  const balance = await ensureUserAndWallet();
  if (typeof balance === "number" && !isNaN(balance)) {
    walletBalance = balance;
    saveBalance(walletBalance); // keep local demo in sync
    renderWalletBalance();
  } else {
    renderWalletBalance();
  }
}

// =========================
// Summary calculation
// =========================

function updateSummary() {
  if (!amountInput || !tokenSelect) return;

  var amt = parseFloat(amountInput.value || "0");
  if (amt < 0) amt = 0;
  var token = tokenSelect.value || "USDT";

  var baseCrypto = amt / RATE_INR_PER_USD; // demo conversion
  var totalCrypto = baseCrypto * (1 + PLATFORM_FEE_PERCENT / 100);

  if (sumAmountInr) {
    sumAmountInr.textContent = "₹" + (amt || 0);
  }
  if (sumAmountCrypto) {
    sumAmountCrypto.textContent =
      baseCrypto.toFixed(4) + " " + token.toUpperCase();
  }
  if (sumFee) {
    sumFee.textContent = PLATFORM_FEE_PERCENT.toFixed(1) + "%";
  }
  if (sumTotalCrypto) {
    sumTotalCrypto.textContent =
      totalCrypto.toFixed(4) + " " + token.toUpperCase();
  }
}

if (amountInput) {
  amountInput.addEventListener("input", updateSummary);
}
if (tokenSelect) {
  tokenSelect.addEventListener("change", updateSummary);
}

// =========================
// Panel toggling
// =========================

function showDepositPanel() {
  if (!depositPanel || !withdrawPanel) return;
  depositPanel.style.display = "block";
  withdrawPanel.style.display = "none";
}

function showWithdrawPanel() {
  if (!depositPanel || !withdrawPanel) return;
  withdrawPanel.style.display = "block";
  depositPanel.style.display = "none";
}

// Old buttons (if used anywhere)
if (openDepositBtn) {
  openDepositBtn.addEventListener("click", function () {
    showDepositPanel();
    scrollToApp();
  });
}
if (openWithdrawBtn) {
  openWithdrawBtn.addEventListener("click", function () {
    showWithdrawPanel();
    scrollToApp();
  });
}

// Header chip buttons
if (hwDepositBtn) {
  hwDepositBtn.addEventListener("click", function () {
    showDepositPanel();
    scrollToApp();
  });
}
if (hwWithdrawBtn) {
  hwWithdrawBtn.addEventListener("click", function () {
    showWithdrawPanel();
    scrollToApp();
  });
}

// =========================
// Shared success overlay
// =========================

function showSuccessOverlay(kind, amountText, extraText) {
  if (!successOverlay) return;

  var title = "Action completed";
  var text =
    "This is a demo confirmation screen. In production you’ll see real status here.";
  var icon = "⚡";

  if (kind === "recharge") {
    title = "Recharge simulated";
    text =
      "We’ve debited your demo wallet balance. A real app would now trigger an INR recharge.";
    icon = "📱";
  } else if (kind === "deposit") {
    title = "Deposit added to wallet";
    text =
      "Your demo balance has been topped up. In production this would follow an on-chain confirmation.";
    icon = "⬆";
  } else if (kind === "withdraw") {
    title = "Withdraw request simulated";
    text =
      "A real app would now create a withdrawal job and send funds on-chain to your address.";
    icon = "⬇";
  }

  if (successTitle) successTitle.textContent = title;
  if (successText) successText.textContent = text;
  if (successIcon) successIcon.textContent = icon;
  if (successAmountLabel && amountText) {
    successAmountLabel.textContent = amountText;
  }
  if (successExtraLabel && extraText) {
    successExtraLabel.textContent = extraText;
  }

  successOverlay.classList.add("visible");
}

if (successCloseBtn && successOverlay) {
  successCloseBtn.addEventListener("click", function () {
    successOverlay.classList.remove("visible");
  });
}

// =========================
// Recharge flow (from wallet)
// =========================

if (payBtn) {
  payBtn.addEventListener("click", async function () {
    var amt = parseFloat(amountInput.value || "0");
    if (!amt || amt <= 0) {
      showToast("Enter a valid recharge amount in INR to continue.", "error");
      return;
    }

    var token = tokenSelect ? tokenSelect.value || "USDT" : "USDT";
    var baseCrypto = amt / RATE_INR_PER_USD;
    var totalCrypto = baseCrypto * (1 + PLATFORM_FEE_PERCENT / 100);

    if (totalCrypto > walletBalance) {
      showToast(
        "Insufficient wallet balance. Top up using Deposit.",
        "error"
      );
      return;
    }

    // Deduct locally
    walletBalance -= totalCrypto;
    saveBalance(walletBalance);
    renderWalletBalance();

    // Update in Supabase (fire and forget)
    updateWalletBalanceInDB(walletBalance);
    recordTransaction("recharge", totalCrypto, "success");

    var randomId = Math.floor(10000 + Math.random() * 90000);
    if (orderIdEl) {
      orderIdEl.textContent = "Order ID: #CC-" + randomId;
    }
    if (orderNoteEl) {
      orderNoteEl.textContent =
        "Demo only: In production, this would create a real order, deduct your on-platform balance, and trigger an INR recharge via partner API.";
    }
    if (walletBox) {
      walletBox.style.display = "block";
    }

    updateSummary();

    addActivity(
      "Recharge",
      "Paid " + totalCrypto.toFixed(4) + " " + token + " for mobile recharge."
    );

    var mobile = (document.getElementById("mobileNumber").value || "").trim();
    var operator = document.getElementById("operator").value || "";

    var amountText =
      "Paid " + totalCrypto.toFixed(4) + " " + token + " from wallet.";
    var extraText = "For " + (mobile || "your mobile number");
    if (operator) {
      extraText += " · " + operator;
    }

    showSuccessOverlay("recharge", amountText, extraText);
    showToast("Recharge simulated from demo wallet.", "success");
  });
}

// =========================
// Deposit (demo)
// =========================

if (confirmDepositBtn) {
  confirmDepositBtn.addEventListener("click", async function () {
    var dep = parseFloat(depositAmountInput.value || "0");
    if (!dep || dep <= 0) {
      showToast("Enter a positive amount to simulate a deposit.", "error");
      return;
    }

    walletBalance += dep;
    saveBalance(walletBalance);
    renderWalletBalance();
    depositAmountInput.value = "";

    updateWalletBalanceInDB(walletBalance);
    recordTransaction("deposit", dep, "success");

    addActivity("Deposit", "Added " + dep.toFixed(4) + " USDT to wallet.");

    var amountText = "Added " + dep.toFixed(4) + " USDT to wallet.";
    var extraText =
      "New demo balance: " + walletBalance.toFixed(4) + " USDT.";

    showSuccessOverlay("deposit", amountText, extraText);
    showToast("Demo deposit added to wallet.", "success");
  });
}

// =========================
// Withdraw (demo)
// =========================

if (confirmWithdrawBtn) {
  confirmWithdrawBtn.addEventListener("click", async function () {
    var amt = parseFloat(withdrawAmountInput.value || "0");
    var addr = (withdrawAddressInput.value || "").trim();

    if (!amt || amt <= 0) {
      showToast("Enter a positive amount to withdraw.", "error");
      return;
    }
    if (amt > walletBalance) {
      showToast(
        "Withdrawal amount exceeds your wallet balance.",
        "error"
      );
      return;
    }
    if (!addr || !addr.startsWith("0x") || addr.length < 10) {
      showToast(
        "Enter a demo BNB wallet address starting with 0x.",
        "error"
      );
      return;
    }

    walletBalance -= amt;
    saveBalance(walletBalance);
    renderWalletBalance();
    withdrawAmountInput.value = "";
    withdrawAddressInput.value = "";

    updateWalletBalanceInDB(walletBalance);
    recordTransaction("withdraw", amt, "success");

    addActivity(
      "Withdraw",
      "Requested " + amt.toFixed(4) + " USDT to " + addr.slice(0, 10) + "..."
    );

    var amountText = "Requested " + amt.toFixed(4) + " USDT withdrawal.";
    var extraText = "To: " + addr.slice(0, 14) + "...";

    showSuccessOverlay("withdraw", amountText, extraText);
    showToast("Demo withdraw request created.", "success");
  });
}

// =========================
// Scroll reveal (auto-attach)
// =========================

(function () {
  var targets = [
    ".hero-left",
    ".hero-right",
    ".demo-guide-card",
    ".section-how",
    ".section-why",
  ];

  var revealEls = [];

  targets.forEach(function (sel) {
    var el = document.querySelector(sel);
    if (el) {
      el.classList.add("reveal");
      revealEls.push(el);
    }
  });

  if (!revealEls.length) return;

  if ("IntersectionObserver" in window) {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.18 }
    );

    revealEls.forEach(function (el) {
      observer.observe(el);
    });
  } else {
    revealEls.forEach(function (el) {
      el.classList.add("visible");
    });
  }
})();

// =========================
// Subtle 3D tilt on app card
// =========================

var appCard = document.querySelector(".app-card");

if (appCard && window.matchMedia("(pointer: fine)").matches) {
  appCard.addEventListener("mousemove", function (e) {
    var rect = appCard.getBoundingClientRect();
    var x = e.clientX - rect.left;
    var y = e.clientY - rect.top;

    var rotateY = ((x / rect.width) - 0.5) * 8; // -4 to 4 deg
    var rotateX = ((y / rect.height) - 0.5) * -8; // -4 to 4 deg

    appCard.style.transform =
      "perspective(700px) rotateX(" +
      rotateX.toFixed(2) +
      "deg) rotateY(" +
      rotateY.toFixed(2) +
      "deg)";
  });

  appCard.addEventListener("mouseleave", function () {
    appCard.style.transform = "perspective(700px) translateY(0)";
  });
}

// =========================
// Initial render + Supabase sync
// =========================

renderWalletBalance();
updateSummary();
initWalletFromSupabase();
