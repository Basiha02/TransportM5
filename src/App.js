import { useState, useEffect } from "react";

const FIREBASE_URL = "https://transport-m5-default-rtdb.firebaseio.com/team_work_app.json";

const DEFAULT_USERS = [
  { id: 1,  name: "Колдаева Юлия Юрьевна",           role: "manager",    pin: "0000" },
  { id: 2,  name: "Вафин Данил Закирьянович",          role: "driver",     pin: "0016" },
  { id: 3,  name: "Касымов Руслан Раилевич",           role: "driver",     pin: "0002" },
  { id: 4,  name: "Мурадымов Марат Хусаинович",        role: "driver",     pin: "0003" },
  { id: 5,  name: "Нафигин Вадим Шавкатович",          role: "driver",     pin: "0004" },
  { id: 6,  name: "Хадыев Марат Саримович",            role: "driver",     pin: "0005" },
  { id: 7,  name: "Шакиров Марат Рашитович",           role: "driver",     pin: "0006" },
  { id: 8,  name: "Шахвалеев Роман Рафидович",         role: "driver",     pin: "0007" },
  { id: 9,  name: "Абдуллин Рафит Ансарович",          role: "driver",     pin: "0008" },
  { id: 10, name: "Абдулин Руслан Марсович",           role: "driver",     pin: "0009" },
  { id: 11, name: "Ямалетдинов Рамат Салахетдинович",  role: "driver",     pin: "0010" },
  { id: 12, name: "Хамматов Ринат Фригатович",         role: "supervisor", pin: "0011" },
  { id: 13, name: "Хамматов Эдуард Фригатович",        role: "manager",    pin: "0001" },
  { id: 14, name: "Салахова Зимфира Маратовна",        role: "supervisor", pin: "0013" },
  { id: 15, name: "Хамматов Фригат",                   role: "driver",     pin: "0014" },
  { id: 16, name: "Оля",                               role: "supervisor", pin: "0015" },
];

const DEFAULT_MACHINES = [
  { id: 1,  name: "Самосвал ХОВО Н 020 ЕА (774)" },
  { id: 2,  name: "Самосвал ХОВО О608 ВУ (774)" },
  { id: 3,  name: "Самосвал ХОВО Н495 ХА (174)" },
  { id: 4,  name: "Самосвал ШАКМАН Е324 ВР (774)" },
  { id: 5,  name: "Манипулятор ХОВО Н 576 ЕА (774)" },
  { id: 6,  name: "ДОНГ ФЕНГ К826 НР174" },
  { id: 7,  name: "УРАЛ 10Т. Х444КВ 174" },
  { id: 8,  name: "АВТОКРАН 25Т. Х964ММ174" },
  { id: 9,  name: "АВТОКРАН 16Т. О726УН174" },
  { id: 10, name: "ПОГРУЗЧИК 6699УС174" },
  { id: 11, name: "ПОГРУЗЧИК В140 О006УС 74" },
  { id: 12, name: "МАЗ У302ВТ 774" },
  { id: 13, name: "ГРЕЙДЕР 0005УС 174" },
  { id: 14, name: "Манипулятор Е944 МС 174" },
  { id: 15, name: "УАЗ О599ВУ774" },
];

const todayStr    = () => new Date().toISOString().slice(0, 10);
const tomorrowStr = () => { const d = new Date(); d.setDate(d.getDate()+1); return d.toISOString().slice(0,10); };
const calcHours   = (f, t) => { if (!f||!t) return 0; const [fh,fm]=f.split(":").map(Number),[th,tm]=t.split(":").map(Number),m=(th*60+tm)-(fh*60+fm); return m>0?(m/60).toFixed(1):0; };
const fmtDate     = d => { const [y,m,day]=d.split("-"); return `${day}.${m}.${y}`; };
const MONTHS      = ["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"];

const S = {
  page:   { fontFamily:"sans-serif", minHeight:"100vh", background:"#f0f4f8" },
  header: { background:"linear-gradient(135deg,#1e3a5f,#2d6a9f)", color:"#fff", padding:"14px 18px", display:"flex", justifyContent:"space-between", alignItems:"center" },
  card:   { background:"#fff", borderRadius:12, padding:14, marginBottom:10, boxShadow:"0 2px 8px rgba(0,0,0,0.07)" },
  input:  { padding:"7px 10px", borderRadius:8, border:"1px solid #ddd", fontSize:14, boxSizing:"border-box" },
  select: { padding:"7px 10px", borderRadius:8, border:"1px solid #ddd", fontSize:14, boxSizing:"border-box", background:"#fff" },
  btn:    (c="#2d6a9f") => ({ background:c, color:"#fff", border:"none", borderRadius:8, padding:"7px 14px", cursor:"pointer", fontWeight:600, fontSize:13 }),
  tag:    (c) => ({ borderRadius:20, padding:"3px 10px", fontSize:12, ...c }),
};

export default function App() {
  const [data, setData] = useState({ users: DEFAULT_USERS, requests:{}, tasks:[], workTime:{}, machines: DEFAULT_MACHINES, salary:{} });
  const [dbConnected, setDbConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [skipWrite, setSkipWrite] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [loginName, setLoginName] = useState("");
  const [loginPin,  setLoginPin]  = useState("");
  const [loginErr,  setLoginErr]  = useState("");
  const [tab,       setTab]       = useState("plan");
  const [selDate,   setSelDate]   = useState(tomorrowStr());
  const [newReq,    setNewReq]    = useState({ title:"", machineId:"", assignedTo:"" });
  const [newTask,   setNewTask]   = useState({ title:"", assignedTo:"", machineId:"", date:tomorrowStr(), time:"" });
  const [newMachine,setNewMachine]= useState("");
  const [manTab,    setManTab]    = useState("overview");
  const [manDate,   setManDate]   = useState(todayStr());
  const [todayDate, setTodayDate] = useState(todayStr());
  const [repYear,   setRepYear]   = useState(new Date().getFullYear());
  const [repMonth,  setRepMonth]  = useState(new Date().getMonth()+1);
  const [repSub,    setRepSub]    = useState("machines");
  const [ovMode,    setOvMode]    = useState("day");
  const [eYear,     setEYear]     = useState(new Date().getFullYear());
  const [eMonth,    setEMonth]    = useState(new Date().getMonth()+1);

  // Firebase sync
  useEffect(() => {
    let active = true;
    const fetchData = async () => {
      try {
        const res = await fetch(FIREBASE_URL);
        if (!res.ok) throw new Error("fetch failed");
        const val = await res.json();
        if (!active) return;
        setSkipWrite(true);
        if (val) {
          setData({
            users: DEFAULT_USERS,
            requests: val.requests || {},
            tasks: val.tasks || [],
            workTime: val.workTime || {},
            machines: val.machines?.length ? val.machines : DEFAULT_MACHINES,
            salary: val.salary || {},
          });
        } else {
          setData({ users: DEFAULT_USERS, requests:{}, tasks:[], workTime:{}, machines: DEFAULT_MACHINES, salary:{} });
        }
        setDbConnected(true);
        setLoading(false);
      } catch (e) {
        if (active) { setDbConnected(false); setLoading(false); }
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 4000);
    return () => { active = false; clearInterval(interval); };
  }, []);

  useEffect(() => {
    if (!dbConnected) return;
    if (skipWrite) { setSkipWrite(false); return; }
    (async () => {
      try {
        await fetch(FIREBASE_URL, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ requests: data.requests, tasks: data.tasks, workTime: data.workTime, machines: data.machines, salary: data.salary || {} })
        });
      } catch (e) { console.error(e); }
    })();
    // eslint-disable-next-line
  }, [data, dbConnected]);

  const upd = fn => setData(prev => { const d = JSON.parse(JSON.stringify(prev)); fn(d); return d; });

  const getReqsForDateByEmployee = (empId, date) => {
    const result = [];
    data.users.forEach(u => {
      (data.requests[u.id]?.[date] || []).forEach(r => {
        const assigned = r.assignedTo ? Number(r.assignedTo) : u.id;
        if (assigned === empId) result.push({ ...r, _creatorId: u.id, _mine: u.id === empId });
      });
    });
    data.tasks.filter(t => Number(t.assignedTo) === empId && t.date === date)
      .forEach(t => result.push({ ...t, _type:"task", _mine:false }));
    return result;
  };

  const getAllReqsForDate = (date) => {
    const result = [];
    data.users.forEach(u => {
      (data.requests[u.id]?.[date] || []).forEach(r => result.push({ ...r, userId: u.id, userName: u.name }));
    });
    return result;
  };

  const addRequest = () => {
    if (!newReq.title.trim()) return;
    upd(d => {
      if (!d.requests[currentUser.id]) d.requests[currentUser.id] = {};
      if (!d.requests[currentUser.id][selDate]) d.requests[currentUser.id][selDate] = [];
      d.requests[currentUser.id][selDate].push({
        id: Date.now(), title: newReq.title,
        machineId: newReq.machineId ? Number(newReq.machineId) : null,
        assignedTo: newReq.assignedTo ? Number(newReq.assignedTo) : currentUser.id,
        done: false, timeFrom: "", timeTo: ""
      });
    });
    setNewReq({ title:"", machineId:"", assignedTo:"" });
  };

  const addMachine = () => {
    if (!newMachine.trim()) return;
    upd(d => d.machines.push({ id: Date.now(), name: newMachine.trim() }));
    setNewMachine("");
  };

  const isPastDate = (date) => currentUser?.role === "driver" && date < todayStr();
  const canAddReq  = (u) => u && (u.role === "manager" || u.role === "supervisor");
  const monthDays  = (y, m) => Array.from({length: new Date(y, m, 0).getDate()}, (_,i) => `${y}-${String(m).padStart(2,"0")}-${String(i+1).padStart(2,"0")}`);

  // LOADING
  if (loading) return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(135deg,#1e3a5f,#2d6a9f)", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff" }}>
      <div style={{ textAlign:"center" }}>
        <div style={{ fontSize:40, marginBottom:10 }}>👥</div>
        <div>Загрузка...</div>
      </div>
    </div>
  );

  // LOGIN
  if (!currentUser) return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(135deg,#1e3a5f,#2d6a9f)", display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div style={{ background:"#fff", borderRadius:16, padding:32, width:"100%", maxWidth:340, boxShadow:"0 8px 32px rgba(0,0,0,0.2)" }}>
        <div style={{ display:"flex", justifyContent:"center", marginBottom:14 }}>
          <img src="/Logo.jpg" alt="Логотип" style={{ maxWidth:120, maxHeight:80, objectFit:"contain", borderRadius:8 }}
            onError={e => { e.target.style.display = "none"; }} />
        </div>
        <h2 style={{ margin:"0 0 6px", color:"#1e3a5f", textAlign:"center" }}>👥 Команда</h2>
        <p style={{ margin:"0 0 4px", color:"#aaa", textAlign:"center", fontSize:12 }}>Транспорт М5</p>
        <p style={{ margin:"0 0 18px", textAlign:"center", fontSize:11, color: dbConnected ? "#27ae60" : "#e74c3c" }}>
          {dbConnected ? "🟢 Подключено" : "🔴 Нет связи с сервером"}
        </p>
        <label style={{ fontSize:12, color:"#555" }}>Пользователь</label>
        <select value={loginName} onChange={e => setLoginName(e.target.value)} style={{ ...S.select, width:"100%", margin:"4px 0 10px" }}>
          <option value="">— выберите —</option>
          {data.users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
        <label style={{ fontSize:12, color:"#555" }}>PIN-код</label>
        <input type="password" maxLength={4} value={loginPin} onChange={e => setLoginPin(e.target.value)} placeholder="••••"
          style={{ ...S.input, width:"100%", margin:"4px 0 14px", fontSize:20, letterSpacing:8, textAlign:"center" }} />
        {loginErr && <p style={{ color:"red", fontSize:12, margin:"0 0 10px", textAlign:"center" }}>{loginErr}</p>}
        <button onClick={() => {
          const u = data.users.find(x => x.id === Number(loginName) && x.pin === loginPin);
          if (u) { setCurrentUser(u); setLoginErr(""); setTab(u.role === "manager" || u.role === "supervisor" ? "overview" : "plan"); }
          else setLoginErr("Неверный пользователь или PIN");
        }} style={{ ...S.btn(), width:"100%", padding:10, fontSize:15 }}>Войти</button>
      </div>
    </div>
  );

  // MACHINES PANEL
  const MachinesPanel = () => (
    <div>
      <div style={S.card}>
        <div style={{ fontWeight:600, color:"#1e3a5f", marginBottom:10 }}>➕ Добавить технику</div>
        <div style={{ display:"flex", gap:8 }}>
          <input value={newMachine} onChange={e => setNewMachine(e.target.value)} onKeyDown={e => e.key==="Enter"&&addMachine()}
            placeholder="Название техники..." style={{ ...S.input, flex:1 }} />
          <button onClick={addMachine} style={S.btn()}>+</button>
        </div>
      </div>
      {data.machines.map(m => (
        <div key={m.id} style={{ ...S.card, display:"flex", alignItems:"center", gap:10, padding:"10px 14px", borderLeft:`3px solid ${m.repair?"#e74c3c":"#27ae60"}` }}>
          <span style={{ fontSize:20 }}>{m.repair?"🔧":"🚜"}</span>
          <div style={{ flex:1 }}>
            <span style={{ fontWeight:500, fontSize:14, color:m.repair?"#aaa":"#222" }}>{m.name}</span>
            {m.repair && <div style={{ fontSize:11, color:"#e74c3c" }}>На ремонте</div>}
          </div>
          <button onClick={() => upd(d => {
            const mm = d.machines.find(x => x.id === m.id);
            if (!mm) return;
            if (!mm.repair) { mm.repair = true; mm.repairSince = todayStr(); }
            else { mm.repair = false; if (!mm.repairLog) mm.repairLog = []; mm.repairLog.push({ from: mm.repairSince || todayStr(), to: todayStr() }); mm.repairSince = null; }
          })} style={{ background:m.repair?"#e8f7ee":"#fef3e2", border:"none", borderRadius:6, padding:"4px 10px", cursor:"pointer", fontSize:11, color:m.repair?"#27ae60":"#e67e22" }}>
            {m.repair?"✓ Вернуть в строй":"🔧 На ремонт"}
          </button>
          {m.id > 15 && <button onClick={() => upd(d => { d.machines = d.machines.filter(x => x.id !== m.id); })}
            style={{ background:"#fde8e8", border:"none", borderRadius:6, padding:"3px 8px", cursor:"pointer", fontSize:11, color:"#c0392b" }}>✕</button>}
        </div>
      ))}
    </div>
  );

  // PLAN PANEL
  const PlanPanel = () => {
    const planReqs = getReqsForDateByEmployee(currentUser.id, selDate);
    return (
      <div>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
          <label style={{ fontSize:13, color:"#555" }}>Дата:</label>
          <input type="date" value={selDate} onChange={e => setSelDate(e.target.value)} style={S.input} />
        </div>
        {canAddReq(currentUser) && currentUser.role !== "manager" && (
          <div style={S.card}>
            <div style={{ fontWeight:600, color:"#1e3a5f", marginBottom:10 }}>➕ Новая заявка</div>
            <input value={newReq.title} onChange={e => setNewReq(p => ({ ...p, title:e.target.value }))}
              onKeyDown={e => e.key==="Enter"&&addRequest()} placeholder="Название заявки..."
              style={{ ...S.input, width:"100%", marginBottom:8 }} />
            <select value={newReq.machineId} onChange={e => setNewReq(p => ({ ...p, machineId:e.target.value }))}
              style={{ ...S.select, width:"100%", marginBottom:8 }}>
              <option value="">🚜 Без техники</option>
              {data.machines.filter(m=>!m.repair).map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            <select value={newReq.assignedTo} onChange={e => setNewReq(p => ({ ...p, assignedTo:e.target.value }))}
              style={{ ...S.select, width:"100%", marginBottom:10 }}>
              <option value="">👤 Назначить сотрудника (по умолчанию — я)</option>
              {data.users.filter(u => u.role !== "manager").map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
            <button onClick={addRequest} style={{ ...S.btn(), width:"100%", padding:9 }}>Добавить заявку</button>
          </div>
        )}
        {planReqs.length === 0 && <div style={{ color:"#888", textAlign:"center", padding:24 }}>{currentUser.role==="driver"?"🚗":"📋"} На {fmtDate(selDate)} заявок нет</div>}
        {planReqs.map(r => {
          const m = data.machines.find(x => x.id === Number(r.machineId));
          return (
            <div key={r.id} style={{ ...S.card, padding:"10px 14px", borderLeft:`3px solid ${r._mine||currentUser.role==="manager"?"#2d6a9f":"#8e44ad"}` }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
                <button onClick={() => {
                  if (isPastDate(selDate)) return;
                  upd(d => {
                    const stamp = `${currentUser.name.split(" ")[0]} ${new Date().toLocaleString("ru",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"})}`;
                    if (r._type === "task") { const t = d.tasks.find(x => x.id === r.id); if (t) { t.done = !t.done; t.doneBy = t.done ? stamp : null; } }
                    else { const uid = r._creatorId ?? currentUser.id; const req = d.requests[uid]?.[selDate]?.find(x => x.id === r.id); if (req) { req.done = !req.done; req.doneBy = req.done ? stamp : null; } }
                  });
                }} style={{ background:"none", border:"none", cursor: isPastDate(selDate)?"not-allowed":"pointer", fontSize:22, padding:0, opacity: isPastDate(selDate)?0.4:1 }}>
                  {r.done ? "✅" : "⬜"}
                </button>
                <span style={{ flex:1, fontWeight:500, fontSize:14, color:r.done?"#aaa":"#222", textDecoration:r.done?"line-through":"none" }}>{r.title}</span>
                {(r._mine||currentUser.role==="manager") && !r._type && (
                  <button onClick={() => upd(d => { const uid = r._creatorId ?? currentUser.id; d.requests[uid][selDate] = d.requests[uid][selDate].filter(x => x.id !== r.id); })}
                    style={{ background:"#fde8e8", border:"none", borderRadius:6, padding:"3px 8px", cursor:"pointer", fontSize:11, color:"#c0392b" }}>✕</button>
                )}
              </div>
              <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                {r.time && <span style={S.tag({ background:"#fdecea", color:"#e74c3c", fontWeight:700 })}>⏰ {r.time}</span>}
                {m && <span style={S.tag({ background:"#fef3e2", color:"#e67e22" })}>🚜 {m.name}</span>}
                {!r._mine && r._type!=="task" && <span style={S.tag({ background:"#f0e8fd", color:"#8e44ad" })}>📌 Назначено</span>}
                {r._type==="task" && <span style={S.tag({ background:"#f0e8fd", color:"#8e44ad" })}>📌 Задача</span>}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // MANAGER / SUPERVISOR VIEW
  if (currentUser.role === "manager" || currentUser.role === "supervisor") {
    const mTabs = [
      { id:"overview",          label:"📊 Сводка" },
      { id:"plan",              label:"📅 План" },
      { id:"machines_overview", label:"🚜 Техника" },
      { id:"tasks",             label:"✅ Задачи" },
      ...(currentUser.role === "manager" ? [{ id:"report", label:"📈 Отчёт" }, { id:"salary", label:"💰 Зарплата" }] : []),
      { id:"machines",          label:"⚙️ Список" },
      { id:"users",             label:"👤 Люди" },
    ];
    const employees = data.users.filter(u => u.role !== "manager");
    const drivers   = data.users.filter(u => u.role === "driver");

    return (
      <div style={S.page}>
        <div style={S.header}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <img src="/Logo.jpg" alt="" style={{ width:36, height:36, objectFit:"contain", borderRadius:6, background:"#fff" }}
              onError={e => { e.target.style.display = "none"; }} />
            <div>
              <div style={{ fontWeight:700, fontSize:15 }}>👑 {currentUser.name}</div>
              <div style={{ fontSize:12, opacity:0.8 }}>{currentUser.role==="manager"?"Руководитель":"Менеджер"}</div>
            </div>
          </div>
          <button onClick={() => setCurrentUser(null)} style={{ background:"rgba(255,255,255,0.2)", border:"none", color:"#fff", borderRadius:8, padding:"5px 12px", cursor:"pointer", fontSize:13 }}>Выйти</button>
        </div>

        <div style={{ display:"flex", overflowX:"auto", borderBottom:"1px solid #dde3ea", background:"#fff" }}>
          {mTabs.map(t => (
            <button key={t.id} onClick={() => setManTab(t.id)}
              style={{ flexShrink:0, padding:"11px 10px", border:"none", background:"none", fontWeight:manTab===t.id?700:400,
                color:manTab===t.id?"#2d6a9f":"#666", borderBottom:manTab===t.id?"2.5px solid #2d6a9f":"2.5px solid transparent", cursor:"pointer", fontSize:12 }}>
              {t.label}
            </button>
          ))}
        </div>

        <div style={{ padding:14, maxWidth:700, margin:"0 auto" }}>

          {/* СВОДКА */}
          {manTab==="overview" && (() => {
            const weekDays = Array.from({length:7}, (_,i) => { const d=new Date(manDate); d.setDate(d.getDate()+i); return d.toISOString().slice(0,10); });
            const dayNames = ["Вс","Пн","Вт","Ср","Чт","Пт","Сб"];
            const sorted = [...employees].sort((a,b) => getReqsForDateByEmployee(b.id,manDate).length - getReqsForDateByEmployee(a.id,manDate).length);
            return (
              <div>
                <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10, flexWrap:"wrap" }}>
                  <label style={{ fontSize:13, color:"#555" }}>Дата:</label>
                  <input type="date" value={manDate} onChange={e => setManDate(e.target.value)} style={S.input} />
                  <div style={{ display:"flex", background:"#fff", borderRadius:8, overflow:"hidden", boxShadow:"0 1px 4px rgba(0,0,0,0.07)" }}>
                    {["day","week"].map(m => (
                      <button key={m} onClick={()=>setOvMode(m)} style={{ padding:"7px 14px", border:"none", cursor:"pointer", fontSize:13, fontWeight:ovMode===m?700:400, background:ovMode===m?"#2d6a9f":"#fff", color:ovMode===m?"#fff":"#666" }}>
                        {m==="day"?"День":"Неделя"}
                      </button>
                    ))}
                  </div>
                </div>

                {ovMode==="week" && (
                  <div>
                    <div style={{ fontSize:12, color:"#888", marginBottom:10 }}>Неделя: {fmtDate(weekDays[0])} — {fmtDate(weekDays[6])}</div>
                    {sorted.map(emp => {
                      const weekData = weekDays.map(date => ({ date, items: getReqsForDateByEmployee(emp.id, date), wt: data.workTime[emp.id]?.[date] || {} }));
                      const totalItems = weekData.reduce((s,d)=>s+d.items.length,0);
                      const totalDone  = weekData.reduce((s,d)=>s+d.items.filter(r=>r.done).length,0);
                      const totalHours = weekData.reduce((s,d)=>s+Number(calcHours(d.wt.from,d.wt.to)||0),0);
                      const totalTrips = weekData.reduce((s,d)=>s+Number(d.wt.trips||0),0);
                      return (
                        <div key={emp.id} style={{ ...S.card, borderLeft:`4px solid ${totalItems>0?"#2d6a9f":"#ddd"}` }}>
                          <div style={{ fontWeight:700, color:"#1e3a5f", fontSize:14, marginBottom:8 }}>{emp.role==="driver"?"🚗":"👤"} {emp.name}</div>
                          <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:8 }}>
                            <span style={S.tag({ background:"#e8f7ee", color:"#27ae60" })}>📋 {totalDone}/{totalItems}</span>
                            <span style={S.tag({ background:"#e8f4fd", color:"#2d6a9f" })}>⏱ {totalHours.toFixed(1)} ч</span>
                            {totalTrips>0 && <span style={S.tag({ background:"#fef3e2", color:"#e67e22" })}>🚗 {totalTrips} рейсов</span>}
                          </div>
                          <div style={{ display:"flex", gap:4, overflowX:"auto" }}>
                            {weekData.map(({date, items, wt}) => {
                              const dow = dayNames[new Date(date).getDay()]; const busy = items.length>0;
                              return (
                                <div key={date} style={{ flex:"1 0 auto", minWidth:42, textAlign:"center", background:busy?"#e8f4fd":"#f7f7f7", borderRadius:8, padding:"6px 4px" }}>
                                  <div style={{ fontSize:10, color:"#888" }}>{dow}</div>
                                  <div style={{ fontSize:11, fontWeight:600, color:"#555" }}>{date.slice(8)}</div>
                                  <div style={{ fontSize:13, fontWeight:700, color:busy?"#2d6a9f":"#ccc", marginTop:2 }}>{busy?`${items.filter(r=>r.done).length}/${items.length}`:"—"}</div>
                                  {wt.from && <div style={{ fontSize:9, color:"#27ae60" }}>{calcHours(wt.from,wt.to)}ч</div>}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {ovMode==="day" && (() => {
                  const dayTotals = employees.reduce((acc,emp) => { const items=getReqsForDateByEmployee(emp.id,manDate); const wt=data.workTime[emp.id]?.[manDate]||{}; acc.total+=items.length; acc.done+=items.filter(r=>r.done).length; acc.hours+=Number(calcHours(wt.from,wt.to)||0); acc.trips+=Number(wt.trips||0); return acc; }, {total:0,done:0,hours:0,trips:0});
                  return (
                    <div style={{ ...S.card, background:"#f8fbff", display:"flex", justifyContent:"space-around", textAlign:"center", flexWrap:"wrap", gap:8 }}>
                      <div><div style={{ fontSize:20, fontWeight:700, color:"#2d6a9f" }}>{dayTotals.done}/{dayTotals.total}</div><div style={{ fontSize:11, color:"#888" }}>📋 Заявок</div></div>
                      <div><div style={{ fontSize:20, fontWeight:700, color:"#27ae60" }}>{dayTotals.hours.toFixed(1)}</div><div style={{ fontSize:11, color:"#888" }}>⏱ Часов</div></div>
                      <div><div style={{ fontSize:20, fontWeight:700, color:"#e67e22" }}>{dayTotals.trips}</div><div style={{ fontSize:11, color:"#888" }}>🚗 Рейсов</div></div>
                    </div>
                  );
                })()}

                {ovMode==="day" && sorted.map(emp => {
                  const items = getReqsForDateByEmployee(emp.id, manDate);
                  const wt = data.workTime[emp.id]?.[manDate] || {};
                  const done = items.filter(r => r.done).length;
                  return (
                    <div key={emp.id} style={{ ...S.card, borderLeft:`4px solid ${items.length>0?"#2d6a9f":"#ddd"}` }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                        <div style={{ fontWeight:700, color:"#1e3a5f", fontSize:14 }}>{emp.role==="driver"?"🚗":"👤"} {emp.name}</div>
                        <div style={{ fontSize:11, color:"#aaa" }}>{fmtDate(manDate)}</div>
                      </div>
                      <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:items.length?8:0 }}>
                        <span style={S.tag({ background:"#e8f4fd", color:"#2d6a9f" })}>⏱ {wt.from||"—"}–{wt.to||"—"} ({calcHours(wt.from,wt.to)} ч)</span>
                        <span style={S.tag(items.length>0?{background:"#e8f7ee",color:"#27ae60"}:{background:"#f5f5f5",color:"#aaa"})}>📋 {done}/{items.length} заявок</span>
                        {wt.trips && <span style={S.tag({background:"#fef3e2",color:"#e67e22"})}>🚗 {wt.trips} рейсов</span>}
                        {wt.route && <span style={S.tag({background:"#e8f7ee",color:"#27ae60"})}>📍 {wt.route}</span>}
                        {wt.org   && <span style={S.tag({background:"#f0e8fd",color:"#8e44ad"})}>🏢 {wt.org}</span>}
                      </div>
                      {items.map(r => {
                        const m = data.machines.find(x => x.id === Number(r.machineId));
                        return (
                          <div key={r.id} style={{ padding:"5px 0", borderTop:"1px solid #f5f5f5", fontSize:13 }}>
                            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                              <span>{r.done?"✅":"⬜"}</span>
                              <span style={{ flex:1, color:r.done?"#aaa":"#333", textDecoration:r.done?"line-through":"none" }}>{r.title}</span>
                              {r.time && <span style={S.tag({background:"#fdecea",color:"#e74c3c"})}>⏰ {r.time}</span>}
                              {m && <span style={S.tag({background:"#fef3e2",color:"#e67e22"})}>🚜 {m.name}</span>}
                            </div>
                            {r.comment && <div style={{ marginLeft:24, marginTop:3, fontSize:12, color:"#e67e22", fontStyle:"italic" }}>💬 {r.comment}</div>}
                            {r.done && r.doneBy && <div style={{ marginLeft:24, marginTop:2, fontSize:11, color:"#27ae60" }}>✓ {r.doneBy}</div>}
                          </div>
                        );
                      })}
                      {items.length===0 && <div style={{ color:"#ccc", fontSize:12 }}>Нет заявок</div>}
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {manTab==="plan" && <PlanPanel />}

          {/* ТЕХНИКА СВОДКА */}
          {manTab==="machines_overview" && (() => {
            const isBusy = m => getAllReqsForDate(manDate).some(r=>r.machineId===m.id) || data.tasks.some(t=>t.machineId===m.id&&t.date===manDate);
            const sorted = [...data.machines].sort((a,b)=>isBusy(b)-isBusy(a));
            return (
              <div>
                <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
                  <label style={{ fontSize:13, color:"#555" }}>Дата:</label>
                  <input type="date" value={manDate} onChange={e=>setManDate(e.target.value)} style={S.input} />
                </div>
                {sorted.map(m => {
                  const busy=isBusy(m); const usedReqs=getAllReqsForDate(manDate).filter(r=>r.machineId===m.id); const usedTasks=data.tasks.filter(t=>t.machineId===m.id&&t.date===manDate);
                  return (
                    <div key={m.id} style={{ ...S.card, borderLeft:`4px solid ${m.repair?"#f39c12":busy?"#27ae60":"#e74c3c"}` }}>
                      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:busy?8:0 }}>
                        <span style={{ fontSize:22 }}>{m.repair?"🔧":"🚜"}</span>
                        <div style={{ flex:1, fontWeight:700, color:"#1e3a5f", fontSize:14 }}>{m.name}</div>
                        <span style={S.tag(m.repair?{background:"#fef3e2",color:"#f39c12"}:busy?{background:"#e8f7ee",color:"#27ae60"}:{background:"#fdecea",color:"#e74c3c"})}>
                          {m.repair?"🔧 На ремонте":busy?"🟢 Занята":"🔴 Простой"}
                        </span>
                      </div>
                      {usedReqs.map(r=><div key={r.id} style={{display:"flex",alignItems:"center",gap:6,padding:"5px 0",borderTop:"1px solid #f5f5f5",fontSize:13}}><span>{r.done?"✅":"⏳"}</span><span style={{flex:1}}>{r.title}</span><span style={S.tag({background:"#e8f4fd",color:"#2d6a9f"})}>📋 {r.userName.split(" ")[0]}</span></div>)}
                      {usedTasks.map(t=>{const emp=data.users.find(u=>u.id===t.assignedTo); return <div key={t.id} style={{display:"flex",alignItems:"center",gap:6,padding:"5px 0",borderTop:"1px solid #f5f5f5",fontSize:13}}><span>{t.done?"✅":"⏳"}</span><span style={{flex:1}}>{t.title}</span><span style={S.tag({background:"#f0e8fd",color:"#8e44ad"})}>✅ {emp?.name.split(" ")[0]||"?"}</span></div>;})}
                    </div>
                  );
                })}
                {data.machines.length>0 && (
                  <div style={{ ...S.card, background:"#f8fbff", textAlign:"center" }}>
                    <div style={{ fontSize:13, color:"#555", marginBottom:6 }}>Итого на {fmtDate(manDate)}</div>
                    <div style={{ display:"flex", justifyContent:"center", gap:24 }}>
                      <div><div style={{ fontSize:26, fontWeight:700, color:"#27ae60" }}>{data.machines.filter(isBusy).length}</div><div style={{ fontSize:12, color:"#888" }}>🟢 Занято</div></div>
                      <div><div style={{ fontSize:26, fontWeight:700, color:"#e74c3c" }}>{data.machines.filter(m=>!isBusy(m)).length}</div><div style={{ fontSize:12, color:"#888" }}>🔴 В простое</div></div>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* ЗАДАЧИ */}
          {manTab==="tasks" && (
            <div>
              <div style={S.card}>
                <div style={{ fontWeight:600, marginBottom:10, color:"#1e3a5f" }}>➕ Новая задача</div>
                <input value={newTask.title} onChange={e=>setNewTask(p=>({...p,title:e.target.value}))} placeholder="Описание задачи..." style={{ ...S.input, width:"100%", marginBottom:8 }} />
                <input type="date" value={newTask.date} onChange={e=>setNewTask(p=>({...p,date:e.target.value}))} style={{ ...S.input, width:"100%", marginBottom:8 }} />
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                  <label style={{ fontSize:13, color:"#555", whiteSpace:"nowrap" }}>⏰ К времени:</label>
                  <input type="time" value={newTask.time} onChange={e=>setNewTask(p=>({...p,time:e.target.value}))} style={{ ...S.input, flex:1 }} />
                </div>
                <select value={newTask.assignedTo} onChange={e=>setNewTask(p=>({...p,assignedTo:e.target.value}))} style={{ ...S.select, width:"100%", marginBottom:8 }}>
                  <option value="">— назначить сотруднику —</option>
                  {employees.map(e=><option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
                <select value={newTask.machineId} onChange={e=>setNewTask(p=>({...p,machineId:e.target.value}))} style={{ ...S.select, width:"100%", marginBottom:10 }}>
                  <option value="">🚜 Без техники</option>
                  {data.machines.filter(m=>!m.repair).map(m=><option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
                <button onClick={() => {
                  if (!newTask.title.trim()) { alert("Введите описание задачи"); return; }
                  if (!newTask.assignedTo) { alert("Выберите сотрудника"); return; }
                  upd(d=>d.tasks.push({id:Date.now(),title:newTask.title,assignedTo:Number(newTask.assignedTo),machineId:newTask.machineId?Number(newTask.machineId):null,done:false,date:newTask.date||todayStr(),time:newTask.time||""}));
                  setNewTask({title:"",assignedTo:"",machineId:"",date:tomorrowStr(),time:""});
                }} style={S.btn()}>Добавить</button>
              </div>
              {data.tasks.length===0 && <div style={{color:"#aaa",textAlign:"center",padding:20}}>Задач пока нет</div>}
              {data.tasks.map(task => {
                const emp=data.users.find(u=>u.id===task.assignedTo); const tm=data.machines.find(m=>m.id===task.machineId);
                return (
                  <div key={task.id} style={{...S.card,display:"flex",alignItems:"center",gap:10}}>
                    <span style={{fontSize:20}}>{task.done?"✅":"⏳"}</span>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:500,color:task.done?"#aaa":"#222",textDecoration:task.done?"line-through":"none",fontSize:14}}>{task.title}</div>
                      <div style={{fontSize:12,color:"#888",display:"flex",gap:6,flexWrap:"wrap",marginTop:2}}>
                        <span>→ {emp?.name||"?"} · {fmtDate(task.date)}</span>
                        {task.time && <span style={S.tag({background:"#fef3e2",color:"#e67e22"})}>⏰ {task.time}</span>}
                        {tm && <span style={S.tag({background:"#fef3e2",color:"#e67e22"})}>🚜 {tm.name}</span>}
                      </div>
                    </div>
                    <button onClick={()=>upd(d=>{const t=d.tasks.find(x=>x.id===task.id);if(t)t.done=!t.done;})} style={{...S.btn(task.done?"#eee":"#e8f4fd"),color:"#555"}}>{task.done?"Открыть":"✓"}</button>
                    <button onClick={()=>upd(d=>{d.tasks=d.tasks.filter(x=>x.id!==task.id);})} style={{...S.btn("#fde8e8"),color:"#c0392b"}}>✕</button>
                  </div>
                );
              })}
            </div>
          )}

          {/* ОТЧЁТ */}
          {manTab==="report" && currentUser.role==="manager" && (() => {
            const allDays = monthDays(repYear, repMonth);
            const daysInMonth = allDays.length;
            const getItemsForDay = date => {
              const r=[];
              data.users.forEach(u=>(data.requests[u.id]?.[date]||[]).forEach(req=>r.push({...req,_creatorId:u.id})));
              data.tasks.filter(t=>t.date===date).forEach(t=>r.push({...t,_type:"task"}));
              return r;
            };
            const buildCopyText = () => {
              let txt=`ОТЧЁТ ЗА ${MONTHS[repMonth-1].toUpperCase()} ${repYear}\n${"=".repeat(40)}\n\n`;
              drivers.forEach(drv=>{
                txt+=`🚗 ${drv.name}\n${"-".repeat(30)}\n`;
                let tTrips=0,tHours=0,wDays=0;
                allDays.forEach(date=>{
                  const wt=data.workTime[drv.id]?.[date]||{};
                  const items=getReqsForDateByEmployee(drv.id,date).filter(r=>r.done);
                  if(!items.length)return; wDays++;
                  tHours+=Number(calcHours(wt.from,wt.to)||0); tTrips+=Number(wt.trips||0);
                  items.forEach(r=>{const m=data.machines.find(x=>x.id===Number(r.machineId));txt+=`  ${fmtDate(date)}: ${r.title}${m?` | 🚜 ${m.name}`:""} | ${wt.org||"—"} | ${wt.route||"—"} | рейсов: ${wt.trips||0} | ${wt.from||"—"}–${wt.to||"—"}\n`;});
                });
                txt+=`  Итого: ${wDays} дней · ${tHours.toFixed(1)} ч · ${tTrips} рейсов\n\n`;
              });
              return txt;
            };
            const downloadExcel = () => {
              let csv="\uFEFF";
              csv+=`Отчёт за ${MONTHS[repMonth-1]} ${repYear}\n\n`;
              csv+="Водитель;Дата;Заявка;Техника;Организация;Маршрут;Рейсов;Время с;Время до;Часов;Сумма ₽\n";
              drivers.forEach(drv=>{
                allDays.forEach(date=>{
                  const wt=data.workTime[drv.id]?.[date]||{};
                  const items=getReqsForDateByEmployee(drv.id,date).filter(r=>r.done);
                  items.forEach(r=>{const m=data.machines.find(x=>x.id===Number(r.machineId));const amount=data.salary?.[r.id]||"";csv+=`${drv.name};${fmtDate(date)};${r.title};${m?.name||""};${wt.org||""};${wt.route||""};${wt.trips||""};${wt.from||""};${wt.to||""};${calcHours(wt.from,wt.to)};${amount}\n`;});
                });
              });
              const blob=new Blob([csv],{type:"text/csv;charset=utf-8;"});
              const url=URL.createObjectURL(blob); const a=document.createElement("a");
              a.href=url; a.download=`Отчёт_${MONTHS[repMonth-1]}_${repYear}.csv`; a.click(); URL.revokeObjectURL(url);
            };
            return (
              <div>
                <div style={{...S.card,display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
                  <div><label style={{fontSize:12,color:"#555",display:"block",marginBottom:3}}>Месяц</label>
                    <select value={repMonth} onChange={e=>setRepMonth(Number(e.target.value))} style={S.select}>{MONTHS.map((n,i)=><option key={i+1} value={i+1}>{n}</option>)}</select></div>
                  <div><label style={{fontSize:12,color:"#555",display:"block",marginBottom:3}}>Год</label>
                    <select value={repYear} onChange={e=>setRepYear(Number(e.target.value))} style={S.select}>{[2024,2025,2026,2027].map(y=><option key={y} value={y}>{y}</option>)}</select></div>
                  <button onClick={()=>{try{navigator.clipboard.writeText(buildCopyText());}catch{}}} style={{...S.btn("#27ae60"),marginTop:18}}>📋 Копировать</button>
                  <button onClick={downloadExcel} style={{...S.btn("#2d6a9f"),marginTop:18}}>📥 Скачать Excel</button>
                </div>
                <div style={{display:"flex",background:"#fff",borderRadius:10,marginBottom:12,overflow:"hidden",boxShadow:"0 1px 4px rgba(0,0,0,0.07)"}}>
                  {[{id:"machines",label:"🚜 По технике"},{id:"drivers",label:"🚗 По водителям"}].map(s=>(
                    <button key={s.id} onClick={()=>setRepSub(s.id)} style={{flex:1,padding:"10px 4px",border:"none",cursor:"pointer",fontSize:13,fontWeight:repSub===s.id?700:400,background:repSub===s.id?"#2d6a9f":"#fff",color:repSub===s.id?"#fff":"#666"}}>{s.label}</button>
                  ))}
                </div>
                {repSub==="machines" && [...data.machines].sort((a,b)=>{
                  const dA=allDays.filter(date=>getItemsForDay(date).some(r=>Number(r.machineId)===a.id&&r.done)).length;
                  const dB=allDays.filter(date=>getItemsForDay(date).some(r=>Number(r.machineId)===b.id&&r.done)).length;
                  return dB-dA;
                }).map(m=>{
                  const repairDays=allDays.filter(date=>{const periods=[...(m.repairLog||[])];if(m.repair&&m.repairSince)periods.push({from:m.repairSince,to:"9999-12-31"});return periods.some(p=>date>=p.from&&date<=p.to);}).length;
                  const machineDays=allDays.map(date=>({date,items:getItemsForDay(date).filter(r=>Number(r.machineId)===m.id&&r.done)})).filter(d=>d.items.length>0);
                  const totalTrips=machineDays.reduce((sum,d)=>sum+d.items.reduce((s,r)=>{const emp=data.users.find(u=>u.id===Number(r.assignedTo||r._creatorId));return s+Number(data.workTime[emp?.id]?.[d.date]?.trips||0);},0),0);
                  return (
                    <div key={m.id} style={S.card}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                        <div style={{fontWeight:700,color:"#1e3a5f",fontSize:15}}>🚜 {m.name}</div>
                        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                          <span style={S.tag({background:"#e8f7ee",color:"#27ae60"})}>{machineDays.length} дней в работе</span>
                          <span style={S.tag({background:"#fdecea",color:"#e74c3c"})}>{daysInMonth-machineDays.length-repairDays} простой</span>
                          {repairDays>0&&<span style={S.tag({background:"#fef3e2",color:"#f39c12"})}>🔧 {repairDays} ремонт</span>}
                        </div>
                      </div>
                      {machineDays.length===0&&<div style={{color:"#ccc",fontSize:13}}>Не использовалась</div>}
                      {machineDays.map(({date,items})=>items.map(r=>{const emp=data.users.find(u=>u.id===Number(r.assignedTo||r._creatorId));const wt=data.workTime[emp?.id]?.[date]||{};return(
                        <div key={r.id} style={{padding:"6px 0",borderTop:"1px solid #f5f5f5",fontSize:13}}>
                          <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
                            <span style={{fontWeight:600,color:"#2d6a9f",minWidth:70}}>{fmtDate(date)}</span>
                            <span>🚗 {emp?.name?.split(" ")[0]||"?"} {emp?.name?.split(" ")[1]||""}</span>
                            {wt.org&&<span style={S.tag({background:"#f0e8fd",color:"#8e44ad"})}>🏢 {wt.org}</span>}
                            {wt.route&&<span style={S.tag({background:"#e8f4fd",color:"#2d6a9f"})}>📍 {wt.route}</span>}
                            {wt.trips&&<span style={S.tag({background:"#fef3e2",color:"#e67e22"})}>🚗 {wt.trips} рейс.</span>}
                          </div>
                        </div>
                      );}))}
                      {machineDays.length>0&&<div style={{marginTop:8,paddingTop:8,borderTop:"2px solid #f0f0f0"}}><span style={S.tag({background:"#e8f4fd",color:"#2d6a9f",fontWeight:700})}>Итого рейсов: {totalTrips}</span></div>}
                    </div>
                  );
                })}
                {repSub==="drivers" && drivers.map(drv=>{
                  const workDays=allDays.map(date=>{const wt=data.workTime[drv.id]?.[date]||{};const items=getReqsForDateByEmployee(drv.id,date).filter(r=>r.done);if(!items.length)return null;return{date,wt,items};}).filter(Boolean);
                  const totalTrips=workDays.reduce((s,d)=>s+Number(d.wt.trips||0),0);
                  const totalHours=workDays.reduce((s,d)=>s+Number(calcHours(d.wt.from,d.wt.to)||0),0);
                  return(
                    <div key={drv.id} style={S.card}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                        <div style={{fontWeight:700,color:"#1e3a5f",fontSize:15}}>🚗 {drv.name}</div>
                        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                          <span style={S.tag({background:"#e8f7ee",color:"#27ae60"})}>{workDays.length} дней</span>
                          <span style={S.tag({background:"#fef3e2",color:"#e67e22"})}>{totalTrips} рейсов</span>
                          <span style={S.tag({background:"#e8f4fd",color:"#2d6a9f"})}>{totalHours.toFixed(1)} ч</span>
                        </div>
                      </div>
                      {workDays.length===0&&<div style={{color:"#ccc",fontSize:13}}>Нет данных</div>}
                      {workDays.map(({date,wt,items})=>{const machines=[...new Set(items.filter(r=>r.machineId).map(r=>data.machines.find(m=>m.id===Number(r.machineId))?.name).filter(Boolean))];return(
                        <div key={date} style={{padding:"6px 0",borderTop:"1px solid #f5f5f5",fontSize:13}}>
                          <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
                            <span style={{fontWeight:600,color:"#2d6a9f",minWidth:70}}>{fmtDate(date)}</span>
                            <span style={S.tag({background:"#e8f7ee",color:"#27ae60"})}>⏱ {wt.from||"—"}–{wt.to||"—"} ({calcHours(wt.from,wt.to)} ч)</span>
                            {wt.trips&&<span style={S.tag({background:"#fef3e2",color:"#e67e22"})}>🚗 {wt.trips}</span>}
                            {wt.org&&<span style={S.tag({background:"#f0e8fd",color:"#8e44ad"})}>🏢 {wt.org}</span>}
                            {wt.route&&<span style={S.tag({background:"#e8f4fd",color:"#2d6a9f"})}>📍 {wt.route}</span>}
                            {machines.map(mn=><span key={mn} style={S.tag({background:"#fef3e2",color:"#e67e22"})}>🚜 {mn}</span>)}
                          </div>
                        </div>
                      );})}
                      {workDays.length>0&&<div style={{marginTop:8,paddingTop:8,borderTop:"2px solid #f0f0f0"}}><span style={S.tag({background:"#e8f4fd",color:"#2d6a9f",fontWeight:700})}>Итого: {workDays.length} дней · {totalHours.toFixed(1)} ч · {totalTrips} рейсов</span></div>}
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {/* ЗАРПЛАТА */}
          {manTab==="salary" && currentUser.role==="manager" && (() => {
            const allDays = monthDays(repYear, repMonth);
            return (
              <div>
                <div style={{...S.card,display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
                  <div><label style={{fontSize:12,color:"#555",display:"block",marginBottom:3}}>Месяц</label>
                    <select value={repMonth} onChange={e=>setRepMonth(Number(e.target.value))} style={S.select}>{MONTHS.map((n,i)=><option key={i+1} value={i+1}>{n}</option>)}</select></div>
                  <div><label style={{fontSize:12,color:"#555",display:"block",marginBottom:3}}>Год</label>
                    <select value={repYear} onChange={e=>setRepYear(Number(e.target.value))} style={S.select}>{[2024,2025,2026,2027].map(y=><option key={y} value={y}>{y}</option>)}</select></div>
                </div>
                {drivers.map(drv=>{
                  const doneItems=allDays.flatMap(date=>getReqsForDateByEmployee(drv.id,date).filter(r=>r.done).map(r=>({...r,date})));
                  const totalSalary=doneItems.reduce((s,r)=>s+Number(data.salary?.[r.id]||0),0);
                  return(
                    <div key={drv.id} style={S.card}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                        <div style={{fontWeight:700,color:"#1e3a5f",fontSize:14}}>🚗 {drv.name}</div>
                        <div style={{fontWeight:700,color:"#27ae60",fontSize:16}}>{totalSalary.toLocaleString("ru")} ₽</div>
                      </div>
                      {doneItems.length===0&&<div style={{color:"#ccc",fontSize:13}}>Нет выполненных заявок</div>}
                      {doneItems.map(r=>{const m=data.machines.find(x=>x.id===Number(r.machineId));return(
                        <div key={r.id} style={{padding:"8px 0",borderTop:"1px solid #f5f5f5"}}>
                          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6,fontSize:13}}>
                            <span style={{color:"#2d6a9f",fontWeight:600,minWidth:70}}>{fmtDate(r.date)}</span>
                            <span style={{flex:1}}>{r.title}</span>
                            {m&&<span style={S.tag({background:"#fef3e2",color:"#e67e22"})}>🚜 {m.name}</span>}
                          </div>
                          <div style={{display:"flex",gap:8,alignItems:"center"}}>
                            <input type="number" min="0" placeholder="Сумма (₽)" value={data.salary?.[r.id]||""}
                              onChange={e=>upd(d=>{if(!d.salary)d.salary={};d.salary[r.id]=e.target.value;})}
                              style={{...S.input,width:140,fontSize:14}}/>
                            <span style={{fontSize:13,color:"#888"}}>₽</span>
                            {data.salary?.[r.id]&&<span style={S.tag({background:"#e8f7ee",color:"#27ae60",fontWeight:700})}>✓ {Number(data.salary[r.id]).toLocaleString("ru")} ₽</span>}
                          </div>
                        </div>
                      );})}
                      {doneItems.length>0&&<div style={{marginTop:10,paddingTop:10,borderTop:"2px solid #f0f0f0",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                        <span style={{fontSize:13,color:"#555"}}>Итого за {MONTHS[repMonth-1]}:</span>
                        <span style={{fontWeight:700,color:"#27ae60",fontSize:18}}>{totalSalary.toLocaleString("ru")} ₽</span>
                      </div>}
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {manTab==="machines" && <MachinesPanel />}

          {manTab==="users" && data.users.map(u=>(
            <div key={u.id} style={{...S.card,display:"flex",alignItems:"center",gap:12,padding:"12px 14px"}}>
              <span style={{fontSize:22}}>{u.role==="manager"?"👑":u.role==="driver"?"🚗":"📋"}</span>
              <div>
                <div style={{fontWeight:600,color:"#1e3a5f",fontSize:14}}>{u.name}</div>
                <div style={{fontSize:12,color:"#888"}}>PIN: {u.pin} · {u.role==="manager"?"Руководитель":u.role==="driver"?"Водитель":"Менеджер"}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // DRIVER / EMPLOYEE VIEW
  const empTabs = currentUser.role==="driver"
    ? [{id:"plan",label:"📅 План"},{id:"today",label:"🕐 Сегодня"},{id:"earnings",label:"💰 Заработок"}]
    : [{id:"plan",label:"📅 План"},{id:"today",label:"🕐 Сегодня"},{id:"tasks",label:"✅ Задачи"},{id:"machines",label:"🚜 Техника"}];

  const myTasks   = data.tasks.filter(t => t.assignedTo === currentUser.id);
  const todayWt   = data.workTime[currentUser.id]?.[todayDate] || {};
  const todayReqs = getReqsForDateByEmployee(currentUser.id, todayDate);

  return (
    <div style={S.page}>
      <div style={S.header}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <img src="/Logo.jpg" alt="" style={{ width:36, height:36, objectFit:"contain", borderRadius:6, background:"#fff" }}
            onError={e => { e.target.style.display = "none"; }} />
          <div>
            <div style={{fontWeight:700,fontSize:14}}>{currentUser.role==="driver"?"🚗":"👤"} {currentUser.name}</div>
            <div style={{fontSize:11,opacity:0.8}}>Сегодня: {fmtDate(todayStr())}</div>
          </div>
        </div>
        <button onClick={()=>setCurrentUser(null)} style={{background:"rgba(255,255,255,0.2)",border:"none",color:"#fff",borderRadius:8,padding:"5px 12px",cursor:"pointer",fontSize:13}}>Выйти</button>
      </div>

      <div style={{display:"flex",borderBottom:"1px solid #dde3ea",background:"#fff"}}>
        {empTabs.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            style={{flex:1,padding:"11px 4px",border:"none",background:"none",fontWeight:tab===t.id?700:400,
              color:tab===t.id?"#2d6a9f":"#666",borderBottom:tab===t.id?"2.5px solid #2d6a9f":"2.5px solid transparent",cursor:"pointer",fontSize:12}}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{padding:14,maxWidth:600,margin:"0 auto"}}>

        {tab==="plan" && <PlanPanel />}

        {tab==="today" && (
          <div>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
              <label style={{fontSize:13,color:"#555"}}>Дата:</label>
              <input type="date" value={todayDate} onChange={e=>setTodayDate(e.target.value)} style={S.input}/>
            </div>
            {currentUser.role==="driver" && (
              <div style={S.card}>
                <div style={{fontWeight:600,color:"#1e3a5f",marginBottom:12}}>🚗 Отчёт по рейсам</div>
                {isPastDate(todayDate)&&<div style={{background:"#fdecea",borderRadius:8,padding:"8px 12px",marginBottom:10,fontSize:13,color:"#e74c3c"}}>🔒 Редактирование прошедших дней недоступно</div>}
                {["org","route","trips"].map(field=>(
                  <div key={field} style={{marginBottom:10}}>
                    <label style={{fontSize:12,color:"#555",display:"block",marginBottom:4}}>
                      {field==="org"?"Название организации":field==="route"?"Маршрут":"Количество рейсов"}
                    </label>
                    <input type={field==="trips"?"number":"text"} disabled={isPastDate(todayDate)}
                      value={data.workTime[currentUser.id]?.[todayDate]?.[field]||""}
                      onChange={e=>upd(d=>{if(!d.workTime[currentUser.id])d.workTime[currentUser.id]={};if(!d.workTime[currentUser.id][todayDate])d.workTime[currentUser.id][todayDate]={};d.workTime[currentUser.id][todayDate][field]=e.target.value;})}
                      placeholder={field==="org"?"Название организации...":field==="route"?"Например: Уфа — Стерлитамак...":"Введите кол-во рейсов..."}
                      style={{...S.input,width:"100%",opacity:isPastDate(todayDate)?0.5:1}}/>
                  </div>
                ))}
              </div>
            )}
            <div style={S.card}>
              <div style={{fontWeight:600,color:"#1e3a5f",marginBottom:10}}>⏱ Рабочее время</div>
              <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
                {["from","to"].map(field=>(
                  <div key={field}>
                    <label style={{fontSize:11,color:"#888",display:"block",marginBottom:2}}>{field==="from"?"С":"До"}</label>
                    <input type="time" value={todayWt[field]||""} disabled={isPastDate(todayDate)}
                      onChange={e=>upd(d=>{if(!d.workTime[currentUser.id])d.workTime[currentUser.id]={};if(!d.workTime[currentUser.id][todayDate])d.workTime[currentUser.id][todayDate]={};d.workTime[currentUser.id][todayDate][field]=e.target.value;})}
                      style={{...S.input,opacity:isPastDate(todayDate)?0.5:1}}/>
                  </div>
                ))}
                <div style={{background:"#e8f4fd",borderRadius:10,padding:"8px 14px",textAlign:"center"}}>
                  <div style={{fontSize:11,color:"#888"}}>Итого</div>
                  <div style={{fontWeight:700,color:"#2d6a9f",fontSize:22}}>{calcHours(todayWt.from,todayWt.to)} ч</div>
                </div>
              </div>
            </div>
            <div style={{fontWeight:600,color:"#1e3a5f",marginBottom:8}}>Заявки на {fmtDate(todayDate)}</div>
            {todayReqs.length===0&&<div style={{color:"#aaa",textAlign:"center",padding:20}}>Нет заявок на этот день</div>}
            {todayReqs.map(r=>{
              const m=data.machines.find(x=>x.id===Number(r.machineId));
              return(
                <div key={r.id} style={S.card}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                    <button onClick={()=>upd(d=>{
                      const stamp=`${currentUser.name.split(" ")[0]} ${new Date().toLocaleString("ru",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"})}`;
                      if(r._type==="task"){const t=d.tasks.find(x=>x.id===r.id);if(t){t.done=!t.done;t.doneBy=t.done?stamp:null;}}
                      else{const uid=r._creatorId??currentUser.id;const req=d.requests[uid]?.[todayDate]?.find(x=>x.id===r.id);if(req){req.done=!req.done;req.doneBy=req.done?stamp:null;}}
                    })} style={{background:"none",border:"none",cursor:"pointer",fontSize:22,padding:0}}>{r.done?"✅":"⬜"}</button>
                    <span style={{flex:1,fontWeight:500,color:r.done?"#aaa":"#222",textDecoration:r.done?"line-through":"none",fontSize:14}}>{r.title}</span>
                    {m&&<span style={S.tag({background:"#fef3e2",color:"#e67e22"})}>🚜 {m.name}</span>}
                  </div>
                  {!r._type&&(
                    <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                      {["timeFrom","timeTo"].map(field=>(
                        <div key={field}>
                          <label style={{fontSize:11,color:"#aaa",display:"block",marginBottom:2}}>{field==="timeFrom"?"Начало":"Конец"}</label>
                          <input type="time" value={r[field]||""} disabled={isPastDate(todayDate)}
                            onChange={e=>upd(d=>{const uid=r._creatorId??currentUser.id;const req=d.requests[uid]?.[todayDate]?.find(x=>x.id===r.id);if(req)req[field]=e.target.value;})}
                            style={{...S.input,fontSize:13,opacity:isPastDate(todayDate)?0.5:1}}/>
                        </div>
                      ))}
                      {r.timeFrom&&r.timeTo&&<div style={{background:"#e8f7ee",borderRadius:8,padding:"4px 10px",fontSize:13,color:"#27ae60",alignSelf:"flex-end"}}>{calcHours(r.timeFrom,r.timeTo)} ч</div>}
                    </div>
                  )}
                  <div style={{marginTop:8}}>
                    <label style={{fontSize:11,color:"#aaa",display:"block",marginBottom:2}}>💬 Комментарий</label>
                    <input type="text" value={r.comment||""} disabled={isPastDate(todayDate)}
                      onChange={e=>upd(d=>{if(r._type==="task"){const t=d.tasks.find(x=>x.id===r.id);if(t)t.comment=e.target.value;}else{const uid=r._creatorId??currentUser.id;const req=d.requests[uid]?.[todayDate]?.find(x=>x.id===r.id);if(req)req.comment=e.target.value;}})}
                      placeholder="Написать комментарий..."
                      style={{...S.input,width:"100%",fontSize:13,opacity:isPastDate(todayDate)?0.5:1}}/>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {tab==="earnings" && currentUser.role==="driver" && (() => {
          const allDays = monthDays(eYear, eMonth);
          const doneItems = allDays.flatMap(date => getReqsForDateByEmployee(currentUser.id,date).filter(r=>r.done).map(r=>({...r,date})));
          const totalEarned = doneItems.reduce((s,r)=>s+Number(data.salary?.[r.id]||0),0);
          const paid = doneItems.filter(r=>data.salary?.[r.id]);
          return(
            <div>
              <div style={{...S.card,display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
                <div><label style={{fontSize:12,color:"#555",display:"block",marginBottom:3}}>Месяц</label>
                  <select value={eMonth} onChange={e=>setEMonth(Number(e.target.value))} style={S.select}>{MONTHS.map((n,i)=><option key={i+1} value={i+1}>{n}</option>)}</select></div>
                <div><label style={{fontSize:12,color:"#555",display:"block",marginBottom:3}}>Год</label>
                  <select value={eYear} onChange={e=>setEYear(Number(e.target.value))} style={S.select}>{[2024,2025,2026,2027].map(y=><option key={y} value={y}>{y}</option>)}</select></div>
              </div>
              <div style={{...S.card,textAlign:"center",background:"linear-gradient(135deg,#1e3a5f,#2d6a9f)",color:"#fff"}}>
                <div style={{fontSize:13,opacity:0.8,marginBottom:4}}>Мой заработок за {MONTHS[eMonth-1]} {eYear}</div>
                <div style={{fontSize:36,fontWeight:700}}>{totalEarned.toLocaleString("ru")} ₽</div>
                <div style={{fontSize:12,opacity:0.7,marginTop:4}}>Начислено за {paid.length} из {doneItems.length} рейсов</div>
              </div>
              {doneItems.length===0&&<div style={{color:"#aaa",textAlign:"center",padding:30}}>Нет выполненных заявок за этот месяц</div>}
              {doneItems.map(r=>{const m=data.machines.find(x=>x.id===Number(r.machineId));const amount=data.salary?.[r.id];return(
                <div key={r.id} style={{...S.card,display:"flex",alignItems:"center",gap:10}}>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:500,fontSize:14,color:"#222",marginBottom:4}}>{r.title}</div>
                    <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                      <span style={{fontSize:12,color:"#888"}}>{fmtDate(r.date)}</span>
                      {m&&<span style={S.tag({background:"#fef3e2",color:"#e67e22"})}>🚜 {m.name}</span>}
                    </div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    {amount?<div style={{fontWeight:700,color:"#27ae60",fontSize:16}}>{Number(amount).toLocaleString("ru")} ₽</div>:<div style={{fontSize:12,color:"#aaa"}}>Не начислено</div>}
                  </div>
                </div>
              );})}
            </div>
          );
        })()}

        {tab==="tasks" && (
          <div>
            <div style={{fontWeight:600,color:"#1e3a5f",marginBottom:10}}>Мои задачи</div>
            {myTasks.length===0&&<div style={{color:"#aaa",textAlign:"center",padding:30}}>Задач пока нет</div>}
            {myTasks.map(task=>(
              <div key={task.id} style={{...S.card,display:"flex",alignItems:"center",gap:10}}>
                <button onClick={()=>upd(d=>{const t=d.tasks.find(x=>x.id===task.id);if(t)t.done=!t.done;})}
                  style={{background:"none",border:"none",cursor:"pointer",fontSize:22,padding:0}}>{task.done?"✅":"⬜"}</button>
                <div style={{flex:1}}>
                  <div style={{fontWeight:500,color:task.done?"#aaa":"#222",textDecoration:task.done?"line-through":"none",fontSize:14}}>{task.title}</div>
                  <div style={{fontSize:12,color:"#aaa"}}>{fmtDate(task.date)}</div>
                </div>
                <span style={S.tag(task.done?{background:"#e8f7ee",color:"#27ae60"}:{background:"#fff3cd",color:"#e67e22"})}>{task.done?"Выполнено":"В работе"}</span>
              </div>
            ))}
          </div>
        )}

        {tab==="machines" && <MachinesPanel />}
      </div>
    </div>
  );
}
