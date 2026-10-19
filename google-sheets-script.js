/* ================================================================
   Транспорт М5 — выгрузка заявок и отчётов в эту Google Таблицу
   и запасной канал связи приложения с базой (в конце файла).
   Каждый день в 21:00 (Челябинск) таблица сама берёт данные из базы.
   Меню «М5» в таблице: «Обновить сейчас» и «Включить ежедневное обновление».
   ================================================================ */

const SUPABASE_URL = 'https://yatwchgupbhrszgbdmtm.supabase.co';
const SUPABASE_KEY = 'sb_publishable_giLV8Jm4CsxlW6ptSkv8ng_9bJ4jm6f';
const TZ = 'Asia/Yekaterinburg';
const UPDATE_HOUR = 21;

const USERS = {
  1: 'Колдаева Юлия Юрьевна', 13: 'Хамматов Эдуард Фригатович', 12: 'Хамматов Ринат Фригатович',
  14: 'Салахова Зимфира Маратовна', 16: 'Абдрафигина Ольга Петровна',
  3: 'Касымов Руслан Раилевич', 4: 'Мурадымов Марат Хусаинович', 5: 'Нафигин Вадим Шавкатович',
  6: 'Хадыев Марат Саримович', 7: 'Шакиров Марат Рашитович', 8: 'Шахвалеев Роман Рафидович',
  9: 'Абдуллин Рафит Ансарович', 10: 'Абдулин Руслан Марсович', 11: 'Ямалетдинов Рамат Салахетдинович',
  15: 'Хамматов Фригат', 2: 'Вафин Данил Закирьянович', 17: 'Валитов Артур'
};
const MACHINES = {
  1: 'Самосвал ХОВО Н 020 ЕА (774)', 2: 'Самосвал ХОВО О608 ВУ (774)', 3: 'Самосвал ХОВО Н495 ХА (174)',
  4: 'Самосвал ШАКМАН Е324 ВР (774)', 5: 'Манипулятор ХОВО Н 576 ЕА (774)', 14: 'Манипулятор Е944 МС 174',
  6: 'ДОНГ ФЕНГ К826 НР174', 7: 'УРАЛ 10Т. Х444КВ 174', 8: 'АВТОКРАН 25Т. Х964ММ174', 9: 'АВТОКРАН 16Т. О726УН174',
  10: 'ПОГРУЗЧИК 6699УС174', 11: 'ПОГРУЗЧИК В140 О006УС 74', 12: 'МАЗ У302ВТ 774', 13: 'ГРЕЙДЕР 0005УС 174',
  15: 'УАЗ О599ВУ774'
};
const MONTHS = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];

function onOpen() {
  SpreadsheetApp.getUi().createMenu('М5')
    .addItem('Обновить сейчас', 'updateM5')
    .addItem('Включить ежедневное обновление (21:00)', 'setupDaily')
    .addToUi();
}

// Запустить один раз: включает ежедневное обновление и сразу заполняет таблицу
function setupDaily() {
  ScriptApp.getProjectTriggers()
    .filter(function (t) { return t.getHandlerFunction() === 'updateM5'; })
    .forEach(function (t) { ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('updateM5').timeBased().everyDays(1).atHour(UPDATE_HOUR).inTimezone(TZ).create();
  updateM5();
  SpreadsheetApp.getActive().toast('Готово! Таблица будет обновляться каждый день около ' + UPDATE_HOUR + ':00.', 'М5', 8);
}

function fetchAll_() {
  var rows = [];
  var useAuth = true;
  for (var offset = 0; ; offset += 1000) {
    var url = SUPABASE_URL + '/rest/v1/app_data?select=id,data&id=neq.main&order=id&limit=1000&offset=' + offset;
    var res = null;
    for (var attempt = 0; attempt < 4; attempt++) {
      var headers = { apikey: SUPABASE_KEY };
      if (useAuth) headers.Authorization = 'Bearer ' + SUPABASE_KEY;
      try {
        res = UrlFetchApp.fetch(url, { headers: headers, muteHttpExceptions: true });
      } catch (e) { res = null; Utilities.sleep(15000); continue; } // база может «просыпаться»
      var code = res.getResponseCode();
      if (code === 200) break;
      if ((code === 401 || code === 403) && useAuth) { useAuth = false; continue; }
      if (code >= 500 || code === 429) { Utilities.sleep(15000); continue; }
      break;
    }
    if (!res) throw new Error('Нет связи с базой Supabase (возможно, проект на паузе).');
    if (res.getResponseCode() !== 200) throw new Error('База ответила ' + res.getResponseCode() + ': ' + res.getContentText().slice(0, 300));
    var batch = JSON.parse(res.getContentText());
    rows = rows.concat(batch);
    if (batch.length < 1000) break;
  }
  return rows;
}

function updateM5() {
  var ss = SpreadsheetApp.getActive();
  ss.setSpreadsheetTimeZone(TZ);
  var rows = fetchAll_();

  var reqs = [], reps = {}, extraMachines = {};
  rows.forEach(function (r) {
    if (!r || !r.data || !r.id) return;
    if (r.id.indexOf('req_') === 0) { var q = r.data; q.id = r.id; reqs.push(q); }
    else if (r.id.indexOf('rep_') === 0 && r.data.reqId) reps[r.data.reqId] = r.data;
    else if (r.id === 'cfg_machines') (r.data.extra || []).forEach(function (m) { extraMachines[m.id] = m.name; });
  });
  var user = function (id) { return USERS[Number(id)] || (id ? 'Сотрудник #' + id : ''); };
  var names = {};
  reqs.forEach(function (q) {
    if (q.driverId && q.driverName) names[q.driverId] = q.driverName;
    if (q.createdBy && q.createdByName) names[q.createdBy] = q.createdByName;
  });
  var userOrig = user;
  user = function (id) { return names[id] || userOrig(id); };
  var machine = function (id) { return !id ? 'без техники' : (MACHINES[Number(id)] || extraMachines[id] || 'Техника #' + id); };
  var monthName = function (ym) { var p = String(ym || '').split('-'); return p.length === 2 ? MONTHS[Number(p[1]) - 1] + ' ' + p[0] : ''; };
  var today = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd');
  var stamp = Utilities.formatDate(new Date(), TZ, 'dd.MM.yyyy HH:mm');

  reqs.sort(function (a, b) {
    return String(b.date || '').localeCompare(String(a.date || '')) ||
      String(a.time || '').localeCompare(String(b.time || '')) ||
      user(a.driverId).localeCompare(user(b.driverId));
  });

  /* ---------- Лист «Заявки» ---------- */
  var head = ['Дата', 'Месяц', 'Водитель', 'Техника', 'Время подачи', 'Куда / объект', 'Заказчик', 'Заявку внёс',
              'Статус', 'Работал с', 'до', 'Часы', 'Рейсы', 'Маршрут', 'Путевой закрыт', 'Комментарий водителя', 'Комментарий к заявке'];
  var table = [], colors = [];
  reqs.forEach(function (q) {
    var p = reps[q.id];
    var done = !!(p && p.done);
    var status = done ? 'Отработано' : (q.date < today ? 'Нет отчёта' : 'В плане');
    table.push([
      q.date || '', monthName(q.month), user(q.driverId), machine(q.machineId), q.time || '', q.place || '', q.org || '',
      q.createdBy ? (Number(q.createdBy) === Number(q.driverId) ? 'сам водитель' : user(q.createdBy)) : '',
      status, done ? (p.from || '') : '', done ? (p.to || '') : '', done ? Number(p.hours || 0) : '',
      done ? Number(p.trips || 0) : '', done ? (p.route || '') : '', done ? (p.waybill ? 'да' : 'нет') : '',
      done ? (p.comment || '') : '', q.note || ''
    ]);
    colors.push(done ? '#e6f6ec' : (status === 'Нет отчёта' ? '#fdecea' : '#ffffff'));
  });
  var sh = getSheet_(ss, 'Заявки');
  sh.clear();
  sh.getRange(1, 1, 1, head.length).setValues([head]).setFontWeight('bold').setBackground('#1e3a5f').setFontColor('#ffffff');
  if (table.length) {
    // время «08:00» сохраняем как текст, чтобы таблица не превращала его в дату
    sh.getRange(2, 5, table.length, 1).setNumberFormat('@');
    sh.getRange(2, 10, table.length, 2).setNumberFormat('@');
    sh.getRange(2, 1, table.length, head.length).setValues(table);
    sh.getRange(2, 1, table.length, 1).setNumberFormat('dd.mm.yyyy');
    sh.getRange(2, 1, table.length, head.length).setBackgrounds(colors.map(function (c) { return head.map(function () { return c; }); }));
  }
  sh.setFrozenRows(1);
  if (sh.getFilter()) sh.getFilter().remove();
  sh.getRange(1, 1, Math.max(table.length + 1, 2), head.length).createFilter();
  sh.autoResizeColumns(1, head.length);

  /* ---------- Лист «Итоги по водителям» и «Итоги по технике» ---------- */
  writeSummary_(ss, 'Итоги по водителям', 'Водитель', reqs, reps, function (q) { return user(q.driverId); }, monthName, today, stamp);
  writeSummary_(ss, 'Итоги по технике', 'Техника', reqs, reps, function (q) { return machine(q.machineId); }, monthName, today, stamp);

  // убираем пустой стартовый лист
  ss.getSheets().forEach(function (s) {
    if (['Заявки', 'Итоги по водителям', 'Итоги по технике'].indexOf(s.getName()) < 0 && s.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(s);
  });
  ss.setActiveSheet(ss.getSheetByName('Итоги по водителям'));
  ss.moveActiveSheet(1);
}

function writeSummary_(ss, name, keyTitle, reqs, reps, keyFn, monthName, today, stamp) {
  var groups = {};
  reqs.forEach(function (q) {
    var k = (q.month || '') + '|' + keyFn(q);
    var g = groups[k] || (groups[k] = { month: q.month || '', key: keyFn(q), shifts: 0, days: {}, hours: 0, trips: 0, missing: 0, noWaybill: 0, planned: 0 });
    var p = reps[q.id];
    if (p && p.done) {
      g.shifts++; g.days[q.date] = 1; g.hours += Number(p.hours || 0); g.trips += Number(p.trips || 0);
      if (!p.waybill) g.noWaybill++;
    } else if (q.date < today) g.missing++;
    else g.planned++;
  });
  var list = Object.keys(groups).map(function (k) { return groups[k]; });
  list.sort(function (a, b) { return b.month.localeCompare(a.month) || b.hours - a.hours; });
  var head = ['Месяц', keyTitle, 'Смен', 'Рабочих дней', 'Часов', 'Рейсов', 'Без отчёта', 'Путевой не закрыт', 'Ещё в плане'];
  var rows = list.map(function (g) {
    return [monthName(g.month), g.key, g.shifts, Object.keys(g.days).length, Math.round(g.hours * 10) / 10, g.trips, g.missing, g.noWaybill, g.planned];
  });
  var sh = getSheet_(ss, name);
  sh.clear();
  sh.getRange(3, 1, 1, head.length).setValues([head]).setFontWeight('bold').setBackground('#1e3a5f').setFontColor('#ffffff');
  if (rows.length) {
    sh.getRange(4, 1, rows.length, head.length).setValues(rows);
    var bg = [], prev = null, shade = false;
    rows.forEach(function (r) { if (r[0] !== prev) { shade = !shade; prev = r[0]; } bg.push(head.map(function () { return shade ? '#ffffff' : '#f0f4f8'; })); });
    sh.getRange(4, 1, rows.length, head.length).setBackgrounds(bg);
  } else {
    sh.getRange(4, 1).setValue('Пока нет данных');
  }
  sh.setFrozenRows(3);
  sh.autoResizeColumns(1, head.length);
  sh.getRange(1, 1).setValue('Обновлено: ' + stamp + ' (обновляется автоматически каждый день в 21:00)').setFontColor('#6b7b8c');
}

function getSheet_(ss, name) {
  return ss.getSheetByName(name) || ss.insertSheet(name);
}


/* ================================================================
   ЗАПАСНОЙ КАНАЛ СВЯЗИ ПРИЛОЖЕНИЯ С БАЗОЙ (через Google)
   Российские провайдеры режут Cloudflare, через который работает база Supabase,
   а Google работает. Если база напрямую не отвечает, приложение само шлёт
   запрос сюда, а скрипт передаёт его в базу со стороны Google.
   Пускает только к таблице app_data, с тем же открытым ключом, что и приложение.
   Публикуется один раз: «Начать развертывание» → «Новое развертывание» →
   «Веб-приложение», запуск от имени «Я», доступ «Все».
   ================================================================ */
function doPost(e) {
  var out;
  try {
    var q = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    var m = String(q.m || 'GET').toUpperCase();
    var p = String(q.p || '');
    if (['GET', 'POST', 'PATCH', 'DELETE'].indexOf(m) < 0) throw new Error('метод не разрешён');
    if (!/^app_data(\?|$)/.test(p)) throw new Error('адрес не разрешён');
    p = p.replace(/>/g, '%3E').replace(/</g, '%3C').replace(/ /g, '%20').replace(/"/g, '%22');
    var headers = { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY };
    if (q.pr) headers.Prefer = String(q.pr);
    var opt = { method: m.toLowerCase(), headers: headers, muteHttpExceptions: true, followRedirects: false };
    if (q.b !== null && q.b !== undefined && m !== 'GET' && m !== 'DELETE') {
      opt.contentType = 'application/json; charset=utf-8';
      opt.payload = String(q.b);
    }
    var r = UrlFetchApp.fetch(SUPABASE_URL + '/rest/v1/' + p, opt);
    out = { s: r.getResponseCode(), t: r.getContentText() };
  } catch (err) {
    out = { s: 0, error: String((err && err.message) || err) };
  }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

// проверка, что канал опубликован: открыть адрес веб-приложения в браузере
function doGet() {
  return ContentService.createTextOutput(JSON.stringify({ ok: true, app: 'Транспорт М5', relay: true }))
    .setMimeType(ContentService.MimeType.JSON);
}
