import React from "react";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { auth, db } from "./firebase";

const MONEY = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

const PEOPLE = {
  "HyPUAmwgY7OmD4uGk6UhvXXcPag1": "Bạn",
  "rpOihQUHWjhgMSPNTuGX9yHedXG2": "Người yêu",
};

function monthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key) {
  const [year, month] = key.split("-");
  return `Tháng ${Number(month)}/${year}`;
}

function formatDate(value) {
  if (!value) return "";
  const [y, m, d] = value.split("-");
  return `${d}/${m}/${y}`;
}

function getDisplayName(user) {
  return PEOPLE[user.uid] || user.email?.split("@")[0] || "Bạn";
}

function Login() {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (err) {
      console.error("Login error:", err);

      const code = err?.code || "";
      const messages = {
        "auth/invalid-credential": "Email hoặc mật khẩu không đúng, hoặc tài khoản chưa tồn tại trong Firebase project này.",
        "auth/wrong-password": "Mật khẩu không đúng.",
        "auth/user-not-found": "Không tìm thấy tài khoản email này trong Firebase.",
        "auth/invalid-email": "Email không đúng định dạng.",
        "auth/user-disabled": "Tài khoản này đang bị vô hiệu hóa trong Firebase.",
        "auth/too-many-requests": "Có quá nhiều lần đăng nhập thất bại. Hãy chờ một lúc rồi thử lại.",
        "auth/network-request-failed": "Không kết nối được tới Firebase. Hãy kiểm tra Internet.",
        "auth/operation-not-allowed": "Đăng nhập bằng Email/Password chưa được bật trong Firebase Authentication."
      };

      setError(messages[code] || `Đăng nhập thất bại (${code || "unknown-error"}). Hãy mở Console để xem chi tiết.`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <form className="login-card" onSubmit={handleLogin}>
        <div className="logo">♥</div>
        <h1>Quỹ của chúng mình</h1>
        <p>Đăng nhập để cùng quản lý chi tiêu tháng này.</p>

        <label>Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
        />

        <label>Mật khẩu</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required
        />

        {error && <div className="error">{error}</div>}

        <button className="primary full" disabled={loading}>
          {loading ? "Đang đăng nhập…" : "Đăng nhập"}
        </button>
      </form>
    </main>
  );
}

function Dashboard({ user }) {

  const currentMonth = monthKey();
  const today = new Date().toISOString().slice(0, 10);
  const displayName = getDisplayName(user);
  const partnerUid = user.uid === "HyPUAmwgY7OmD4uGk6UhvXXcPag1"
    ? "rpOihQUHWjhgMSPNTuGX9yHedXG2"
    : "HyPUAmwgY7OmD4uGk6UhvXXcPag1";

  const [fund, setFund] = React.useState(0);
  const [fundLoaded, setFundLoaded] = React.useState(false);
  const [expensesLoaded, setExpensesLoaded] = React.useState(false);
  const [expenses, setExpenses] = React.useState([]);
  const [showFundModal, setShowFundModal] = React.useState(false);
  const [showExpenseModal, setShowExpenseModal] = React.useState(false);
  const [fundInput, setFundInput] = React.useState("");
  const [note, setNote] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [date, setDate] = React.useState(today);
  const [payer, setPayer] = React.useState(user.uid);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    let active = true;
    setFundLoaded(false);
    setError("");

    const monthRef = doc(db, "months", currentMonth);

    const unsubscribe = onSnapshot(
      monthRef,
      (snap) => {
        if (!active) return;
        if (snap.exists()) {
          const value = Number(snap.data().fund || 0);
          setFund(value);
          setFundInput(String(value));
          setShowFundModal(false);
        } else {
          setFund(0);
          setFundInput("");
          setShowFundModal(true);
        }
        setFundLoaded(true);
      },
      (err) => {
        console.error("Firestore months error:", err);
        if (!active) return;
        setFundLoaded(true);
        setError(`Không thể đọc quỹ tháng này (${err.code || "unknown-error"}). Hãy kiểm tra Firestore Rules.`);
      }
    );

    return () => {
      active = false;
      unsubscribe();
    };
  }, [currentMonth]);

  React.useEffect(() => {
    let active = true;
    setExpensesLoaded(false);

    const q = query(collection(db, "expenses"), orderBy("date", "desc"));

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        if (!active) return;
        const all = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((x) => x.month === currentMonth);
        setExpenses(all);
        setExpensesLoaded(true);
      },
      (err) => {
        console.error("Firestore expenses error:", err);
        if (!active) return;
        setExpensesLoaded(true);
        setError((current) => current || `Không thể đọc danh sách chi tiêu (${err.code || "unknown-error"}). Hãy kiểm tra Firestore Rules.`);
      }
    );

    return () => {
      active = false;
      unsubscribe();
    };
  }, [currentMonth]);

  const spent = expenses.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const remaining = fund - spent;

  async function saveFund(e) {
    e.preventDefault();
    const value = Number(fundInput);

    if (!Number.isFinite(value) || value < 0) {
      setError("Hãy nhập số tiền hợp lệ.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      await setDoc(
        doc(db, "months", currentMonth),
        {
          fund: value,
          month: currentMonth,
          updatedBy: user.uid,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      setShowFundModal(false);
    } catch (err) {
      console.error("Save fund error:", err);
      setError(`Không thể lưu quỹ (${err.code || "unknown-error"}). Hãy kiểm tra Firestore Rules.`);
    } finally {
      setSaving(false);
    }
  }

  async function addExpense(e) {
    e.preventDefault();
    const value = Number(amount);

    if (!Number.isFinite(value) || value <= 0) {
      setError("Hãy nhập khoản chi lớn hơn 0.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      await addDoc(collection(db, "expenses"), {
        month: currentMonth,
        amount: value,
        note: note.trim() || "Khoản chi",
        date,
        payerUid: payer,
        payerName: PEOPLE[payer] || "Người yêu",
        createdBy: user.uid,
        createdAt: serverTimestamp(),
      });

      setNote("");
      setAmount("");
      setDate(today);
      setPayer(user.uid);
      setShowExpenseModal(false);
    } catch (err) {
      console.error("Add expense error:", err);
      setError(`Không thể lưu khoản chi (${err.code || "unknown-error"}). Hãy kiểm tra Firestore Rules.`);
    } finally {
      setSaving(false);
    }
  }

  if (!fundLoaded || !expensesLoaded) {
    return (
      <div className="loading-page">
        <div className="loading-card">
          <div className="logo">♥</div>
          <h2>Đang mở quỹ của chúng mình…</h2>
          <p>Đang kết nối với Firebase.</p>
          {error && (
            <div className="error loading-error">
              {error}
              <button onClick={() => window.location.reload()}>Tải lại</button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <div className="eyebrow">OUR LITTLE FUND</div>
          <h1>Quỹ chi tiêu cho bé 💕</h1>
          <div className="month">{monthLabel(currentMonth)}</div>
        </div>

        <div className="header-actions">
          <span className="user-pill">{displayName}</span>
          <button className="ghost" onClick={() => signOut(auth)}>Đăng xuất</button>
        </div>
      </header>

      <main className="content">
        {error && (
          <div className="error banner">
            {error}
            <button onClick={() => setError("")}>×</button>
          </div>
        )}

        <section className="summary-grid">
          <div className="summary-card fund">
            <span>Tổng tiền tháng này</span>
            <strong>{MONEY.format(fund)}</strong>
            <button onClick={() => setShowFundModal(true)}>Điều chỉnh quỹ</button>
          </div>

          <div className="summary-card">
            <span>Đã chi</span>
            <strong>{MONEY.format(spent)}</strong>
            <small>{expenses.length} khoản chi</small>
          </div>

          <div className={`summary-card ${remaining < 0 ? "negative" : "remaining"}`}>
            <span>Còn lại</span>
            <strong>{MONEY.format(remaining)}</strong>
            <small>{remaining < 0 ? "Đã vượt quỹ" : "Vẫn còn trong quỹ"}</small>
          </div>
        </section>

        <section className="expenses-section">
          <div className="section-heading">
            <div>
              <h2>Chi tiêu tháng này</h2>
              <p>Ai chi, chi gì, bao nhiêu và vào ngày nào đều nằm ở đây.</p>
            </div>
            <button className="primary" onClick={() => setShowExpenseModal(true)}>
              + Thêm khoản chi
            </button>
          </div>

          <div className="expense-list">
            {expenses.length === 0 ? (
              <div className="empty">
                <div className="empty-icon">🧾</div>
                <h3>Chưa có khoản chi nào</h3>
                <p>Chiếc quỹ đang sạch bong. Thêm khoản đầu tiên nhé.</p>
              </div>
            ) : (
              expenses.map((item) => (
                <div className="expense-row" key={item.id}>
                  <div className="expense-icon">₫</div>
                  <div className="expense-main">
                    <strong>{item.note}</strong>
                    <span>{item.payerName || "Không rõ"} · {formatDate(item.date)}</span>
                  </div>
                  <strong className="expense-amount">-{MONEY.format(Number(item.amount))}</strong>
                </div>
              ))
            )}
          </div>
        </section>
      </main>

      {showFundModal && (
        <div className="modal-backdrop">
          <form className="modal" onSubmit={saveFund}>
            <div className="modal-top">
              <div>
                <span className="eyebrow">NEW MONTH</span>
                <h2>Quỹ tháng này là bao nhiêu?</h2>
              </div>
              <button type="button" className="close" onClick={() => fund > 0 && setShowFundModal(false)}>×</button>
            </div>

            <p>Chỉ cần một người nhập. Sau khi lưu, cả hai tài khoản sẽ nhìn thấy cùng một số tiền.</p>

            <label>Tổng quỹ tháng</label>
            <div className="money-input">
              <input
                autoFocus
                type="number"
                min="0"
                step="1"
                value={fundInput}
                onChange={(e) => setFundInput(e.target.value)}
                placeholder="Ví dụ: 10000000"
                required
              />
              <span>VNĐ</span>
            </div>

            <button className="primary full" disabled={saving}>
              {saving ? "Đang lưu…" : "Lưu quỹ tháng"}
            </button>
          </form>
        </div>
      )}

      {showExpenseModal && (
        <div className="modal-backdrop">
          <form className="modal" onSubmit={addExpense}>
            <div className="modal-top">
              <div>
                <span className="eyebrow">NEW EXPENSE</span>
                <h2>Thêm khoản chi</h2>
              </div>
              <button type="button" className="close" onClick={() => setShowExpenseModal(false)}>×</button>
            </div>

            <label>Khoản chi</label>
            <input
              autoFocus
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ví dụ: Ăn tối, tiền điện…"
              required
            />

            <label>Số tiền</label>
            <div className="money-input">
              <input
                type="number"
                min="1"
                step="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="150000"
                required
              />
              <span>VNĐ</span>
            </div>

            <label>Ai là người chi?</label>
            <div className="people">
              <button type="button" className={payer === user.uid ? "person active" : "person"} onClick={() => setPayer(user.uid)}>
                <span>👤</span>{displayName}
              </button>
              <button type="button" className={payer === partnerUid ? "person active" : "person"} onClick={() => setPayer(partnerUid)}>
                <span>💕</span>Người yêu
              </button>
            </div>

            <label>Ngày chi</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />

            <button className="primary full" disabled={saving}>
              {saving ? "Đang lưu…" : "Lưu khoản chi"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function App({ user }) {
  return user ? <Dashboard user={user} /> : <Login />;
}

export default App;
