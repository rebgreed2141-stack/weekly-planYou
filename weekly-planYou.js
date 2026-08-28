(() => {
  "use strict";

  const jpDow = ["日", "月", "火", "水", "木", "金", "土"];
  // v9: class checkbox is calendar-mark display only. Sync/class selection code is not affected.
  const classToAge = {
    "もみじ": 0,
    "どんぐり": 1,
    "こぐま": 2,
    "りす": 3,
    "のうさぎ": 4,
    "かもしか": 5
  };
  const classMarks = {
    "もみじ": "も",
    "どんぐり": "ど",
    "こぐま": "こ",
    "りす": "り",
    "のうさぎ": "の",
    "かもしか": "か"
  };
  const classOrder = ["もみじ", "どんぐり", "こぐま", "りす", "のうさぎ", "かもしか"];
  const STORAGE_PREFIX = "weekly_";
  const TEXT_LIMITS = {};
  const BACKUP_HEADERS = [
    "classKey",
    "startDate",
    "weeklyAim",
    "childAppearance",
    "events",
    "day0Date",
    "day0Environment",
    "day0Activity",
    "day0Consideration",
    "day0Evaluation",
    "day0AbsenceStatus",
    "day1Date",
    "day1Environment",
    "day1Activity",
    "day1Consideration",
    "day1Evaluation",
    "day1AbsenceStatus",
    "day2Date",
    "day2Environment",
    "day2Activity",
    "day2Consideration",
    "day2Evaluation",
    "day2AbsenceStatus",
    "day3Date",
    "day3Environment",
    "day3Activity",
    "day3Consideration",
    "day3Evaluation",
    "day3AbsenceStatus",
    "day4Date",
    "day4Environment",
    "day4Activity",
    "day4Consideration",
    "day4Evaluation",
    "day4AbsenceStatus",
    "day5Date",
    "day5Environment",
    "day5Activity",
    "day5Consideration",
    "day5Evaluation",
    "day5AbsenceStatus",
    "parentSupport",
    "childReflection",
    "selfEvaluation",
  ];

  const el = {
    classSelect: document.getElementById("classSelect"),
    weekLabel: document.getElementById("weekLabel"),
    classLabel: document.getElementById("classLabel"),
    weeklyAim: document.getElementById("weeklyAim"),
    weeklyAimCount: document.getElementById("weeklyAimCount"),
    weeklyAimSaveStatus: document.getElementById("weeklyAimSaveStatus"),
    childAppearance: document.getElementById("childAppearance"),
    events: document.getElementById("events"),
    eventsCount: document.getElementById("eventsCount"),
    journalBody: document.getElementById("journalBody"),
    parentSupport: document.getElementById("parentSupport"),
    childReflection: document.getElementById("childReflection"),
    selfEvaluation: document.getElementById("selfEvaluation"),
    weekKeyView: document.getElementById("weekKeyView"),
    lastSavedView: document.getElementById("lastSavedView"),
    syncStatusView: document.getElementById("syncStatusView"),
    serverApiUrl: document.getElementById("serverApiUrl"),
    btnSaveServerUrl: document.getElementById("btnSaveServerUrl"),
    btnReceiveFromServer: document.getElementById("btnReceiveFromServer"),
    btnSendToServer: document.getElementById("btnSendToServer"),
    btnTopReceive: document.getElementById("btnTopReceive"),
    btnTopSend: document.getElementById("btnTopSend"),
    btnClear: document.getElementById("btnClear"),
    btnBackup: document.getElementById("btnBackup"),
    btnRestore: document.getElementById("btnRestore"),
    btnDeleteAll: document.getElementById("btnDeleteAll"),
    restoreFileInput: document.getElementById("restoreFileInput"),
    tabMainBtn: document.getElementById("tabMainBtn"),
    tabCalendarBtn: document.getElementById("tabCalendarBtn"),
    tabPhraseBtn: document.getElementById("tabPhraseBtn"),
    tabManageBtn: document.getElementById("tabManageBtn"),
    tabVersionBtn: document.getElementById("tabVersionBtn"),
    tabMain: document.getElementById("tabMain"),
    tabCalendar: document.getElementById("tabCalendar"),
    tabPhrase: document.getElementById("tabPhrase"),
    tabManage: document.getElementById("tabManage"),
    tabVersion: document.getElementById("tabVersion"),
    currentVersionView: document.getElementById("currentVersionView"),
    latestVersionView: document.getElementById("latestVersionView"),
    btnApplyUpdate: document.getElementById("btnApplyUpdate"),
    templatePhraseText: document.getElementById("templatePhraseText"),
    btnAddTemplatePhrase: document.getElementById("btnAddTemplatePhrase"),
    templatePhraseList: document.getElementById("templatePhraseList"),
    btnExportTemplatePhrases: document.getElementById("btnExportTemplatePhrases"),
    btnImportTemplatePhrases: document.getElementById("btnImportTemplatePhrases"),
    templatePhraseImportInput: document.getElementById("templatePhraseImportInput"),
    templatePhrasePopup: document.getElementById("templatePhrasePopup"),
    templatePhrasePopupList: document.getElementById("templatePhrasePopupList"),
    btnCloseTemplatePhrasePopup: document.getElementById("btnCloseTemplatePhrasePopup"),
    btnPrevMonth: document.getElementById("btnPrevMonth"),
    btnNextMonth: document.getElementById("btnNextMonth"),
    calendarTitle: document.getElementById("calendarTitle"),
    calendarGrid: document.getElementById("calendarGrid"),
    classFilterBox: document.getElementById("classFilterBox")
  };

  const calendarState = (() => {
    const today = new Date();
    return {
      year: today.getFullYear(),
      month: today.getMonth() + 1
    };
  })();

  let currentStartDateIso = "";
  let saveTimer = null;
  let suppressAutosave = false;
  let classPickerResolve = null;
  let currentVersion = "";
  let latestVersion = "";
  let swRegistration = null;
  const CURRENT_VERSION_STORAGE_KEY = "weekly_plan_current_version";
  const SERVER_URL_STORAGE_KEY = "weekly_plan_server_url";
  const DEFAULT_SERVER_URL = "http://192.168.2.60:3000";
  const CLIENT_ID_STORAGE_KEY = "weekly_plan_client_id";
  const LOCK_RENEW_INTERVAL_MS = 30000;
  const ENABLED_CLASSES_STORAGE_KEY = "weekly_plan_enabled_classes";
  const TEMPLATE_PHRASES_STORAGE_KEY = "weekly_plan_template_phrases";

  let currentLock = null;
  let lockRenewTimer = null;
  let isReadOnlyMode = false;
  let isLoadingWeek = false;
  let activeTemplatePhraseTarget = null;
  let serverWeeksCache = [];

  const pad2 = (n) => String(n).padStart(2, "0");

  function createLocalDate(year, month, day) {
    return new Date(year, month - 1, day, 12, 0, 0, 0);
  }

  function parseISODate(value) {
    if (!value) return null;
    const m = String(value).trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (!m) return null;
    return createLocalDate(Number(m[1]), Number(m[2]), Number(m[3]));
  }

  function toISO(dateObj) {
    return `${dateObj.getFullYear()}-${pad2(dateObj.getMonth() + 1)}-${pad2(dateObj.getDate())}`;
  }

  function addDays(dateObj, days) {
    const d = new Date(dateObj.getTime());
    d.setDate(d.getDate() + days);
    return d;
  }

  function formatMD(dateObj) {
    return `${dateObj.getMonth() + 1}/${dateObj.getDate()}`;
  }

  function formatMDJpDow(dateObj) {
    return `${formatMD(dateObj)}（${jpDow[dateObj.getDay()]}）`;
  }

  function nowIso() {
    const d = new Date();
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
  }

  function excelSerialToDate(serial) {
    const n = Number(serial);
    if (!Number.isFinite(n)) return null;
    const utcDays = Math.floor(n - 25569);
    const utcValue = utcDays * 86400 * 1000;
    const date = new Date(utcValue);
    if (Number.isNaN(date.getTime())) return null;
    return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 12, 0, 0, 0);
  }

  function normalizeDateValue(value) {
    if (value == null) return null;
    const s = String(value).trim();
    if (!s) return null;

    if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(s)) {
      return parseISODate(s);
    }
    if (/^\d{4}\/\d{1,2}\/\d{1,2}$/.test(s)) {
      const [y, m, d] = s.split("/").map(Number);
      return createLocalDate(y, m, d);
    }
    if (/^\d{4}\.\d{1,2}\.\d{1,2}$/.test(s)) {
      const [y, m, d] = s.split(".").map(Number);
      return createLocalDate(y, m, d);
    }
    if (/^\d{8}$/.test(s)) {
      return createLocalDate(Number(s.slice(0, 4)), Number(s.slice(4, 6)), Number(s.slice(6, 8)));
    }
    if (/^\d+(\.\d+)?$/.test(s)) {
      return excelSerialToDate(s);
    }
    return null;
  }

  function normalizeDateToISO(value) {
    const dateObj = normalizeDateValue(value);
    return dateObj ? toISO(dateObj) : "";
  }

  function toSlashDate(value) {
    const dateObj = normalizeDateValue(value);
    if (!dateObj) return "";
    return `${dateObj.getFullYear()}/${pad2(dateObj.getMonth() + 1)}/${pad2(dateObj.getDate())}`;
  }

  function getFiscalYearFromDate(dateObj) {
    if (!dateObj) return "";
    const year = dateObj.getFullYear();
    return dateObj.getMonth() + 1 >= 4 ? year : year - 1;
  }

  function getFiscalYearFromIso(iso) {
    const dateObj = parseISODate(iso);
    return getFiscalYearFromDate(dateObj);
  }

  function getClassLabel(classKey) {
    if (!classKey) return "";
    return `${classToAge[classKey]}歳児${classKey}組`;
  }

  function getEnabledClasses() {
    // チェックを入れた直後でも反映するため、画面上のチェック状態を最優先で読む。
    if (el.classFilterBox) {
      const boxes = Array.from(el.classFilterBox.querySelectorAll('input[type="checkbox"]'));
      if (boxes.length > 0) {
        const checkedSet = new Set(boxes.filter((box) => box.checked).map((box) => box.value));
        return classOrder.filter((classKey) => checkedSet.has(classKey));
      }
    }

    let saved = [];
    try {
      saved = JSON.parse(localStorage.getItem(ENABLED_CLASSES_STORAGE_KEY) || "[]");
    } catch (_) {
      saved = [];
    }

    // 初期状態は「チェックなし」。
    if (!Array.isArray(saved)) return [];

    const set = new Set(saved.filter((classKey) => classOrder.includes(classKey)));
    return classOrder.filter((classKey) => set.has(classKey));
  }

  function isClassEnabled(classKey) {
    return getEnabledClasses().includes(classKey);
  }

  function saveEnabledClasses(list) {
    const safe = classOrder.filter((classKey) => Array.isArray(list) && list.includes(classKey));
    localStorage.setItem(ENABLED_CLASSES_STORAGE_KEY, JSON.stringify(safe));
  }

  function renderClassFilter() {
    if (!el.classFilterBox) return;
    const enabled = new Set(getEnabledClasses());
    el.classFilterBox.innerHTML = "";

    classOrder.forEach((classKey) => {
      const label = document.createElement("label");
      label.className = "classCheckItem";

      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.value = classKey;
      cb.checked = enabled.has(classKey);

      const text = document.createElement("span");
      text.textContent = getClassLabel(classKey);

      cb.addEventListener("change", () => {
        const checked = Array.from(el.classFilterBox.querySelectorAll('input[type="checkbox"]:checked')).map((item) => item.value);
        saveEnabledClasses(checked);

        // チェックボックスはカレンダー表示対象の絞り込みに使う。
        renderCalendar();
      });

      label.appendChild(cb);
      label.appendChild(text);
      el.classFilterBox.appendChild(label);
    });
  }

  function getTemplatePhrases() {
    let list = [];
    try {
      const raw = JSON.parse(localStorage.getItem(TEMPLATE_PHRASES_STORAGE_KEY) || "[]");
      if (Array.isArray(raw)) list = raw;
      else if (raw && Array.isArray(raw.phrases)) list = raw.phrases;
    } catch (_) {
      list = [];
    }

    const seen = new Set();
    const result = [];
    list.forEach((item) => {
      const text = String(item || "").trim();
      if (!text || seen.has(text)) return;
      seen.add(text);
      result.push(text);
    });
    return result;
  }

  function saveTemplatePhrases(list) {
    const seen = new Set();
    const safe = [];
    (Array.isArray(list) ? list : []).forEach((item) => {
      const text = String(item || "").trim();
      if (!text || seen.has(text)) return;
      seen.add(text);
      safe.push(text);
    });
    localStorage.setItem(TEMPLATE_PHRASES_STORAGE_KEY, JSON.stringify(safe));
  }

  function renderTemplatePhraseList() {
    if (!el.templatePhraseList) return;
    const phrases = getTemplatePhrases();
    el.templatePhraseList.innerHTML = "";

    if (phrases.length === 0) {
      const empty = document.createElement("div");
      empty.className = "templatePhraseEmpty";
      empty.textContent = "登録済みの定型文はありません。";
      el.templatePhraseList.appendChild(empty);
      renderTemplatePhrasePopupList();
      return;
    }

    phrases.forEach((phrase, index) => {
      const row = document.createElement("div");
      row.className = "templatePhraseItem";

      const text = document.createElement("div");
      text.className = "templatePhraseText";
      text.textContent = phrase;

      const del = document.createElement("button");
      del.type = "button";
      del.className = "danger";
      del.textContent = "削除";
      del.addEventListener("click", () => {
        const current = getTemplatePhrases();
        current.splice(index, 1);
        saveTemplatePhrases(current);
        renderTemplatePhraseList();
      });

      row.appendChild(text);
      row.appendChild(del);
      el.templatePhraseList.appendChild(row);
    });

    renderTemplatePhrasePopupList();
  }

  function addTemplatePhrase() {
    const text = String(el.templatePhraseText?.value || "").trim();
    if (!text) {
      alert("定型文を入力してください。");
      return;
    }

    const phrases = getTemplatePhrases();
    if (!phrases.includes(text)) phrases.push(text);
    saveTemplatePhrases(phrases);
    if (el.templatePhraseText) el.templatePhraseText.value = "";
    renderTemplatePhraseList();
  }

  function exportTemplatePhrases() {
    const phrases = getTemplatePhrases();
    const blob = new Blob([JSON.stringify(phrases, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "weekly-template-phrases.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function importTemplatePhrases(file) {
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const incoming = Array.isArray(parsed) ? parsed : (parsed && Array.isArray(parsed.phrases) ? parsed.phrases : []);
      if (!incoming.length) {
        alert("定型文データが見つかりません。");
        return;
      }
      const merged = getTemplatePhrases().concat(incoming);
      saveTemplatePhrases(merged);
      renderTemplatePhraseList();
      alert("定型文をインポートしました。");
    } catch (_) {
      alert("インポートできません。JSONファイルを確認してください。");
    } finally {
      if (el.templatePhraseImportInput) el.templatePhraseImportInput.value = "";
    }
  }

  function renderTemplatePhrasePopupList() {
    if (!el.templatePhrasePopupList) return;
    const phrases = getTemplatePhrases();
    el.templatePhrasePopupList.innerHTML = "";

    if (phrases.length === 0) {
      const empty = document.createElement("div");
      empty.className = "templatePhraseEmpty";
      empty.textContent = "登録済みの定型文はありません。";
      el.templatePhrasePopupList.appendChild(empty);
      return;
    }

    phrases.forEach((phrase) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "templatePhrasePopupItem";
      btn.textContent = phrase;
      btn.addEventListener("click", () => insertTemplatePhraseToActiveTarget(phrase));
      el.templatePhrasePopupList.appendChild(btn);
    });
  }

  function showTemplatePhrasePopup(target) {
    if (!target || target.disabled || target.readOnly) return;
    activeTemplatePhraseTarget = target;
    renderTemplatePhrasePopupList();
    if (el.templatePhrasePopup) el.templatePhrasePopup.hidden = false;
  }

  function closeTemplatePhrasePopup() {
    if (el.templatePhrasePopup) el.templatePhrasePopup.hidden = true;
  }

  function insertTemplatePhraseToActiveTarget(phrase) {
    const target = activeTemplatePhraseTarget;
    if (!target) return;

    const value = String(target.value || "");
    const start = typeof target.selectionStart === "number" ? target.selectionStart : value.length;
    const end = typeof target.selectionEnd === "number" ? target.selectionEnd : value.length;
    const prefix = value.slice(0, start);
    const suffix = value.slice(end);
    const insertText = prefix && !prefix.endsWith("\n") ? "\n" + phrase : phrase;

    const nextValue = prefix + insertText + suffix;
    target.value = nextValue;
    const pos = (prefix + insertText).length;
    if (typeof target.setSelectionRange === "function") {
      target.focus();
      target.setSelectionRange(pos, pos);
    }
    target.dispatchEvent(new Event("input", { bubbles: true }));
    closeTemplatePhrasePopup();
  }

  function getLengthLimitLabel(target) {
    return target?.dataset?.limitLabel || "この入力欄";
  }

  function showLengthLimitMessage(target) {
    return;
  }

  function applyTextLengthLimit(target, limit, label) {
    return;
  }

  function updateAllFixedTextCounters() {}

  function applyFixedTextLengthLimits() {}

  function bindTemplatePhraseInput(target) {
    if (!target || target.dataset.templatePhraseBound === "1") return;
    target.dataset.templatePhraseBound = "1";
    target.addEventListener("focus", () => showTemplatePhrasePopup(target));
    target.addEventListener("click", () => showTemplatePhrasePopup(target));
  }

  function bindTemplatePhraseInputs() {
    [
      el.weeklyAim,
      el.childAppearance,
      el.events,
      el.parentSupport,
      el.childReflection,
      el.selfEvaluation
    ].forEach(bindTemplatePhraseInput);

    if (el.journalBody) {
      Array.from(el.journalBody.querySelectorAll("textarea")).forEach(bindTemplatePhraseInput);
    }
  }

  function isFiscalStartException(dateObj) {
    if (!dateObj) return false;
    return dateObj.getMonth() + 1 === 4 && dateObj.getDate() === 1 && dateObj.getDay() >= 2 && dateObj.getDay() <= 6;
  }

  function isSelectableStartDate(dateObj) {
    if (!dateObj) return false;
    return dateObj.getDay() === 1 || isFiscalStartException(dateObj);
  }

  function getWeekInfoByStartDateIso(startDateIso) {
    const startDate = parseISODate(startDateIso);
    if (!startDate) {
      return { month: "", week: "", weekLabel: "" };
    }

    const year = startDate.getFullYear();
    const month = startDate.getMonth() + 1;
    let week = 0;
    const monthLastDay = new Date(year, month, 0).getDate();

    for (let day = 1; day <= monthLastDay; day++) {
      const d = createLocalDate(year, month, day);
      if (isSelectableStartDate(d)) {
        week += 1;
      }
      if (toISO(d) === startDateIso) {
        return {
          month,
          week,
          weekLabel: `${month}月第${week}週`
        };
      }
    }

    return { month, week: "", weekLabel: "" };
  }

  function setCalendarMonthByIso(iso) {
    const dateObj = parseISODate(iso);
    if (!dateObj) return;
    calendarState.year = dateObj.getFullYear();
    calendarState.month = dateObj.getMonth() + 1;
  }

  function makeStorageKey(startDateIso, classKey) {
    if (!startDateIso || !classKey) return "";
    return `${STORAGE_PREFIX}${classKey}_${startDateIso}`;
  }

  function currentStorageKey() {
    return makeStorageKey(currentStartDateIso, el.classSelect.value || "");
  }

  function refreshTopLabels() {
    const weekInfo = getWeekInfoByStartDateIso(currentStartDateIso);
    el.weekLabel.textContent = weekInfo.weekLabel || "—";
    el.classLabel.textContent = getClassLabel(el.classSelect.value || "") || "—";
    el.weekKeyView.textContent = currentStorageKey() || "未設定";
  }

  function getJournalDateSlots(startDateIso) {
    const slots = Array(6).fill("");
    const startDate = parseISODate(startDateIso);
    if (!startDate) return slots;

    const fiscalYear = getFiscalYearFromDate(startDate);
    const startDow = startDate.getDay();
    let startIndex = 0;

    if (isFiscalStartException(startDate)) {
      startIndex = startDow - 1;
    }

    for (let i = startIndex; i < 6; i++) {
      const offset = i - startIndex;
      const dateObj = addDays(startDate, offset);
      if (getFiscalYearFromDate(dateObj) !== fiscalYear) break;
      slots[i] = toISO(dateObj);
    }

    return slots;
  }

  function buildJournalRows(startDateIso) {
    el.journalBody.innerHTML = "";
    const slotDates = getJournalDateSlots(startDateIso);

    for (let i = 0; i < 6; i++) {
      const card = document.createElement("section");
      card.className = "dayCard";
      card.dataset.dayIndex = String(i);

      const slotIso = slotDates[i];
      const slotDateObj = parseISODate(slotIso);
      const hasDate = Boolean(slotDateObj);

      if (!hasDate) card.classList.add("disabledDay");
      if (i === 0 && hasDate) card.classList.add("open");

      const head = document.createElement("button");
      head.type = "button";
      head.className = "dayCardHead";

      const left = document.createElement("div");
      left.className = "dayTitle";

      const icon = document.createElement("span");
      icon.className = "dayIcon";
      icon.textContent = "▣";

      const dateText = document.createElement("span");
      dateText.className = "dayDate";
      dateText.textContent = hasDate ? formatMDJpDow(slotDateObj) : "—";

      left.appendChild(icon);
      left.appendChild(dateText);

      const badge = document.createElement("span");
      badge.className = "dayBadge";
      badge.textContent = hasDate ? "未入力" : "対象外";
      badge.dataset.badgeFor = String(i);
      if (hasDate) {
        badge.setAttribute("role", "button");
        badge.setAttribute("tabindex", "0");
        badge.setAttribute("aria-label", "この日の入力内容を保存");
      }

      const arrow = document.createElement("span");
      arrow.className = "dayArrow";
      arrow.textContent = "⌄";

      head.appendChild(left);
      head.appendChild(badge);
      head.appendChild(arrow);
      card.appendChild(head);

      const body = document.createElement("div");
      body.className = "dayCardBody";

      const makeField = (kind, labelText, mark, placeholder, colorClass) => {
        const wrap = document.createElement("div");
        wrap.className = "dayField";

        const label = document.createElement("div");
        label.className = `dayFieldLabel ${colorClass}`;
        const m = document.createElement("span");
        m.className = "fieldMark";
        m.textContent = mark;
        const t = document.createElement("span");
        t.textContent = labelText;
        label.appendChild(m);
        label.appendChild(t);

        const ta = document.createElement("textarea");
        ta.className = "tarea mobileTarea";
        ta.placeholder = hasDate ? placeholder : "";
        ta.dataset.field = `day${i}_${kind}`;
        ta.disabled = !hasDate;
        wrap.appendChild(label);
        wrap.appendChild(ta);

        return wrap;
      };

      body.appendChild(makeField("environment", "環境・構成", "◆", "環境・構成を入力してください", "blueLabel"));
      body.appendChild(makeField("activity", "子どもの活動", "♟", "子どもの活動を入力してください", "blueLabel"));
      body.appendChild(makeField("consideration", "配慮事項", "●", "配慮事項を入力してください", "blueLabel"));
      body.appendChild(makeField("evaluation", "保育評価（日誌）", "▣", "保育評価（日誌）を入力してください", "pinkLabel"));
      body.appendChild(makeField("absenceStatus", "欠席状況", "▲", "欠席状況を入力してください", "blueLabel"));
      card.appendChild(body);

      head.addEventListener("click", () => {
        if (!hasDate) return;
        card.classList.toggle("open");
      });

      if (hasDate) {
        badge.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          manualSaveDay(i);
        });
        badge.addEventListener("keydown", (event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          event.stopPropagation();
          manualSaveDay(i);
        });
      }

      el.journalBody.appendChild(card);
    }

    Array.from(el.journalBody.querySelectorAll("textarea")).forEach((t) => {
      t.addEventListener("input", () => {
        updateTextareaCounter(t);
        markDayUnsavedFromTextarea(t);
        updateDayBadgeFromTextarea(t);
        scheduleAutosave();
      });
      t.addEventListener("change", () => {
        updateTextareaCounter(t);
        markDayUnsavedFromTextarea(t);
        updateDayBadgeFromTextarea(t);
        scheduleAutosave();
      });
      updateTextareaCounter(t);
    });
    bindTemplatePhraseInputs();
    updateAllDayBadges();
  }

  function hasWeeklyAimText() {
    return Boolean(String(el.weeklyAim?.value || "").trim());
  }

  function updateWeeklyAimStatus() {
    const badge = el.weeklyAimSaveStatus;
    if (!badge) return;
    const hasText = hasWeeklyAimText();
    const isSaved = badge.dataset.saved === "1";
    badge.textContent = hasText ? (isSaved ? "保存済み" : "未保存") : "未入力";
    badge.classList.toggle("active", hasText && !isSaved);
    badge.classList.toggle("saved", hasText && isSaved);
  }

  function markWeeklyAimUnsaved() {
    const badge = el.weeklyAimSaveStatus;
    if (!badge) return;
    badge.dataset.saved = "0";
    updateWeeklyAimStatus();
  }

  function manualSaveWeeklyAim() {
    if (!hasWeeklyAimText()) return;
    try {
      autosave();
      if (el.weeklyAimSaveStatus) el.weeklyAimSaveStatus.dataset.saved = "1";
      updateWeeklyAimStatus();
      setSyncStatus("保存しました");
    } catch (_) {
      if (el.weeklyAimSaveStatus) el.weeklyAimSaveStatus.dataset.saved = "0";
      updateWeeklyAimStatus();
      setSyncStatus("保存できませんでした");
    }
  }

  function updateTextareaCounter(textarea) {}

  function updateDayBadgeFromTextarea(textarea) {
    const m = String(textarea?.dataset?.field || "").match(/^day(\d+)_/);
    if (m) updateDayBadge(Number(m[1]));
  }

  function markDayUnsavedFromTextarea(textarea) {
    const m = String(textarea?.dataset?.field || "").match(/^day(\d+)_/);
    if (!m) return;
    const badge = el.journalBody.querySelector(`[data-badge-for="${Number(m[1])}"]`);
    if (badge) badge.dataset.saved = "0";
  }

  function updateDayBadge(index) {
    const badge = el.journalBody.querySelector(`[data-badge-for="${index}"]`);
    if (!badge) return;
    const els = getJournalRowElements(index);
    const hasText = [els.environment, els.activity, els.consideration, els.evaluation, els.absenceStatus].some((node) => String(node?.value || "").trim());
    const isSaved = badge.dataset.saved === "1";
    badge.textContent = hasText ? (isSaved ? "保存済み" : "未保存") : "未入力";
    badge.classList.toggle("active", hasText && !isSaved);
    badge.classList.toggle("saved", hasText && isSaved);
  }

  function manualSaveDay(index) {
    const badge = el.journalBody.querySelector(`[data-badge-for="${index}"]`);
    if (!badge) return;
    const els = getJournalRowElements(index);
    const hasText = [els.environment, els.activity, els.consideration, els.evaluation, els.absenceStatus].some((node) => String(node?.value || "").trim());
    if (!hasText) return;

    try {
      autosave();
      badge.dataset.saved = "1";
      updateDayBadge(index);
      setSyncStatus("保存しました");
    } catch (_) {
      badge.dataset.saved = "0";
      updateDayBadge(index);
      setSyncStatus("保存できませんでした");
    }
  }

  function markAllFilledDayBadgesSaved() {
    for (let i = 0; i < 6; i++) {
      const badge = el.journalBody.querySelector(`[data-badge-for="${i}"]`);
      if (!badge) continue;
      const els = getJournalRowElements(i);
      const hasText = [els.environment, els.activity, els.consideration, els.evaluation, els.absenceStatus].some((node) => String(node?.value || "").trim());
      badge.dataset.saved = hasText ? "1" : "0";
      updateDayBadge(i);
    }
    if (el.weeklyAimSaveStatus) {
      el.weeklyAimSaveStatus.dataset.saved = hasWeeklyAimText() ? "1" : "0";
      updateWeeklyAimStatus();
    }
  }

  function updateAllDayBadges(savedState) {
    for (let i = 0; i < 6; i++) {
      const badge = el.journalBody.querySelector(`[data-badge-for="${i}"]`);
      if (badge && (savedState === "saved" || savedState === "unsaved")) {
        badge.dataset.saved = savedState === "saved" ? "1" : "0";
      }
      updateDayBadge(i);
      const els = getJournalRowElements(i);
      [els.environment, els.activity, els.consideration, els.evaluation, els.absenceStatus].forEach(updateTextareaCounter);
    }
    updateWeeklyAimStatus();
  }

  function getJournalRowElements(index) {
    return {
      environment: el.journalBody.querySelector(`textarea[data-field="day${index}_environment"]`),
      activity: el.journalBody.querySelector(`textarea[data-field="day${index}_activity"]`),
      consideration: el.journalBody.querySelector(`textarea[data-field="day${index}_consideration"]`),
      evaluation: el.journalBody.querySelector(`textarea[data-field="day${index}_evaluation"]`),
      absenceStatus: el.journalBody.querySelector(`textarea[data-field="day${index}_absenceStatus"]`)
    };
  }

  function setEditingEnabled(enabled) {
    const slotDates = getJournalDateSlots(currentStartDateIso);
    const canEdit = Boolean(enabled) && !isReadOnlyMode && Boolean(currentLock);

    [
      el.weeklyAim,
      el.childAppearance,
      el.events,
      el.parentSupport,
      el.childReflection,
      el.selfEvaluation,
      el.btnClear
    ].filter(Boolean).forEach((node) => {
      node.disabled = !canEdit;
    });

    for (let i = 0; i < 6; i++) {
      const slotExists = Boolean(slotDates[i]);
      const rowEls = getJournalRowElements(i);
      if (rowEls.environment) rowEls.environment.disabled = !canEdit || !slotExists;
      if (rowEls.activity) rowEls.activity.disabled = !canEdit || !slotExists;
      if (rowEls.consideration) rowEls.consideration.disabled = !canEdit || !slotExists;
      if (rowEls.evaluation) rowEls.evaluation.disabled = !canEdit || !slotExists;
      if (rowEls.absenceStatus) rowEls.absenceStatus.disabled = !canEdit || !slotExists;
    }
  }

  function collectData(startDateIso) {
    const slotDates = getJournalDateSlots(startDateIso);

    const data = {
      classKey: el.classSelect.value || "",
      startDate: startDateIso || "",
      weeklyAim: el.weeklyAim.value || "",
      childAppearance: el.childAppearance.value || "",
      events: el.events.value || "",
      journal: [],
      parentSupport: el.parentSupport.value || "",
      childReflection: el.childReflection.value || "",
      selfEvaluation: el.selfEvaluation.value || "",
      updatedAt: nowIso()
    };

    for (let i = 0; i < 6; i++) {
      const rowDateIso = slotDates[i] || "";
      const rowDate = parseISODate(rowDateIso);
      const els = getJournalRowElements(i);
      data.journal.push({
        dateIso: rowDateIso,
        datePretty: rowDate ? formatMDJpDow(rowDate) : "",
        environment: rowDateIso && els.environment ? els.environment.value : "",
        activity: rowDateIso && els.activity ? els.activity.value : "",
        consideration: rowDateIso && els.consideration ? els.consideration.value : "",
        evaluation: rowDateIso && els.evaluation ? els.evaluation.value : "",
        absenceStatus: rowDateIso && els.absenceStatus ? els.absenceStatus.value : ""
      });
    }

    return data;
  }

  function clearCurrentInputs(keepClass = true) {
    const classValue = keepClass ? (el.classSelect.value || "") : "";
    el.weeklyAim.value = "";
    el.childAppearance.value = "";
    el.events.value = "";
    el.parentSupport.value = "";
    el.childReflection.value = "";
    el.selfEvaluation.value = "";
    updateAllFixedTextCounters();

    for (let i = 0; i < 6; i++) {
      const els = getJournalRowElements(i);
      if (els.environment) els.environment.value = "";
      if (els.activity) els.activity.value = "";
      if (els.consideration) els.consideration.value = "";
      if (els.evaluation) els.evaluation.value = "";
      if (els.absenceStatus) els.absenceStatus.value = "";
    }

    if (!keepClass) {
      el.classSelect.value = "";
    } else {
      el.classSelect.value = classValue;
    }

    el.lastSavedView.textContent = "—";
    refreshTopLabels();
    updateAllDayBadges("unsaved");
  }

  function withSuppressedAutosave(fn) {
    suppressAutosave = true;
    try {
      return fn();
    } finally {
      suppressAutosave = false;
    }
  }


  function getServerBaseUrl() {
    return String(localStorage.getItem(SERVER_URL_STORAGE_KEY) || DEFAULT_SERVER_URL)
      .trim()
      .replace(/\/+$/, "");
  }

  function setSyncStatus(text) {
    if (el.syncStatusView) el.syncStatusView.textContent = text || "—";
  }

  function saveServerUrlSetting() {
    const value = String(el.serverApiUrl?.value || "").trim().replace(/\/+$/, "");
    if (!value) {
      alert("サーバーURLを入力してください。");
      return;
    }
    localStorage.setItem(SERVER_URL_STORAGE_KEY, value);
    setSyncStatus("接続先を保存しました");
  }

  function apiUrl(path, params = {}) {
    const url = new URL(path, getServerBaseUrl());
    Object.entries(params).forEach(([key, value]) => {
      if (value != null && value !== "") url.searchParams.set(key, value);
    });
    return url.toString();
  }

  function getClientId() {
    let id = localStorage.getItem(CLIENT_ID_STORAGE_KEY);
    if (!id) {
      id = `client_${Date.now()}_${Math.random().toString(16).slice(2)}`;
      localStorage.setItem(CLIENT_ID_STORAGE_KEY, id);
    }
    return id;
  }

  function getDeviceName() {
    const ua = navigator.userAgent || "";
    if (/Android/i.test(ua)) return "Android端末";
    if (/iPhone|iPad/i.test(ua)) return "iPhone/iPad";
    if (/Windows/i.test(ua)) return "Windows PC";
    return "端末";
  }

  function stopLockRenew() {
    if (lockRenewTimer) {
      clearInterval(lockRenewTimer);
      lockRenewTimer = null;
    }
  }

  function startLockRenew() {
    stopLockRenew();
    lockRenewTimer = setInterval(() => {
      if (currentLock) {
        acquireLock(currentLock.startDate, currentLock.classKey, true).catch(() => {});
      }
    }, LOCK_RENEW_INTERVAL_MS);
  }

  async function acquireLock(startDateIso, classKey, silent = false) {
    const response = await fetch(apiUrl("/api/lock"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        startDate: startDateIso,
        classKey,
        clientId: getClientId(),
        deviceName: getDeviceName(),
        token: currentLock && currentLock.startDate === startDateIso && currentLock.classKey === classKey ? currentLock.token : ""
      })
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.ok) {
      if (!silent) {
        currentLock = null;
        stopLockRenew();
      }
      return { ok: false, lockedBy: result.lockedBy || "別端末" };
    }

    currentLock = { startDate: startDateIso, classKey, token: result.token || "" };
    isReadOnlyMode = false;
    startLockRenew();
    return { ok: true };
  }

  async function releaseCurrentLock() {
    if (!currentLock) return;
    const lock = currentLock;
    currentLock = null;
    stopLockRenew();

    const payload = JSON.stringify({
      startDate: lock.startDate,
      classKey: lock.classKey,
      clientId: getClientId(),
      token: lock.token
    });

    try {
      if (navigator.sendBeacon) {
        navigator.sendBeacon(apiUrl("/api/unlock"), new Blob([payload], { type: "application/json" }));
      } else {
        await fetch(apiUrl("/api/unlock"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payload,
          keepalive: true
        });
      }
    } catch (_) {}
  }

  function applyDataToInputs(data) {
    el.weeklyAim.value = data.weeklyAim ?? "";
    el.childAppearance.value = data.childAppearance ?? "";
    el.events.value = data.events ?? "";

    const journal = Array.isArray(data.journal) ? data.journal : [];
    const slotDates = getJournalDateSlots(currentStartDateIso);
    for (let i = 0; i < 6; i++) {
      const row = journal[i] || {};
      const rowEls = getJournalRowElements(i);
      const isActiveSlot = Boolean(slotDates[i]);
      if (rowEls.environment) rowEls.environment.value = isActiveSlot ? (row.environment || "") : "";
      if (rowEls.activity) rowEls.activity.value = isActiveSlot ? (row.activity || "") : "";
      if (rowEls.consideration) rowEls.consideration.value = isActiveSlot ? (row.consideration || "") : "";
      if (rowEls.evaluation) rowEls.evaluation.value = isActiveSlot ? (row.evaluation || "") : "";
      if (rowEls.absenceStatus) rowEls.absenceStatus.value = isActiveSlot ? (row.absenceStatus || "") : "";
    }

    el.parentSupport.value = data.parentSupport ?? "";
    el.childReflection.value = data.childReflection ?? "";
    el.selfEvaluation.value = data.selfEvaluation ?? "";
    updateAllFixedTextCounters();
    el.lastSavedView.textContent = data.updatedAt || "—";
    if (el.weeklyAimSaveStatus) el.weeklyAimSaveStatus.dataset.saved = hasWeeklyAimText() ? "1" : "0";
    updateAllDayBadges("saved");
  }

  async function saveDataToServer(data) {
    if (!currentLock || isReadOnlyMode) {
      throw new Error("lock required");
    }

    const response = await fetch(apiUrl("/api/week"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Client-Id": getClientId(),
        "X-Lock-Token": currentLock.token || ""
      },
      body: JSON.stringify(data)
    });

    if (response.status === 423) {
      isReadOnlyMode = true;
      currentLock = null;
      stopLockRenew();
      setEditingEnabled(false);
      throw new Error("locked by another client");
    }

    if (!response.ok) throw new Error("server save failed");
    return response.json().catch(() => ({}));
  }

  async function loadDataFromServer(startDateIso, classKey) {
    const response = await fetch(apiUrl("/api/week", {
      startDate: startDateIso,
      classKey
    }), {
      method: "GET",
      cache: "no-store"
    });
    if (!response.ok) throw new Error("server load failed");
    const result = await response.json();
    return result && result.data ? result.data : null;
  }

  async function deleteDataFromServer(startDateIso, classKey) {
    const response = await fetch(apiUrl("/api/week", {
      startDate: startDateIso,
      classKey
    }), {
      method: "DELETE",
      headers: {
        "X-Client-Id": getClientId(),
        "X-Lock-Token": currentLock ? currentLock.token || "" : ""
      }
    });
    if (!response.ok) throw new Error("server delete failed");
  }

  async function getServerDataList() {
    const response = await fetch(apiUrl("/api/weeks"), {
      method: "GET",
      cache: "no-store"
    });
    if (!response.ok) throw new Error("server list failed");
    const result = await response.json();
    return Array.isArray(result.items) ? result.items : [];
  }

  async function saveAllDataToServer(items) {
    // server.js は /api/weeks の一括POSTを持たないため、
    // 各データを /api/week へ1件ずつ保存する。
    // 送信対象は、管理タブでチェックされているクラスの weekly_ データだけにする。
    const enabledSet = new Set(getEnabledClasses());
    const targetItems = items.filter((data) => data && data.startDate && data.classKey && enabledSet.has(data.classKey));

    for (const data of targetItems) {
      await saveDataToServer(data);
    }
    return { ok: true, count: targetItems.length };
  }

  async function pullListFromServerToLocal() {
    try {
      const items = await getServerDataList();
      const enabledSet = new Set(getEnabledClasses());
      const targetItems = items.filter((data) => data && data.startDate && data.classKey && enabledSet.has(data.classKey));

      // サーバーの一覧を正として、チェック済みクラスの週案キャッシュだけ作り直す。
      // 未チェッククラスの端末内データは触らない。
      const oldKeys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key || !key.startsWith(STORAGE_PREFIX)) continue;
        try {
          const data = JSON.parse(localStorage.getItem(key) || "{}");
          if (data && enabledSet.has(data.classKey)) oldKeys.push(key);
        } catch (_) {
          oldKeys.push(key);
        }
      }
      oldKeys.forEach((key) => localStorage.removeItem(key));

      targetItems.forEach((data) => {
        localStorage.setItem(makeStorageKey(data.startDate, data.classKey), JSON.stringify(data));
      });

      renderCalendar();
      setSyncStatus("同期完了");
      return { ok: true, count: targetItems.length };
    } catch (_) {
      setSyncStatus("サーバー未接続：端末内に一時保存");
      throw _;
    }
  }

  async function autosave() {
    if (suppressAutosave || isLoadingWeek) return;
    if (!currentStartDateIso) return;

    const classKey = el.classSelect.value || "";
    if (!classKey) {
      refreshTopLabels();
      return;
    }

    if (isReadOnlyMode || !currentLock) {
      setSyncStatus("閲覧モード：保存しません");
      return;
    }

    const data = collectData(currentStartDateIso);
    setSyncStatus("保存中...");

    try {
      await saveDataToServer(data);
      el.lastSavedView.textContent = data.updatedAt;
      setSyncStatus("保存完了");
      updateAllDayBadges("saved");
      await refreshServerWeeksCache();
      renderCalendar();
    } catch (error) {
      console.warn("週案保存エラー:", error);
      if (String(error && error.message || "").includes("locked")) {
        setSyncStatus("別端末が編集中：保存できません");
      } else {
        setSyncStatus("保存失敗");
      }
    }

    refreshTopLabels();
  }

  function flushAutosave() {
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
    if (suppressAutosave) return;
    try {
      autosave();
    } catch (_) {}
  }

  function scheduleAutosave() {
    if (suppressAutosave || isLoadingWeek) return;
    refreshTopLabels();
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
    saveTimer = setTimeout(() => {
      saveTimer = null;
      try {
        autosave();
      } catch (_) {}
    }, 1200);
  }

  function getStoredDataList() {
    return Array.isArray(serverWeeksCache) ? serverWeeksCache.slice() : [];
  }

  async function refreshServerWeeksCache() {
    try {
      serverWeeksCache = await getServerDataList();
    } catch (error) {
      console.warn("週案一覧読込エラー:", error);
      serverWeeksCache = [];
    }
    return serverWeeksCache;
  }

  function closeClassPicker(selectedClassKey) {
    const overlay = document.getElementById("classPickerOverlay");
    if (overlay) overlay.remove();
    const resolver = classPickerResolve;
    classPickerResolve = null;
    if (resolver) resolver(selectedClassKey || "");
  }

  function showClassPicker(startDateIso) {
    closeClassPicker("");

    return new Promise((resolve) => {
      classPickerResolve = resolve;

      const overlay = document.createElement("div");
      overlay.id = "classPickerOverlay";
      overlay.style.position = "fixed";
      overlay.style.inset = "0";
      overlay.style.background = "rgba(0,0,0,0.35)";
      overlay.style.display = "flex";
      overlay.style.alignItems = "center";
      overlay.style.justifyContent = "center";
      overlay.style.zIndex = "9999";

      const panel = document.createElement("div");
      panel.style.width = "min(92vw, 420px)";
      panel.style.background = "#fff";
      panel.style.borderRadius = "14px";
      panel.style.padding = "20px";
      panel.style.boxShadow = "0 10px 30px rgba(0,0,0,0.22)";

      const title = document.createElement("div");
      title.textContent = `${startDateIso} のクラスを選択`;
      title.style.fontWeight = "700";
      title.style.marginBottom = "14px";
      panel.appendChild(title);

      const list = document.createElement("div");
      list.style.display = "grid";
      list.style.gap = "10px";

      // クラス選択一覧は、管理タブでチェックONのクラスだけを出す。
      // ここで絞るのは「表示する選択肢」だけ。保存データのキーは変更しない。
      const enabledClasses = getEnabledClasses();

      if (enabledClasses.length === 0) {
        const empty = document.createElement("div");
        empty.textContent = "管理画面で表示するクラスにチェックを入れてください。";
        empty.style.padding = "12px 14px";
        empty.style.border = "1px solid #cfd8dc";
        empty.style.borderRadius = "10px";
        empty.style.background = "#fff";
        list.appendChild(empty);
      }

      enabledClasses.forEach((classKey) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.textContent = getClassLabel(classKey);
        btn.style.padding = "12px 14px";
        btn.style.border = "1px solid #cfd8dc";
        btn.style.borderRadius = "10px";
        btn.style.background = "#f8fafc";
        btn.style.cursor = "pointer";
        btn.addEventListener("click", () => closeClassPicker(classKey));
        list.appendChild(btn);
      });

      const cancelBtn = document.createElement("button");
      cancelBtn.type = "button";
      cancelBtn.textContent = "キャンセル";
      cancelBtn.style.marginTop = "14px";
      cancelBtn.style.padding = "12px 14px";
      cancelBtn.style.width = "100%";
      cancelBtn.style.border = "1px solid #cfd8dc";
      cancelBtn.style.borderRadius = "10px";
      cancelBtn.style.background = "#fff";
      cancelBtn.style.cursor = "pointer";
      cancelBtn.addEventListener("click", () => closeClassPicker(""));

      panel.appendChild(list);
      panel.appendChild(cancelBtn);
      overlay.appendChild(panel);
      overlay.addEventListener("click", (event) => {
        if (event.target === overlay) {
          closeClassPicker("");
        }
      });

      document.body.appendChild(overlay);
    });
  }

  async function loadWeek(startDateIso) {
    isLoadingWeek = true;
    suppressAutosave = true;

    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }

    await releaseCurrentLock();
    currentStartDateIso = startDateIso || "";
    currentLock = null;
    isReadOnlyMode = true;

    buildJournalRows(currentStartDateIso);
    refreshTopLabels();
    el.lastSavedView.textContent = "—";

    if (currentStartDateIso) {
      setCalendarMonthByIso(currentStartDateIso);
    }

    if (!currentStartDateIso) {
      clearCurrentInputs(false);
      setEditingEnabled(false);
      renderCalendar();
      suppressAutosave = false;
      isLoadingWeek = false;
      return;
    }

    const classKey = el.classSelect.value || "";
    if (!classKey) {
      clearCurrentInputs(true);
      setEditingEnabled(false);
      renderCalendar();
      suppressAutosave = false;
      isLoadingWeek = false;
      return;
    }

    try {
      setSyncStatus("サーバーから読込中...");
      const serverData = await loadDataFromServer(currentStartDateIso, classKey);
      if (serverData) {
        applyDataToInputs(serverData);
      } else {
        clearCurrentInputs(true);
      }
    } catch (error) {
      console.warn("週案読込エラー:", error);
      clearCurrentInputs(true);
      setSyncStatus("サーバー未接続：入力できません");
      setEditingEnabled(false);
      refreshTopLabels();
      renderCalendar();
      suppressAutosave = false;
      isLoadingWeek = false;
      return;
    }

    try {
      const lockResult = await acquireLock(currentStartDateIso, classKey);
      if (lockResult.ok) {
        isReadOnlyMode = false;
        setSyncStatus("編集できます");
      } else {
        isReadOnlyMode = true;
        setSyncStatus(`${lockResult.lockedBy || "別端末"}が編集中：閲覧のみ`);
      }
    } catch (error) {
      console.warn("ロック取得エラー:", error);
      isReadOnlyMode = true;
      setSyncStatus("ロック取得失敗：閲覧のみ");
    }

    setEditingEnabled(true);
    refreshTopLabels();
    renderCalendar();
    suppressAutosave = false;
    isLoadingWeek = false;
  }

  async function openWeekFromCalendar(startDateIso) {
    flushAutosave();

    const selectedClassKey = await showClassPicker(startDateIso);
    if (!selectedClassKey) return;

    withSuppressedAutosave(() => {
      el.classSelect.value = selectedClassKey;
    });

    await loadWeek(startDateIso);
    activateTab("main");
  }

  async function clearThisWeek() {
    if (!currentStartDateIso) {
      alert("カレンダーで週の開始日を先に選んでください。");
      return;
    }
    const classKey = el.classSelect.value || "";
    if (!classKey) {
      alert("先にクラスを選択してください。");
      return;
    }
    if (!confirm("この週のサーバー保存データを消去します。よろしいですか？")) return;

    try {
      await deleteDataFromServer(currentStartDateIso, classKey);
      withSuppressedAutosave(() => clearCurrentInputs(true));
      el.lastSavedView.textContent = "—";
      setSyncStatus("サーバーから削除しました");
      await refreshServerWeeksCache();
      renderCalendar();
    } catch (error) {
      console.warn("週案削除エラー:", error);
      alert("サーバーのデータを削除できませんでした。");
    }
  }

  function resetAppToInitialState(options = {}) {
    const skipFlush = Boolean(options.skipFlush);

    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }

    if (!skipFlush) {
      flushAutosave();
    }

    withSuppressedAutosave(() => {
      currentStartDateIso = "";
      buildJournalRows("");
      el.classSelect.value = "";
      clearCurrentInputs(false);
      el.restoreFileInput.value = "";
    });

    el.weekKeyView.textContent = "未設定";
    el.lastSavedView.textContent = "—";
    setEditingEnabled(false);
    activateTab("calendar");
    renderCalendar();
  }

  function deleteAllData() {
    const confirmed = window.prompt("初期化を実行するには「削除」と入力してください。", "");
    if (confirmed !== "削除") {
      alert("初期化を中止しました。");
      return;
    }

    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }

    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(STORAGE_PREFIX)) {
        keys.push(k);
      }
    }

    withSuppressedAutosave(() => {
      keys.forEach((k) => localStorage.removeItem(k));
      resetAppToInitialState({ skipFlush: true });
    });

    alert("初期化しました。必要ならバックアップCSVから復元してください。");
  }

  function csvEscape(v) {
    const s = String(v ?? "");
    if (/[",\n\r]/.test(s)) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  }

  function dataToBackupRow(data) {
    const row = {
      classKey: data.classKey ?? "",
      startDate: toSlashDate(data.startDate),
      weeklyAim: data.weeklyAim ?? "",
      childAppearance: data.childAppearance ?? "",
      events: data.events ?? "",
      parentSupport: data.parentSupport ?? "",
      childReflection: data.childReflection ?? "",
      selfEvaluation: data.selfEvaluation ?? ""
    };

    for (let i = 0; i < 6; i++) {
      row[`day${i}Date`] = toSlashDate(data.journal?.[i]?.dateIso ?? "");
      row[`day${i}Environment`] = data.journal?.[i]?.environment ?? "";
      row[`day${i}Activity`] = data.journal?.[i]?.activity ?? "";
      row[`day${i}Consideration`] = data.journal?.[i]?.consideration ?? "";
      row[`day${i}Evaluation`] = data.journal?.[i]?.evaluation ?? "";
      row[`day${i}AbsenceStatus`] = data.journal?.[i]?.absenceStatus ?? "";
    }

    return row;
  }

  function rowsToCsv(rows) {
    const lines = [];
    lines.push(BACKUP_HEADERS.map(csvEscape).join(","));
    rows.forEach((rowObj) => {
      lines.push(BACKUP_HEADERS.map((h) => csvEscape(rowObj[h] ?? "")).join(","));
    });
    return lines.join("\r\n");
  }

  function sortRowsByStartDate(rows) {
    rows.sort((a, b) => {
      const aIso = normalizeDateToISO(a.startDate);
      const bIso = normalizeDateToISO(b.startDate);
      if (aIso !== bIso) return aIso.localeCompare(bIso);
      return (a.classKey || "").localeCompare(b.classKey || "", "ja");
    });
    return rows;
  }

  async function backupAllData() {
    flushAutosave();

    const baseIso = currentStartDateIso || toISO(createLocalDate(calendarState.year, calendarState.month, 1));
    const fiscalYear = getFiscalYearFromIso(baseIso);
    const allData = (await getServerDataList()).filter((data) => getFiscalYearFromIso(data.startDate) === fiscalYear);

    const zip = new JSZip();

    classOrder.forEach((classKey) => {
      const rows = allData
        .filter((data) => data.classKey === classKey)
        .map((data) => dataToBackupRow(data));

      sortRowsByStartDate(rows);
      const csv = rowsToCsv(rows);
      zip.file(`weekly_${classKey}_${fiscalYear}.csv`, "\uFEFF" + csv);
    });

    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `weekly-plan_backup_${fiscalYear}.zip`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function parseCSV(text) {
    const rows = [];
    let row = [];
    let cell = "";
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (inQuotes) {
        if (ch === '"') {
          if (text[i + 1] === '"') {
            cell += '"';
            i += 1;
          } else {
            inQuotes = false;
          }
        } else {
          cell += ch;
        }
      } else {
        if (ch === '"') {
          inQuotes = true;
        } else if (ch === ",") {
          row.push(cell);
          cell = "";
        } else if (ch === "\n") {
          row.push(cell);
          rows.push(row);
          row = [];
          cell = "";
        } else if (ch === "\r") {
        } else {
          cell += ch;
        }
      }
    }

    if (cell.length > 0 || row.length > 0) {
      row.push(cell);
      rows.push(row);
    }

    return rows.filter((r) => !(r.length === 1 && r[0] === ""));
  }

  function rowToObject(headers, row) {
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = row[i] ?? "";
    });
    return obj;
  }

  function objectToStoredData(obj) {
    const classKey = String(obj.classKey || "").trim();
    const startDate = normalizeDateToISO(obj.startDate);
    if (!classKey || !startDate) return null;

    const slotDates = getJournalDateSlots(startDate);
    const journal = [];
    for (let i = 0; i < 6; i++) {
      const slotDateIso = slotDates[i] || "";
      const providedDateIso = normalizeDateToISO(obj[`day${i}Date`]);
      const dateIso = slotDateIso || providedDateIso || "";
      const dateObj = parseISODate(dateIso);
      journal.push({
        dateIso,
        datePretty: dateObj ? formatMDJpDow(dateObj) : "",
        environment: slotDateIso ? (obj[`day${i}Environment`] ?? "") : "",
        activity: slotDateIso ? (obj[`day${i}Activity`] ?? "") : "",
        consideration: slotDateIso ? (obj[`day${i}Consideration`] ?? "") : "",
        evaluation: slotDateIso ? (obj[`day${i}Evaluation`] ?? "") : "",
        absenceStatus: slotDateIso ? (obj[`day${i}AbsenceStatus`] ?? "") : ""
      });
    }

    return {
      classKey,
      startDate,
      weeklyAim: obj.weeklyAim || "",
      childAppearance: obj.childAppearance || "",
      events: obj.events || "",
      journal,
      parentSupport: obj.parentSupport || "",
      childReflection: obj.childReflection || "",
      selfEvaluation: obj.selfEvaluation || "",
      updatedAt: nowIso()
    };
  }

  function restoreFromCSVText(text) {
    const rows = parseCSV(text);
    if (!rows.length) return 0;

    const headers = rows[0].map((h) => String(h || "").trim().replace(/^\uFEFF/, ""));
    const missing = BACKUP_HEADERS.filter((h) => !headers.includes(h));
    if (missing.length) {
      throw new Error("復元用CSVの項目が不足しています。");
    }

    let count = 0;
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.every((v) => String(v || "").trim() === "")) continue;
      const obj = rowToObject(headers, row);
      const data = objectToStoredData(obj);
      if (!data) continue;
      saveDataToServer(data).catch(() => {});
      count += 1;
    }
    return count;
  }

  function decodeArrayBuffer(buffer, encoding) {
    try {
      return new TextDecoder(encoding).decode(buffer);
    } catch (_) {
      return "";
    }
  }

  function scoreJapaneseText(text) {
    if (!text) return -999999;
    let score = 0;
    if (text.includes("classKey")) score += 30;
    if (text.includes("startDate")) score += 30;
    if (text.includes("weeklyAim")) score += 30;
    if (text.includes("case1Text")) score += 30;

    const mojibakeMatches = text.match(/[�Ã¢ã¤æ¥œ]/g);
    if (mojibakeMatches) score -= mojibakeMatches.length * 2;

    const japaneseMatches = text.match(/[ぁ-んァ-ヶ一-龠]/g);
    if (japaneseMatches) score += japaneseMatches.length;

    return score;
  }

  function chooseDecodedCsvText(buffer) {
    const utf8Text = decodeArrayBuffer(buffer, "utf-8");
    const sjisText = decodeArrayBuffer(buffer, "shift_jis");
    return scoreJapaneseText(sjisText) > scoreJapaneseText(utf8Text) ? sjisText : utf8Text;
  }

  async function handleRestoreFile(file) {
    if (!file) return;
    const lowerName = String(file.name || "").toLowerCase();

    try {
      let count = 0;

      if (lowerName.endsWith(".zip")) {
        const arrayBuffer = await file.arrayBuffer();
        const zip = await JSZip.loadAsync(arrayBuffer);
        const csvEntries = Object.values(zip.files).filter((f) => !f.dir && f.name.toLowerCase().endsWith(".csv"));
        if (!csvEntries.length) {
          alert("ZIP内にCSVがありません。");
          el.restoreFileInput.value = "";
          return;
        }

        for (const entry of csvEntries) {
          const uint8 = await entry.async("uint8array");
          const text = chooseDecodedCsvText(uint8.buffer);
          count += restoreFromCSVText(text);
        }
      } else {
        const arrayBuffer = await file.arrayBuffer();
        const text = chooseDecodedCsvText(arrayBuffer);
        count += restoreFromCSVText(text);
      }

      if (currentStartDateIso) {
        loadWeek(currentStartDateIso);
      } else {
        renderCalendar();
      }
      alert(`復元完了：${count}件`);
    } catch (error) {
      alert(error && error.message ? error.message : "復元に失敗しました。");
    } finally {
      el.restoreFileInput.value = "";
    }
  }

  function hasAnyWeekContent(week) {
    if (!week) return false;
    if (String(week.weeklyAim || "").trim()) return true;
    if (String(week.childAppearance || "").trim()) return true;
    if (String(week.events || "").trim()) return true;
    if (String(week.parentSupport || "").trim()) return true;
    if (String(week.childReflection || "").trim()) return true;
    if (String(week.selfEvaluation || "").trim()) return true;

    const journal = Array.isArray(week.journal) ? week.journal : [];
    return journal.some((row) => {
      return String(row?.environment || "").trim()
        || String(row?.activity || "").trim()
        || String(row?.consideration || "").trim()
        || String(row?.evaluation || "").trim()
        || String(row?.absenceStatus || "").trim();
    });
  }

  function getMarksByDate() {
    const map = new Map();
    const appendMark = (dateIso, classKey) => {
      if (!dateIso || !classKey || !classMarks[classKey]) return;
      if (!isClassEnabled(classKey)) return;
      if (!map.has(dateIso)) map.set(dateIso, new Set());
      map.get(dateIso).add(classMarks[classKey]);
    };

    getStoredDataList().forEach((week) => {
      if (!week || !week.startDate || !week.classKey) return;

      // 週案データが1つでも入っていれば、週の開始日に「か」「の」等を表示する
      if (hasAnyWeekContent(week)) {
        appendMark(week.startDate, week.classKey);
      }

      // 日ごとの活動欄に入力がある場合は、その日にも従来通り表示する
      (Array.isArray(week.journal) ? week.journal : []).forEach((row) => {
        if (row && row.dateIso && String(row.activity || "").trim()) {
          appendMark(row.dateIso, week.classKey);
        }
      });
    });

    if (currentStartDateIso && el.classSelect.value) {
      const currentData = collectData(currentStartDateIso);
      if (hasAnyWeekContent(currentData)) {
        appendMark(currentData.startDate, currentData.classKey);
      }
      currentData.journal.forEach((row) => {
        if (row && row.dateIso && String(row.activity || "").trim()) {
          appendMark(row.dateIso, currentData.classKey);
        }
      });
    }

    return map;
  }

  function renderCalendar() {
    if (!Number.isInteger(calendarState.year) || !Number.isInteger(calendarState.month)) {
      const today = new Date();
      calendarState.year = today.getFullYear();
      calendarState.month = today.getMonth() + 1;
    }
    const year = calendarState.year;
    const month = calendarState.month;
    const firstDay = createLocalDate(year, month, 1);
    const firstDow = firstDay.getDay();
    const startDate = addDays(firstDay, -firstDow);
    const marksByDate = getMarksByDate();

    el.calendarTitle.textContent = `${year}年${month}月`;
    el.calendarGrid.innerHTML = "";

    for (let i = 0; i < 42; i++) {
      const cellDate = addDays(startDate, i);
      const cellIso = toISO(cellDate);
      const inCurrentMonth = cellDate.getMonth() + 1 === month;
      const selectable = isSelectableStartDate(cellDate);
      const isSelected = currentStartDateIso === cellIso;
      const marks = Array.from(marksByDate.get(cellIso) || []);
      marks.sort((a, b) => {
        const aIndex = classOrder.findIndex((key) => classMarks[key] === a);
        const bIndex = classOrder.findIndex((key) => classMarks[key] === b);
        return aIndex - bIndex;
      });

      const cell = document.createElement("div");
      cell.className = "calendarCell";
      if (!inCurrentMonth) cell.classList.add("otherMonth");
      if (isSelected) cell.classList.add("isSelected");

      let inner;
      if (selectable) {
        inner = document.createElement("button");
        inner.type = "button";
        inner.className = "calendarCellInner isMonday";
        inner.addEventListener("click", () => {
          openWeekFromCalendar(cellIso);
        });
      } else {
        inner = document.createElement("div");
        inner.className = "calendarCellInner";
      }

      const dayNum = document.createElement("div");
      dayNum.className = "calendarDayNum";
      dayNum.textContent = String(cellDate.getDate());
      inner.appendChild(dayNum);

      if (selectable) {
        const startMark = document.createElement("div");
        startMark.className = "calendarMondayMark";
        startMark.textContent = cellDate.getDay() === 1 ? "開始日" : "年度初日";
        inner.appendChild(startMark);
      }

      cell.appendChild(inner);

      const markRow = document.createElement("div");
      markRow.className = "calendarDotRow";
      marks.forEach((mark) => {
        const span = document.createElement("span");
        span.className = "calendarDot";
        span.textContent = mark;
        markRow.appendChild(span);
      });
      cell.appendChild(markRow);

      el.calendarGrid.appendChild(cell);
    }
  }

  function activateTab(tabName) {
    flushAutosave();

    const isMain = tabName === "main";
    const isCalendar = tabName === "calendar";
    const isPhrase = tabName === "phrase";
    const isManage = tabName === "manage";
    const isVersion = tabName === "version";

    if (el.tabMain) el.tabMain.classList.toggle("active", isMain);
    if (el.tabCalendar) el.tabCalendar.classList.toggle("active", isCalendar);
    if (el.tabPhrase) el.tabPhrase.classList.toggle("active", isPhrase);
    if (el.tabManage) el.tabManage.classList.toggle("active", isManage);
    if (el.tabVersion) el.tabVersion.classList.toggle("active", isVersion);

    if (el.tabMainBtn) el.tabMainBtn.classList.toggle("active", isMain);
    if (el.tabCalendarBtn) el.tabCalendarBtn.classList.toggle("active", isCalendar);
    if (el.tabPhraseBtn) el.tabPhraseBtn.classList.toggle("active", isPhrase);
    if (el.tabManageBtn) el.tabManageBtn.classList.toggle("active", isManage);
    if (el.tabVersionBtn) el.tabVersionBtn.classList.toggle("active", isVersion);

    if (isCalendar) {
      // サーバー上の最新データを読み直してカレンダーへ反映する。
      refreshServerWeeksCache().then(() => renderCalendar());
    }
    if (isPhrase) {
      renderTemplatePhraseList();
    }
    if (isVersion) {
      refreshLatestVersionInfo();
    }
  }


  async function fetchVersionJson(options = {}) {
    const url = options.noStore ? `./version.json?ts=${Date.now()}` : "./version.json";
    const response = await fetch(url, {
      cache: options.noStore ? "no-store" : "default"
    });
    if (!response.ok) {
      throw new Error("version.json を読み込めません。");
    }
    const json = await response.json();
    return String((json && json.version) || "").trim();
  }

  function updateVersionButtonState() {
    const canUpdate = !!latestVersion && !!currentVersion && latestVersion !== currentVersion;
    el.btnApplyUpdate.disabled = !canUpdate;
  }

  function reflectVersionViews() {
    el.currentVersionView.textContent = currentVersion || "—";
    if (!latestVersion || latestVersion === currentVersion) {
      el.latestVersionView.textContent = "最新です";
    } else {
      el.latestVersionView.textContent = latestVersion;
    }
    updateVersionButtonState();
  }

  async function refreshVersionViews() {
    currentVersion = String(localStorage.getItem(CURRENT_VERSION_STORAGE_KEY) || "").trim();

    if (!currentVersion) {
      try {
        const cache = await caches.open("weekly-plan-v10");
        const response = await cache.match("./version.json", { ignoreSearch: true }) || await cache.match("version.json", { ignoreSearch: true });
        if (response) {
          const json = await response.json();
          currentVersion = String((json && json.version) || "").trim();
        }
      } catch (_) {}

      if (currentVersion) {
        localStorage.setItem(CURRENT_VERSION_STORAGE_KEY, currentVersion);
      }
    }

    latestVersion = currentVersion;
    reflectVersionViews();
  }


  async function refreshLatestVersionInfo() {
    try {
      latestVersion = await fetchVersionJson({ noStore: true });
    } catch (_) {
      latestVersion = currentVersion;
    }
    reflectVersionViews();
  }

  function bindWaitingWorker(registration) {
    swRegistration = registration || null;
    updateVersionButtonState();
  }

  async function setupVersionManagement() {
    await refreshVersionViews();
    await refreshLatestVersionInfo();

    if (!("serviceWorker" in navigator)) {
      swRegistration = null;
      updateVersionButtonState();
      return;
    }

    try {
      swRegistration = await navigator.serviceWorker.register("./sw.js", { scope: "./" });
      await swRegistration.update().catch(() => {});
    } catch (error) {
      console.warn("Service Worker登録エラー:", error);
      swRegistration = null;
    }

    updateVersionButtonState();
  }

  async function waitForWaitingWorker(registration) {
    if (registration.waiting) return registration.waiting;

    return await new Promise((resolve) => {
      let settled = false;

      const finish = () => {
        if (settled) return;
        settled = true;
        resolve(registration.waiting || null);
      };

      const installingWorker = registration.installing;
      if (installingWorker) {
        installingWorker.addEventListener("statechange", () => {
          if (installingWorker.state === "installed") {
            finish();
          }
        });
      }

      registration.addEventListener("updatefound", () => {
        const worker = registration.installing;
        if (!worker) {
          finish();
          return;
        }
        worker.addEventListener("statechange", () => {
          if (worker.state === "installed") {
            finish();
          }
        });
      }, { once: true });

      setTimeout(finish, 8000);
    });
  }

  async function applyWaitingUpdate() {
    if (!swRegistration || el.btnApplyUpdate.disabled) return;

    el.btnApplyUpdate.disabled = true;

    try {
      try {
        latestVersion = await fetchVersionJson({ noStore: true });
      } catch (_) {}

      await swRegistration.update();
      bindWaitingWorker(swRegistration);

      const waitingWorker = await waitForWaitingWorker(swRegistration);
      if (!waitingWorker) {
        reflectVersionViews();
        return;
      }

      await new Promise((resolve) => {
        let done = false;
        const finish = () => {
          if (done) return;
          done = true;
          resolve();
        };

        navigator.serviceWorker.addEventListener("controllerchange", finish, { once: true });
        waitingWorker.postMessage({ type: "SKIP_WAITING" });
        setTimeout(finish, 8000);
      });

      if (latestVersion) {
        currentVersion = latestVersion;
        localStorage.setItem(CURRENT_VERSION_STORAGE_KEY, currentVersion);
      }

      window.location.reload();
    } catch (_) {
      reflectVersionViews();
    }
  }


  async function receiveCurrentWeekFromServer() {
    const enabledClasses = getEnabledClasses();
    if (enabledClasses.length === 0) {
      alert("管理タブで受信するクラスにチェックを入れてください。");
      return;
    }

    if (!confirm("チェック済みクラスのデータだけをサーバーからスマホに取り込みます。よろしいですか？")) return;

    try {
      setSyncStatus("受信中...");
      const result = await pullListFromServerToLocal();

      if (currentStartDateIso && el.classSelect.value) {
        const key = makeStorageKey(currentStartDateIso, el.classSelect.value || "");
        const raw = localStorage.getItem(key);
        if (raw) {
          const data = JSON.parse(raw);
          withSuppressedAutosave(() => applyDataToInputs(data));
        }
      }

      setSyncStatus("受信完了");
      alert(`チェック済みクラスのデータを受信しました。\n受信件数：${result.count}件`);
    } catch (_) {
      alert("受信できません。園内Wi-Fi接続とサーバーURLを確認してください。");
      setSyncStatus("受信失敗");
    }
  }

  async function sendCurrentWeekToServer() {
    flushAutosave();

    const enabledClasses = getEnabledClasses();
    if (enabledClasses.length === 0) {
      alert("管理タブで送信するクラスにチェックを入れてください。");
      return;
    }

    const localItems = getStoredDataList();
    const enabledSet = new Set(enabledClasses);
    const targetItems = localItems.filter((data) => data && data.startDate && data.classKey && enabledSet.has(data.classKey));
    if (targetItems.length === 0) {
      alert("チェック済みクラスの送信データがスマホ内にありません。");
      return;
    }

    if (!confirm("チェック済みクラスのデータだけを園内サーバーへ送信します。よろしいですか？")) return;

    try {
      setSyncStatus("送信中...");

      // 送信は「選択中の週」ではなく、チェック済みクラスの weekly_ データだけを送る。
      const result = await saveAllDataToServer(targetItems);

      setSyncStatus("送信完了");
      alert(`チェック済みクラスのデータを送信しました。\n送信件数：${result.count}件`);
    } catch (_) {
      alert("送信できません。園内Wi-Fi接続とサーバーURLを確認してください。");
      setSyncStatus("送信失敗");
    }
  }

  function moveCalendarMonth(diff) {
    let y = calendarState.year;
    let m = calendarState.month + diff;
    if (m <= 0) {
      y -= 1;
      m = 12;
    } else if (m >= 13) {
      y += 1;
      m = 1;
    }
    calendarState.year = y;
    calendarState.month = m;
    renderCalendar();
  }

  if (el.tabMainBtn) el.tabMainBtn.addEventListener("click", () => activateTab("main"));
  if (el.tabCalendarBtn) el.tabCalendarBtn.addEventListener("click", () => activateTab("calendar"));
  if (el.tabPhraseBtn) el.tabPhraseBtn.addEventListener("click", () => activateTab("phrase"));
  if (el.tabManageBtn) el.tabManageBtn.addEventListener("click", async () => { activateTab("manage"); await refreshVersionViews(); await refreshLatestVersionInfo(); });
  if (el.tabVersionBtn) el.tabVersionBtn.addEventListener("click", () => activateTab("version"));
  el.btnApplyUpdate.addEventListener("click", applyWaitingUpdate);
  el.btnPrevMonth.addEventListener("click", () => moveCalendarMonth(-1));
  el.btnNextMonth.addEventListener("click", () => moveCalendarMonth(1));
  
  
  
  
  if (el.btnAddTemplatePhrase) el.btnAddTemplatePhrase.addEventListener("click", addTemplatePhrase);
  if (el.btnExportTemplatePhrases) el.btnExportTemplatePhrases.addEventListener("click", exportTemplatePhrases);
  if (el.btnImportTemplatePhrases) el.btnImportTemplatePhrases.addEventListener("click", () => el.templatePhraseImportInput.click());
  if (el.templatePhraseImportInput) el.templatePhraseImportInput.addEventListener("change", async (event) => {
    const file = event.target.files && event.target.files[0];
    await importTemplatePhrases(file);
  });
  if (el.btnCloseTemplatePhrasePopup) el.btnCloseTemplatePhrasePopup.addEventListener("click", closeTemplatePhrasePopup);

  if (el.restoreFileInput) {
    el.restoreFileInput.addEventListener("change", async (event) => {
      const file = event.target.files && event.target.files[0];
      await handleRestoreFile(file);
    });
  }

  [
    el.weeklyAim,
    el.childAppearance,
    el.events,
    el.parentSupport,
    el.childReflection,
    el.selfEvaluation
  ].forEach((inp) => {
    inp.addEventListener("input", () => {
      if (inp === el.weeklyAim) markWeeklyAimUnsaved();
      updateAllFixedTextCounters();
      scheduleAutosave();
    });
    inp.addEventListener("change", () => {
      if (inp === el.weeklyAim) markWeeklyAimUnsaved();
      updateAllFixedTextCounters();
      scheduleAutosave();
    });
  });

  if (el.weeklyAimSaveStatus) {
    el.weeklyAimSaveStatus.addEventListener("click", manualSaveWeeklyAim);
  }

  el.classSelect.disabled = true;
  if (el.classSelect.options.length > 0) {
    el.classSelect.options[0].textContent = "クラス（カレンダーで選択）";
  }

  renderTemplatePhraseList();
  applyFixedTextLengthLimits();
  bindTemplatePhraseInputs();

  const initialToday = new Date();
  calendarState.year = initialToday.getFullYear();
  calendarState.month = initialToday.getMonth() + 1;

  renderClassFilter();
  buildJournalRows("");
  refreshTopLabels();
  loadWeek("");
  refreshServerWeeksCache().then(() => renderCalendar());
  activateTab("calendar");
  setEditingEnabled(false);
  window.addEventListener("load", () => {
    setupVersionManagement();
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      flushAutosave();
    }
  });

  window.addEventListener("pagehide", () => {
    flushAutosave();
  });

  window.addEventListener("beforeunload", () => {
    flushAutosave();
  });
})();