import React from "react";
import {
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { auth, db } from "./firebase";

const MONTH_NAMES = [
  "Tháng Một","Tháng Hai","Tháng Ba","Tháng Tư","Tháng Năm","Tháng Sáu",
  "Tháng Bảy","Tháng Tám","Tháng Chín","Tháng Mười","Tháng Mười Một","Tháng Mười Hai",
];

const PEOPLE = {
  "HyPUAmwgY7OmD4uGk6UhvXXcPag1": { name: "Bạn", accent: "#C4694F", soft: "#F1DFD6" },
  "rpOihQUHWjhgMSPNTuGX9yHedXG2": { name: "Người yêu", accent: "#4A7C74", soft: "#DCE7E4" },
};

const MONEY = (n) => `${(Math.round(Number(n) || 0)).toLocaleString("vi-VN")}₫`;
const monthKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
const todayISO = () => new Date().toISOString().slice(0,10);
const fmtDate = (iso) => {
  if (!iso) return "";
  const [y,m,d] = iso.split("-");
  return `${d}/${m}`;
};
const parseAmount = (s) => {
  const cleaned = String(s).replace(/[^\d]/g, "");
  return cleaned ? parseInt(cleaned, 10) : 0;
};

function Login() {
  const [email,setEmail]=React.useState("");
  const [password,setPassword]=React.useState("");
  const [loading,setLoading]=React.useState(false);
  const [error,setError]=React.useState("");

  async function submit(e) {
    e.preventDefault();
    setLoading(true); setError("");
    try { await signInWithEmailAndPassword(auth,email,password); }
    catch { setError("Email hoặc mật khẩu chưa đúng."); }
    finally { setLoading(false); }
  }

  return (
    <div className="page-center">
      <div className="login-card">
        <div className="wallet-mark">◒</div>
        <div className="eyebrow">OUR SHARED LEDGER</div>
        <h1>Quỹ chung</h1>
        <p>Đăng nhập để cùng ghi chép những khoản chi của hai bạn.</p>
        <form onSubmit={submit}>
          <label>Email</label>
          <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email của bạn" required />
          <label>Mật khẩu</label>
          <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" required />
          {error && <div className="error">{error}</div>}
          <button className="dark-btn full" disabled={loading}>{loading ? "Đang vào sổ..." : "Đăng nhập"}</button>
        </form>
      </div>
    </div>
  );
}

export default function App({ user }) {
  if (!user) return <Login />;

  const now = new Date();
  const mKey = monthKey(now);
  const person = PEOPLE[user.uid] || {name:"Bạn",accent:"#C4694F",soft:"#F1DFD6"};

  const [budget,setBudget]=React.useState(null);
  const [expenses,setExpenses]=React.useState([]);
  const [loaded,setLoaded]=React.useState(false);
  const [error,setError]=React.useState("");
  const [showBudgetForm,setShowBudgetForm]=React.useState(false);
  const [budgetInput,setBudgetInput]=React.useState("");
  const [amountInput,setAmountInput]=React.useState("");
  const [dateInput,setDateInput]=React.useState(todayISO());
  const [noteInput,setNoteInput]=React.useState("");
  const [spenderId,setSpenderId]=React.useState(user.uid);
  const [saving,setSaving]=React.useState(false);

  React.useEffect(()=>{
    const ref=doc(db,"months",mKey);
    return onSnapshot(ref,snap=>{
      const data=snap.exists()?snap.data():null;
      setBudget(data);
      setBudgetInput(data ? String(data.fund || 0) : "");
      setLoaded(true);
      if(!data) setShowBudgetForm(true);
    },(err)=>{
      console.error("Firestore months listener:", err);
      setError(`Không thể đọc quỹ tháng này: ${err?.code || "lỗi kết nối"}.`);
      setLoaded(true);
    });
  },[mKey]);

  React.useEffect(()=>{
    const q=query(collection(db,"expenses"),orderBy("date","desc"));
    return onSnapshot(q,snap=>{
      setExpenses(snap.docs.map(d=>({id:d.id,...d.data()})).filter(x=>x.month===mKey));
    },(err)=>{
      console.error("Firestore expenses listener:", err);
      setError(`Không thể đọc danh sách khoản chi: ${err?.code || "lỗi kết nối"}.`);
    });
  },[mKey]);

  const totalBudget=Number(budget?.fund||0);
  const totalSpent=expenses.reduce((s,x)=>s+Number(x.amount||0),0);
  const remaining=totalBudget-totalSpent;
  const spentPct=totalBudget>0?Math.min(100,(totalSpent/totalBudget)*100):0;

  async function saveBudget(e){
    e.preventDefault();
    const amount=parseAmount(budgetInput);
    if(!amount) return;
    setSaving(true); setError("");
    try{
      await setDoc(doc(db,"months",mKey),{
        fund:amount,month:mKey,updatedBy:user.uid,updatedByName:person.name,updatedAt:serverTimestamp()
      },{merge:true});
      setShowBudgetForm(false);
    }catch{setError("Không lưu được quỹ. Kiểm tra Firestore Rules.");}
    finally{setSaving(false);}
  }

  async function addExpense(e){
    e.preventDefault();
    const amount=parseAmount(amountInput);
    if(!amount || !dateInput) return;
    setSaving(true); setError("");
    const spender=PEOPLE[spenderId]||person;
    try{
      await addDoc(collection(db,"expenses"),{
        month:mKey,amount,note:noteInput.trim(),date:dateInput,
        payerUid:spenderId,payerName:spender.name,createdBy:user.uid,createdAt:serverTimestamp()
      });
      setAmountInput(""); setNoteInput(""); setDateInput(todayISO()); setSpenderId(user.uid);
    }catch{setError("Không thêm được khoản chi.");}
    finally{setSaving(false);}
  }

  async function removeExpense(id){
    setSaving(true); setError("");
    try{ await deleteDoc(doc(db,"expenses",id)); }
    catch{setError("Không xoá được khoản chi. Kiểm tra Rules.");}
    finally{setSaving(false);}
  }

  if(!loaded) return <div className="loading"><span className="spinner">◌</span></div>;

  return (
    <div className="app">
      <main className="shell">
        <header className="header">
          <div>
            <div className="eyebrow mono">{MONTH_NAMES[now.getMonth()]} {now.getFullYear()}</div>
            <h1>Quỹ chung</h1>
          </div>
          <button className="switch-user" onClick={()=>signOut(auth)}>
            <span className="dot" style={{background:person.accent}} />
            {person.name}
            <span className="switch-icon">⇄</span>
          </button>
        </header>

        <section className="ledger-card">
          <div className="ledger-stats">
            <div>
              <span className="stat-label">Tổng quỹ</span>
              <strong>{MONEY(totalBudget)}</strong>
            </div>
            <div>
              <span className="stat-label">Đã chi</span>
              <strong className="spent">{MONEY(totalSpent)}</strong>
            </div>
            <div>
              <span className="stat-label">Còn lại</span>
              <strong className={remaining<0?"over":"left"}>{MONEY(remaining)}</strong>
            </div>
          </div>

          <div className="progress"><div style={{width:`${spentPct}%`,background:remaining<0?"#C4694F":"#C9A468"}} /></div>

          <div className="ledger-foot">
            <span className="muted mono">
              {budget ? `Thiết lập bởi ${budget.updatedByName || "một trong hai bạn"}` : "Chưa thiết lập quỹ tháng này"}
            </span>
            <button className="text-btn" onClick={()=>{setBudgetInput(budget?String(budget.fund):"");setShowBudgetForm(true)}}>✎ {budget?"Điều chỉnh":"Thiết lập"}</button>
          </div>
          <i className="notch left-notch"/><i className="notch right-notch"/>
        </section>

        {showBudgetForm && (
          <form className="budget-form" onSubmit={saveBudget}>
            <div className="form-grow">
              <label className="dark-label mono">Quỹ {MONTH_NAMES[now.getMonth()].toLowerCase()} là bao nhiêu?</label>
              <input inputMode="numeric" value={budgetInput} onChange={e=>setBudgetInput(e.target.value)} placeholder="VD: 15000000" autoFocus />
            </div>
            <div className="form-actions">
              <button className="gold-btn" disabled={saving || !parseAmount(budgetInput)}>Lưu</button>
              {budget && <button type="button" className="cancel-btn" onClick={()=>setShowBudgetForm(false)}>Huỷ</button>}
            </div>
          </form>
        )}

        <form className="expense-form" onSubmit={addExpense}>
          <input inputMode="numeric" value={amountInput} onChange={e=>setAmountInput(e.target.value)} placeholder="Số tiền" />
          <input type="date" value={dateInput} onChange={e=>setDateInput(e.target.value)} />
          <select value={spenderId} onChange={e=>setSpenderId(e.target.value)}>
            {Object.entries(PEOPLE).map(([id,p])=><option key={id} value={id}>{p.name} chi</option>)}
          </select>
          <input className="note-input" value={noteInput} onChange={e=>setNoteInput(e.target.value)} placeholder="Ghi chú (không bắt buộc)" />
          <button className="add-btn" style={{background:person.accent}} disabled={saving || !parseAmount(amountInput)}>＋ Thêm</button>
        </form>

        {error && <div className="error error-wide">{error}<button onClick={()=>setError("")}>×</button></div>}

        <section className="list-card">
          <div className="list-head">
            <span>Danh sách khoản chi</span>
            <span className="muted mono">{expenses.length} khoản</span>
          </div>
          {expenses.length===0 ? (
            <div className="empty">Chưa có khoản chi nào trong tháng này.</div>
          ) : (
            <div>
              {[...expenses].sort((a,b)=>a.date<b.date?1:-1).map(x=>{
                const p=PEOPLE[x.payerUid]||{name:x.payerName||"Không rõ",accent:"#8A8172",soft:"#E3DBC8"};
                return (
                  <div className="expense-row" key={x.id}>
                    <span className="date mono">{fmtDate(x.date)}</span>
                    <span className="person-chip" style={{background:p.soft,color:p.accent}}>{p.name}</span>
                    <span className="note">{x.note || <em>Không có ghi chú</em>}</span>
                    <span className="amount mono">{MONEY(x.amount)}</span>
                    <button className="delete-btn" onClick={()=>removeExpense(x.id)} title="Xoá">×</button>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}