import React, { useState, useEffect, useRef, useCallback } from "react";

/* =====================================================================
   Транспорт М5 — план работ и отчёты водителей
   Хранение: Supabase, таблица app_data.
   Каждая заявка — отдельная строка (id = "req_..."),
   каждый отчёт водителя — отдельная строка (id = "rep_<id заявки>"),
   настройки — строки "cfg_machines" и "cfg_blocked".
   Поэтому сохранения разных людей не перезаписывают друг друга.
   ===================================================================== */

const SUPABASE_URL = "https://yatwchgupbhrszgbdmtm.supabase.co";
const SUPABASE_KEY = "sb_publishable_giLV8Jm4CsxlW6ptSkv8ng_9bJ4jm6f";
const TABLE = "app_data";

const USERS = [
  { id: 1,  name: "Колдаева Юлия Юрьевна",            role: "manager",    pin: "0000" },
  { id: 13, name: "Хамматов Эдуард Фригатович",       role: "manager",    pin: "0001" },
  { id: 12, name: "Хамматов Ринат Фригатович",        role: "supervisor", pin: "0011" },
  { id: 14, name: "Салахова Зимфира Маратовна",       role: "supervisor", pin: "0013" },
  { id: 16, name: "Абдрафигина Ольга Петровна",       role: "supervisor", pin: "0015" },
  { id: 3,  name: "Касымов Руслан Раилевич",          role: "driver",     pin: "0002" },
  { id: 4,  name: "Мурадымов Марат Хусаинович",       role: "driver",     pin: "0003" },
  { id: 5,  name: "Нафигин Вадим Шавкатович",         role: "driver",     pin: "0004" },
  { id: 6,  name: "Хадыев Марат Саримович",           role: "driver",     pin: "0005" },
  { id: 7,  name: "Шакиров Марат Рашитович",          role: "driver",     pin: "0006" },
  { id: 8,  name: "Шахвалеев Роман Рафидович",        role: "driver",     pin: "0007" },
  { id: 9,  name: "Абдуллин Рафит Ансарович",         role: "driver",     pin: "0008" },
  { id: 10, name: "Абдулин Руслан Марсович",          role: "driver",     pin: "0009" },
  { id: 11, name: "Ямалетдинов Рамат Салахетдинович", role: "driver",     pin: "0010" },
  { id: 15, name: "Хамматов Фригат",                  role: "driver",     pin: "0014" },
  { id: 2,  name: "Вафин Данил Закирьянович",         role: "driver",     pin: "0016" },
];

const MACHINES = [
  { id: 1,  name: "Самосвал ХОВО Н 020 ЕА (774)" },
  { id: 2,  name: "Самосвал ХОВО О608 ВУ (774)" },
  { id: 3,  name: "Самосвал ХОВО Н495 ХА (174)" },
  { id: 4,  name: "Самосвал ШАКМАН Е324 ВР (774)" },
  { id: 5,  name: "Манипулятор ХОВО Н 576 ЕА (774)" },
  { id: 14, name: "Манипулятор Е944 МС 174" },
  { id: 6,  name: "ДОНГ ФЕНГ К826 НР174" },
  { id: 7,  name: "УРАЛ 10Т. Х444КВ 174" },
  { id: 8,  name: "АВТОКРАН 25Т. Х964ММ174" },
  { id: 9,  name: "АВТОКРАН 16Т. О726УН174" },
  { id: 10, name: "ПОГРУЗЧИК 6699УС174" },
  { id: 11, name: "ПОГРУЗЧИК В140 О006УС 74" },
  { id: 12, name: "МАЗ У302ВТ 774" },
  { id: 13, name: "ГРЕЙДЕР 0005УС 174" },
  { id: 15, name: "УАЗ О599ВУ774" },
];

const ROLE_LABEL = { manager: "Руководитель", supervisor: "Менеджер", driver: "Водитель" };
const MONTHS = ["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"];
const WEEKDAYS = ["вс","пн","вт","ср","чт","пт","сб"];

/* ---------------- даты и мелочи ---------------- */
const pad = n => String(n).padStart(2, "0");
const dateToStr = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const todayStr = () => dateToStr(new Date());
const addDays = (s, n) => { const [y, m, d] = s.split("-").map(Number); return dateToStr(new Date(y, m - 1, d + n)); };
const fmtDate = s => { if (!s) return ""; const [y, m, d] = s.split("-"); return `${d}.${m}.${y}`; };
const fmtDay = s => { const [y, m, d] = s.split("-").map(Number); return `${WEEKDAYS[new Date(y, m - 1, d).getDay()]}, ${pad(d)}.${pad(m)}`; };
const monthOf = s => s.slice(0, 7);
const calcHours = (f, t) => {
  if (!f || !t) return 0;
  const [fh, fm] = f.split(":").map(Number);
  const [th, tm] = t.split(":").map(Number);
  let m = (th * 60 + tm) - (fh * 60 + fm);
  if (m < 0) m += 24 * 60; // ночная смена через полночь
  return Math.round(m / 6) / 10;
};
const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const clone = o => JSON.parse(JSON.stringify(o));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const lsGet = k => { try { return window.localStorage.getItem(k); } catch { return null; } };
const lsSet = (k, v) => { try { if (v === null) window.localStorage.removeItem(k); else window.localStorage.setItem(k, v); } catch {} };
const userName = id => (USERS.find(u => u.id === Number(id)) || {}).name || "—";
const shortName = id => { const n = userName(id).split(" "); return n.length > 1 ? `${n[0]} ${n[1][0]}.` : n[0]; };

/* ---------------- индикатор связи ---------------- */
const netListeners = new Set();
let netOk = true;
function setNet(ok) { if (ok !== netOk) { netOk = ok; netListeners.forEach(f => f(ok)); } }
function useNet() {
  const [ok, setOk] = useState(netOk);
  useEffect(() => { netListeners.add(setOk); return () => { netListeners.delete(setOk); }; }, []);
  return ok;
}

/* ---------------- работа с базой ---------------- */
function isDemo() { try { return typeof window !== "undefined" && window.__M5_DEMO__ === true; } catch { return false; } }

// Запрос к Supabase с таймаутом и автоповтором (до 4 попыток).
// Все записи идемпотентны (запись по id), поэтому повтор безопасен.
async function sbFetch(path, opts = {}) {
  const { method = "GET", body, prefer } = opts;
  let useAuth = true;
  let lastErr = null;
  for (let attempt = 0; attempt < 4; attempt++) {
    if (attempt > 0) await sleep(900 * attempt);
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 20000);
    const headers = { "Content-Type": "application/json", apikey: SUPABASE_KEY };
    if (useAuth) headers.Authorization = `Bearer ${SUPABASE_KEY}`;
    if (prefer) headers.Prefer = prefer;
    let res;
    try {
      res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
        method, headers, cache: "no-store", signal: ctrl.signal,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
    } catch (e) {
      clearTimeout(timer);
      lastErr = new Error(e && e.name === "AbortError"
        ? "Сервер долго не отвечает (возможно, база «просыпается»). Нажмите ещё раз через минуту."
        : "Нет связи с сервером. Проверьте интернет и нажмите ещё раз.");
      lastErr.network = true;
      continue;
    }
    clearTimeout(timer);
    const text = await res.text().catch(() => "");
    if (res.ok) {
      setNet(true);
      if (!text) return null;
      try { return JSON.parse(text); } catch { return null; }
    }
    if ((res.status === 401 || res.status === 403) && useAuth) {
      useAuth = false; // вторая попытка — только с apikey
      lastErr = new Error(`Доступ отклонён сервером (${res.status}). ${text.slice(0, 200)}`);
      continue;
    }
    lastErr = new Error(`Ошибка сервера ${res.status}${text ? ": " + text.slice(0, 200) : ""}`);
    if (res.status < 500 && res.status !== 408 && res.status !== 429) break;
  }
  if (lastErr && lastErr.network) setNet(false);
  throw lastErr || new Error("Неизвестная ошибка");
}

/* --- демо-режим (только для предпросмотра, база не затрагивается) --- */
const DEMO_KEY = "m5_demo_rows_v3";
let demoRows = null;
function demoSeed() {
  const t = todayStr(), y = addDays(t, -1), tm = addDays(t, 1);
  const rows = {};
  const authors = [14, 1, 13, 12, 16];
  let n = 0;
  const add = (date, driverId, machineId, time, place, org, note, rep) => {
    const id = "req_demo" + newId();
    rows[id] = { date, month: monthOf(date), driverId, machineId, time, place, org, note, createdBy: authors[n++ % authors.length], createdAt: new Date().toISOString() };
    if (rep) rows["rep_" + id] = { reqId: id, date, month: monthOf(date), driverId, machineId, ...rep, hours: calcHours(rep.from, rep.to), done: true, savedBy: driverId, savedAt: new Date().toISOString() };
  };
  add(y, 3, 1, "08:00", "Карьер — ул. Линейная, 98", "ООО «СтройМонтаж»", "Щебень 20-40", { from: "08:00", to: "17:30", trips: 6, route: "Карьер → Линейная", comment: "", waybill: true });
  add(y, 6, 14, "09:00", "ул. Каслинская, 5", "ИП Петров", "Разгрузка плит", null);
  add(t, 3, 1, "08:00", "Карьер — ул. Линейная, 98", "ООО «СтройМонтаж»", "Щебень 20-40", { from: "08:00", to: "16:00", trips: 5, route: "Карьер → Линейная", comment: "", waybill: true });
  add(t, 4, 8, "09:00", "Склад, Свердловский тракт, 12", "ООО «УралСнаб»", "Кран на 4 часа", null);
  add(t, 5, 10, "07:30", "п. Терема", "ИП Колдаева", "", null);
  add(tm, 3, 2, "08:00", "Карьер — ул. Линейная, 98", "ООО «СтройМонтаж»", "", null);
  add(tm, 7, 5, "10:00", "ул. Труда, 160", "ООО «Альфа»", "Манипулятор, 2 точки", null);
  return rows;
}
function demoDb() {
  if (demoRows) return demoRows;
  let saved = null;
  try { saved = JSON.parse(lsGet(DEMO_KEY) || "null"); } catch {}
  demoRows = saved || demoSeed();
  return demoRows;
}
const demoSave = () => lsSet(DEMO_KEY, JSON.stringify(demoRows));

const api = {
  async rowsWhere(field, value) {
    if (isDemo()) {
      await sleep(200);
      return Object.entries(demoDb())
        .filter(([id, d]) => d && d[field] === value && (id.startsWith("req_") || id.startsWith("rep_")))
        .map(([id, data]) => ({ id, data: clone(data) }));
    }
    const rows = await sbFetch(`${TABLE}?select=id,data&data->>${field}=eq.${encodeURIComponent(value)}`);
    return Array.isArray(rows) ? rows : [];
  },
  byDate(date) { return api.rowsWhere("date", date); },
  byMonth(ym) { return api.rowsWhere("month", ym); },
  async put(id, data) {
    if (isDemo()) { await sleep(300); demoDb()[id] = clone(data); demoSave(); return; }
    await sbFetch(TABLE, {
      method: "POST",
      prefer: "resolution=merge-duplicates,return=minimal",
      body: [{ id, data, updated_at: new Date().toISOString() }],
    });
  },
  async del(id) {
    if (isDemo()) { await sleep(200); delete demoDb()[id]; demoSave(); return; }
    await sbFetch(`${TABLE}?id=eq.${encodeURIComponent(id)}`, { method: "DELETE", prefer: "return=minimal" });
  },
  async getCfg() {
    let rows;
    if (isDemo()) {
      const db = demoDb();
      rows = ["cfg_machines", "cfg_blocked"].filter(k => db[k]).map(k => ({ id: k, data: clone(db[k]) }));
    } else {
      rows = await sbFetch(`${TABLE}?select=id,data&id=in.(cfg_machines,cfg_blocked)`);
    }
    const cfg = emptyCfg();
    (rows || []).forEach(r => {
      if (r.id === "cfg_machines" && r.data) cfg.machines = { repair: r.data.repair || {}, extra: r.data.extra || [] };
      if (r.id === "cfg_blocked" && r.data) cfg.blocked = { ids: r.data.ids || [] };
    });
    return cfg;
  },
};
const emptyCfg = () => ({ machines: { repair: {}, extra: [] }, blocked: { ids: [] } });

function splitRows(rows) {
  const reqs = [], reps = {};
  (rows || []).forEach(r => {
    if (!r || !r.data || !r.id) return;
    if (r.id.startsWith("req_")) reqs.push({ ...r.data, id: r.id });
    else if (r.id.startsWith("rep_") && r.data.reqId) reps[r.data.reqId] = { ...r.data, id: r.id };
  });
  return { reqs, reps };
}

// Загрузка заявок и отчётов за день или месяц + автообновление.
// Формы хранят свои данные отдельно, поэтому обновление их не стирает.
function useRows(kind, key, pollMs) {
  const [state, setState] = useState({ reqs: [], reps: {}, loading: true, error: "", key: null });
  const seq = useRef(0);
  const load = useCallback(async (silent) => {
    const my = ++seq.current;
    if (!silent) setState(s => ({ ...s, loading: true, error: "" }));
    try {
      const rows = kind === "date" ? await api.byDate(key) : await api.byMonth(key);
      if (my !== seq.current) return; // пришёл устаревший ответ — игнорируем
      const { reqs, reps } = splitRows(rows);
      setState({ reqs, reps, loading: false, error: "", key });
    } catch (e) {
      if (my !== seq.current) return;
      setState(s => ({ ...s, loading: false, error: e.message }));
    }
  }, [kind, key]);
  useEffect(() => {
    setState({ reqs: [], reps: {}, loading: true, error: "", key: null });
    load(false);
    const t = setInterval(() => { if (document.visibilityState === "visible") load(true); }, pollMs || 20000);
    const onVis = () => { if (document.visibilityState === "visible") load(true); };
    document.addEventListener("visibilitychange", onVis);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", onVis); };
  }, [load, pollMs]);
  // после сохранения: сразу показываем изменение и перечитываем базу
  const applyLocal = useCallback((fn) => {
    seq.current++;
    setState(s => { const n = { ...s, reps: { ...s.reps }, reqs: [...s.reqs] }; fn(n); return n; });
    load(true);
  }, [load]);
  return { ...state, reload: load, applyLocal };
}

function useSaver() {
  const [s, setS] = useState({ busy: false, error: "", ok: false });
  const run = async (fn) => {
    setS({ busy: true, error: "", ok: false });
    try {
      await fn();
      setS({ busy: false, error: "", ok: true });
      setTimeout(() => setS(x => (x.busy ? x : { ...x, ok: false })), 2500);
      return true;
    } catch (e) {
      setS({ busy: false, error: (e && e.message) || String(e), ok: false });
      return false;
    }
  };
  return [s, run];
}

/* ---------------- стили ---------------- */
const C = {
  blue: "#2d6a9f", dark: "#1e3a5f", green: "#27ae60", greenBg: "#e6f6ec", greenBorder: "#9fd8b4",
  red: "#e74c3c", redBg: "#fdecea", orange: "#e67e22", orangeBg: "#fef3e2", gray: "#6b7b8c",
  bg: "#f0f4f8", border: "#d9e1ea", purple: "#8e44ad", purpleBg: "#f3e9fb", blueBg: "#e8f1fa",
};
const S = {
  page: { fontFamily: "-apple-system, 'Segoe UI', Roboto, Arial, sans-serif", minHeight: "100vh", background: C.bg, color: "#1d2733" },
  wrap: { maxWidth: 780, margin: "0 auto", padding: "12px 12px 80px" },
  header: { background: `linear-gradient(135deg, ${C.dark}, ${C.blue})`, color: "#fff", padding: "12px 16px" },
  card: { background: "#fff", borderRadius: 12, padding: 14, marginBottom: 10, boxShadow: "0 1px 6px rgba(0,0,0,0.07)" },
  input: { width: "100%", padding: "10px 11px", borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 16, boxSizing: "border-box", background: "#fff", color: "#1d2733", fontFamily: "inherit" },
  label: { fontSize: 12, color: C.gray, marginBottom: 4, display: "block", fontWeight: 600 },
  btn: (bg = C.blue, extra = {}) => ({ background: bg, color: "#fff", border: "none", borderRadius: 9, padding: "11px 16px", cursor: "pointer", fontWeight: 700, fontSize: 15, fontFamily: "inherit", ...extra }),
  ghost: (extra = {}) => ({ background: "#fff", color: C.blue, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 12px", cursor: "pointer", fontWeight: 600, fontSize: 13, fontFamily: "inherit", ...extra }),
  tag: (bg, color) => ({ display: "inline-block", borderRadius: 20, padding: "3px 10px", fontSize: 12.5, background: bg, color, marginRight: 6, marginTop: 5, lineHeight: 1.4 }),
  grid2: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 },
  h2: { fontSize: 17, fontWeight: 700, margin: "4px 0 10px" },
  muted: { color: C.gray, fontSize: 13 },
};

/* ---------------- мелкие компоненты ---------------- */
function Field({ label, children }) {
  return <label style={{ display: "block" }}><span style={S.label}>{label}</span>{children}</label>;
}

function SaveNote({ s }) {
  if (s.error) return <div style={{ marginTop: 8, padding: "8px 10px", borderRadius: 8, background: C.redBg, color: C.red, fontSize: 13 }}>❌ Не сохранено. {s.error}</div>;
  if (s.ok) return <div style={{ marginTop: 8, color: C.green, fontSize: 13, fontWeight: 600 }}>✅ Сохранено</div>;
  return null;
}

function DateBar({ date, setDate }) {
  const t = todayStr();
  const quick = [[addDays(t, -1), "Вчера"], [t, "Сегодня"], [addDays(t, 1), "Завтра"]];
  return (
    <div style={{ ...S.card, display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", padding: 10 }}>
      <button style={S.ghost()} onClick={() => setDate(addDays(date, -1))} aria-label="Предыдущий день">◀</button>
      {quick.map(([d, l]) => (
        <button key={l} onClick={() => setDate(d)}
          style={date === d ? S.btn(C.blue, { padding: "8px 12px", fontSize: 13 }) : S.ghost()}>{l}</button>
      ))}
      <button style={S.ghost()} onClick={() => setDate(addDays(date, 1))} aria-label="Следующий день">▶</button>
      <input type="date" value={date} onChange={e => e.target.value && setDate(e.target.value)}
        style={{ ...S.input, width: "auto", flex: "1 1 150px", padding: "7px 10px", fontSize: 15 }} />
      <div style={{ width: "100%", fontWeight: 700, color: C.dark, fontSize: 15 }}>📅 {fmtDay(date)}{date === t ? " — сегодня" : date === addDays(t, 1) ? " — завтра" : ""}</div>
    </div>
  );
}

/* ---------------- форма заявки ---------------- */
function ReqForm({ initial, date, drivers, machines, repair, dayReqs, lockDriver, onSubmit, onCancel, submitLabel }) {
  const [f, setF] = useState(() => initial ? { ...initial } : { date, driverId: lockDriver || "", machineId: "", time: "08:00", place: "", org: "", note: "" });
  const [s, run] = useSaver();
  const [err, setErr] = useState("");
  const set = (k, v) => setF(x => ({ ...x, [k]: v }));
  const busyMachine = f.machineId && (dayReqs || []).find(r => Number(r.machineId) === Number(f.machineId) && r.id !== f.id && r.date === f.date);
  const busyDriver = f.driverId && (dayReqs || []).find(r => Number(r.driverId) === Number(f.driverId) && r.id !== f.id && r.date === f.date);

  const submit = async () => {
    if (!f.driverId) return setErr("Выберите водителя");
    if (!f.place.trim() && !f.org.trim()) return setErr("Укажите, куда ехать или заказчика");
    setErr("");
    const ok = await run(() => onSubmit({ ...f, driverId: Number(f.driverId), machineId: f.machineId ? Number(f.machineId) : null, place: f.place.trim(), org: f.org.trim(), note: f.note.trim() }));
    if (ok && !initial) setF(x => ({ ...x, place: "", org: "", note: "", machineId: "", driverId: lockDriver || "" }));
  };

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div style={S.grid2}>
        {!lockDriver && (
          <Field label="Водитель *">
            <select style={S.input} value={f.driverId} onChange={e => set("driverId", e.target.value)}>
              <option value="">— выберите —</option>
              {drivers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </Field>
        )}
        <Field label="Техника">
          <select style={S.input} value={f.machineId || ""} onChange={e => set("machineId", e.target.value)}>
            <option value="">— без техники —</option>
            {machines.map(m => <option key={m.id} value={m.id} disabled={!!repair[m.id]}>{m.name}{repair[m.id] ? " (в ремонте)" : ""}</option>)}
          </select>
        </Field>
        <Field label="Время подачи">
          <input type="time" style={S.input} value={f.time} onChange={e => set("time", e.target.value)} />
        </Field>
        {initial && (
          <Field label="Дата">
            <input type="date" style={S.input} value={f.date} onChange={e => e.target.value && set("date", e.target.value)} />
          </Field>
        )}
      </div>
      <Field label="Куда / объект">
        <input style={S.input} value={f.place} onChange={e => set("place", e.target.value)} placeholder="Адрес или название объекта" />
      </Field>
      <Field label="Заказчик">
        <input style={S.input} value={f.org} onChange={e => set("org", e.target.value)} placeholder="Организация" />
      </Field>
      <Field label="Комментарий для водителя">
        <input style={S.input} value={f.note} onChange={e => set("note", e.target.value)} placeholder="Что везти, контакт на месте…" />
      </Field>
      {busyMachine && <div style={{ ...S.muted, color: C.orange }}>⚠️ Эта техника на эту дату уже стоит в плане: {shortName(busyMachine.driverId)}, {busyMachine.time || "время не указано"}</div>}
      {busyDriver && !lockDriver && <div style={{ ...S.muted, color: C.orange }}>ℹ️ У водителя на эту дату уже есть заявка ({busyDriver.time || "без времени"}, {busyDriver.place || busyDriver.org})</div>}
      {err && <div style={{ color: C.red, fontSize: 13 }}>{err}</div>}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button style={S.btn(C.blue, { flex: "1 1 200px", opacity: s.busy ? 0.7 : 1 })} disabled={s.busy} onClick={submit}>
          {s.busy ? "⏳ Сохраняем…" : submitLabel || "💾 Сохранить"}
        </button>
        {onCancel && <button style={S.ghost({ padding: "11px 16px" })} onClick={onCancel}>Отмена</button>}
      </div>
      <SaveNote s={s} />
    </div>
  );
}

/* ---------------- форма отчёта водителя ---------------- */
function ReportForm({ req, rep, onSubmit, onCancel }) {
  const [f, setF] = useState(() => ({
    from: rep?.from || req.time || "", to: rep?.to || "", trips: rep?.trips ?? "",
    route: rep?.route || "", comment: rep?.comment || "", waybill: rep ? !!rep.waybill : false,
  }));
  const [s, run] = useSaver();
  const [err, setErr] = useState("");
  const set = (k, v) => setF(x => ({ ...x, [k]: v }));
  const hours = calcHours(f.from, f.to);

  const submit = async () => {
    if (!f.from || !f.to) return setErr("Укажите время работы: с какого и до какого часа");
    setErr("");
    await run(() => onSubmit({ ...f, trips: f.trips === "" ? 0 : Number(f.trips), hours, route: f.route.trim(), comment: f.comment.trim() }));
  };

  return (
    <div style={{ marginTop: 10, padding: 12, borderRadius: 10, background: "#f7fbf8", border: `1px solid ${C.greenBorder}`, display: "grid", gap: 10 }}>
      <div style={{ fontWeight: 700, color: C.green }}>📝 Отчёт о выполненной работе</div>
      <div style={S.grid2}>
        <Field label="Работал с *"><input type="time" style={S.input} value={f.from} onChange={e => set("from", e.target.value)} /></Field>
        <Field label="до *"><input type="time" style={S.input} value={f.to} onChange={e => set("to", e.target.value)} /></Field>
        <Field label="Рейсов"><input type="number" inputMode="numeric" min="0" style={S.input} value={f.trips} onChange={e => set("trips", e.target.value)} placeholder="0" /></Field>
      </div>
      {hours > 0 && <div style={{ fontSize: 14, color: C.dark }}>Итого: <b>{hours} ч</b></div>}
      <Field label="Маршрут / что делал">
        <input style={S.input} value={f.route} onChange={e => set("route", e.target.value)} placeholder="Например: Карьер → ул. Линейная" />
      </Field>
      <Field label="Комментарий">
        <input style={S.input} value={f.comment} onChange={e => set("comment", e.target.value)} placeholder="Простой, поломка, доп. работы…" />
      </Field>
      <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 15, cursor: "pointer", padding: "4px 0" }}>
        <input type="checkbox" checked={f.waybill} onChange={e => set("waybill", e.target.checked)} style={{ width: 22, height: 22 }} />
        Путевой лист закрыт
      </label>
      {err && <div style={{ color: C.red, fontSize: 13 }}>{err}</div>}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button style={S.btn(C.green, { flex: "1 1 220px", opacity: s.busy ? 0.7 : 1 })} disabled={s.busy} onClick={submit}>
          {s.busy ? "⏳ Сохраняем…" : "✅ Работа выполнена — сохранить"}
        </button>
        {onCancel && <button style={S.ghost({ padding: "11px 16px" })} onClick={onCancel}>Отмена</button>}
      </div>
      <SaveNote s={s} />
    </div>
  );
}

/* ---------------- карточка заявки ---------------- */
function ReqCard({ req, rep, machines, repair, drivers, dayReqs, me, canEditPlan, onSaveReq, onDeleteReq, onSaveRep, onDeleteRep }) {
  const [mode, setMode] = useState("view"); // view | edit | report
  const [confirmDel, setConfirmDel] = useState(false);
  const [s, run] = useSaver();
  const t = todayStr();
  const done = !!(rep && rep.done);
  const missing = !done && req.date < t;
  const canReport = req.date <= t && (canEditPlan || Number(req.driverId) === me.id);
  const machine = machines.find(m => m.id === Number(req.machineId));

  const border = done ? C.green : missing ? C.orange : C.blue;
  const cardStyle = { ...S.card, borderLeft: `6px solid ${border}`, background: done ? C.greenBg : "#fff" };

  if (mode === "edit") {
    return (
      <div style={cardStyle}>
        <div style={{ ...S.h2, fontSize: 15 }}>✏️ Изменить заявку</div>
        <ReqForm initial={req} date={req.date} drivers={drivers} machines={machines} repair={repair} dayReqs={dayReqs}
          submitLabel="💾 Сохранить изменения"
          onSubmit={async (f) => { await onSaveReq(f); setMode("view"); }}
          onCancel={() => setMode("view")} />
      </div>
    );
  }

  return (
    <div style={cardStyle} data-testid="req-card">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start" }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 16 }}>
            {req.time ? <span style={{ color: C.dark }}>🕗 {req.time} · </span> : null}{userName(req.driverId)}
          </div>
          <div style={{ fontSize: 14, marginTop: 4, color: "#33414f" }}>🚜 {machine ? machine.name : "без техники"}</div>
        </div>
        <span style={{ ...S.tag(done ? C.green : missing ? C.orangeBg : C.blueBg, done ? "#fff" : missing ? C.orange : C.blue), marginTop: 0, whiteSpace: "nowrap", fontWeight: 700 }}>
          {done ? "✅ Отработано" : missing ? "⚠️ Нет отчёта" : "⏳ В плане"}
        </span>
      </div>
      <div style={{ marginTop: 6, fontSize: 14, lineHeight: 1.5 }}>
        {req.place && <div>📍 {req.place}</div>}
        {req.org && <div>🏢 {req.org}</div>}
        {req.note && <div style={{ color: C.gray }}>💬 {req.note}</div>}
      </div>
      {req.createdBy && (
        <div data-testid="author" style={{ marginTop: 8, padding: "7px 10px", borderRadius: 8, background: done ? "#fff" : C.purpleBg, color: C.purple, fontSize: 13.5, lineHeight: 1.45 }}>
          {Number(req.createdBy) === Number(req.driverId)
            ? <>👤 Добавил сам водитель</>
            : <>📞 Заявку внёс(ла): <b>{userName(req.createdBy)}</b></>}
          {req.updatedBy && Number(req.updatedBy) !== Number(req.createdBy) && (
            <div style={{ fontSize: 12.5 }}>✏️ Изменил(а): {userName(req.updatedBy)}</div>
          )}
        </div>
      )}

      {done && mode !== "report" && (
        <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px dashed ${C.greenBorder}` }}>
          <span style={S.tag("#fff", C.dark)}>🕐 {rep.from}–{rep.to} · <b>{rep.hours} ч</b></span>
          {Number(rep.trips) > 0 && <span style={S.tag(C.orangeBg, C.orange)}>🚗 {rep.trips} рейс.</span>}
          {rep.route && <span style={S.tag(C.blueBg, C.blue)}>🛣 {rep.route}</span>}
          <span style={S.tag(rep.waybill ? "#fff" : C.redBg, rep.waybill ? C.green : C.red)}>{rep.waybill ? "📄 Путевой закрыт" : "📄 Путевой НЕ закрыт"}</span>
          {rep.comment && <div style={{ fontSize: 13, color: C.gray, marginTop: 6 }}>💬 {rep.comment}</div>}
          {Number(rep.savedBy) !== Number(req.driverId) && rep.savedBy && <div style={{ ...S.muted, fontSize: 12, marginTop: 4 }}>отчёт внёс: {shortName(rep.savedBy)}</div>}
        </div>
      )}

      {mode === "report" && (
        <ReportForm req={req} rep={rep}
          onSubmit={async (f) => { await onSaveRep(req, f); setMode("view"); }}
          onCancel={() => setMode("view")} />
      )}

      {mode === "view" && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
          {canReport && !done && (
            <button style={S.btn(C.green, { flex: "1 1 220px" })} onClick={() => setMode("report")}>✅ Отработал — заполнить отчёт</button>
          )}
          {canReport && done && <button style={S.ghost()} onClick={() => setMode("report")}>✏️ Изменить отчёт</button>}
          {canEditPlan && done && <button style={S.ghost({ color: C.orange })} disabled={s.busy} onClick={() => run(() => onDeleteRep(req))}>↩️ Снять отметку</button>}
          {canEditPlan && !done && <button style={S.ghost()} onClick={() => setMode("edit")}>✏️ Изменить</button>}
          {canEditPlan && !confirmDel && <button style={S.ghost({ color: C.red })} onClick={() => setConfirmDel(true)}>🗑</button>}
          {canEditPlan && confirmDel && (
            <>
              <button style={S.btn(C.red, { padding: "8px 12px", fontSize: 13 })} disabled={s.busy} onClick={() => run(() => onDeleteReq(req))}>Да, удалить</button>
              <button style={S.ghost()} onClick={() => setConfirmDel(false)}>Нет</button>
            </>
          )}
          {!canReport && !done && req.date > t && Number(req.driverId) === me.id && (
            <div style={{ ...S.muted, fontSize: 12 }}>Отчёт можно заполнить в день работы</div>
          )}
        </div>
      )}
      <SaveNote s={s} />
    </div>
  );
}

/* ---------------- план (общий для менеджера и водителя) ---------------- */
function PlanView({ me, machines, repair, blockedIds, isDriver }) {
  const [date, setDate] = useState(isDriver ? todayStr() : addDays(todayStr(), 1));
  const day = useRows("date", date, 20000);
  const [showForm, setShowForm] = useState(false);
  const drivers = USERS.filter(u => u.role === "driver" && !blockedIds.includes(u.id)).sort((a, b) => a.name.localeCompare(b.name, "ru"));

  const list = (isDriver ? day.reqs.filter(r => Number(r.driverId) === me.id) : day.reqs)
    .slice()
    .sort((a, b) => (a.time || "99").localeCompare(b.time || "99") || userName(a.driverId).localeCompare(userName(b.driverId), "ru"));

  const saveReq = async (f) => {
    const isNew = !f.id;
    const id = f.id || "req_" + newId();
    const old = day.reqs.find(r => r.id === id);
    const data = {
      date: f.date || date, month: monthOf(f.date || date),
      driverId: f.driverId, machineId: f.machineId, time: f.time || "",
      place: f.place, org: f.org, note: f.note,
      createdBy: old ? old.createdBy : me.id, createdAt: old ? old.createdAt : new Date().toISOString(),
      updatedBy: me.id, updatedAt: new Date().toISOString(),
    };
    await api.put(id, data);
    // если у заявки уже есть отчёт и поменяли дату/водителя — переносим отчёт вместе с ней
    const rep = day.reps[id];
    if (!isNew && rep && (rep.date !== data.date || Number(rep.driverId) !== Number(data.driverId))) {
      const { id: repId, ...repData } = rep;
      await api.put(repId, { ...repData, date: data.date, month: data.month, driverId: data.driverId, machineId: data.machineId });
    }
    day.applyLocal(st => {
      st.reqs = st.reqs.filter(r => r.id !== id);
      if (data.date === date) st.reqs.push({ ...data, id });
    });
  };

  const deleteReq = async (req) => {
    if (day.reps[req.id]) await api.del("rep_" + req.id);
    await api.del(req.id);
    day.applyLocal(st => { st.reqs = st.reqs.filter(r => r.id !== req.id); delete st.reps[req.id]; });
  };

  const saveRep = async (req, f) => {
    const id = "rep_" + req.id;
    const data = {
      reqId: req.id, date: req.date, month: monthOf(req.date), driverId: Number(req.driverId), machineId: req.machineId,
      from: f.from, to: f.to, hours: f.hours, trips: f.trips, route: f.route, comment: f.comment, waybill: !!f.waybill,
      done: true, savedBy: me.id, savedAt: new Date().toISOString(),
    };
    await api.put(id, data);
    day.applyLocal(st => { st.reps[req.id] = { ...data, id }; });
  };

  const deleteRep = async (req) => {
    await api.del("rep_" + req.id);
    day.applyLocal(st => { delete st.reps[req.id]; });
  };

  const doneCnt = list.filter(r => day.reps[r.id]?.done).length;
  const t = todayStr();
  const missingCnt = date < t ? list.length - doneCnt : 0;
  const busyMachineIds = new Set(day.reqs.map(r => Number(r.machineId)).filter(Boolean));
  const freeMachines = machines.filter(m => !busyMachineIds.has(m.id) && !repair[m.id]);
  const busyDriverIds = new Set(day.reqs.map(r => Number(r.driverId)));
  const freeDrivers = drivers.filter(d => !busyDriverIds.has(d.id));

  return (
    <div>
      <DateBar date={date} setDate={d => { setDate(d); setShowForm(false); }} />

      {day.error && (
        <div style={{ ...S.card, background: C.redBg, color: C.red, fontSize: 14 }}>
          ⚠️ {day.error} <button style={S.ghost({ marginLeft: 8 })} onClick={() => day.reload(false)}>Обновить</button>
        </div>
      )}

      {!isDriver && (
        <div style={{ ...S.card, display: "flex", justifyContent: "space-around", textAlign: "center", padding: 10 }}>
          <div><div style={{ fontSize: 22, fontWeight: 800, color: C.blue }}>{list.length}</div><div style={S.muted}>заявок</div></div>
          <div><div style={{ fontSize: 22, fontWeight: 800, color: C.green }}>{doneCnt}</div><div style={S.muted}>отработано</div></div>
          <div><div style={{ fontSize: 22, fontWeight: 800, color: missingCnt ? C.orange : C.gray }}>{date < t ? missingCnt : list.length - doneCnt}</div><div style={S.muted}>{date < t ? "без отчёта" : "в работе"}</div></div>
        </div>
      )}

      {!showForm && (
        <button style={S.btn(isDriver ? "#fff" : C.blue, { width: "100%", marginBottom: 10, ...(isDriver ? { color: C.blue, border: `1px dashed ${C.blue}`, fontSize: 14 } : {}) })}
          onClick={() => setShowForm(true)}>
          {isDriver ? "➕ Добавить работу без заявки" : "➕ Добавить заявку на " + fmtDay(date)}
        </button>
      )}
      {showForm && (
        <div style={S.card}>
          <div style={S.h2}>{isDriver ? "➕ Работа без заявки" : "➕ Новая заявка"} · {fmtDay(date)}</div>
          <ReqForm date={date} drivers={drivers} machines={machines} repair={repair} dayReqs={day.reqs}
            lockDriver={isDriver ? me.id : null}
            submitLabel={isDriver ? "💾 Добавить" : "💾 Добавить в план"}
            onSubmit={saveReq} onCancel={() => setShowForm(false)} />
        </div>
      )}

      {day.loading && day.key !== date ? (
        <div style={{ ...S.card, textAlign: "center", color: C.gray }}>⏳ Загружаем…</div>
      ) : list.length === 0 ? (
        <div style={{ ...S.card, textAlign: "center", color: C.gray, padding: 24 }}>
          {isDriver ? "На этот день заявок нет" : "На этот день заявок пока нет"}
        </div>
      ) : (
        list.map(r => (
          <ReqCard key={r.id} req={r} rep={day.reps[r.id]} me={me}
            machines={machines} repair={repair} drivers={drivers} dayReqs={day.reqs}
            canEditPlan={!isDriver || Number(r.createdBy) === me.id}
            onSaveReq={saveReq} onDeleteReq={deleteReq} onSaveRep={saveRep} onDeleteRep={deleteRep} />
        ))
      )}

      {!isDriver && !day.loading && (
        <div style={S.card}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>🟢 Свободная техника ({freeMachines.length})</div>
          <div>{freeMachines.length ? freeMachines.map(m => <span key={m.id} style={S.tag(C.greenBg, C.green)}>{m.name}</span>) : <span style={S.muted}>вся техника в плане</span>}</div>
          <div style={{ fontWeight: 700, fontSize: 14, margin: "12px 0 4px" }}>👤 Водители без заявок ({freeDrivers.length})</div>
          <div>{freeDrivers.length ? freeDrivers.map(d => <span key={d.id} style={S.tag(C.blueBg, C.blue)}>{shortName(d.id)}</span>) : <span style={S.muted}>все водители в плане</span>}</div>
          {Object.keys(repair).filter(k => repair[k]).length > 0 && (
            <>
              <div style={{ fontWeight: 700, fontSize: 14, margin: "12px 0 4px" }}>🔧 В ремонте</div>
              <div>{machines.filter(m => repair[m.id]).map(m => <span key={m.id} style={S.tag(C.redBg, C.red)}>{m.name}</span>)}</div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------------- отчёт за месяц ---------------- */
function ReportView({ machines }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [mode, setMode] = useState("drivers");
  const [open, setOpen] = useState({});
  const ym = `${year}-${pad(month)}`;
  const data = useRows("month", ym, 60000);

  const rows = data.reqs.map(r => ({ req: r, rep: data.reps[r.id] }))
    .sort((a, b) => a.req.date.localeCompare(b.req.date) || (a.req.time || "").localeCompare(b.req.time || ""));
  const t = todayStr();
  const done = rows.filter(x => x.rep?.done);
  const missing = rows.filter(x => !x.rep?.done && x.req.date < t);
  const totalHours = Math.round(done.reduce((s, x) => s + Number(x.rep.hours || 0), 0) * 10) / 10;
  const totalTrips = done.reduce((s, x) => s + Number(x.rep.trips || 0), 0);
  const mName = id => (machines.find(m => m.id === Number(id)) || {}).name || "без техники";

  const groupBy = (keyFn) => {
    const g = {};
    rows.forEach(x => { const k = keyFn(x); (g[k] = g[k] || []).push(x); });
    return Object.entries(g).map(([k, items]) => {
      const d = items.filter(x => x.rep?.done);
      return {
        key: k, items,
        days: new Set(d.map(x => x.req.date)).size,
        shifts: d.length,
        hours: Math.round(d.reduce((s, x) => s + Number(x.rep.hours || 0), 0) * 10) / 10,
        trips: d.reduce((s, x) => s + Number(x.rep.trips || 0), 0),
        missing: items.filter(x => !x.rep?.done && x.req.date < t).length,
        noWaybill: d.filter(x => !x.rep.waybill).length,
      };
    }).sort((a, b) => b.hours - a.hours);
  };
  const groups = mode === "drivers"
    ? groupBy(x => String(x.req.driverId)).map(g => ({ ...g, title: userName(g.key) }))
    : groupBy(x => String(x.req.machineId || 0)).map(g => ({ ...g, title: g.key === "0" ? "Без техники" : mName(g.key) }));

  const csvCell = v => { const s = v === undefined || v === null ? "" : String(v); return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const downloadCsv = () => {
    const head = ["Дата", "Водитель", "Техника", "Время подачи", "Объект", "Заказчик", "Заявку внёс", "Статус", "С", "До", "Часы", "Рейсы", "Маршрут", "Путевой закрыт", "Комментарий водителя"];
    const lines = rows.map(({ req, rep }) => [
      fmtDate(req.date), userName(req.driverId), mName(req.machineId), req.time, req.place, req.org, req.createdBy ? userName(req.createdBy) : "",
      rep?.done ? "Отработано" : req.date < t ? "Нет отчёта" : "В плане",
      rep?.from, rep?.to, rep?.hours ? String(rep.hours).replace(".", ",") : "", rep?.trips, rep?.route,
      rep?.done ? (rep.waybill ? "да" : "нет") : "", rep?.comment,
    ].map(csvCell).join(";"));
    const csv = "﻿" + [head.join(";"), ...lines].join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `Отчёт_М5_${MONTHS[month - 1]}_${year}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };

  return (
    <div>
      <div style={{ ...S.card, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <select style={{ ...S.input, width: "auto", flex: "1 1 140px" }} value={month} onChange={e => setMonth(Number(e.target.value))}>
          {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
        </select>
        <select style={{ ...S.input, width: "auto", flex: "0 1 110px" }} value={year} onChange={e => setYear(Number(e.target.value))}>
          {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <button style={S.btn(C.green, { flex: "1 1 160px", fontSize: 14 })} onClick={downloadCsv} disabled={!rows.length}>⬇️ Скачать Excel (CSV)</button>
      </div>

      {data.error && <div style={{ ...S.card, background: C.redBg, color: C.red, fontSize: 14 }}>⚠️ {data.error}</div>}

      <div style={{ ...S.card, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", textAlign: "center", padding: 10, gap: 4 }}>
        <div><div style={{ fontSize: 20, fontWeight: 800, color: C.green }}>{done.length}</div><div style={S.muted}>смен</div></div>
        <div><div style={{ fontSize: 20, fontWeight: 800, color: C.blue }}>{totalHours}</div><div style={S.muted}>часов</div></div>
        <div><div style={{ fontSize: 20, fontWeight: 800, color: C.orange }}>{totalTrips}</div><div style={S.muted}>рейсов</div></div>
        <div><div style={{ fontSize: 20, fontWeight: 800, color: missing.length ? C.red : C.gray }}>{missing.length}</div><div style={S.muted}>без отчёта</div></div>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        {[["drivers", "👤 По водителям"], ["machines", "🚜 По технике"]].map(([k, l]) => (
          <button key={k} style={mode === k ? S.btn(C.dark, { flex: 1, fontSize: 14, padding: "9px" }) : S.ghost({ flex: 1, fontSize: 14 })} onClick={() => setMode(k)}>{l}</button>
        ))}
      </div>

      {data.loading && data.key !== ym ? <div style={{ ...S.card, textAlign: "center", color: C.gray }}>⏳ Загружаем…</div>
        : groups.length === 0 ? <div style={{ ...S.card, textAlign: "center", color: C.gray, padding: 24 }}>За {MONTHS[month - 1].toLowerCase()} записей нет</div>
        : groups.map(g => (
          <div key={g.key} style={S.card}>
            <div style={{ cursor: "pointer" }} onClick={() => setOpen(o => ({ ...o, [mode + g.key]: !o[mode + g.key] }))}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{g.title}</div>
                <div style={{ color: C.blue, fontSize: 13, whiteSpace: "nowrap" }}>{open[mode + g.key] ? "▲ скрыть" : "▼ подробно"}</div>
              </div>
              <div>
                <span style={S.tag(C.greenBg, C.green)}>{g.days} дн. / {g.shifts} смен</span>
                <span style={S.tag(C.blueBg, C.blue)}>{g.hours} ч</span>
                <span style={S.tag(C.orangeBg, C.orange)}>{g.trips} рейс.</span>
                {g.missing > 0 && <span style={S.tag(C.redBg, C.red)}>⚠️ без отчёта: {g.missing}</span>}
                {g.noWaybill > 0 && <span style={S.tag(C.redBg, C.red)}>📄 путевой не закрыт: {g.noWaybill}</span>}
              </div>
            </div>
            {open[mode + g.key] && (
              <div style={{ marginTop: 8 }}>
                {g.items.map(({ req, rep }) => (
                  <div key={req.id} style={{ padding: "8px 0", borderTop: `1px solid ${C.border}`, fontSize: 13.5, lineHeight: 1.5 }}>
                    <b>{fmtDate(req.date)}</b> · {mode === "drivers" ? mName(req.machineId) : userName(req.driverId)}
                    <div style={{ color: "#33414f" }}>{[req.place, req.org].filter(Boolean).join(" · ")}</div>
                    {req.createdBy && <div style={{ color: C.purple, fontSize: 12.5 }}>внёс(ла): {shortName(req.createdBy)}</div>}
                    {rep?.done
                      ? <div style={{ color: C.green }}>✅ {rep.from}–{rep.to} ({rep.hours} ч){Number(rep.trips) ? `, ${rep.trips} рейс.` : ""}{rep.route ? `, ${rep.route}` : ""}{rep.waybill ? "" : " · путевой не закрыт"}</div>
                      : <div style={{ color: req.date < t ? C.red : C.gray }}>{req.date < t ? "⚠️ отчёт не заполнен" : "⏳ в плане"}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
    </div>
  );
}

/* ---------------- техника ---------------- */
function MachinesView({ machines, cfg, saveCfg }) {
  const [name, setName] = useState("");
  const [s, run] = useSaver();
  const repair = cfg.machines.repair;
  const toggle = (m) => run(() => saveCfg("machines", c => { c.repair = { ...c.repair, [m.id]: !c.repair[m.id] }; if (!c.repair[m.id]) delete c.repair[m.id]; }));
  const add = () => {
    const n = name.trim(); if (!n) return;
    run(async () => { await saveCfg("machines", c => { c.extra = [...(c.extra || []), { id: 1000 + Date.now() % 1000000, name: n }]; }); setName(""); });
  };
  const remove = (m) => run(() => saveCfg("machines", c => { c.extra = (c.extra || []).filter(x => x.id !== m.id); delete c.repair[m.id]; }));
  return (
    <div>
      <div style={S.card}>
        <div style={S.h2}>🚜 Техника ({machines.length})</div>
        <div style={S.muted}>Техника «в ремонте» не предлагается при составлении плана.</div>
        <SaveNote s={s} />
      </div>
      {machines.map(m => (
        <div key={m.id} style={{ ...S.card, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", borderLeft: `6px solid ${repair[m.id] ? C.red : C.green}` }}>
          <div style={{ flex: "1 1 200px", fontWeight: 600 }}>{m.name}</div>
          <span style={S.tag(repair[m.id] ? C.redBg : C.greenBg, repair[m.id] ? C.red : C.green)}>{repair[m.id] ? "🔧 В ремонте" : "✅ В работе"}</span>
          <button style={S.ghost()} disabled={s.busy} onClick={() => toggle(m)}>{repair[m.id] ? "Вернуть в работу" : "В ремонт"}</button>
          {m.extra && <button style={S.ghost({ color: C.red })} disabled={s.busy} onClick={() => remove(m)}>🗑</button>}
        </div>
      ))}
      <div style={{ ...S.card, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input style={{ ...S.input, flex: "1 1 220px" }} value={name} onChange={e => setName(e.target.value)} placeholder="Новая техника: марка и госномер" />
        <button style={S.btn()} disabled={s.busy} onClick={add}>➕ Добавить</button>
      </div>
    </div>
  );
}

/* ---------------- сотрудники ---------------- */
function PeopleView({ me, cfg, saveCfg }) {
  const [s, run] = useSaver();
  const blocked = cfg.blocked.ids;
  const toggle = (u) => run(() => saveCfg("blocked", c => { c.ids = c.ids.includes(u.id) ? c.ids.filter(x => x !== u.id) : [...c.ids, u.id]; }));
  return (
    <div>
      <div style={S.card}>
        <div style={S.h2}>👥 Сотрудники</div>
        <div style={S.muted}>Заблокированный сотрудник не сможет войти в приложение.</div>
        <SaveNote s={s} />
      </div>
      {USERS.map(u => {
        const b = blocked.includes(u.id);
        return (
          <div key={u.id} style={{ ...S.card, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", opacity: b ? 0.65 : 1 }}>
            <div style={{ flex: "1 1 200px" }}>
              <div style={{ fontWeight: 600 }}>{u.name}</div>
              <div style={S.muted}>{ROLE_LABEL[u.role]}</div>
            </div>
            {b && <span style={S.tag(C.redBg, C.red)}>🔒 Заблокирован</span>}
            {u.id !== me.id && (
              <button style={S.ghost({ color: b ? C.green : C.red })} disabled={s.busy} onClick={() => toggle(u)}>{b ? "Разблокировать" : "Заблокировать"}</button>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ---------------- вход ---------------- */
function Login({ blockedIds, onLogin }) {
  const [uid, setUid] = useState("");
  const [pin, setPin] = useState("");
  const [err, setErr] = useState("");
  const users = USERS.filter(u => !blockedIds.includes(u.id)).slice().sort((a, b) => a.name.localeCompare(b.name, "ru"));
  const submit = () => {
    const u = USERS.find(x => x.id === Number(uid));
    if (!u) return setErr("Выберите себя из списка");
    if (blockedIds.includes(u.id)) return setErr("Доступ закрыт. Обратитесь к руководителю.");
    if (u.pin !== pin) return setErr("Неверный PIN-код");
    onLogin(u);
  };
  return (
    <div style={{ ...S.page, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, background: `linear-gradient(135deg, ${C.dark}, ${C.blue})` }}>
      <div style={{ ...S.card, width: "100%", maxWidth: 380, padding: 26 }}>
        <div style={{ textAlign: "center", marginBottom: 18 }}>
          <div style={{ fontSize: 40 }}>🚚</div>
          <div style={{ fontWeight: 800, fontSize: 20, color: C.dark }}>Транспорт М5</div>
          <div style={S.muted}>План работ и отчёты</div>
        </div>
        <div style={{ display: "grid", gap: 12 }}>
          <Field label="Кто вы">
            <select style={S.input} value={uid} onChange={e => { setUid(e.target.value); setErr(""); }}>
              <option value="">— выберите —</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </Field>
          <Field label="PIN-код">
            <input style={{ ...S.input, textAlign: "center", letterSpacing: 8, fontSize: 20 }} type="password" inputMode="numeric" maxLength={4}
              value={pin} onChange={e => { setPin(e.target.value.replace(/\D/g, "")); setErr(""); }}
              onKeyDown={e => e.key === "Enter" && submit()} placeholder="••••" />
          </Field>
          {err && <div style={{ color: C.red, fontSize: 14, textAlign: "center" }}>{err}</div>}
          <button style={S.btn(C.blue, { width: "100%", fontSize: 16, padding: 13 })} onClick={submit}>Войти</button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- приложение ---------------- */
export default function App() {
  const [me, setMe] = useState(() => { const id = Number(lsGet("m5_user")); return USERS.find(u => u.id === id) || null; });
  const [cfg, setCfg] = useState(emptyCfg);
  const [tab, setTab] = useState("plan");
  const online = useNet();

  const loadCfg = useCallback(async () => {
    try { setCfg(await api.getCfg()); } catch {}
  }, []);
  useEffect(() => {
    loadCfg();
    const t = setInterval(() => { if (document.visibilityState === "visible") loadCfg(); }, 60000);
    return () => clearInterval(t);
  }, [loadCfg]);

  // если сотрудника заблокировали — выходим
  useEffect(() => {
    if (me && cfg.blocked.ids.includes(me.id)) { setMe(null); lsSet("m5_user", null); }
  }, [cfg, me]);

  // изменение настроек: читаем свежую версию с сервера, меняем, записываем
  const saveCfg = async (part, mutate) => {
    const fresh = await api.getCfg();
    const piece = clone(fresh[part]);
    mutate(piece);
    await api.put(part === "machines" ? "cfg_machines" : "cfg_blocked", piece);
    setCfg({ ...fresh, [part]: piece });
  };

  const login = u => { setMe(u); lsSet("m5_user", String(u.id)); setTab("plan"); };
  const logout = () => { setMe(null); lsSet("m5_user", null); };

  if (!me) return <Login blockedIds={cfg.blocked.ids} onLogin={login} />;

  const machines = [...MACHINES, ...(cfg.machines.extra || []).map(m => ({ ...m, extra: true }))];
  const repair = cfg.machines.repair || {};
  const isDriver = me.role === "driver";
  const tabs = isDriver ? [] : [
    ["plan", "📅 План"], ["report", "📊 Отчёт"], ["machines", "🚜 Техника"],
    ...(me.role === "manager" ? [["people", "👥 Люди"]] : []),
  ];

  return (
    <div style={S.page}>
      <div style={S.header}>
        <div style={{ maxWidth: 780, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 17 }}>🚚 Транспорт М5</div>
            <div style={{ fontSize: 13, opacity: 0.9, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{me.name} · {ROLE_LABEL[me.role]}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span title={online ? "Связь с сервером есть" : "Нет связи с сервером"} style={{ fontSize: 12, opacity: 0.95 }}>{online ? "🟢" : "🔴 нет связи"}</span>
            <button onClick={logout} style={{ background: "rgba(255,255,255,0.18)", color: "#fff", border: "none", borderRadius: 8, padding: "8px 12px", cursor: "pointer", fontWeight: 600, fontFamily: "inherit" }}>Выйти</button>
          </div>
        </div>
      </div>

      {isDemo() && (
        <div style={{ background: "#fff8e1", color: "#8a6d00", fontSize: 13, padding: "8px 16px", textAlign: "center" }}>
          Демо-режим предпросмотра: данные примерные и сохраняются только в этом окне. Настоящая база не затрагивается.
        </div>
      )}

      {tabs.length > 0 && (
        <div style={{ background: "#fff", borderBottom: `1px solid ${C.border}`, position: "sticky", top: 0, zIndex: 5 }}>
          <div style={{ maxWidth: 780, margin: "0 auto", display: "flex", overflowX: "auto" }}>
            {tabs.map(([k, l]) => (
              <button key={k} onClick={() => setTab(k)} style={{
                flex: "1 0 auto", background: "none", border: "none", padding: "12px 14px", cursor: "pointer", fontSize: 14.5, fontFamily: "inherit",
                fontWeight: tab === k ? 800 : 500, color: tab === k ? C.blue : C.gray,
                borderBottom: tab === k ? `3px solid ${C.blue}` : "3px solid transparent",
              }}>{l}</button>
            ))}
          </div>
        </div>
      )}

      <div style={S.wrap}>
        {isDriver && <div style={{ ...S.h2, marginTop: 6 }}>Мои заявки</div>}
        {(isDriver || tab === "plan") && (
          <PlanView me={me} machines={machines} repair={repair} blockedIds={cfg.blocked.ids} isDriver={isDriver} />
        )}
        {!isDriver && tab === "report" && <ReportView machines={machines} />}
        {!isDriver && tab === "machines" && <MachinesView machines={machines} cfg={cfg} saveCfg={saveCfg} />}
        {!isDriver && tab === "people" && me.role === "manager" && <PeopleView me={me} cfg={cfg} saveCfg={saveCfg} />}
      </div>
    </div>
  );
}
