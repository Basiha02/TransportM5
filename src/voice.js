/* =====================================================================
   Разбор надиктованной заявки: «Завтра Касымов, самосвал 020, к 8 утра,
   карьер на Линейной 98, заказчик СтройМонтаж, везти щебень»
   → дата, водитель, техника, время, куда, заказчик, комментарий.
   Работает без интернета и без платных сервисов — только правила.
   ===================================================================== */

const pad = n => String(n).padStart(2, "0");
const dateToStr = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseDate = s => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
const addDays = (s, n) => { const d = parseDate(s); d.setDate(d.getDate() + n); return dateToStr(d); };
const norm = s => String(s || "").toLowerCase().replace(/ё/g, "е");

const REL_DAYS = { "сегодня": 0, "завтра": 1, "послезавтра": 2 };
const WEEKDAYS = [
  [/^воскресень/, 0], [/^понедельник/, 1], [/^вторник/, 2], [/^сред[ауы]$/, 3],
  [/^четверг/, 4], [/^пятниц/, 5], [/^суббот/, 6],
];
const MONTHS_GEN = {
  "января": 1, "февраля": 2, "марта": 3, "апреля": 4, "мая": 5, "июня": 6, "июля": 7,
  "августа": 8, "сентября": 9, "октября": 10, "ноября": 11, "декабря": 12,
};
const HOUR_WORDS = {
  "час": 1, "один": 1, "одного": 1, "два": 2, "двух": 2, "три": 3, "трех": 3, "четыре": 4, "четырех": 4,
  "пять": 5, "пяти": 5, "шесть": 6, "шести": 6, "семь": 7, "семи": 7, "восемь": 8, "восьми": 8,
  "девять": 9, "девяти": 9, "десять": 10, "десяти": 10, "одиннадцать": 11, "одиннадцати": 11,
  "двенадцать": 12, "двенадцати": 12,
};
const ORDINAL_HOURS = {
  "первого": 1, "второго": 2, "третьего": 3, "четвертого": 4, "пятого": 5, "шестого": 6, "седьмого": 7,
  "восьмого": 8, "девятого": 9, "десятого": 10, "одиннадцатого": 11, "двенадцатого": 12,
};
const PART_OF_DAY = { "утра": "am", "утром": "am", "дня": "pm", "днем": "pm", "вечера": "pm", "вечером": "pm", "ночи": "night" };
const TIME_PREPS = new Set(["в", "во", "к", "ко", "на", "подача", "подачи", "подать", "время", "около", "часов"]);
const DATE_PREPS = new Set(["на", "в", "во", "следующий", "следующую", "следующее", "этот", "эту", "это", "дата"]);

const ORG_KW = new Set(["заказчик", "заказчика", "заказчику", "заказчиком", "клиент", "клиента", "клиенту", "организация", "организации", "компания", "компании", "фирма", "фирмы", "контрагент"]);
const PLACE_KW = new Set(["адрес", "адресу", "адреса", "куда", "объект", "объекта", "объекте", "объектом", "место"]);
const NOTE_KW = new Set(["комментарий", "комментарии", "примечание", "задача", "задание", "груз", "заметка"]);
const NOTE_KEEP = new Set(["щебень", "щебня", "песок", "песка", "грунт", "грунта", "отсев", "отсева", "гравий", "пгс", "щпс", "бетон", "асфальт", "кирпич", "блоки", "плиты", "плит", "трубы", "труб", "мусор", "мусора", "снег", "снега", "земля", "землю", "глина", "глину", "чернозем", "торф", "металл", "лес", "бревна", "поддоны", "контейнер", "везти", "отвезти", "привезти", "вывезти", "перевезти", "вывоз", "завоз", "доставить", "доставка", "перевозка", "погрузка", "разгрузка", "выгрузка", "разгрузить", "погрузить"]);
const FILLER = new Set(["водитель", "водителя", "водителем", "техника", "технику", "техникой", "машина", "машину", "время", "дата", "заявка", "заявку", "заявки", "поставь", "поставить", "поставьте", "запиши", "запишите", "нужно", "нужен", "нужна", "надо", "поедет", "едет", "поехать", "выезд", "выезжает", "пожалуйста", "ну", "так", "значит", "вот", "там", "тоже", "еще", "подача", "подачи", "подать", "госномер", "номер"]);
const STOP = new Set(["на", "в", "во", "к", "ко", "до", "по", "для", "с", "со", "и", "а", "у", "от", "из", "что", "чтобы", "это", "который", "которая", "часов", "часам", "около", ...FILLER]);
const LEGAL = { "ооо": "ООО", "ип": "ИП", "ао": "АО", "зао": "ЗАО", "оао": "ОАО", "пао": "ПАО" };
const REGION_CODES = new Set([74, 174, 774]);

const NUM_WORDS = {
  "ноль": [0, 0], "нуль": [0, 0],
  "один": [1, 1], "одна": [1, 1], "два": [2, 1], "две": [2, 1], "три": [3, 1], "четыре": [4, 1], "пять": [5, 1],
  "шесть": [6, 1], "семь": [7, 1], "восемь": [8, 1], "девять": [9, 1],
  "десять": [10, 1], "одиннадцать": [11, 1], "двенадцать": [12, 1], "тринадцать": [13, 1], "четырнадцать": [14, 1],
  "пятнадцать": [15, 1], "шестнадцать": [16, 1], "семнадцать": [17, 1], "восемнадцать": [18, 1], "девятнадцать": [19, 1],
  "двадцать": [20, 2], "тридцать": [30, 2], "сорок": [40, 2], "пятьдесят": [50, 2], "шестьдесят": [60, 2],
  "семьдесят": [70, 2], "восемьдесят": [80, 2], "девяносто": [90, 2],
  "сто": [100, 3], "двести": [200, 3], "триста": [300, 3], "четыреста": [400, 3], "пятьсот": [500, 3],
  "шестьсот": [600, 3], "семьсот": [700, 3], "восемьсот": [800, 3], "девятьсот": [900, 3],
};

// «двадцать пять» → 25, «триста два» → 302, «ноль» → 0 (исходные слова сохраняются для текста)
function mergeNumberWords(toks) {
  const out = [];
  for (let i = 0; i < toks.length; i++) {
    const w = NUM_WORDS[toks[i].n];
    if (!w) { out.push(toks[i]); continue; }
    if (w[1] === 0) { out.push({ ...toks[i], n: "0" }); continue; }
    let sum = w[0], rank = w[0] >= 10 && w[0] < 20 ? 1 : w[1], j = i;
    while (!toks[j].brk && toks[j + 1]) {
      const nx = NUM_WORDS[toks[j + 1].n];
      if (!nx || nx[1] === 0) break;
      const nxRank = nx[1];
      if (nxRank >= rank || (rank === 2 && nx[0] >= 10)) break;
      sum += nx[0]; rank = nx[0] >= 10 && nx[0] < 20 ? 0 : nxRank; j++;
    }
    out.push({ o: toks.slice(i, j + 1).map(t => t.o).join(" "), n: String(sum), used: false, brk: toks[j].brk });
    i = j;
  }
  return out;
}

function tokenize(text) {
  const toks = String(text || "")
    .replace(/[«»"“”()]/g, " ")
    .split(/\s+/)
    .map(raw => {
      const brk = /[,;]$/.test(raw);
      const o = raw.replace(/^[,.;:!?—–-]+|[,.;:!?—–-]+$/g, "");
      if (!o) return null;
      return { o, n: norm(o), used: false, brk };
    })
    .filter(Boolean);
  return mergeNumberWords(toks);
}

function lev(a, b) {
  const m = a.length, n = b.length;
  if (!m) return n; if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[n];
}

const isUnitWord = w => !!MONTHS_GEN[w] || /^(числ|тонн|тонны|тонный|тонник|т$|рейс|км$|кило|куб|метр|м$|машин|штук|шт$|человек|дн|день|дней|сутки|суток|минут)/.test(w);

/* ---------- дата ---------- */
function findDate(toks, today) {
  const mark = (...idx) => idx.forEach(i => { if (toks[i]) toks[i].used = true; });
  const markPrev = i => { let k = i - 1; while (k >= 0 && !toks[k].used && DATE_PREPS.has(toks[k].n)) { toks[k].used = true; k--; } };
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    if (t.used) continue;
    if (REL_DAYS[t.n] !== undefined) { mark(i); markPrev(i); return { date: addDays(today, REL_DAYS[t.n]), word: t.o }; }
    const wd = WEEKDAYS.find(([re]) => re.test(t.n));
    if (wd) {
      const cur = parseDate(today).getDay();
      let delta = (wd[1] - cur + 7) % 7; if (delta === 0) delta = 7;
      mark(i); markPrev(i);
      return { date: addDays(today, delta), word: t.o };
    }
    let m = t.n.match(/^(\d{1,2})(?:-?(?:го|е|ое))?$/);
    if (m) {
      const day = +m[1];
      let k = i + 1;
      if (toks[k] && /^(го|е|ое)$/.test(toks[k].n)) k++;
      const nx = toks[k];
      if (nx && MONTHS_GEN[nx.n] && day >= 1 && day <= 31) {
        const t0 = parseDate(today);
        let y = t0.getFullYear();
        let s = `${y}-${pad(MONTHS_GEN[nx.n])}-${pad(day)}`;
        if (s < addDays(today, -60)) { y++; s = `${y}-${pad(MONTHS_GEN[nx.n])}-${pad(day)}`; }
        if (dateToStr(parseDate(s)) === s) { for (let q = i; q <= k; q++) mark(q); markPrev(i); return { date: s, word: `${day} ${nx.o}` }; }
      }
      const ordinalOnly = /-?(го|е|ое)$/.test(t.n) && i > 0 && toks[i - 1].n === "на";
      if (((nx && /^числ/.test(nx.n)) || ordinalOnly) && day >= 1 && day <= 31) {
        if (ordinalOnly && !(nx && /^числ/.test(nx.n))) k = i;
        const t0 = parseDate(today);
        let y = t0.getFullYear(), mo = t0.getMonth() + 1;
        if (day < t0.getDate()) { mo++; if (mo > 12) { mo = 1; y++; } }
        const s = `${y}-${pad(mo)}-${pad(day)}`;
        if (dateToStr(parseDate(s)) === s) { for (let q = i; q <= k; q++) mark(q); markPrev(i); return { date: s, word: `${day} число` }; }
      }
    }
    m = t.n.match(/^(\d{1,2})[./](\d{1,2})(?:[./](\d{2,4}))?$/);
    if (m && !(i > 0 && ["в", "к", "ко"].includes(toks[i - 1].n))) {
      const day = +m[1], mo = +m[2];
      let y = m[3] ? +m[3] : parseDate(today).getFullYear();
      if (y < 100) y += 2000;
      if (mo >= 1 && mo <= 12) {
        const s = `${y}-${pad(mo)}-${pad(day)}`;
        if (dateToStr(parseDate(s)) === s) { mark(i); markPrev(i); return { date: s, word: t.o }; }
      }
    }
  }
  return null;
}

/* ---------- время подачи ---------- */
function tryTime(toks, i) {
  let j = i, prep = null;
  if (TIME_PREPS.has(toks[j].n)) { prep = toks[j].n; j++; }
  if (!toks[j] || toks[j].used) return null;
  if (prep && ["время", "подача", "подачи", "подать"].includes(prep) && toks[j] && ["в", "к", "на"].includes(toks[j].n)) j++;
  let k = j, h = null, m = 0, colon = false, half = false;
  if (toks[k] && ["половине", "половина", "пол"].includes(toks[k].n)) { half = true; k++; }
  const tk = toks[k];
  if (!tk || tk.used) return null;
  let mm;
  if ((mm = tk.n.match(/^(\d{1,2})[:.](\d{2})$/))) {
    if (tk.n.includes(".") && !prep) return null;
    h = +mm[1]; m = +mm[2]; colon = true; k++;
  } else if (/^\d{1,2}$/.test(tk.n) && !half) {
    h = +tk.n; k++;
    if (toks[k] && /^(час|часа|часов|часам|ч)$/.test(toks[k].n)) k++;
    if (toks[k] && /^\d{2}$/.test(toks[k].n) && +toks[k].n <= 59 && !(toks[k + 1] && isUnitWord(toks[k + 1].n))) {
      m = +toks[k].n; k++;
      if (toks[k] && /^минут/.test(toks[k].n)) k++;
    }
  } else if (half && ORDINAL_HOURS[tk.n]) {
    h = ORDINAL_HOURS[tk.n] - 1; m = 30; k++;
  } else if (HOUR_WORDS[tk.n] !== undefined && prep) {
    h = HOUR_WORDS[tk.n]; k++;
    if (toks[k] && /^(час|часа|часов|часам)$/.test(toks[k].n)) k++;
  } else return null;

  const podTok = toks[k] && !toks[k].used && PART_OF_DAY[toks[k].n] ? toks[k] : null;
  const pod = podTok ? PART_OF_DAY[podTok.n] : null;
  if (podTok) k++;
  if (!prep && !pod && !colon) return null;           // голое число — это не время
  if (prep === "на" && !pod && !colon) return null;   // «на 4 часа» — это длительность
  if (prep === "часов" && !pod && !colon) return null;
  if (!pod && !colon && toks[k] && isUnitWord(toks[k].n)) return null; // «в 2 рейса», «к 19 числу»
  if (h > 23 || m > 59) return null;
  if (pod === "pm" && h < 12) h += 12;
  else if (pod === "night" && h === 12) h = 0;
  else if (!pod && !colon && h >= 1 && h <= 5) h += 12; // «в 3» днём, а не ночью
  if (h === 0 && half) h = 12;
  return { time: `${pad(h)}:${pad(m)}`, from: i, to: k - 1 };
}

function findTime(toks) {
  for (let i = 0; i < toks.length; i++) {
    if (toks[i].used) continue;
    const r = tryTime(toks, i);
    if (r) { for (let q = r.from; q <= r.to; q++) toks[q].used = true; return r.time; }
  }
  return null;
}

/* ---------- водитель ---------- */
function surnameMatch(tok, sur) {
  if (tok.length < 4 || sur.length < 4) return false;
  if (tok === sur) return true;
  if (tok.startsWith(sur) && tok.length <= sur.length + 3) return true;
  const head = tok.slice(0, sur.length);
  if (tok.length > sur.length + 3) return false;
  return lev(head, sur) <= (sur.length >= 7 ? 2 : 1);
}
function firstNameMatch(tok, first) {
  if (!first || first.length < 4 || tok.length < 4) return false;
  if (tok.length > first.length + 3) return false;
  return lev(tok.slice(0, first.length), first) <= 1;
}

function findDriver(toks, drivers) {
  const scored = drivers.map(d => {
    const parts = norm(d.name).split(/\s+/);
    const sur = parts[0], first = parts[1];
    let score = 0; const idx = [];
    toks.forEach((t, i) => {
      if (t.used) return;
      if (surnameMatch(t.n, sur)) { score += 2; idx.push(i); }
      else if (firstNameMatch(t.n, first)) { score += 1; idx.push(i); }
    });
    return { d, score, idx };
  }).filter(x => x.score > 0).sort((a, b) => b.score - a.score);
  if (!scored.length) return { driver: null };
  if (scored[1] && scored[1].score === scored[0].score) {
    return { driver: null, ambiguous: scored.filter(x => x.score === scored[0].score).map(x => x.d) };
  }
  const best = scored[0];
  best.idx.forEach(i => { toks[i].used = true; });
  // «водитель Касымов» — служебное слово рядом тоже убираем
  best.idx.forEach(i => { if (toks[i - 1] && /^водител/.test(toks[i - 1].n)) toks[i - 1].used = true; });
  return { driver: best.d };
}

/* ---------- техника ---------- */
function machineKeys(m) {
  const nm = norm(m.name);
  const words = new Set((nm.match(/[а-яa-z]{3,}/g) || []));
  if (words.has("автокран")) words.add("кран");
  if (words.has("донг") && words.has("фенг")) words.add("донгфенг");
  const plates = [], tons = [];
  const re = /(\d+)\s*(т(?![а-яё]))?/gi;
  let mm;
  while ((mm = re.exec(String(m.name)))) {
    const v = +mm[1];
    if (mm[2]) tons.push(v);
    else if (!REGION_CODES.has(v)) plates.push(v);
  }
  return { words: [...words], plates, tons };
}
function kindMatch(tok, w) {
  if (w.length <= 4) {
    return tok === w || tok === w + "ом" || (tok.length === w.length + 1 && tok.startsWith(w) && /[аеуы]$/.test(tok));
  }
  return tok.startsWith(w.slice(0, w.length - 2)) && tok.length <= w.length + 3;
}
function tokNumber(t) {
  const m = t.n.match(/^(\d+)(.*)$/);
  if (!m) return null;
  return { val: +m[1], tonnage: /тон|^-?т$/.test(m[2]) };
}
const TON_WORD = /^(т|тонн|тонны|тонный|тонник|тонника|тонном)$/;

function findMachine(toks, machines, isFree) {
  const kindIdxAll = new Set();
  const scored = machines.map(m => {
    const { words, plates, tons } = machineKeys(m);
    let score = 0; const kindIdx = [], numIdx = [];
    words.forEach(w => {
      let hit = false;
      toks.forEach((t, i) => { if (!t.used && kindMatch(t.n, w)) { hit = true; kindIdx.push(i); kindIdxAll.add(i); } });
      if (hit) score += 2;
    });
    const near = i => kindIdx.some(k => Math.abs(k - i) <= 3) || (toks[i - 1] && /^(номер|госномер)$/.test(toks[i - 1].n));
    const takeZero = i => { if (toks[i - 1] && toks[i - 1].n === "0" && !toks[i - 1].used) numIdx.push(i - 1); };
    // госномер: «020», «608», «6699»
    plates.forEach(p => {
      const occ = [];
      toks.forEach((t, i) => { const tn = !t.used && tokNumber(t); if (tn && !tn.tonnage && tn.val === p) occ.push(i); });
      if (!occ.length) return;
      const close = occ.filter(near);
      if (close.length) { score += p >= 100 ? 6 : 4; close.forEach(i => { numIdx.push(i); takeZero(i); }); }
      else if (p >= 100) { score += 3; numIdx.push(occ[0]); }
    });
    // тоннаж: «кран 25», «25 тонн», «25-тонный»
    tons.forEach(v => {
      toks.forEach((t, i) => {
        const tn = !t.used && tokNumber(t);
        if (!tn || tn.val !== v) return;
        const tonNext = tn.tonnage || (toks[i + 1] && TON_WORD.test(toks[i + 1].n));
        if (near(i) || (tonNext && kindIdx.length)) {
          score += 4; numIdx.push(i);
          if (toks[i + 1] && TON_WORD.test(toks[i + 1].n)) numIdx.push(i + 1);
        }
      });
    });
    return { m, score, idx: [...kindIdx, ...numIdx] };
  }).filter(x => x.score >= 2).sort((a, b) => b.score - a.score);

  const mentioned = kindIdxAll.size > 0;
  const consumeKinds = () => kindIdxAll.forEach(i => { toks[i].used = true; });
  if (!scored.length) return { machine: null, mentioned };
  let top = scored.filter(x => x.score === scored[0].score);
  if (top.length > 1) {
    const free = top.filter(x => isFree(x.m.id));
    if (free.length === 1) top = free;
    else { consumeKinds(); return { machine: null, mentioned, ambiguous: (free.length ? free : top).map(x => x.m) }; }
  }
  const best = top[0];
  if (best.score < 4 && !best.idx.some(i => kindIdxAll.has(i))) return { machine: null, mentioned };
  best.idx.forEach(i => { toks[i].used = true; });
  consumeKinds();
  return { machine: best.m, mentioned };
}

/* ---------- куда / заказчик / комментарий ---------- */
const cap = s => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

function cleanChunk(chunk) {
  let a = 0, b = chunk.length;
  while (a < b && STOP.has(chunk[a].n)) a++;
  while (b > a && STOP.has(chunk[b - 1].n)) b--;
  return chunk.slice(a, b);
}

function splitText(toks) {
  const out = { free: [], org: [], place: [], note: [] };
  let bucket = "free", cur = [];
  const flush = () => {
    const c = cleanChunk(cur);
    if (c.length) out[bucket].push(c);
    cur = [];
  };
  toks.forEach(t => {
    if (t.used) { flush(); bucket = "free"; return; }
    if (ORG_KW.has(t.n)) { flush(); bucket = "org"; return; }
    if (PLACE_KW.has(t.n)) { flush(); bucket = "place"; return; }
    if (NOTE_KW.has(t.n)) { flush(); bucket = "note"; return; }
    if (NOTE_KEEP.has(t.n)) { if (bucket !== "note") { flush(); bucket = "note"; } cur.push(t); return; }
    cur.push(t);
    if (t.brk) { flush(); bucket = "free"; }
  });
  flush();
  return out;
}

const chunkText = c => c.map(t => t.o).join(" ");
const ADDR_KW = new Set(["улица", "ул", "улице", "улицу", "проспект", "пр", "проспекте", "тракт", "тракте", "переулок", "пер", "шоссе", "микрорайон", "мкр", "район", "районе", "поселок", "пос", "поселке", "село", "селе", "деревня", "деревне", "город", "г", "городе", "дом", "д", "корпус", "строение", "стр", "база", "базу", "базе", "склад", "склада", "складе", "завод", "заводе", "карьер", "карьере", "жк", "снт", "промзона", "площадка", "участок"]);
const UNIT_RE = /^(т|тонн|тонны|тонна|куб|куба|кубов|кубами|машин|машины|машина|рейс|рейса|рейсов|мешков|поддонов|штук|шт)$/;
const isAddressy = c => c.some(t => ADDR_KW.has(t.n)) || (c.some(t => /^\d/.test(t.n)) && !c.some(t => UNIT_RE.test(t.n)));

function orgText(c) {
  return c.map((t, i) => (i === 0 && LEGAL[t.n] ? LEGAL[t.n] : (i > 0 && t.o === t.n ? cap(t.o) : t.o))).join(" ");
}

function extractLegalOrg(chunks) {
  // «ООО Ромашка», «ИП Петров» внутри свободного текста
  for (let ci = 0; ci < chunks.length; ci++) {
    const c = chunks[ci];
    const li = c.findIndex(t => LEGAL[t.n]);
    if (li < 0) continue;
    const take = LEGAL[c[li].n] === "ИП" ? 1 : 2;
    let end = li + 1;
    while (end < c.length && end - li <= take && !STOP.has(c[end].n)) end++;
    if (end === li + 1) continue;
    const org = orgText(c.slice(li, end));
    const rest = [cleanChunk(c.slice(0, li)), cleanChunk(c.slice(end))].filter(x => x.length);
    chunks.splice(ci, 1, ...rest);
    return org;
  }
  return null;
}

/* ---------- главная функция ---------- */
export function parseVoiceRequest(text, ctx) {
  const today = ctx.today;
  const toks = tokenize(text);
  const res = { warnings: [] };
  if (!toks.length) return res;

  const d = findDate(toks, today);
  if (d) res.date = d.date;
  const date = res.date || ctx.baseDate || today;

  const time = findTime(toks);
  if (time) res.time = time;

  if (!ctx.lockDriver) {
    const dr = findDriver(toks, ctx.drivers || []);
    if (dr.driver) res.driverId = dr.driver.id;
    else if (dr.ambiguous) res.warnings.push("Уточните водителя: подходят " + dr.ambiguous.map(x => x.name.split(" ").slice(0, 2).join(" ")).join(", "));
    else res.warnings.push("Водитель не распознан — выберите в списке");
  }

  const mc = findMachine(toks, ctx.machines || [], id => (ctx.isFree ? ctx.isFree(id, date) : true));
  if (mc.machine) {
    res.machineId = mc.machine.id;
    if (ctx.repairOf && ctx.repairOf(mc.machine.id, date)) res.warnings.push(`⚠️ ${mc.machine.name} в ремонте на эту дату`);
    else if (ctx.isFree && !ctx.isFree(mc.machine.id, date)) res.warnings.push(`ℹ️ ${mc.machine.name} уже стоит в плане на эту дату`);
  } else if (mc.ambiguous) {
    res.warnings.push("Уточните технику: подходят " + mc.ambiguous.map(m => m.name).join("; "));
  } else if (mc.mentioned) {
    res.warnings.push("Техника не распознана точно — выберите в списке");
  }

  const parts = splitText(toks);
  let org = parts.org.map(orgText).join(", ");
  if (!org) org = extractLegalOrg(parts.free) || "";
  const placeChunks = [...parts.place];
  const noteChunks = [...parts.note];
  const free = [...parts.free];
  if (!placeChunks.length && free.length) {
    placeChunks.push(free.shift());
    // следом идущие куски, похожие на адрес («улица Кирова 5»), тоже в адрес
    while (free.length && isAddressy(free[0])) placeChunks.push(free.shift());
  }
  noteChunks.push(...free);
  // «песок 10 тонн Металлургический район» — после объёма груза идёт адрес
  if (!placeChunks.length) {
    for (let ci = 0; ci < noteChunks.length && !placeChunks.length; ci++) {
      const c = noteChunks[ci];
      let cut = -1;
      for (let i = 1; i < c.length; i++) {
        if (ADDR_KW.has(c[i].n) && i > 0 && !UNIT_RE.test(c[i - 1].n)) { cut = i; break; }
        if (UNIT_RE.test(c[i - 1].n) && i < c.length) { cut = i; break; }
      }
      if (cut > 0) {
        const rest = cleanChunk(c.slice(cut));
        if (rest.length) { placeChunks.push(rest); noteChunks[ci] = c.slice(0, cut); }
      }
    }
  }
  const place = placeChunks.map(chunkText).join(", ");
  const notes = noteChunks.filter(c => c.length).map(chunkText);
  if (place) res.place = cap(place);
  if (org) res.org = org;
  if (notes.length) res.note = cap(notes.join(", "));

  return res;
}
