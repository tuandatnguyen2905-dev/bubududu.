import { useState, useEffect } from "react";
import { Wallet, Plus, Trash2, Pencil, ArrowLeftRight, Loader2 } from "lucide-react";

const MONTH_NAMES = [
  "Tháng Một", "Tháng Hai", "Tháng Ba", "Tháng Tư", "Tháng Năm", "Tháng Sáu",
  "Tháng Bảy", "Tháng Tám", "Tháng Chín", "Tháng Mười", "Tháng Mười Một", "Tháng Mười Hai",
];

function monthKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
function fmtVND(n) {
  return (Math.round(n) || 0).toLocaleString("vi-VN") + "₫";
}
function fmtDate(iso) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}`;
}
function parseAmount(str) {
  const cleaned = String(str).replace(/[^\d]/g, "");
  return cleaned ? parseInt(cleaned, 10) : 0;
}

const PALETTE = {
  p1: { accent: "#C4694F", accentSoft: "#F1DFD6", label: "text-[#C4694F]" },
  p2: { accent: "#4A7C74", accentSoft: "#DCE7E4", label: "text-[#4A7C74]" },
};

export default function CoupleLedger() {
  const [phase, setPhase] = useState("loading"); // loading | setup | login | app
  const [profiles, setProfiles] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [now] = useState(new Date());
  const mKey = monthKey(now);

  const [budget, setBudget] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [error, setError] = useState("");

  const [name1, setName1] = useState("");
  const [name2, setName2] = useState("");

  const [showBudgetForm, setShowBudgetForm] = useState(false);
  const [budgetInput, setBudgetInput] = useState("");

  const [amountInput, setAmountInput] = useState("");
  const [dateInput, setDateInput] = useState(todayISO());
  const [noteInput, setNoteInput] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        let profs = null;
        try {
          const r = await window.storage.get("profiles", true);
          profs = r ? JSON.parse(r.value) : null;
        } catch (_) {}

        let bud = null;
        try {
          const r = await window.storage.get(`budget:${mKey}`, true);
          bud = r ? JSON.parse(r.value) : null;
        } catch (_) {}

        let exp = [];
        try {
          const r = await window.storage.get(`expenses:${mKey}`, true);
          exp = r ? JSON.parse(r.value) : [];
        } catch (_) {}

        setProfiles(profs);
        setBudget(bud);
        setExpenses(exp);
        setPhase(profs ? "login" : "setup");
      } catch (e) {
        setError("Không tải được dữ liệu. Hãy thử tải lại trang.");
        setPhase("setup");
      }
    })();
  }, []);

  async function handleSetup(e) {
    e.preventDefault();
    if (!name1.trim() || !name2.trim()) return;
    const profs = [
      { id: "p1", name: name1.trim() },
      { id: "p2", name: name2.trim() },
    ];
    setSaving(true);
    try {
      await window.storage.set("profiles", JSON.stringify(profs), true);
      setProfiles(profs);
      setPhase("login");
    } catch (_) {
      setError("Không lưu được tên. Thử lại nhé.");
    } finally {
      setSaving(false);
    }
  }

  function login(p) {
    setCurrentUser(p);
    setPhase("app");
    if (!budget) setShowBudgetForm(true);
  }

  async function handleSaveBudget(e) {
    e.preventDefault();
    const amt = parseAmount(budgetInput);
    if (!amt) return;
    const payload = { amount: amt, setBy: currentUser.name, setAt: new Date().toISOString() };
    setSaving(true);
    try {
      await window.storage.set(`budget:${mKey}`, JSON.stringify(payload), true);
      setBudget(payload);
      setShowBudgetForm(false);
      setBudgetInput("");
    } catch (_) {
      setError("Không lưu được quỹ. Thử lại nhé.");
    } finally {
      setSaving(false);
    }
  }

  async function handleAddExpense(e) {
    e.preventDefault();
    const amt = parseAmount(amountInput);
    if (!amt || !dateInput) return;
    const entry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      amount: amt,
      spenderId: currentUser.id,
      spenderName: currentUser.name,
      date: dateInput,
      note: noteInput.trim(),
    };
    setSaving(true);
    try {
      let latest = [];
      try {
        const r = await window.storage.get(`expenses:${mKey}`, true);
        latest = r ? JSON.parse(r.value) : [];
      } catch (_) {}
      const updated = [...latest, entry];
      await window.storage.set(`expenses:${mKey}`, JSON.stringify(updated), true);
      setExpenses(updated);
      setAmountInput("");
      setNoteInput("");
      setDateInput(todayISO());
    } catch (_) {
      setError("Không thêm được khoản chi. Thử lại nhé.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    setSaving(true);
    try {
      let latest = [];
      try {
        const r = await window.storage.get(`expenses:${mKey}`, true);
        latest = r ? JSON.parse(r.value) : [];
      } catch (_) {}
      const updated = latest.filter((x) => x.id !== id);
      await window.storage.set(`expenses:${mKey}`, JSON.stringify(updated), true);
      setExpenses(updated);
    } catch (_) {
      setError("Không xoá được. Thử lại nhé.");
    } finally {
      setSaving(false);
    }
  }

  const totalBudget = budget?.amount || 0;
  const totalSpent = expenses.reduce((s, x) => s + x.amount, 0);
  const remaining = totalBudget - totalSpent;
  const sortedExpenses = [...expenses].sort((a, b) => (a.date < b.date ? 1 : -1));

  const FONTS = (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap');
      .font-display { font-family: 'Fraunces', serif; }
      .font-body { font-family: 'Inter', sans-serif; }
      .font-mono { font-family: 'JetBrains Mono', monospace; }
    `}</style>
  );

  if (phase === "loading") {
    return (
      <div className="min-h-[500px] w-full flex items-center justify-center bg-[#1D2430]">
        {FONTS}
        <Loader2 className="animate-spin text-[#C9A468]" size={28} />
      </div>
    );
  }

  if (phase === "setup") {
    return (
      <div className="min-h-[500px] w-full flex items-center justify-center bg-[#1D2430] font-body px-4 py-10">
        {FONTS}
        <div className="w-full max-w-sm bg-[#F4EFE4] rounded-lg p-8 shadow-xl">
          <Wallet className="text-[#C4694F] mb-3" size={26} />
          <h1 className="font-display text-2xl text-[#1D2430] mb-1">Lập sổ quỹ chung</h1>
          <p className="text-sm text-[#6B6558] mb-6">Nhập tên của hai bạn — chỉ cần làm một lần.</p>
          <form onSubmit={handleSetup} className="space-y-3">
            <input
              value={name1}
              onChange={(e) => setName1(e.target.value)}
              placeholder="Tên người thứ nhất"
              className="w-full rounded-md border border-[#D8CFBC] bg-white px-3.5 py-2.5 text-[#1D2430] outline-none focus:border-[#C4694F] focus:ring-2 focus:ring-[#C4694F]/20"
            />
            <input
              value={name2}
              onChange={(e) => setName2(e.target.value)}
              placeholder="Tên người thứ hai"
              className="w-full rounded-md border border-[#D8CFBC] bg-white px-3.5 py-2.5 text-[#1D2430] outline-none focus:border-[#4A7C74] focus:ring-2 focus:ring-[#4A7C74]/20"
            />
            <button
              type="submit"
              disabled={saving || !name1.trim() || !name2.trim()}
              className="w-full rounded-md bg-[#1D2430] text-[#F4EFE4] py-2.5 font-medium hover:bg-[#2A3242] transition-colors disabled:opacity-40"
            >
              {saving ? "Đang lưu..." : "Bắt đầu"}
            </button>
          </form>
          {error && <p className="text-sm text-[#C4694F] mt-3">{error}</p>}
        </div>
      </div>
    );
  }

  if (phase === "login") {
    return (
      <div className="min-h-[500px] w-full flex items-center justify-center bg-[#1D2430] font-body px-4 py-10">
        {FONTS}
        <div className="w-full max-w-sm bg-[#F4EFE4] rounded-lg p-8 shadow-xl text-center">
          <Wallet className="text-[#C4694F] mx-auto mb-3" size={26} />
          <h1 className="font-display text-2xl text-[#1D2430] mb-1">Bạn là ai?</h1>
          <p className="text-sm text-[#6B6558] mb-6">Chọn tên để bắt đầu ghi chép.</p>
          <div className="space-y-3">
            {profiles.map((p) => {
              const c = PALETTE[p.id];
              return (
                <button
                  key={p.id}
                  onClick={() => login(p)}
                  className="w-full rounded-md py-3.5 font-display text-lg text-white transition-transform hover:scale-[1.02]"
                  style={{ backgroundColor: c.accent }}
                >
                  {p.name}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ---- main app ----
  const spentPct = totalBudget > 0 ? Math.min(100, (totalSpent / totalBudget) * 100) : 0;

  return (
    <div className="min-h-[600px] w-full bg-[#1D2430] font-body px-4 py-8 sm:px-8">
      {FONTS}
      <div className="max-w-2xl mx-auto">
        {/* header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-[#8B93A6] text-xs uppercase tracking-widest font-mono mb-1">
              {MONTH_NAMES[now.getMonth()]} {now.getFullYear()}
            </p>
            <h1 className="font-display text-2xl text-[#F4EFE4]">Quỹ chung</h1>
          </div>
          <button
            onClick={() => { setCurrentUser(null); setPhase("login"); }}
            className="flex items-center gap-1.5 text-[#8B93A6] hover:text-[#F4EFE4] text-sm transition-colors"
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: PALETTE[currentUser.id].accent }}
            />
            {currentUser.name}
            <ArrowLeftRight size={14} />
          </button>
        </div>

        {/* ledger stub — signature element */}
        <div className="relative bg-[#F4EFE4] rounded-lg px-6 pt-6 pb-5 mb-6 shadow-xl">
          <div className="grid grid-cols-3 divide-x divide-dashed divide-[#C9BCA0]">
            <div className="pr-3">
              <p className="text-[10px] uppercase tracking-widest text-[#8A8172] font-mono mb-1.5">Tổng quỹ</p>
              <p className="font-display text-lg sm:text-xl text-[#1D2430] leading-tight">{fmtVND(totalBudget)}</p>
            </div>
            <div className="px-3">
              <p className="text-[10px] uppercase tracking-widest text-[#8A8172] font-mono mb-1.5">Đã chi</p>
              <p className="font-display text-lg sm:text-xl text-[#C4694F] leading-tight">{fmtVND(totalSpent)}</p>
            </div>
            <div className="pl-3">
              <p className="text-[10px] uppercase tracking-widest text-[#8A8172] font-mono mb-1.5">Còn lại</p>
              <p
                className="font-display text-lg sm:text-xl leading-tight"
                style={{ color: remaining < 0 ? "#C4694F" : "#4A7C74" }}
              >
                {fmtVND(remaining)}
              </p>
            </div>
          </div>

          {/* progress bar */}
          <div className="mt-4 h-1.5 rounded-full bg-[#E3DBC8] overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${spentPct}%`, backgroundColor: remaining < 0 ? "#C4694F" : "#C9A468" }}
            />
          </div>

          <div className="mt-3 flex items-center justify-between">
            <p className="text-xs text-[#8A8172] font-mono">
              {budget ? `Thiết lập bởi ${budget.setBy}` : "Chưa thiết lập quỹ tháng này"}
            </p>
            <button
              onClick={() => { setShowBudgetForm(true); setBudgetInput(budget ? String(budget.amount) : ""); }}
              className="flex items-center gap-1 text-xs text-[#4A7C74] hover:text-[#1D2430] font-medium transition-colors"
            >
              <Pencil size={12} /> {budget ? "Điều chỉnh" : "Thiết lập"}
            </button>
          </div>

          {/* perforation notches */}
          <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-[#1D2430]" />
          <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-[#1D2430]" />
        </div>

        {/* budget form */}
        {showBudgetForm && (
          <form
            onSubmit={handleSaveBudget}
            className="bg-[#2A3242] rounded-lg p-5 mb-6 flex flex-col sm:flex-row gap-3 sm:items-end"
          >
            <div className="flex-1">
              <label className="block text-xs text-[#8B93A6] font-mono mb-1.5">
                Quỹ tháng {MONTH_NAMES[now.getMonth()].toLowerCase()} là bao nhiêu?
              </label>
              <input
                autoFocus
                inputMode="numeric"
                value={budgetInput}
                onChange={(e) => setBudgetInput(e.target.value)}
                placeholder="VD: 15000000"
                className="w-full rounded-md border border-[#3D4658] bg-[#1D2430] px-3.5 py-2.5 text-[#F4EFE4] font-mono outline-none focus:border-[#C9A468]"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving || !parseAmount(budgetInput)}
                className="rounded-md bg-[#C9A468] text-[#1D2430] px-4 py-2.5 font-medium hover:brightness-105 transition disabled:opacity-40"
              >
                Lưu
              </button>
              {budget && (
                <button
                  type="button"
                  onClick={() => setShowBudgetForm(false)}
                  className="rounded-md border border-[#3D4658] text-[#8B93A6] px-4 py-2.5 hover:text-[#F4EFE4] transition"
                >
                  Huỷ
                </button>
              )}
            </div>
          </form>
        )}

        {/* add expense */}
        <form
          onSubmit={handleAddExpense}
          className="bg-[#2A3242] rounded-lg p-5 mb-6 flex flex-col sm:flex-row gap-3"
        >
          <input
            inputMode="numeric"
            value={amountInput}
            onChange={(e) => setAmountInput(e.target.value)}
            placeholder="Số tiền"
            className="sm:w-32 rounded-md border border-[#3D4658] bg-[#1D2430] px-3.5 py-2.5 text-[#F4EFE4] font-mono outline-none focus:border-[#C9A468]"
          />
          <input
            type="date"
            value={dateInput}
            onChange={(e) => setDateInput(e.target.value)}
            className="sm:w-40 rounded-md border border-[#3D4658] bg-[#1D2430] px-3.5 py-2.5 text-[#F4EFE4] font-mono outline-none focus:border-[#C9A468]"
          />
          <input
            value={noteInput}
            onChange={(e) => setNoteInput(e.target.value)}
            placeholder="Ghi chú (không bắt buộc)"
            className="flex-1 rounded-md border border-[#3D4658] bg-[#1D2430] px-3.5 py-2.5 text-[#F4EFE4] outline-none focus:border-[#C9A468]"
          />
          <button
            type="submit"
            disabled={saving || !parseAmount(amountInput)}
            className="flex items-center justify-center gap-1.5 rounded-md text-white px-4 py-2.5 font-medium hover:brightness-110 transition disabled:opacity-40"
            style={{ backgroundColor: PALETTE[currentUser.id].accent }}
          >
            <Plus size={16} /> Thêm
          </button>
        </form>

        {error && <p className="text-sm text-[#C4694F] mb-4">{error}</p>}

        {/* expense list */}
        <div className="bg-[#F4EFE4] rounded-lg overflow-hidden shadow-xl">
          <div className="px-5 py-3 border-b border-[#E3DBC8] flex items-center justify-between">
            <p className="font-display text-[#1D2430]">Danh sách khoản chi</p>
            <p className="text-xs text-[#8A8172] font-mono">{expenses.length} khoản</p>
          </div>

          {sortedExpenses.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="text-[#8A8172] text-sm">Chưa có khoản chi nào trong tháng này.</p>
            </div>
          ) : (
            <div className="divide-y divide-[#E3DBC8]">
              {sortedExpenses.map((x) => {
                const c = PALETTE[x.spenderId] || PALETTE.p1;
                return (
                  <div key={x.id} className="group flex items-center gap-3 px-5 py-3 hover:bg-[#EFE8D8] transition-colors">
                    <span className="font-mono text-xs text-[#8A8172] w-10 shrink-0">{fmtDate(x.date)}</span>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-medium shrink-0"
                      style={{ backgroundColor: c.accentSoft, color: c.accent }}
                    >
                      {x.spenderName}
                    </span>
                    <span className="flex-1 text-sm text-[#1D2430] truncate">
                      {x.note || <span className="text-[#B3A98F] italic">Không có ghi chú</span>}
                    </span>
                    <span className="font-mono text-sm text-[#1D2430] shrink-0">{fmtVND(x.amount)}</span>
                    <button
                      onClick={() => handleDelete(x.id)}
                      className="opacity-0 group-hover:opacity-100 text-[#B3A98F] hover:text-[#C4694F] transition shrink-0"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
