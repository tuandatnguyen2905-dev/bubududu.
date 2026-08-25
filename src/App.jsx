import React from "react";
import {
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
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
  // Đổi UID thành UID thật của 2 tài khoản Firebase.
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
      await signInWithEmailAndPassword(auth, email, password);
    } catch {
      setError("Email hoặc mật khẩu chưa đúng.");
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

function App({ user }) {
  if (!user) return <Login />;

  const currentMonth = monthKey();
  const today = new Date().toISOString().slice(0, 10);
  const displayName = getDisplayName(user);

  const [fund, setFund] = React.useState(0);
  const [fundLoaded, setFundLoaded] = React.useState(false);
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
    const monthRef = doc(db, "months", currentMonth);

    return onSnapshot(
      monthRef,
      (snap) => {
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
      () => setError("Không thể đọc dữ liệu quỹ tháng này.")
    );
  }, [currentMonth]);

  React.useEffect(() => {
    const q = query(
      collection(db, "expenses"),
      orderBy("date", "desc")
    );

    return onSnapshot(
      q,
      (snap) => {
        const all = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((x) => x.month === currentMonth);
        setExpenses(all);
      },
      () => setError("Không thể đọc danh sách chi tiêu.")
    );
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
    } catch {
      setError("Không thể lưu quỹ. Kiểm tra Firestore Rules.");
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
        payerName: PEOPLE[payer] || (payer === user.uid ? displayName : "Người yêu"),
        createdBy: user.uid,
        createdAt: serverTimestamp(),
      });

      setNote("");
      setAmount("");
      setDate(today);
      setPayer(user.uid);
      setShowExpenseModal(false);
    } catch {
      setError("Không thể lưu khoản chi.");
    } finally {
      setSaving(false);
    }
  }

  if (!fundLoaded) {
    return <div className="loading">Đang tải quỹ tháng này…</div>;
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <div className="eyebrow">OUR LITTLE FUND</div>
          <h1>Quỹ của chúng mình 💕</h1>
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
                    <span>
                      {item.payerName || "Không rõ"} · {formatDate(item.date)}
                    </span>
                  </div>
                  <strong className="expense-amount">
                    -{MONEY.format(Number(item.amount))}
                  </strong>
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
              <button type="button" className="close" onClick={() => fundLoaded && fund > 0 && setShowFundModal(false)}>×</button>
            </div>

            <p>
              Chỉ cần một người nhập. Sau khi lưu, cả hai tài khoản sẽ nhìn thấy cùng một số tiền.
            </p>

            <label>Tổng quỹ tháng</label>
            <div className="money-input">
              <input
                autoFocus
                type="number"
                min="0"
                step="1000"
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
                step="1000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="150000"
                required
              />
              <span>VNĐ</span>
            </div>

            <label>Ai là người chi?</label>
            <div className="people">
              <button
                type="button"
                className={payer === user.uid ? "person active" : "person"}
                onClick={() => setPayer(user.uid)}
              >
                <span>👤</span>
                {displayName}
              </button>

              <button
                type="button"
                className={payer !== user.uid ? "person active" : "person"}
                onClick={() => setPayer(user.uid === "HyPUAmwgY7OmD4uGk6UhvXXcPag1" ? "rpOihQUHWjhgMSPNTuGX9yHedXG2" : "HyPUAmwgY7OmD4uGk6UhvXXcPag1")}
              >
                <span>💕</span>
                {user.uid === "HyPUAmwgY7OmD4uGk6UhvXXcPag1" ? "Người yêu" : "Người yêu"}
              </button>
            </div>

            <label>Ngày chi</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />

            <button className="primary full" disabled={saving}>
              {saving ? "Đang lưu…" : "Lưu khoản chi"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export default App;