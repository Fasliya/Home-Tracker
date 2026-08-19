import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  Wallet, Plus, LayoutDashboard, List, Settings, TrendingUp, TrendingDown,
  Trash2, Car, ChevronLeft, ChevronRight, X, Check, AlertCircle, Users, PiggyBank, Download, Upload,
} from "lucide-react";

// ---------- Local storage shim (browser localStorage instead of Claude artifact storage) ----------
const storage = {
  async get(key) {
    try {
      const value = window.localStorage.getItem(key);
      return value !== null ? { key, value } : null;
    } catch (e) {
      throw e;
    }
  },
  async set(key, value) {
    try {
      window.localStorage.setItem(key, value);
      return { key, value };
    } catch (e) {
      throw e;
    }
  },
};


// ---------- Theme ----------
const FONTS = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600&display=swap');
.ft-display{font-family:'Fraunces',serif;}
.ft-body{font-family:'Inter',sans-serif;}
.ft-mono{font-family:'IBM Plex Mono',monospace; font-variant-numeric: tabular-nums;}
`;

const COLORS = {
  bg: "#EEF2EE",
  paper: "#FFFFFF",
  ink: "#182B2A",
  inkSoft: "#5B6B67",
  line: "#DCE3DC",
  brand: "#2F6F5E",
  brandDark: "#1F4E42",
  brandTint: "#E4EEE9",
  gold: "#AD8A3F",
  goldTint: "#F3ECDA",
  red: "#B5473A",
  redTint: "#F6E6E2",
};

// ---------- Categories ----------
const GROUP_COLORS = {
  Home: "#2F6F5E",
  Transportation: "#B5473A",
  Personal: "#8A5A8C",
  Food: "#B06A2E",
  Other: "#4B6E8A",
};
const GROUP_ORDER = ["Home", "Transportation", "Personal", "Food", "Other"];

const DEFAULT_CATEGORIES = [
  { key: "Groceries", emoji: "🛒", group: "Home" },
  { key: "Electricity", emoji: "💡", group: "Home" },
  { key: "Water", emoji: "💧", group: "Home" },
  { key: "Internet", emoji: "🌐", group: "Home" },
  { key: "Mobile bills", emoji: "📱", group: "Home" },
  { key: "Home maintenance", emoji: "🔧", group: "Home" },
  { key: "Fuel", emoji: "⛽", group: "Transportation" },
  { key: "Vehicle maintenance", emoji: "🚗", group: "Transportation" },
  { key: "Parking", emoji: "🅿️", group: "Transportation" },
  { key: "Clothing", emoji: "👕", group: "Personal" },
  { key: "Pharmacy/medical", emoji: "💊", group: "Personal" },
  { key: "Personal care", emoji: "💇", group: "Personal" },
  { key: "Education", emoji: "🎓", group: "Personal" },
  { key: "Gifts", emoji: "🎁", group: "Personal" },
  { key: "Eating out", emoji: "🍱", group: "Food" },
  { key: "Coffee/snacks", emoji: "☕", group: "Food" },
  { key: "Entertainment", emoji: "🎬", group: "Other" },
  { key: "Travel", emoji: "✈️", group: "Other" },
  { key: "Subscriptions", emoji: "🔁", group: "Other" },
  { key: "Miscellaneous", emoji: "🧾", group: "Other" },
];

const PAYMENT_METHODS = [
  { key: "Cash", emoji: "💵" },
  { key: "Card", emoji: "💳" },
  { key: "UPI", emoji: "📲" },
  { key: "Bank Transfer", emoji: "🏦" },
  { key: "Other", emoji: "🔖" },
];

const CURRENCIES = [
  { symbol: "Rs.", code: "LKR" },
  { symbol: "₹", code: "INR" },
  { symbol: "$", code: "USD" },
  { symbol: "€", code: "EUR" },
  { symbol: "£", code: "GBP" },
];

const MEMBER_PALETTE = ["#2F6F5E", "#B5473A", "#AD8A3F", "#4B6E8A", "#8A5A8C", "#B06A2E", "#5C7A3E"];
const memberColor = (name) => {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return MEMBER_PALETTE[Math.abs(h) % MEMBER_PALETTE.length];
};

const getAllCategories = (data) => [...DEFAULT_CATEGORIES, ...(data.customCategories || [])];
const findCategory = (data, key) => getAllCategories(data).find((c) => c.key === key);
const catEmoji = (data, key) => findCategory(data, key)?.emoji || "🧾";
const catColor = (data, key) => GROUP_COLORS[findCategory(data, key)?.group] || GROUP_COLORS.Other;

const STORAGE_KEY = "family-budget-data-v3";
const todayISO = () => new Date().toISOString().slice(0, 10);
const monthKeyOf = (isoDate) => isoDate.slice(0, 7);
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTH_NAMES_FULL = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

const DEFAULT_DATA = () => ({
  currency: "Rs.",
  vehicles: [],
  familyMembers: [{ id: "m-you", name: "You" }],
  customCategories: [],
  transactions: [],
  budgets: {},
  setupDone: false,
});

function useAppData() {
  const [data, setData] = useState(null);
  const [status, setStatus] = useState("loading");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await storage.get(STORAGE_KEY);
        if (res && res.value) {
          setData({ ...DEFAULT_DATA(), ...JSON.parse(res.value) });
        } else {
          setData(DEFAULT_DATA());
        }
        setStatus("ready");
      } catch (e) {
        setData(DEFAULT_DATA());
        setStatus("ready");
      }
    })();
  }, []);

  const persist = useCallback(async (next) => {
    setData(next);
    setSaving(true);
    try {
      const result = await storage.set(STORAGE_KEY, JSON.stringify(next));
      if (!result) console.error("Storage save returned null");
    } catch (e) {
      console.error("Storage save failed", e);
    } finally {
      setSaving(false);
    }
  }, []);

  return { data, status, saving, persist };
}

// ---------- Small UI atoms ----------
function Card({ children, style, className = "" }) {
  return (
    <div className={`rounded-2xl ${className}`} style={{ background: COLORS.paper, border: `1px solid ${COLORS.line}`, ...style }}>
      {children}
    </div>
  );
}

function EmojiBadge({ emoji, color, size = 38 }) {
  return (
    <div className="flex items-center justify-center rounded-xl shrink-0" style={{ width: size, height: size, background: color + "1A", fontSize: size * 0.5 }}>
      {emoji}
    </div>
  );
}

function Avatar({ name, size = 22 }) {
  const color = memberColor(name);
  return (
    <div className="flex items-center justify-center rounded-full shrink-0 ft-body" style={{ width: size, height: size, background: color, color: "#fff", fontSize: size * 0.42, fontWeight: 700 }}>
      {name.trim().charAt(0).toUpperCase()}
    </div>
  );
}

function Money({ value, currency, size = 16, weight = 600, color }) {
  const negative = value < 0;
  return (
    <span className="ft-mono" style={{ fontSize: size, fontWeight: weight, color: color || (negative ? COLORS.red : COLORS.ink) }}>
      {negative ? "-" : ""}{currency} {Math.abs(value).toLocaleString(undefined, { maximumFractionDigits: 0 })}
    </span>
  );
}

function Chip({ active, onClick, children, color = COLORS.brand, style }) {
  return (
    <button
      onClick={onClick}
      className="ft-body rounded-full px-2.5 py-1.5 whitespace-nowrap"
      style={{ fontSize: 12, fontWeight: 600, border: `1.5px solid ${active ? color : COLORS.line}`, background: active ? color + "16" : "transparent", color: active ? color : COLORS.inkSoft, ...style }}
    >
      {children}
    </button>
  );
}

// ---------- Onboarding ----------
function Onboarding({ onDone, currency }) {
  const [amount, setAmount] = useState("");
  return (
    <div className="min-h-full flex flex-col items-center justify-center p-6" style={{ background: COLORS.bg }}>
      <div className="w-full max-w-sm text-center mb-8">
        <div className="mx-auto mb-4 flex items-center justify-center rounded-2xl" style={{ width: 56, height: 56, background: COLORS.brandTint, color: COLORS.brand }}>
          <Wallet size={26} />
        </div>
        <h1 className="ft-display" style={{ fontSize: 26, fontWeight: 600, color: COLORS.ink }}>Set up your household ledger</h1>
        <p className="ft-body mt-2" style={{ color: COLORS.inkSoft, fontSize: 14 }}>
          How much cash do you have on hand right now? Add family members, vehicles, and budgets afterward in Settings and Budgets.
        </p>
      </div>
      <Card className="w-full max-w-sm p-5">
        <label className="ft-body block mb-2" style={{ fontSize: 12, color: COLORS.inkSoft, fontWeight: 600 }}>CURRENT AMOUNT IN HAND</label>
        <div className="flex items-center gap-2 rounded-xl px-3 py-2" style={{ border: `1px solid ${COLORS.line}` }}>
          <span className="ft-mono" style={{ color: COLORS.inkSoft, fontSize: 16 }}>{currency}</span>
          <input
            autoFocus
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
            placeholder="0"
            className="ft-mono w-full bg-transparent outline-none"
            style={{ fontSize: 18, color: COLORS.ink }}
          />
        </div>
        <button
          onClick={() => onDone(parseFloat(amount) || 0)}
          className="ft-body w-full mt-4 rounded-xl py-3 flex items-center justify-center gap-2"
          style={{ background: COLORS.brand, color: "#fff", fontWeight: 600, fontSize: 14 }}
        >
          Start tracking <Check size={16} />
        </button>
      </Card>
    </div>
  );
}

// ---------- Month picker (Jan-Dec strip + year) ----------
function MonthPicker({ month, setMonth }) {
  const [year, monthNum] = month.split("-").map(Number);
  const changeYear = (delta) => setMonth(`${year + delta}-${String(monthNum).padStart(2, "0")}`);
  const selectMonth = (idx) => setMonth(`${year}-${String(idx + 1).padStart(2, "0")}`);
  return (
    <div>
      <div className="flex items-center justify-between px-1 mb-2">
        <button onClick={() => changeYear(-1)} className="p-1.5 rounded-lg" style={{ color: COLORS.brand }}><ChevronLeft size={18} /></button>
        <span className="ft-display" style={{ fontSize: 15, fontWeight: 600, color: COLORS.ink }}>{year}</span>
        <button onClick={() => changeYear(1)} className="p-1.5 rounded-lg" style={{ color: COLORS.brand }}><ChevronRight size={18} /></button>
      </div>
      <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
        {MONTH_NAMES.map((m, i) => (
          <Chip key={m} active={monthNum === i + 1} onClick={() => selectMonth(i)} style={{ minWidth: 44, textAlign: "center", justifyContent: "center" }}>
            {m}
          </Chip>
        ))}
      </div>
    </div>
  );
}

// ---------- Monthly statement (receipt style) ----------
function MonthlyStatement({ month, income, expense, byCategory, currency }) {
  return (
    <Card className="p-5">
      <p className="ft-body mb-3" style={{ fontSize: 11, color: COLORS.inkSoft, fontWeight: 700, letterSpacing: 0.5 }}>
        {MONTH_NAMES_FULL[Number(month.split("-")[1]) - 1].toUpperCase()} STATEMENT
      </p>
      <div className="flex justify-between items-baseline py-1">
        <span className="ft-body" style={{ fontSize: 14, color: COLORS.ink, fontWeight: 600 }}>Income</span>
        <Money value={income} currency={currency} size={14} weight={700} color={COLORS.brand} />
      </div>
      <div style={{ borderTop: `1.5px dashed ${COLORS.line}`, margin: "8px 0" }} />
      {byCategory.length === 0 ? (
        <p className="ft-body py-1" style={{ fontSize: 12.5, color: COLORS.inkSoft }}>No expenses logged this month.</p>
      ) : (
        byCategory.map((c) => (
          <div key={c.name} className="flex justify-between items-baseline py-1">
            <span className="ft-body" style={{ fontSize: 13, color: COLORS.ink }}>{c.emoji} {c.name}</span>
            <Money value={c.value} currency={currency} size={13} weight={500} />
          </div>
        ))
      )}
      <div style={{ borderTop: `1.5px dashed ${COLORS.line}`, margin: "8px 0" }} />
      <div className="flex justify-between items-baseline py-1">
        <span className="ft-body" style={{ fontSize: 14, color: COLORS.ink, fontWeight: 600 }}>Total Expenses</span>
        <Money value={expense} currency={currency} size={14} weight={700} color={COLORS.red} />
      </div>
      <div className="flex justify-between items-baseline py-1">
        <span className="ft-body" style={{ fontSize: 14, color: COLORS.ink, fontWeight: 700 }}>Remaining</span>
        <Money value={income - expense} currency={currency} size={16} weight={700} color={income - expense >= 0 ? COLORS.brand : COLORS.red} />
      </div>
    </Card>
  );
}

function CategoryPie({ byCategory, currency }) {
  if (byCategory.length === 0) return null;
  return (
    <Card className="p-4">
      <h3 className="ft-display" style={{ fontSize: 15, fontWeight: 600, color: COLORS.ink }}>Where the money went</h3>
      <div style={{ width: "100%", height: 220 }} className="mt-1">
        <ResponsiveContainer>
          <PieChart>
            <Pie data={byCategory} dataKey="value" nameKey="name" innerRadius={45} outerRadius={78} paddingAngle={2}>
              {byCategory.map((c, i) => <Cell key={i} fill={c.color} stroke={COLORS.paper} strokeWidth={2} />)}
            </Pie>
            <Tooltip formatter={(v, n) => [`${currency} ${v.toLocaleString()}`, n]} contentStyle={{ borderRadius: 10, border: `1px solid ${COLORS.line}`, fontSize: 12 }} />
            <Legend
              layout="vertical"
              align="right"
              verticalAlign="middle"
              iconSize={8}
              formatter={(value) => <span className="ft-body" style={{ fontSize: 11.5, color: COLORS.ink }}>{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

function BudgetAlerts({ alerts, currency }) {
  if (alerts.length === 0) return null;
  return (
    <Card className="p-4" style={{ background: COLORS.redTint, border: `1px solid ${COLORS.red}40` }}>
      <div className="flex flex-col gap-1.5">
        {alerts.map((a) => (
          <div key={a.category} className="flex items-start gap-1.5">
            <span style={{ fontSize: 13 }}>⚠️</span>
            <span className="ft-body" style={{ fontSize: 12.5, color: "#7A3226" }}>
              <strong>{a.category}</strong> budget exceeded by <Money value={a.over} currency={currency} size={12.5} weight={700} color="#7A3226" />
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ---------- Dashboard ----------
function Dashboard({ data, month, setMonth, currency, onDelete }) {
  const monthTx = useMemo(() => data.transactions.filter((t) => monthKeyOf(t.date) === month), [data.transactions, month]);
  const income = monthTx.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const expense = monthTx.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);

  const overallBalance = useMemo(
    () => data.transactions.reduce((s, t) => s + (t.type === "income" ? t.amount : -t.amount), 0),
    [data.transactions]
  );

  const byCategory = useMemo(() => {
    const map = {};
    monthTx.filter((t) => t.type === "expense").forEach((t) => { map[t.category] = (map[t.category] || 0) + t.amount; });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value, color: catColor(data, name), emoji: catEmoji(data, name) }))
      .sort((a, b) => b.value - a.value);
  }, [monthTx, data]);

  const budgetAlerts = useMemo(() => {
    const map = {};
    monthTx.filter((t) => t.type === "expense").forEach((t) => { map[t.category] = (map[t.category] || 0) + t.amount; });
    return Object.entries(data.budgets || {})
      .filter(([cat, budget]) => budget > 0 && (map[cat] || 0) > budget)
      .map(([cat, budget]) => ({ category: cat, over: (map[cat] || 0) - budget }));
  }, [monthTx, data.budgets]);

  const byVehicle = useMemo(() => {
    const map = {};
    monthTx.filter((t) => t.type === "expense" && t.category === "Fuel").forEach((t) => {
      const label = data.vehicles.find((v) => v.id === t.vehicleId)?.name || "Unassigned";
      map[label] = (map[label] || 0) + t.amount;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [monthTx, data.vehicles]);

  const byMember = useMemo(() => {
    const map = {};
    monthTx.filter((t) => t.type === "expense" && t.paidBy).forEach((t) => {
      const name = data.familyMembers.find((m) => m.id === t.paidBy)?.name || "Unassigned";
      map[name] = (map[name] || 0) + t.amount;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [monthTx, data.familyMembers]);

  const trend = useMemo(() => {
    const months = [];
    const [cy, cm] = month.split("-").map(Number);
    for (let i = 5; i >= 0; i--) {
      const d = new Date(cy, cm - 1 - i, 1);
      const mk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const total = data.transactions.filter((t) => monthKeyOf(t.date) === mk && t.type === "expense").reduce((s, t) => s + t.amount, 0);
      months.push({ month: d.toLocaleDateString(undefined, { month: "short" }), total });
    }
    return months;
  }, [data.transactions, month]);

  const recent = [...monthTx].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 6);

  return (
    <div className="flex flex-col gap-4 p-4 pb-4">
      <Card className="p-5 relative overflow-hidden" style={{ background: COLORS.brandDark, border: "none" }}>
        <div className="absolute right-0 top-0 h-full" style={{ width: 14, backgroundImage: `radial-gradient(circle, ${COLORS.bg} 3px, transparent 3.5px)`, backgroundSize: "14px 14px", backgroundPosition: "center" }} />
        <p className="ft-body" style={{ color: "#BFE0D2", fontSize: 12, fontWeight: 600, letterSpacing: 0.5 }}>CASH IN HAND</p>
        <div className="mt-1"><Money value={overallBalance} currency={currency} size={30} weight={700} color="#fff" /></div>
        <div className="flex items-center gap-4 mt-4 pt-3" style={{ borderTop: "1px dashed #3E7364" }}>
          <div className="flex items-center gap-1.5"><TrendingUp size={14} color="#8FD6B4" /><span className="ft-mono" style={{ color: "#8FD6B4", fontSize: 12.5 }}>{currency} {income.toLocaleString()}</span></div>
          <div className="flex items-center gap-1.5"><TrendingDown size={14} color="#F0A99B" /><span className="ft-mono" style={{ color: "#F0A99B", fontSize: 12.5 }}>{currency} {expense.toLocaleString()}</span></div>
          <span className="ft-body ml-auto" style={{ color: "#BFE0D2", fontSize: 11 }}>this month</span>
        </div>
      </Card>

      <MonthPicker month={month} setMonth={setMonth} />

      <MonthlyStatement month={month} income={income} expense={expense} byCategory={byCategory} currency={currency} />

      <BudgetAlerts alerts={budgetAlerts} currency={currency} />

      <CategoryPie byCategory={byCategory} currency={currency} />

      {byMember.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center gap-2"><Users size={16} color={COLORS.brand} /><h3 className="ft-display" style={{ fontSize: 15, fontWeight: 600, color: COLORS.ink }}>Who spent what</h3></div>
          <div className="mt-3 flex flex-col gap-2.5">
            {byMember.map((m) => {
              const pct = expense ? (m.value / expense) * 100 : 0;
              return (
                <div key={m.name} className="flex items-center gap-2.5">
                  <Avatar name={m.name} size={30} />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline">
                      <span className="ft-body" style={{ fontSize: 13, color: COLORS.ink, fontWeight: 500 }}>{m.name}</span>
                      <Money value={m.value} currency={currency} size={12.5} weight={600} />
                    </div>
                    <div className="mt-1 h-1.5 rounded-full" style={{ background: COLORS.line }}>
                      <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, background: memberColor(m.name) }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {byVehicle.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center gap-2"><Car size={16} color={COLORS.red} /><h3 className="ft-display" style={{ fontSize: 15, fontWeight: 600, color: COLORS.ink }}>Fuel by vehicle</h3></div>
          <div className="mt-3 flex flex-col gap-2">
            {byVehicle.map((v) => (
              <div key={v.name} className="flex justify-between items-center">
                <span className="ft-body" style={{ fontSize: 13, color: COLORS.ink }}>{v.name}</span>
                <Money value={v.value} currency={currency} size={13} weight={600} />
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card className="p-4">
        <h3 className="ft-display" style={{ fontSize: 15, fontWeight: 600, color: COLORS.ink }}>Last 6 months</h3>
        <div style={{ width: "100%", height: 140 }} className="mt-2">
          <ResponsiveContainer>
            <LineChart data={trend} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid stroke={COLORS.line} vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: COLORS.inkSoft }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: COLORS.inkSoft }} axisLine={false} tickLine={false} width={40} />
              <Tooltip formatter={(v) => [`${currency} ${v.toLocaleString()}`, "Expenses"]} contentStyle={{ borderRadius: 10, border: `1px solid ${COLORS.line}`, fontSize: 12 }} />
              <Line type="monotone" dataKey="total" stroke={COLORS.brand} strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="p-4">
        <h3 className="ft-display" style={{ fontSize: 15, fontWeight: 600, color: COLORS.ink }}>Recent entries</h3>
        {recent.length === 0 ? (
          <p className="ft-body mt-2" style={{ fontSize: 13, color: COLORS.inkSoft }}>Nothing logged yet.</p>
        ) : (
          <div className="mt-2 flex flex-col divide-y" style={{ borderColor: COLORS.line }}>
            {recent.map((t) => <TxRow key={t.id} t={t} data={data} currency={currency} onDelete={onDelete} />)}
          </div>
        )}
      </Card>
    </div>
  );
}

function TxRow({ t, data, currency, onDelete }) {
  const emoji = t.type === "income" ? "💰" : catEmoji(data, t.category);
  const color = t.type === "income" ? COLORS.gold : catColor(data, t.category);
  const vehicleName = t.vehicleId ? data.vehicles.find((v) => v.id === t.vehicleId)?.name : null;
  const memberName = t.paidBy ? data.familyMembers.find((m) => m.id === t.paidBy)?.name : null;
  const subParts = [
    new Date(t.date + "T00:00:00").toLocaleDateString(undefined, { day: "numeric", month: "short" }),
    memberName, t.paymentMethod, t.note,
  ].filter(Boolean);
  return (
    <div className="flex items-center gap-2.5 py-2.5">
      <EmojiBadge emoji={emoji} color={color} />
      <div className="flex-1 min-w-0">
        <p className="ft-body truncate" style={{ fontSize: 13, color: COLORS.ink, fontWeight: 500 }}>{t.category}{vehicleName ? ` · ${vehicleName}` : ""}</p>
        <p className="ft-body truncate" style={{ fontSize: 11, color: COLORS.inkSoft }}>{subParts.join(" · ")}</p>
      </div>
      <Money value={t.type === "income" ? t.amount : -t.amount} currency={currency} size={13} weight={600} />
      <button onClick={() => onDelete(t.id)} className="p-1.5 rounded-lg" style={{ color: COLORS.inkSoft }}><Trash2 size={14} /></button>
    </div>
  );
}

// ---------- Category picker ----------
function CategoryPicker({ data, value, onChange, onAddCustom }) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("🧾");
  const [group, setGroup] = useState("Other");
  const customByGroup = (g) => (data.customCategories || []).filter((c) => c.group === g);

  const submitCustom = () => {
    if (!name.trim()) return;
    onAddCustom({ key: name.trim(), emoji: emoji || "🧾", group });
    setName(""); setEmoji("🧾"); setAdding(false);
  };

  return (
    <div className="flex flex-col gap-3">
      {GROUP_ORDER.map((g) => (
        <div key={g}>
          <p className="ft-body mb-1.5" style={{ fontSize: 10.5, fontWeight: 700, color: GROUP_COLORS[g], letterSpacing: 0.4 }}>{g.toUpperCase()}</p>
          <div className="flex flex-wrap gap-1.5">
            {[...DEFAULT_CATEGORIES.filter((c) => c.group === g), ...customByGroup(g)].map((c) => (
              <Chip key={c.key} active={value === c.key} onClick={() => onChange(c.key)} color={GROUP_COLORS[g]}>{c.emoji} {c.key}</Chip>
            ))}
          </div>
        </div>
      ))}

      {!adding ? (
        <button onClick={() => setAdding(true)} className="ft-body flex items-center justify-center gap-1.5 rounded-xl py-2 mt-1" style={{ border: `1.5px dashed ${COLORS.line}`, fontSize: 12.5, color: COLORS.inkSoft, fontWeight: 600 }}>
          <Plus size={14} /> Create your own category
        </button>
      ) : (
        <div className="rounded-xl p-3 mt-1" style={{ border: `1px solid ${COLORS.line}` }}>
          <div className="flex gap-2 mb-2">
            <input value={emoji} onChange={(e) => setEmoji(e.target.value.slice(0, 2))} className="ft-body text-center rounded-lg outline-none" style={{ width: 44, border: `1px solid ${COLORS.line}`, fontSize: 18, padding: "6px 0" }} />
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Category name" className="ft-body flex-1 rounded-lg px-3 outline-none bg-transparent" style={{ border: `1px solid ${COLORS.line}`, fontSize: 13, color: COLORS.ink }} />
          </div>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {GROUP_ORDER.map((g) => <Chip key={g} active={group === g} onClick={() => setGroup(g)} color={GROUP_COLORS[g]}>{g}</Chip>)}
          </div>
          <div className="flex gap-2">
            <button onClick={submitCustom} className="ft-body flex-1 rounded-lg py-2" style={{ background: COLORS.brand, color: "#fff", fontSize: 12.5, fontWeight: 600 }}>Add category</button>
            <button onClick={() => setAdding(false)} className="rounded-lg px-3" style={{ border: `1px solid ${COLORS.line}` }}><X size={15} color={COLORS.inkSoft} /></button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- Add Transaction ----------
function AddTransaction({ data, currency, onAdd, onAddCustomCategory, onAddMember, onNavigate }) {
  const [type, setType] = useState("expense");
  const [category, setCategory] = useState("Groceries");
  const [vehicleId, setVehicleId] = useState(data.vehicles[0]?.id || "");
  const [paidBy, setPaidBy] = useState(data.familyMembers[0]?.id || "");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [addingMember, setAddingMember] = useState(false);
  const [newMember, setNewMember] = useState("");

  const submit = () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { setError("Enter an amount greater than zero."); return; }
    onAdd({
      id: uid(), type,
      category: type === "income" ? "Income" : category,
      vehicleId: type === "expense" && category === "Fuel" ? vehicleId || null : null,
      paidBy: type === "expense" ? paidBy || null : null,
      paymentMethod: paymentMethod || null,
      amount: amt, date, note: note.trim(),
    });
    setAmount(""); setNote("");
    onNavigate("dashboard");
  };

  const submitNewMember = () => {
    if (!newMember.trim()) return;
    const id = uid();
    onAddMember(newMember.trim(), id);
    setPaidBy(id);
    setNewMember(""); setAddingMember(false);
  };

  return (
    <div className="p-4 flex flex-col gap-4">
      <h2 className="ft-display" style={{ fontSize: 20, fontWeight: 600, color: COLORS.ink }}>Log an entry</h2>

      <div className="flex rounded-xl p-1" style={{ background: COLORS.line + "80" }}>
        {["expense", "income"].map((opt) => (
          <button key={opt} onClick={() => setType(opt)} className="ft-body flex-1 py-2 rounded-lg capitalize"
            style={{ fontSize: 13, fontWeight: 600, background: type === opt ? COLORS.paper : "transparent", color: type === opt ? (opt === "expense" ? COLORS.red : COLORS.brand) : COLORS.inkSoft, boxShadow: type === opt ? "0 1px 3px rgba(0,0,0,0.08)" : "none" }}>
            {opt}
          </button>
        ))}
      </div>

      <Card className="p-4">
        <label className="ft-body block mb-1.5" style={{ fontSize: 12, color: COLORS.inkSoft, fontWeight: 600 }}>AMOUNT</label>
        <div className="flex items-center gap-2 rounded-xl px-3 py-2 mb-4" style={{ border: `1px solid ${COLORS.line}` }}>
          <span className="ft-mono" style={{ color: COLORS.inkSoft, fontSize: 16 }}>{currency}</span>
          <input inputMode="decimal" value={amount} onChange={(e) => { setAmount(e.target.value.replace(/[^0-9.]/g, "")); setError(""); }} placeholder="0" className="ft-mono w-full bg-transparent outline-none" style={{ fontSize: 17, color: COLORS.ink }} />
        </div>

        {type === "expense" && (
          <>
            <label className="ft-body block mb-1.5" style={{ fontSize: 12, color: COLORS.inkSoft, fontWeight: 600 }}>CATEGORY</label>
            <div className="mb-4"><CategoryPicker data={data} value={category} onChange={setCategory} onAddCustom={(c) => { onAddCustomCategory(c); setCategory(c.key); }} /></div>
          </>
        )}

        {type === "expense" && category === "Fuel" && (
          <div className="mb-4">
            <label className="ft-body block mb-1.5" style={{ fontSize: 12, color: COLORS.inkSoft, fontWeight: 600 }}>VEHICLE</label>
            {data.vehicles.length === 0 ? (
              <p className="ft-body" style={{ fontSize: 12.5, color: COLORS.inkSoft }}>Add a vehicle first in Settings to tag fuel entries.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {data.vehicles.map((v) => <Chip key={v.id} active={vehicleId === v.id} onClick={() => setVehicleId(v.id)} color={COLORS.red}>🚗 {v.name}</Chip>)}
              </div>
            )}
          </div>
        )}

        {type === "expense" && (
          <div className="mb-4">
            <label className="ft-body block mb-1.5" style={{ fontSize: 12, color: COLORS.inkSoft, fontWeight: 600 }}>PAID BY</label>
            <div className="flex flex-wrap gap-1.5 items-center">
              {data.familyMembers.map((m) => (
                <button key={m.id} onClick={() => setPaidBy(m.id)} className="flex items-center gap-1.5 rounded-full pl-1 pr-2.5 py-1" style={{ border: `1.5px solid ${paidBy === m.id ? COLORS.brand : COLORS.line}`, background: paidBy === m.id ? COLORS.brandTint : "transparent" }}>
                  <Avatar name={m.name} size={20} />
                  <span className="ft-body" style={{ fontSize: 12, fontWeight: 600, color: paidBy === m.id ? COLORS.brand : COLORS.ink }}>{m.name}</span>
                </button>
              ))}
              {!addingMember ? (
                <button onClick={() => setAddingMember(true)} className="flex items-center gap-1 rounded-full px-2.5 py-1.5" style={{ border: `1.5px dashed ${COLORS.line}`, color: COLORS.inkSoft }}>
                  <Plus size={13} /><span className="ft-body" style={{ fontSize: 12 }}>Add</span>
                </button>
              ) : (
                <div className="flex items-center gap-1">
                  <input autoFocus value={newMember} onChange={(e) => setNewMember(e.target.value)} placeholder="Name" className="ft-body rounded-full px-3 py-1.5 outline-none bg-transparent" style={{ border: `1px solid ${COLORS.line}`, fontSize: 12, width: 90 }} />
                  <button onClick={submitNewMember} className="p-1.5 rounded-full" style={{ background: COLORS.brand, color: "#fff" }}><Check size={13} /></button>
                  <button onClick={() => setAddingMember(false)} className="p-1.5 rounded-full" style={{ border: `1px solid ${COLORS.line}` }}><X size={13} color={COLORS.inkSoft} /></button>
                </div>
              )}
            </div>
          </div>
        )}

        <label className="ft-body block mb-1.5" style={{ fontSize: 12, color: COLORS.inkSoft, fontWeight: 600 }}>PAYMENT METHOD</label>
        <div className="flex flex-wrap gap-1.5 mb-4">
          {PAYMENT_METHODS.map((p) => <Chip key={p.key} active={paymentMethod === p.key} onClick={() => setPaymentMethod(p.key)}>{p.emoji} {p.key}</Chip>)}
        </div>

        <label className="ft-body block mb-1.5" style={{ fontSize: 12, color: COLORS.inkSoft, fontWeight: 600 }}>DATE</label>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="ft-body w-full rounded-xl px-3 py-2 mb-4 bg-transparent outline-none" style={{ border: `1px solid ${COLORS.line}`, fontSize: 13, color: COLORS.ink }} />

        <label className="ft-body block mb-1.5" style={{ fontSize: 12, color: COLORS.inkSoft, fontWeight: 600 }}>DESCRIPTION (OPTIONAL)</label>
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Monthly groceries" className="ft-body w-full rounded-xl px-3 py-2 bg-transparent outline-none" style={{ border: `1px solid ${COLORS.line}`, fontSize: 13, color: COLORS.ink }} />

        {error && <div className="flex items-center gap-1.5 mt-3" style={{ color: COLORS.red }}><AlertCircle size={13} /><span className="ft-body" style={{ fontSize: 12 }}>{error}</span></div>}

        <button onClick={submit} className="ft-body w-full mt-4 rounded-xl py-3" style={{ background: type === "expense" ? COLORS.red : COLORS.brand, color: "#fff", fontWeight: 600, fontSize: 14 }}>Save entry</button>
      </Card>
    </div>
  );
}

// ---------- Transactions list ----------
function TransactionsList({ data, currency, onDelete }) {
  const [filter, setFilter] = useState("all");
  const sorted = useMemo(() => [...data.transactions].sort((a, b) => (a.date < b.date ? 1 : -1)), [data.transactions]);
  const filtered = filter === "all" ? sorted : sorted.filter((t) => t.category === filter);
  const cats = ["all", ...new Set(data.transactions.map((t) => t.category))];

  return (
    <div className="p-4 flex flex-col gap-3">
      <h2 className="ft-display" style={{ fontSize: 20, fontWeight: 600, color: COLORS.ink }}>All entries</h2>
      <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
        {cats.map((c) => <Chip key={c} active={filter === c} onClick={() => setFilter(c)}>{c === "all" ? "All" : `${catEmoji(data, c)} ${c}`}</Chip>)}
      </div>
      <Card className="p-4">
        {filtered.length === 0 ? (
          <p className="ft-body" style={{ fontSize: 13, color: COLORS.inkSoft }}>No entries here.</p>
        ) : (
          <div className="flex flex-col divide-y" style={{ borderColor: COLORS.line }}>
            {filtered.map((t) => <TxRow key={t.id} t={t} data={data} currency={currency} onDelete={onDelete} />)}
          </div>
        )}
      </Card>
    </div>
  );
}

// ---------- Budgets ----------
function BudgetRow({ category, emoji, color, budget, spent, currency, onSet, onRemove }) {
  const [val, setVal] = useState(String(budget || ""));
  useEffect(() => setVal(String(budget || "")), [budget]);
  const remaining = (budget || 0) - spent;
  const pct = budget ? Math.min((spent / budget) * 100, 100) : 0;
  const over = budget > 0 && spent > budget;

  return (
    <div className="py-3" style={{ borderBottom: `1px solid ${COLORS.line}` }}>
      <div className="flex items-center gap-2.5">
        <EmojiBadge emoji={emoji} color={color} size={32} />
        <span className="ft-body flex-1" style={{ fontSize: 13.5, color: COLORS.ink, fontWeight: 500 }}>{category}</span>
        <button onClick={onRemove} style={{ color: COLORS.inkSoft }}><X size={14} /></button>
      </div>
      <div className="grid grid-cols-3 gap-2 mt-2">
        <div>
          <p className="ft-body" style={{ fontSize: 9.5, color: COLORS.inkSoft, fontWeight: 700 }}>BUDGET</p>
          <div className="flex items-center gap-1 mt-0.5">
            <span className="ft-mono" style={{ fontSize: 11, color: COLORS.inkSoft }}>{currency}</span>
            <input
              inputMode="decimal"
              value={val}
              onChange={(e) => setVal(e.target.value.replace(/[^0-9.]/g, ""))}
              onBlur={() => onSet(parseFloat(val) || 0)}
              className="ft-mono bg-transparent outline-none w-full"
              style={{ fontSize: 12.5, color: COLORS.ink, borderBottom: `1px dashed ${COLORS.line}` }}
            />
          </div>
        </div>
        <div>
          <p className="ft-body" style={{ fontSize: 9.5, color: COLORS.inkSoft, fontWeight: 700 }}>SPENT</p>
          <Money value={spent} currency={currency} size={12.5} weight={600} />
        </div>
        <div>
          <p className="ft-body" style={{ fontSize: 9.5, color: COLORS.inkSoft, fontWeight: 700 }}>REMAINING</p>
          <Money value={remaining} currency={currency} size={12.5} weight={700} color={over ? COLORS.red : COLORS.brand} />
        </div>
      </div>
      <div className="mt-2 h-1.5 rounded-full" style={{ background: COLORS.line }}>
        <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, background: over ? COLORS.red : color }} />
      </div>
    </div>
  );
}

function BudgetsView({ data, month, setMonth, currency, onSetBudget, onRemoveBudget, onAddCustomCategory }) {
  const [addingNew, setAddingNew] = useState(false);
  const [newCat, setNewCat] = useState("Groceries");
  const [newAmount, setNewAmount] = useState("");

  const monthTx = useMemo(() => data.transactions.filter((t) => monthKeyOf(t.date) === month && t.type === "expense"), [data.transactions, month]);
  const spentMap = useMemo(() => {
    const map = {};
    monthTx.forEach((t) => { map[t.category] = (map[t.category] || 0) + t.amount; });
    return map;
  }, [monthTx]);

  const budgeted = Object.keys(data.budgets || {});
  const rows = budgeted
    .map((cat) => ({ category: cat, budget: data.budgets[cat], spent: spentMap[cat] || 0 }))
    .sort((a, b) => b.spent - a.spent);

  const totalBudget = rows.reduce((s, r) => s + r.budget, 0);
  const totalSpent = rows.reduce((s, r) => s + r.spent, 0);
  const alerts = rows.filter((r) => r.budget > 0 && r.spent > r.budget).map((r) => ({ category: r.category, over: r.spent - r.budget }));

  return (
    <div className="p-4 flex flex-col gap-4">
      <h2 className="ft-display" style={{ fontSize: 20, fontWeight: 600, color: COLORS.ink }}>Budgets</h2>
      <p className="ft-body -mt-2" style={{ fontSize: 12.5, color: COLORS.inkSoft }}>These targets apply every month — set once, track always.</p>

      <MonthPicker month={month} setMonth={setMonth} />

      <BudgetAlerts alerts={alerts} currency={currency} />

      {rows.length > 0 && (
        <Card className="p-4">
          <div className="flex justify-between items-baseline">
            <span className="ft-body" style={{ fontSize: 12.5, color: COLORS.inkSoft, fontWeight: 600 }}>Total budgeted</span>
            <Money value={totalBudget} currency={currency} size={14} weight={700} />
          </div>
          <div className="flex justify-between items-baseline mt-1">
            <span className="ft-body" style={{ fontSize: 12.5, color: COLORS.inkSoft, fontWeight: 600 }}>Total spent this month</span>
            <Money value={totalSpent} currency={currency} size={14} weight={700} color={totalSpent > totalBudget ? COLORS.red : COLORS.brand} />
          </div>
        </Card>
      )}

      <Card className="p-4">
        {rows.length === 0 ? (
          <p className="ft-body" style={{ fontSize: 13, color: COLORS.inkSoft }}>No budgets set yet. Add one below to start tracking targets.</p>
        ) : (
          <div>
            {rows.map((r) => (
              <BudgetRow
                key={r.category}
                category={r.category}
                emoji={catEmoji(data, r.category)}
                color={catColor(data, r.category)}
                budget={r.budget}
                spent={r.spent}
                currency={currency}
                onSet={(amt) => onSetBudget(r.category, amt)}
                onRemove={() => onRemoveBudget(r.category)}
              />
            ))}
          </div>
        )}
      </Card>

      {!addingNew ? (
        <button onClick={() => setAddingNew(true)} className="ft-body flex items-center justify-center gap-1.5 rounded-xl py-3" style={{ border: `1.5px dashed ${COLORS.line}`, fontSize: 13, color: COLORS.brand, fontWeight: 600 }}>
          <PiggyBank size={16} /> Set a new budget
        </button>
      ) : (
        <Card className="p-4">
          <label className="ft-body block mb-1.5" style={{ fontSize: 12, color: COLORS.inkSoft, fontWeight: 600 }}>CATEGORY</label>
          <CategoryPicker data={data} value={newCat} onChange={setNewCat} onAddCustom={(c) => { onAddCustomCategory(c); setNewCat(c.key); }} />
          <label className="ft-body block mb-1.5 mt-4" style={{ fontSize: 12, color: COLORS.inkSoft, fontWeight: 600 }}>MONTHLY BUDGET</label>
          <div className="flex items-center gap-2 rounded-xl px-3 py-2 mb-3" style={{ border: `1px solid ${COLORS.line}` }}>
            <span className="ft-mono" style={{ color: COLORS.inkSoft, fontSize: 15 }}>{currency}</span>
            <input inputMode="decimal" value={newAmount} onChange={(e) => setNewAmount(e.target.value.replace(/[^0-9.]/g, ""))} placeholder="0" className="ft-mono w-full bg-transparent outline-none" style={{ fontSize: 15, color: COLORS.ink }} />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { const amt = parseFloat(newAmount) || 0; if (amt > 0) { onSetBudget(newCat, amt); setNewAmount(""); setAddingNew(false); } }}
              className="ft-body flex-1 rounded-xl py-2.5" style={{ background: COLORS.brand, color: "#fff", fontWeight: 600, fontSize: 13 }}
            >Save budget</button>
            <button onClick={() => setAddingNew(false)} className="rounded-xl px-4" style={{ border: `1px solid ${COLORS.line}` }}><X size={16} color={COLORS.inkSoft} /></button>
          </div>
        </Card>
      )}
    </div>
  );
}


// ---------- Backup & restore ----------
function BackupRestoreCard({ data, onRestore }) {
  const inputRef = React.useRef(null);
  const [status, setStatus] = useState("");
  const [pending, setPending] = useState(null);

  const handleExport = () => {
    try {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const today = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `household-ledger-backup-${today}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setStatus("Backup downloaded — save it to Google Drive or wherever you keep files.");
    } catch (e) {
      setStatus("Couldn't create the backup file.");
    }
  };

  const handleFileChosen = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result);
        if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.transactions)) {
          setStatus("That file doesn't look like a valid backup.");
          return;
        }
        setPending(parsed);
        setStatus("");
      } catch (err) {
        setStatus("Couldn't read that file — make sure it's a backup exported from this app.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const confirmRestore = () => {
    onRestore(pending);
    setPending(null);
    setStatus("Backup restored.");
  };

  return (
    <Card className="p-4">
      <h3 className="ft-display" style={{ fontSize: 14, fontWeight: 600, color: COLORS.ink }}>Backup &amp; restore</h3>
      <p className="ft-body mt-1" style={{ fontSize: 12.5, color: COLORS.inkSoft }}>
        Save a copy of your data to a file you control — store it in Google Drive, email it to yourself, or keep it anywhere safe.
      </p>
      <div className="flex gap-2 mt-3">
        <button onClick={handleExport} className="ft-body flex items-center gap-1.5 rounded-xl px-3 py-2" style={{ background: COLORS.brand, color: "#fff", fontSize: 12.5, fontWeight: 600 }}>
          <Download size={14} /> Download backup
        </button>
        <button onClick={() => inputRef.current?.click()} className="ft-body flex items-center gap-1.5 rounded-xl px-3 py-2" style={{ border: `1px solid ${COLORS.line}`, color: COLORS.ink, fontSize: 12.5, fontWeight: 600 }}>
          <Upload size={14} /> Restore from file
        </button>
        <input ref={inputRef} type="file" accept="application/json" className="hidden" onChange={handleFileChosen} />
      </div>
      {status && <p className="ft-body mt-2" style={{ fontSize: 11.5, color: COLORS.inkSoft }}>{status}</p>}
      {pending && (
        <div className="mt-3 rounded-xl p-3" style={{ border: `1px solid ${COLORS.red}`, background: COLORS.redTint }}>
          <p className="ft-body" style={{ fontSize: 12, color: "#7A3226" }}>
            This replaces all data currently on this device with the backup file. This can't be undone.
          </p>
          <div className="flex gap-2 mt-2">
            <button onClick={confirmRestore} className="ft-body rounded-lg px-3 py-1.5" style={{ background: COLORS.red, color: "#fff", fontSize: 12, fontWeight: 600 }}>Replace my data</button>
            <button onClick={() => setPending(null)} className="ft-body rounded-lg px-3 py-1.5" style={{ border: `1px solid ${COLORS.line}`, fontSize: 12, color: COLORS.inkSoft }}>Cancel</button>
          </div>
        </div>
      )}
    </Card>
  );
}

// ---------- Settings ----------
function SettingsView({ data, currency, onAddVehicle, onRemoveVehicle, onAddMember, onRemoveMember, onAdjustBalance, onSetCurrency, onRestore, balance }) {
  const [vehicleName, setVehicleName] = useState("");
  const [memberName, setMemberName] = useState("");
  const [newBalance, setNewBalance] = useState("");
  const [showAdjust, setShowAdjust] = useState(false);

  return (
    <div className="p-4 flex flex-col gap-4">
      <h2 className="ft-display" style={{ fontSize: 20, fontWeight: 600, color: COLORS.ink }}>Settings</h2>

      <BackupRestoreCard data={data} onRestore={onRestore} />

      <Card className="p-4">
        <h3 className="ft-display" style={{ fontSize: 14, fontWeight: 600, color: COLORS.ink }}>Cash on hand</h3>
        <p className="ft-body mt-1" style={{ fontSize: 12.5, color: COLORS.inkSoft }}>Current balance: <Money value={balance} currency={currency} size={13} weight={700} /></p>
        {!showAdjust ? (
          <button onClick={() => setShowAdjust(true)} className="ft-body mt-3 rounded-xl px-3 py-2" style={{ border: `1px solid ${COLORS.line}`, fontSize: 12.5, color: COLORS.ink, fontWeight: 600 }}>Correct balance</button>
        ) : (
          <div className="mt-3 flex items-center gap-2">
            <input inputMode="decimal" value={newBalance} onChange={(e) => setNewBalance(e.target.value.replace(/[^0-9.]/g, ""))} placeholder="New balance" className="ft-mono flex-1 rounded-xl px-3 py-2 bg-transparent outline-none" style={{ border: `1px solid ${COLORS.line}`, fontSize: 13, color: COLORS.ink }} />
            <button onClick={() => { onAdjustBalance(parseFloat(newBalance) || 0); setNewBalance(""); setShowAdjust(false); }} className="rounded-xl px-3 py-2" style={{ background: COLORS.brand, color: "#fff" }}><Check size={16} /></button>
            <button onClick={() => setShowAdjust(false)} className="rounded-xl px-3 py-2" style={{ border: `1px solid ${COLORS.line}` }}><X size={16} color={COLORS.inkSoft} /></button>
          </div>
        )}
      </Card>

      <Card className="p-4">
        <h3 className="ft-display" style={{ fontSize: 14, fontWeight: 600, color: COLORS.ink }}>Family members</h3>
        <p className="ft-body mt-1" style={{ fontSize: 12.5, color: COLORS.inkSoft }}>Add everyone whose spending you want to track.</p>
        <div className="flex flex-col gap-2 mt-3">
          {data.familyMembers.map((m) => (
            <div key={m.id} className="flex items-center justify-between rounded-xl px-3 py-2" style={{ border: `1px solid ${COLORS.line}` }}>
              <div className="flex items-center gap-2"><Avatar name={m.name} /><span className="ft-body" style={{ fontSize: 13, color: COLORS.ink }}>{m.name}</span></div>
              <button onClick={() => onRemoveMember(m.id)} style={{ color: COLORS.inkSoft }}><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
        <div className="flex gap-2 mt-3">
          <input value={memberName} onChange={(e) => setMemberName(e.target.value)} placeholder="e.g. Husband" className="ft-body flex-1 rounded-xl px-3 py-2 bg-transparent outline-none" style={{ border: `1px solid ${COLORS.line}`, fontSize: 13, color: COLORS.ink }} />
          <button onClick={() => { if (memberName.trim()) { onAddMember(memberName.trim()); setMemberName(""); } }} className="rounded-xl px-3 py-2" style={{ background: COLORS.brand, color: "#fff" }}><Plus size={16} /></button>
        </div>
      </Card>

      <Card className="p-4">
        <h3 className="ft-display" style={{ fontSize: 14, fontWeight: 600, color: COLORS.ink }}>Vehicles</h3>
        <p className="ft-body mt-1" style={{ fontSize: 12.5, color: COLORS.inkSoft }}>Add each family vehicle to track fuel spend separately.</p>
        <div className="flex flex-col gap-2 mt-3">
          {data.vehicles.map((v) => (
            <div key={v.id} className="flex items-center justify-between rounded-xl px-3 py-2" style={{ border: `1px solid ${COLORS.line}` }}>
              <div className="flex items-center gap-2"><Car size={15} color={COLORS.red} /><span className="ft-body" style={{ fontSize: 13, color: COLORS.ink }}>{v.name}</span></div>
              <button onClick={() => onRemoveVehicle(v.id)} style={{ color: COLORS.inkSoft }}><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
        <div className="flex gap-2 mt-3">
          <input value={vehicleName} onChange={(e) => setVehicleName(e.target.value)} placeholder="e.g. Honda Activa" className="ft-body flex-1 rounded-xl px-3 py-2 bg-transparent outline-none" style={{ border: `1px solid ${COLORS.line}`, fontSize: 13, color: COLORS.ink }} />
          <button onClick={() => { if (vehicleName.trim()) { onAddVehicle(vehicleName.trim()); setVehicleName(""); } }} className="rounded-xl px-3 py-2" style={{ background: COLORS.brand, color: "#fff" }}><Plus size={16} /></button>
        </div>
      </Card>

      <Card className="p-4">
        <h3 className="ft-display" style={{ fontSize: 14, fontWeight: 600, color: COLORS.ink }}>Currency</h3>
        <div className="flex flex-wrap gap-2 mt-3">
          {CURRENCIES.map((c) => (
            <button key={c.code} onClick={() => onSetCurrency(c.symbol)} className="flex flex-col items-center rounded-xl px-3.5 py-2"
              style={{ border: `1.5px solid ${currency === c.symbol ? COLORS.brand : COLORS.line}`, background: currency === c.symbol ? COLORS.brandTint : "transparent" }}>
              <span className="ft-mono" style={{ fontSize: 14, fontWeight: 700, color: currency === c.symbol ? COLORS.brand : COLORS.ink }}>{c.symbol}</span>
              <span className="ft-body" style={{ fontSize: 9, color: COLORS.inkSoft }}>{c.code}</span>
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ---------- Main App ----------
export default function FamilyExpenseTracker() {
  const { data, status, saving, persist } = useAppData();
  const [view, setView] = useState("dashboard");
  const [month, setMonth] = useState(monthKeyOf(todayISO()));

  if (status === "loading" || !data) {
    return (
      <div className="min-h-full flex items-center justify-center p-10" style={{ background: COLORS.bg }}>
        <style>{FONTS}</style>
        <p className="ft-body" style={{ color: COLORS.inkSoft, fontSize: 13 }}>Opening your ledger…</p>
      </div>
    );
  }

  const currency = data.currency || "Rs.";
  const balance = data.transactions.reduce((s, t) => s + (t.type === "income" ? t.amount : -t.amount), 0);

  const completeOnboarding = (startingAmount) => {
    persist({ ...data, setupDone: true, transactions: [{ id: uid(), type: "income", category: "Starting balance", vehicleId: null, paidBy: null, paymentMethod: null, amount: startingAmount, date: todayISO(), note: "" }] });
  };

  const addTransaction = (tx) => persist({ ...data, transactions: [...data.transactions, tx] });
  const deleteTransaction = (id) => persist({ ...data, transactions: data.transactions.filter((t) => t.id !== id) });
  const addVehicle = (name) => persist({ ...data, vehicles: [...data.vehicles, { id: uid(), name }] });
  const removeVehicle = (id) => persist({ ...data, vehicles: data.vehicles.filter((v) => v.id !== id) });
  const addMember = (name, id = uid()) => persist({ ...data, familyMembers: [...data.familyMembers, { id, name }] });
  const removeMember = (id) => persist({ ...data, familyMembers: data.familyMembers.filter((m) => m.id !== id) });
  const addCustomCategory = (c) => persist({ ...data, customCategories: [...(data.customCategories || []), c] });
  const setCurrency = (c) => persist({ ...data, currency: c });
  const setBudget = (category, amount) => persist({ ...data, budgets: { ...(data.budgets || {}), [category]: amount } });
  const removeBudget = (category) => {
    const next = { ...(data.budgets || {}) };
    delete next[category];
    persist({ ...data, budgets: next });
  };
  const restoreBackup = (parsed) => persist({ ...DEFAULT_DATA(), ...parsed, setupDone: true });
  const adjustBalance = (target) => {
    const diff = target - balance;
    if (diff === 0) return;
    addTransaction({ id: uid(), type: diff > 0 ? "income" : "expense", category: "Balance correction", vehicleId: null, paidBy: null, paymentMethod: null, amount: Math.abs(diff), date: todayISO(), note: "" });
  };

  if (!data.setupDone) {
    return (
      <div className="min-h-full" style={{ background: COLORS.bg }}>
        <style>{FONTS}</style>
        <Onboarding onDone={completeOnboarding} currency={currency} />
      </div>
    );
  }

  const NAV = [
    { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { key: "add", label: "Add", icon: Plus },
    { key: "budgets", label: "Budgets", icon: PiggyBank },
    { key: "transactions", label: "Entries", icon: List },
    { key: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="min-h-full flex flex-col" style={{ background: COLORS.bg, maxWidth: 480, margin: "0 auto" }}>
      <style>{FONTS}</style>

      <header className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center rounded-lg" style={{ width: 30, height: 30, background: COLORS.brand, color: "#fff" }}><Wallet size={15} /></div>
          <span className="ft-display" style={{ fontSize: 17, fontWeight: 600, color: COLORS.ink }}>Household Ledger</span>
        </div>
        <span className="ft-body" style={{ fontSize: 10.5, color: saving ? COLORS.gold : COLORS.inkSoft }}>{saving ? "Saving…" : "Synced"}</span>
      </header>

      <main className="flex-1 overflow-y-auto" style={{ paddingBottom: 92 }}>
        {view === "dashboard" && <Dashboard data={data} month={month} setMonth={setMonth} currency={currency} onDelete={deleteTransaction} />}
        {view === "add" && <AddTransaction data={data} currency={currency} onAdd={addTransaction} onAddCustomCategory={addCustomCategory} onAddMember={addMember} onNavigate={setView} />}
        {view === "budgets" && <BudgetsView data={data} month={month} setMonth={setMonth} currency={currency} onSetBudget={setBudget} onRemoveBudget={removeBudget} onAddCustomCategory={addCustomCategory} />}
        {view === "transactions" && <TransactionsList data={data} currency={currency} onDelete={deleteTransaction} />}
        {view === "settings" && (
          <SettingsView data={data} currency={currency} balance={balance} onAddVehicle={addVehicle} onRemoveVehicle={removeVehicle} onAddMember={addMember} onRemoveMember={removeMember} onAdjustBalance={adjustBalance} onSetCurrency={setCurrency} onRestore={restoreBackup} />
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 flex justify-around py-2" style={{ background: COLORS.paper, borderTop: `1px solid ${COLORS.line}`, maxWidth: 480, margin: "0 auto" }}>
        {NAV.map((n) => {
          const Icon = n.icon;
          const active = view === n.key;
          return (
            <button key={n.key} onClick={() => setView(n.key)} className="flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-xl" style={{ background: active ? COLORS.brandTint : "transparent" }}>
              <Icon size={18} color={active ? COLORS.brand : COLORS.inkSoft} strokeWidth={active ? 2.3 : 2} />
              <span className="ft-body" style={{ fontSize: 9.5, fontWeight: active ? 700 : 500, color: active ? COLORS.brand : COLORS.inkSoft }}>{n.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
