var STORAGE_BALANCE_KEY = "cc_wallet_balance_usdt";
var STORAGE_ACTIVITY_KEY = "cc_activity_log";

var walletBalanceValue = document.getElementById("walletBalanceValue");
var activityListEl = document.getElementById("activityList");
var filterButtons = document.querySelectorAll(".filter-pill");
var yearEl = document.getElementById("year");

// Year in footer
if (yearEl) {
  yearEl.textContent = new Date().getFullYear().toString();
}

// =========================
// Toast helper (same style as main page)
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
  }, 2500);
}

// =========================
// Data helpers
// =========================

function loadBalance() {
  var stored = localStorage.getItem(STORAGE_BALANCE_KEY);
  if (!stored) return 50.0;
  var val = parseFloat(stored);
  if (isNaN(val)) return 50.0;
  return val;
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

// =========================
// Render balance
// =========================

function renderBalance() {
  var bal = loadBalance();
  if (walletBalanceValue) {
    walletBalanceValue.textContent = bal.toFixed(4) + " USDT";
  }
}

// =========================
// Activity rendering
// =========================

// meta for type
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

// extract first number from desc
function extractAmount(desc) {
  if (!desc) return null;
  var m = desc.match(/([0-9]+(\.[0-9]+)?)/);
  if (!m) return null;
  var n = parseFloat(m[1]);
  if (isNaN(n)) return null;
  return n;
}

function renderActivity(filterKind) {
  if (!activityListEl) return;

  var log = loadActivity();
  var filtered = log;

  if (filterKind && filterKind !== "ALL") {
    filtered = log.filter(function (item) {
      return item.kind === filterKind;
    });
  }

  if (!filtered.length) {
    activityListEl.innerHTML =
      '<li class="activity-empty">No matching activity yet. Try a demo deposit, recharge or withdrawal on the main page.</li>';
    return;
  }

  var html = filtered
    .map(function (item) {
      var meta = getKindMeta(item.kind);
      var amt = extractAmount(item.desc);
      var amountStr = amt != null ? meta.sign + amt.toFixed(4) : "—";

      return (
        '<li class="txn-row ' +
        meta.cls +
        '">' +
        '<div class="txn-left">' +
        '<div class="txn-icon">' +
        meta.icon +
        "</div>" +
        '<div class="txn-main">' +
        '<div class="txn-title">' +
        meta.label +
        "</div>" +
        '<div class="txn-desc">' +
        item.desc +
        "</div>" +
        "</div>" +
        "</div>" +
        '<div class="txn-right">' +
        '<div class="txn-amount">' +
        amountStr +
        " USDT</div>" +
        '<div class="txn-time">' +
        (item.time || "") +
        "</div>" +
        "</div>" +
        "</li>"
      );
    })
    .join("");

  activityListEl.innerHTML = html;
}

// =========================
// Filters + toasts
// =========================

function filterLabel(kind) {
  if (kind === "Deposit") return "Deposits";
  if (kind === "Recharge") return "Recharges";
  if (kind === "Withdraw") return "Withdrawals";
  return "All activity";
}

filterButtons.forEach(function (btn) {
  btn.addEventListener("click", function () {
    var filter = btn.getAttribute("data-filter") || "ALL";

    filterButtons.forEach(function (b) {
      b.classList.remove("active");
    });
    btn.classList.add("active");

    renderActivity(filter);

    // Check if there is any matching activity
    var log = loadActivity();
    var hasActivity =
      filter === "ALL"
        ? log.length > 0
        : log.some(function (item) {
            return item.kind === filter;
          });

    if (!hasActivity) {
      var msg =
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
// Initial render
// =========================

renderBalance();
renderActivity("ALL");

// Small info toast on first load
setTimeout(function () {
  showToast("Wallet synced with main prototype.", "success");
}, 400);
var STORAGE_BALANCE_KEY = "cc_wallet_balance_usdt";
var STORAGE_ACTIVITY_KEY = "cc_activity_log";

var walletBalanceValue = document.getElementById("walletBalanceValue");
var activityListEl = document.getElementById("activityList");
var filterButtons = document.querySelectorAll(".filter-pill");
var yearEl = document.getElementById("year");

// Year in footer
if (yearEl) {
  yearEl.textContent = new Date().getFullYear().toString();
}

// =========================
// Toast helper (same style as main page)
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
  }, 2500);
}

// =========================
// Data helpers
// =========================

function loadBalance() {
  var stored = localStorage.getItem(STORAGE_BALANCE_KEY);
  if (!stored) return 50.0;
  var val = parseFloat(stored);
  if (isNaN(val)) return 50.0;
  return val;
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

// =========================
// Render balance
// =========================

function renderBalance() {
  var bal = loadBalance();
  if (walletBalanceValue) {
    walletBalanceValue.textContent = bal.toFixed(4) + " USDT";
  }
}

// =========================
// Activity rendering
// =========================

// meta for type
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

// extract first number from desc
function extractAmount(desc) {
  if (!desc) return null;
  var m = desc.match(/([0-9]+(\.[0-9]+)?)/);
  if (!m) return null;
  var n = parseFloat(m[1]);
  if (isNaN(n)) return null;
  return n;
}

function renderActivity(filterKind) {
  if (!activityListEl) return;

  var log = loadActivity();
  var filtered = log;

  if (filterKind && filterKind !== "ALL") {
    filtered = log.filter(function (item) {
      return item.kind === filterKind;
    });
  }

  if (!filtered.length) {
    activityListEl.innerHTML =
      '<li class="activity-empty">No matching activity yet. Try a demo deposit, recharge or withdrawal on the main page.</li>';
    return;
  }

  var html = filtered
    .map(function (item) {
      var meta = getKindMeta(item.kind);
      var amt = extractAmount(item.desc);
      var amountStr = amt != null ? meta.sign + amt.toFixed(4) : "—";

      return (
        '<li class="txn-row ' +
        meta.cls +
        '">' +
        '<div class="txn-left">' +
        '<div class="txn-icon">' +
        meta.icon +
        "</div>" +
        '<div class="txn-main">' +
        '<div class="txn-title">' +
        meta.label +
        "</div>" +
        '<div class="txn-desc">' +
        item.desc +
        "</div>" +
        "</div>" +
        "</div>" +
        '<div class="txn-right">' +
        '<div class="txn-amount">' +
        amountStr +
        " USDT</div>" +
        '<div class="txn-time">' +
        (item.time || "") +
        "</div>" +
        "</div>" +
        "</li>"
      );
    })
    .join("");

  activityListEl.innerHTML = html;
}

// =========================
// Filters + toasts
// =========================

function filterLabel(kind) {
  if (kind === "Deposit") return "Deposits";
  if (kind === "Recharge") return "Recharges";
  if (kind === "Withdraw") return "Withdrawals";
  return "All activity";
}

filterButtons.forEach(function (btn) {
  btn.addEventListener("click", function () {
    var filter = btn.getAttribute("data-filter") || "ALL";

    filterButtons.forEach(function (b) {
      b.classList.remove("active");
    });
    btn.classList.add("active");

    renderActivity(filter);

    // Check if there is any matching activity
    var log = loadActivity();
    var hasActivity =
      filter === "ALL"
        ? log.length > 0
        : log.some(function (item) {
            return item.kind === filter;
          });

    if (!hasActivity) {
      var msg =
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
// Initial render
// =========================

renderBalance();
renderActivity("ALL");

// Small info toast on first load
setTimeout(function () {
  showToast("Wallet synced with main prototype.", "success");
}, 400);
