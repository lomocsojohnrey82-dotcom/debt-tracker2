(function () {
  "use strict";

  const KEY = "storeDebtTracker.v1";
  const money = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });

  let state = load();
  let selectedId = null;

  // ---------- Storage ----------
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          customers: Array.isArray(parsed.customers) ? parsed.customers : [],
          transactions: Array.isArray(parsed.transactions) ? parsed.transactions : []
        };
      }
    } catch (e) { /* corrupt or unavailable storage: start fresh */ }
    return { customers: [], transactions: [] };
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); }
    catch (e) { alert("Could not save data. Check browser storage settings."); }
  }

  // ---------- Helpers ----------
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const today = () => new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD

  function balanceOf(customerId) {
    return state.transactions
      .filter(t => t.customerId === customerId)
      .reduce((sum, t) => sum + (t.type === "charge" ? t.amount : -t.amount), 0);
  }

  function setMsg(el, text, type) {
    el.textContent = text;
    el.className = "msg " + (type || "");
    if (text) setTimeout(() => { if (el.textContent === text) el.textContent = ""; }, 3000);
  }

  // ---------- Rendering ----------
  function renderStats() {
    let total = 0, debtors = 0;
    state.customers.forEach(c => {
      const b = balanceOf(c.id);
      if (b > 0) { total += b; debtors++; }
    });
    document.getElementById("statTotal").textContent = money.format(total);
    document.getElementById("statDebtors").textContent = debtors;
    document.getElementById("statCustomers").textContent = state.customers.length;
  }

  function renderCustomerOptions() {
    const sel = document.getElementById("txCustomer");
    const current = sel.value || selectedId || "";
    const sorted = [...state.customers].sort((a, b) => a.name.localeCompare(b.name));
    sel.innerHTML = '<option value="">Select customer…</option>' +
      sorted.map(c => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join("");
    if (current && state.customers.some(c => c.id === current)) sel.value = current;
  }

  function renderCustomers() {
    const q = document.getElementById("search").value.trim().toLowerCase();
    const body = document.getElementById("custBody");
    const list = [...state.customers]
      .filter(c => !q || c.name.toLowerCase().includes(q) || (c.phone || "").includes(q))
      .sort((a, b) => balanceOf(b.id) - balanceOf(a.id) || a.name.localeCompare(b.name));

    if (!list.length) {
      body.innerHTML = `<tr><td colspan="4" class="empty">${state.customers.length ? "No matches." : "No customers yet. Add one to get started."}</td></tr>`;
      return;
    }

    body.innerHTML = list.map(c => {
      const b = balanceOf(c.id);
      const cls = b > 0 ? "debt" : b < 0 ? "paid" : "";
      const badge = b > 0 ? '<span class="badge charge">Unpaid</span>'
        : b < 0 ? '<span class="badge payment">Credit</span>'
        : '<span class="badge payment">Settled</span>';
      return `<tr class="clickable ${c.id === selectedId ? "selected" : ""}" data-id="${esc(c.id)}">
        <td>${esc(c.name)}</td>
        <td>${esc(c.phone || "—")}</td>
        <td class="num ${cls}">${money.format(b)}</td>
        <td class="num">${badge}</td>
      </tr>`;
    }).join("");
  }

  function renderLedger() {
    const card = document.getElementById("ledgerCard");
    const customer = state.customers.find(c => c.id === selectedId);
    if (!customer) { card.hidden = true; return; }
    card.hidden = false;

    document.getElementById("ledgerTitle").textContent =
      customer.name + (customer.phone ? " · " + customer.phone : "");

    const b = balanceOf(customer.id);
    document.getElementById("ledgerBalance").innerHTML = b > 0
      ? `Outstanding balance: <span class="debt">${money.format(b)}</span>`
      : b < 0
        ? `Store credit (overpaid): <span class="paid">${money.format(-b)}</span>`
        : `Balance: <span class="paid">${money.format(0)} (settled)</span>`;

    // Oldest first to compute running balance, then display newest first
    const txs = state.transactions
      .filter(t => t.customerId === customer.id)
      .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt);

    let running = 0;
    const rows = txs.map(t => {
      running += t.type === "charge" ? t.amount : -t.amount;
      return { ...t, running };
    }).reverse();

    document.getElementById("ledgerBody").innerHTML = rows.length
      ? rows.map(t => `<tr>
          <td>${esc(t.date)}</td>
          <td><span class="badge ${t.type}">${t.type === "charge" ? "Credit" : "Payment"}</span></td>
          <td>${esc(t.note || "—")}</td>
          <td class="num ${t.type === "charge" ? "debt" : "paid"}">${t.type === "charge" ? "+" : "−"}${money.format(t.amount)}</td>
          <td class="num">${money.format(t.running)}</td>
          <td class="num"><button class="btn danger small" data-del-tx="${esc(t.id)}" type="button">Delete</button></td>
        </tr>`).join("")
      : `<tr><td colspan="6" class="empty">No transactions yet.</td></tr>`;
  }

  function renderAll() {
    renderStats();
    renderCustomerOptions();
    renderCustomers();
    renderLedger();
  }

  // ---------- CSV export ----------
  function exportCSV() {
    const csvCell = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const header = ["Date", "Customer", "Phone", "Type", "Amount", "Note"];
    const rows = [...state.transactions]
      .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt)
      .map(t => {
        const c = state.customers.find(x => x.id === t.customerId) || {};
        return [t.date, c.name, c.phone, t.type === "charge" ? "Credit sale" : "Payment", t.amount.toFixed(2), t.note]
          .map(csvCell).join(",");
      });
    const csv = [header.join(","), ...rows].join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `debt-report-${today()}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // ---------- Events ----------
  document.getElementById("customerForm").addEventListener("submit", e => {
    e.preventDefault();
    const name = document.getElementById("custName").value.trim();
    const phone = document.getElementById("custPhone").value.trim();
    const msg = document.getElementById("custMsg");

    if (!name) return setMsg(msg, "Please enter a name.", "error");
    if (state.customers.some(c => c.name.toLowerCase() === name.toLowerCase()))
      return setMsg(msg, "A customer with that name already exists.", "error");

    const customer = { id: uid(), name, phone, createdAt: Date.now() };
    state.customers.push(customer);
    save();
    e.target.reset();
    selectedId = customer.id;
    setMsg(msg, "Customer added.", "success");
    renderAll();
  });

  document.getElementById("txForm").addEventListener("submit", e => {
    e.preventDefault();
    const customerId = document.getElementById("txCustomer").value;
    const type = document.getElementById("txType").value;
    const amount = Math.round(parseFloat(document.getElementById("txAmount").value) * 100) / 100;
    const date = document.getElementById("txDate").value || today();
    const note = document.getElementById("txNote").value.trim();
    const msg = document.getElementById("txMsg");

    if (!customerId) return setMsg(msg, "Select a customer.", "error");
    if (!(amount > 0)) return setMsg(msg, "Enter a valid amount.", "error");

    if (type === "payment") {
      const owed = balanceOf(customerId);
      if (amount > owed &&
          !confirm(`This payment is more than the balance owed (${money.format(owed)}). Save anyway?`)) return;
    }

    state.transactions.push({ id: uid(), customerId, type, amount, date, note, createdAt: Date.now() });
    save();
    document.getElementById("txAmount").value = "";
    document.getElementById("txNote").value = "";
    selectedId = customerId;
    setMsg(msg, type === "charge" ? "Credit sale recorded." : "Payment recorded.", "success");
    renderAll();
  });

  document.getElementById("txDate").value = today();
  document.getElementById("search").addEventListener("input", renderCustomers);
  document.getElementById("exportBtn").addEventListener("click", exportCSV);

  document.getElementById("custBody").addEventListener("click", e => {
    const row = e.target.closest("tr[data-id]");
    if (!row) return;
    selectedId = row.dataset.id;
    renderAll();
  });

  document.getElementById("ledgerBody").addEventListener("click", e => {
    const btn = e.target.closest("[data-del-tx]");
    if (!btn || !confirm("Delete this transaction?")) return;
    state.transactions = state.transactions.filter(t => t.id !== btn.dataset.delTx);
    save();
    renderAll();
  });

  document.getElementById("delCustomer").addEventListener("click", () => {
    const c = state.customers.find(x => x.id === selectedId);
    if (!c) return;
    if (!confirm(`Delete ${c.name} and all their transactions? This cannot be undone.`)) return;
    state.customers = state.customers.filter(x => x.id !== c.id);
    state.transactions = state.transactions.filter(t => t.customerId !== c.id);
    selectedId = null;
    save();
    renderAll();
  });

  renderAll();
})();
