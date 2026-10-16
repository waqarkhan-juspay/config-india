(function(){
'use strict';

/* ======================================================================
   Data: Config India 2026, Day 2 (Thu Oct 15), from config.figma.com/india/agenda/?day=2
   ====================================================================== */
const D = window.AGENDA;            // data.js
const PH = window.SPEAKER_PHOTOS || {};   // data.js; speakers without one show initials

const LOC = {
  main:{name:'Main Stage', short:'Main Stage', hall:'Hall 5'},
  cafe:{name:'Cafe', short:'Cafe', hall:'Hall 4'},
  lcl:{name:'Leadership Collective Lounge', short:'LC Lounge', hall:'Hall 4'}
};
const THEME = {keynote:'Keynote', stage:'Main Stage', food:'Food & Beverage', connect:'Connect', lounge:'LC Lounge'};
const FILTERS = [['all','All'],['talks','Talks'],['main','Main Stage'],['cafe','Cafe']];

/* ---------- time (always IST, whatever the phone's zone) ---------- */
const IST = 330 * 60000;
const DAY0 = Date.UTC(2026, 9, 15) - IST;           // 00:00 IST, Oct 15
const hm = s => { const p = s.split(':'); return (+p[0]) * 60 + (+p[1]); };
const toMs = min => DAY0 + min * 60000;
const DOORS = hm(D.info[0].time);                    // 07:00
const DAY_END = hm('20:00');
// Once Day 2 is over, the app becomes a record of the agenda: nothing reads as finished or live
// unless you replay a moment with the time scrubber.
const ARCHIVE = Date.now() >= toMs(DAY_END);
let spFilter = 'all';                              // Speakers: which colour pill is on
let planEditOpen = false;                          // My plan: "Manage plan" panel open?
let simBase = null;                                // a previewed moment (frozen), or null for real time
function readSim(){
  const m = /^#t(\d{2})(\d{2})$/.exec(location.hash || '');
  if (m) simBase = toMs((+m[1]) * 60 + (+m[2]));
}
const now = () => simBase != null ? simBase : ARCHIVE ? DAY0 : Date.now();
const archived = () => ARCHIVE && simBase == null;
const nowMin = () => (now() - DAY0) / 60000;
function phase(t){ t = t == null ? now() : t; if (t < toMs(DOORS)) return 'before'; if (t >= toMs(DAY_END)) return 'after'; return 'during'; }

function f12(min){ min = Math.floor(min); let h = Math.floor(min / 60) % 24; const m = min % 60; const ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12; return {t: h + ':' + String(m).padStart(2, '0'), ap}; }
const fT = min => { const f = f12(min); return f.t + ' ' + f.ap; };
function fRange(a, b){ const A = f12(a), B = f12(b); return A.ap === B.ap ? A.t + ' – ' + B.t + ' ' + B.ap : A.t + ' ' + A.ap + ' – ' + B.t + ' ' + B.ap; }
function fDur(m){ m = Math.round(m); if (m < 60) return m + ' min'; const h = Math.floor(m / 60), r = m % 60; return r ? h + 'h ' + r + 'm' : h + 'h'; }
function fIn(ms){ const m = Math.max(0, Math.ceil(ms / 60000)); if (m < 1) return 'now'; if (m < 60) return m + ' min'; const h = Math.floor(m / 60), r = m % 60; if (h < 24) return r ? h + 'h ' + r + 'm' : h + 'h'; const d = Math.floor(h / 24); return d + 'd ' + (h % 24) + 'h'; }

/* ---------- items ---------- */
const ITEMS = D.items.map((x, i) => { const sm = hm(x.start), em = hm(x.end); return Object.assign({}, x, {i, sm, em, s: toMs(sm), e: toMs(em)}); });
const BY = {}; ITEMS.forEach(x => { BY[x.id] = x; });
const SP = D.speakers;
Object.keys(SP).forEach(k => { SP[k].items = []; });
ITEMS.forEach(x => (x.sp || []).forEach(k => SP[k].items.push(x.id)));
const SP_KEYS = Object.keys(SP).sort((a, b) => SP[a].name.localeCompare(SP[b].name));
const TALKS = ITEMS.filter(x => x.kind === 'talk');
const KEYNOTES = ITEMS.filter(x => x.theme === 'keynote');
const LC_N = ITEMS.filter(x => x.loc === 'lcl').length;
const THEME_ORDER = ['keynote', 'stage', 'lounge', 'food', 'connect'];
const SP_FILTERS = [['all', 'All'], ['stage', 'Main Stage'], ['keynote', 'Keynote'], ['lounge', 'LC Lounge']];

function inits(n){ const p = String(n).split(/\s+/).filter(Boolean); return ((p[0] || '?')[0] + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase(); }
function av(k, size, cls){ const s = SP[k]; const th = BY[s.items[0]].theme; return '<span class="av t-' + th + (PH[k] ? ' ph' : '') + (cls ? ' ' + cls : '') + '"' + (PH[k] ? ' data-k="' + k + '"' : '') + ' style="--s:' + size + 'px" aria-hidden="true">' + esc(inits(s.name)) + '</span>'; }
// Photos are defined once as CSS backgrounds, so re-renders never copy the image data
if (Object.keys(PH).length){ const st = document.createElement('style'); st.textContent = Object.keys(PH).filter(k => SP[k]).map(k => '.av[data-k="' + k + '"]{background-image:url(' + PH[k] + ')}').join('\n'); (document.head || document.documentElement).appendChild(st); }
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
// Show an eyebrow only when the title doesn't already say it ("Figma product keynote" needs no "Opening keynote").
const eyeOf = it => it.eyebrow && it.title.toLowerCase().indexOf(it.eyebrow.split(' ').pop().toLowerCase()) < 0 ? it.eyebrow : '';
// Plain "Main Stage Hall 5" text for cards and rows; LC places get the lock.
const whereHTML = it => '<span class="mi loc">' + LOC[it.loc].short + ' <span class="hall">' + LOC[it.loc].hall + '</span>' + lockIC(it) + '</span>';
// Keynote cards always say which keynote it is ("Opening keynote" even though the title says keynote).
const cardEye = it => it.theme === 'keynote' && it.eyebrow ? it.eyebrow : eyeOf(it);
const fullTitle = it => eyeOf(it) ? eyeOf(it) + ': ' + it.title : it.title;
// Where the room is on screen, LC events drop their "Leadership Collective" prefix.
const ctxTitle = it => { if (it.loc !== 'lcl' || it.kind !== 'event') return it.title; const t = it.title.replace(/^Leadership Collective\s+/i, ''); return t === 'Lounge' ? 'Lounge open' : t.charAt(0).toUpperCase() + t.slice(1); };
const lockIC = it => it.loc === 'lcl' ? '<span class="lock">' + svg('lock') + '</span>' : '';
const dot = t => /[….!?]$/.test(t) ? t : t + '.';   // no "…." after a cut title
const shortTitle = (it, n) => { n = n || 46; const t = it.title; return t.length > n ? t.slice(0, n - 1).replace(/[\s,:;]+\S*$/, '') + '…' : t; };
const spNames = it => (it.sp || []).map(k => SP[k].name);
const joinNames = a => a.length <= 1 ? (a[0] || '') : a.length === 2 ? a[0] + ' and ' + a[1] : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1];
const overlaps = (a, b) => a.s < b.e && b.s < a.e;
const isLive = (it, t) => t >= it.s && t < it.e;
const isPast = (it, t) => t >= it.e;
function evIcon(it){ const t = it.title.toLowerCase(); if (/tea/.test(t)) return 'cup'; if (/reception/.test(t)) return 'glass'; if (/lounge/.test(t)) return 'sofa'; return 'fork'; }

/* ---------- icons ---------- */
const IC = {
  share:'<path d="M12 3.8v11"/><path d="M8 7.6l4-3.8 4 3.8"/><path d="M5.5 12.5v5.2a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-5.2"/>',
  chat:'<path d="M4.6 19.4l1.3-3.7a7.6 7.6 0 1 1 2.8 2.6z"/>',
  link:'<path d="M10.2 13.8a3.8 3.8 0 0 0 5.4 0l2.7-2.7a3.8 3.8 0 0 0-5.4-5.4l-1 1"/><path d="M13.8 10.2a3.8 3.8 0 0 0-5.4 0l-2.7 2.7a3.8 3.8 0 0 0 5.4 5.4l1-1"/>',
  sliders:'<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
  search:'<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.2 4.2"/>',
  chev:'<path d="M9.5 5.5L16 12l-6.5 6.5"/>',
  ext:'<path d="M8 16L16 8M9.5 8H16v6.5"/>',
  cup:'<path d="M5 9.5h11v4.3a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5V9.5z"/><path d="M16 11h1.4a2.4 2.4 0 0 1 0 4.8H16"/><path d="M8.6 3.6c0 1.4 1.4 1.5 1.4 3M12 3.6c0 1.4 1.4 1.5 1.4 3"/>',
  fork:'<path d="M7 3.5v6.2a2 2 0 0 0 2 2v8.8M11 3.5v6.2a2 2 0 0 1-2 2M9 3.5v5.5"/><path d="M17.5 20.5v-17c-2.2 1.4-3.3 3.9-3.3 7v3.4h3.3"/>',
  glass:'<path d="M7 3.8h10l-.9 5.6a4.1 4.1 0 0 1-8.2 0L7 3.8z"/><path d="M12 13.6v6.4M8.6 20.4h6.8"/>',
  sofa:'<path d="M5 10.5V8.3A2.8 2.8 0 0 1 7.8 5.5h8.4A2.8 2.8 0 0 1 19 8.3v2.2"/><path d="M3.2 12.3a1.9 1.9 0 0 1 3.8 0v1.9h10v-1.9a1.9 1.9 0 0 1 3.8 0v4.9H3.2v-4.9z"/><path d="M5.5 17.2v2.3M18.5 17.2v2.3"/>',
  badge:'<rect x="6" y="3.6" width="12" height="17" rx="2.6"/><path d="M10.3 3.6V2M13.7 3.6V2"/><circle cx="12" cy="10.2" r="2.2"/><path d="M8.9 15.6c.6-1.4 1.7-2.1 3.1-2.1s2.5.7 3.1 2.1"/>',
  live:'<circle cx="12" cy="12" r="1.9"/><path d="M8.6 15.4a4.8 4.8 0 0 1 0-6.8M15.4 8.6a4.8 4.8 0 0 1 0 6.8M5.8 18.2a8.8 8.8 0 0 1 0-12.4M18.2 5.8a8.8 8.8 0 0 1 0 12.4"/>',
  door:'<path d="M5 20.5h14M7 20.5V4.6A1.1 1.1 0 0 1 8.1 3.5h7.8A1.1 1.1 0 0 1 17 4.6v15.9"/><path d="M14 12.2v.1"/>',
  pin:'<path d="M12 21s-6.6-5.7-6.6-11.1a6.6 6.6 0 0 1 13.2 0C18.6 15.3 12 21 12 21z"/><circle cx="12" cy="9.9" r="2.4"/>',
  clock:'<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  warn:'<path d="M12 4.2l8.6 15.3H3.4L12 4.2z"/><path d="M12 10v4.3M12 17.2v.1"/>',
  copy:'<rect x="8.5" y="8.5" width="11" height="11" rx="2.6"/><path d="M15.5 8.5V6.3a2 2 0 0 0-2-2H6.3a2 2 0 0 0-2 2v7.2a2 2 0 0 0 2 2h2.2"/>',
  users:'<circle cx="9" cy="8.5" r="3.6"/><path d="M2.6 20c.8-3.6 3.3-5.6 6.4-5.6s5.6 2 6.4 5.6"/><path d="M15.6 5.1a3.6 3.6 0 0 1 0 6.8M17.6 14.7c1.9.7 3.2 2.4 3.8 5.3"/>',
  cal:'<rect x="3.5" y="5" width="17" height="15.5" rx="3.2"/><path d="M3.5 9.8h17M8 3v4M16 3v4M12 12.8v5M9.5 15.3h5"/>',
  check:'<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  lock:'<rect x="5.5" y="10.5" width="13" height="10" rx="2.4"/><path d="M8.5 10.5V7.8a3.5 3.5 0 0 1 7 0v2.7"/>',
  plus:'<path d="M12 5.5v13M5.5 12h13"/>',
  sync:'<path d="M19.5 12a7.5 7.5 0 0 1-12.8 5.3M4.5 12a7.5 7.5 0 0 1 12.8-5.3"/><path d="M17.5 3v3.8h-3.8M6.5 21v-3.8h3.8"/>',
  trash:'<path d="M4.5 7h15M10 4h4M6.5 7l.9 12.2a1.5 1.5 0 0 0 1.5 1.3h6.2a1.5 1.5 0 0 0 1.5-1.3L17.5 7"/>'
};
const svg = (n, cls) => '<svg class="ic' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" aria-hidden="true">' + IC[n] + '</svg>';

/* ======================================================================
   State: kept in this browser for the day; nothing is sent anywhere.
   ====================================================================== */
const STORE = 'config-india-2026-day2';
const EXPIRES = Date.UTC(2026, 9, 16, 18, 30);      // end of Fri Oct 16, IST
const S = {picks: new Set(), friends: [], filter: 'all', updated: 0, tab: 'schedule', storage: 'local', done: {schedule: false, plan: false}, showLC: true, me: ''};
let memCopy = null;

function loadState(){
  let d = null;
  try { const raw = localStorage.getItem(STORE); d = raw ? JSON.parse(raw) : null; }
  catch (e) { S.storage = 'memory'; d = memCopy; }
  if (d && d.v !== 1) { try { localStorage.removeItem(STORE); } catch (e) {} d = null; }
  if (!d) return;
  applyDoc(d);
  if (FILTERS.some(f => f[0] === d.filter)) S.filter = d.filter;
  if (d.done && typeof d.done === 'object') S.done = {schedule: !!d.done.schedule, plan: !!d.done.plan};
  S.showLC = d.showLC == null ? true : !!d.showLC;
  // The archive shows LC to everyone once (during the event it was off by default); after that, the visitor's own toggle wins.
  if (ARCHIVE && !d.lcArchive) S.showLC = true;
  S.me = String(d.me || '').replace(/\s+/g, ' ').trim().slice(0, 24);
  if (!S.showLC && S.filter === 'lcl') S.filter = 'all';
}
function applyDoc(d){
  S.picks = new Set((Array.isArray(d.picks) ? d.picks : []).filter(id => BY[id]));
  S.friends = (Array.isArray(d.friends) ? d.friends : []).map(f => ({name: cleanName(f && f.name), code: String(f && f.code || ''), ids: decodePlan(f && f.code)})).filter(f => f.ids).slice(0, 8);
  S.updated = +d.updated || 0;
}
function saveState(touch){
  if (touch) S.updated = Date.now();
  const d = {v: 1, picks: Array.from(S.picks), friends: S.friends.map(f => ({name: f.name, code: f.code})), filter: S.filter, done: S.done, showLC: S.showLC, lcArchive: ARCHIVE, me: S.me, updated: S.updated, expires: EXPIRES};
  memCopy = d;
  try { localStorage.setItem(STORE, JSON.stringify(d)); S.storage = 'local'; } catch (e) { S.storage = 'memory'; }
}
const cleanName = n => (String(n || '').replace(/\s+/g, ' ').trim().slice(0, 24)) || 'Friend';

/* ---------- plan codes (friends compare plans without any server) ---------- */
const A36 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
function chk(body){ let s = 0; for (let k = 0; k < body.length; k++) s += (A36.indexOf(body[k]) + 1) * (k + 3); return A36[s % 36]; }
function encodePlan(ids){
  let n = 0n; ids.forEach(id => { const it = BY[id]; if (it) n |= (1n << BigInt(it.i)); });
  const body = n.toString(36).toUpperCase();
  return 'CI2-' + body + chk(body);
}
function decodePlan(text){
  const m = /CI2[-\s]?([0-9A-Z]{2,})/.exec(String(text || '').toUpperCase());
  if (!m) return null;
  const body = m[1].slice(0, -1), c = m[1].slice(-1);
  if (chk(body) !== c) return null;
  let n = 0n; for (const ch of body) n = n * 36n + BigInt(A36.indexOf(ch));
  if (n >> BigInt(ITEMS.length)) return null;
  return ITEMS.filter(it => (n >> BigInt(it.i)) & 1n).map(it => it.id);
}
const friendColor = i => 'var(--pal-' + ((i % 6) + 1) + ')';
const initial = n => (Array.from(n.trim())[0] || '?').toUpperCase();
function friendsOn(id){ return S.friends.map((f, i) => ({f, i})).filter(x => x.f.ids.indexOf(id) >= 0); }

/* ---------- derived ---------- */
// Leadership Collective is invite-only, so its items stay hidden unless the viewer switches them on.
const lcOK = it => S.showLC || it.loc !== 'lcl';
const vis = it => lcOK(it) || S.picks.has(it.id);           // your own picks always count
const spOK = k => S.showLC || SP[k].items.some(id => BY[id].loc !== 'lcl');
function lcToggleHTML(sub, tag){
  tag = tag || 'div';
  return '<' + tag + ' class="lc-wrap"><button class="lc-toggle" type="button" role="switch" aria-checked="' + S.showLC + '" data-act="lc">' +
    '<span class="lc-ic">' + svg('badge') + '</span><span class="lc-text"><b>Show LC items</b><span>' + esc(sub) + '</span></span><span class="switch" aria-hidden="true"><i></i></span></button></' + tag + '>';
}
const picked = () => ITEMS.filter(it => S.picks.has(it.id));
function clashesFor(it, list){
  if (it.kind !== 'talk') return [];
  return (list || picked()).filter(o => o.id !== it.id && o.kind === 'talk' && overlaps(o, it));
}

/* ======================================================================
   Rendering
   ====================================================================== */
const V = {schedule: $('#v-schedule'), plan: $('#v-plan'), speakers: $('#v-speakers'), info: $('#v-info')};
const TITLES = {schedule: 'Thu, Oct 15', plan: 'My plan', speakers: 'Speakers', info: 'Venue & info'};

function addBtn(it, cls){
  const on = S.picks.has(it.id);
  return '<button class="add' + (on ? ' on' : '') + (cls ? ' ' + cls : '') + '" type="button" data-toggle="' + it.id + '" aria-pressed="' + on + '" aria-label="' + (on ? 'Remove from my plan: ' : 'Add to my plan: ') + esc(fullTitle(it)) + '">' +
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path class="pl" d="M12 5.5v13M5.5 12h13"/><path class="ck" d="M5 12.5l4.5 4.5L19 7.5"/></svg></button>';
}
function palsHTML(id){
  const fs = friendsOn(id); if (!fs.length) return '';
  const names = fs.map(x => x.f.name);
  return '<div class="pals"><span class="pals-dots">' + fs.slice(0, 4).map(x => '<span class="pal" style="--pc:' + friendColor(x.i) + '">' + esc(initial(x.f.name)) + '</span>').join('') + '</span><span>' + esc(joinNames(names)) + (names.length > 1 ? ' are' : ' is') + ' going</span></div>';
}
function progPct(it, t){ return Math.max(0, Math.min(100, (t - it.s) / (it.e - it.s) * 100)).toFixed(1); }

function talkCard(it, ctx){
  const t = now(), live = isLive(it, t), past = isPast(it, t), on = S.picks.has(it.id);
  const L = LOC[it.loc];
  const names = spNames(it);
  const startsIn = it.s - t;
  let status = '';
  if (live) status = '<span class="pill live"><i></i>Live</span>';
  else if (!past && startsIn > 0 && startsIn <= 30 * 60000 && phase(t) === 'during') status = '<span class="pill soon" data-in="' + it.id + '" data-pre="In ">In ' + fIn(startsIn) + '</span>';
  const clash = ctx && ctx.clash && ctx.clash.length ? '<p class="note warn">' + svg('warn') + '<span>Overlaps with ' + esc(shortTitle(ctx.clash[0], 52)) + ' (' + fT(ctx.clash[0].sm) + ')' + (ctx.clash.length > 1 ? ' and ' + (ctx.clash.length - 1) + ' more' : '') + '</span></p>' : '';
  return '<article class="card t-' + it.theme + (on ? ' is-picked' : '') + (live ? ' is-live' : '') + (past ? ' is-past' : '') + '" data-id="' + it.id + '">' +
    '<button class="hit" type="button" data-open="' + it.id + '" aria-label="' + esc(fullTitle(it)) + ', ' + fRange(it.sm, it.em) + ', ' + L.name + (it.loc === 'lcl' ? ', invite-only' : '') + '. Open details"></button>' +
    '<div class="card-head">' + (cardEye(it) ? '<p class="card-eyebrow">' + esc(cardEye(it)) + '</p>' : '') + '<h3 class="card-title">' + esc(it.title) + '</h3></div>' +
    (names.length ? '<div class="who"><span class="faces">' + it.sp.slice(0, 3).map(k => av(k, 26)).join('') + '</span><span class="who-names"><i class="cdot" aria-hidden="true"></i>' + esc(names.join(', ')) + '</span></div>' : '') +
    '<p class="card-meta">' + status + '<span class="mi">' + fRange(it.sm, it.em) + '</span>' + whereHTML(it) + '</p>' +
    palsHTML(it.id) + clash +
    (live ? '<div class="prog"><i data-prog="' + it.id + '" style="--p:' + progPct(it, t) + '%"></i></div>' : '') +
    addBtn(it) + '</article>';
}
function eventCard(it){
  const t = now(), live = isLive(it, t), past = isPast(it, t), on = S.picks.has(it.id);
  const L = LOC[it.loc];
  return '<article class="ev t-' + it.theme + (on ? ' is-picked' : '') + (live ? ' is-live' : '') + (past ? ' is-past' : '') + '" data-id="' + it.id + '">' +
    '<button class="hit" type="button" data-open="' + it.id + '" aria-label="' + esc(it.title) + ', ' + fRange(it.sm, it.em) + ', ' + L.name + (it.loc === 'lcl' ? ', invite-only' : '') + '. Open details"></button>' +
    '<span class="ev-ico">' + svg(evIcon(it)) + '</span>' +
    '<div><p class="ev-title">' + esc(ctxTitle(it)) + '</p><p class="ev-meta">' + (live ? '<span class="pill live"><i></i>Now</span>' : '') + '<span class="mi">' + fRange(it.sm, it.em) + '</span>' + whereHTML(it) + '</p>' + palsHTML(it.id) + '</div>' +
    addBtn(it) + '</article>';
}
const itemHTML = (it, ctx) => it.kind === 'talk' ? talkCard(it, ctx) : eventCard(it);

function groupBy(list){
  const g = [];
  list.forEach(it => { const last = g[g.length - 1]; if (last && last.sm === it.sm) last.items.push(it); else g.push({sm: it.sm, items: [it]}); });
  return g;
}
function slotHTML(g, ctxFn){
  const f = f12(g.sm), t = now();
  const allPast = g.items.every(it => isPast(it, t));
  return '<li class="slot' + (allPast ? ' is-past' : '') + '"><div class="slot-time" aria-hidden="true"><b>' + f.t + '</b><small>' + f.ap + '</small></div><div class="slot-items">' + g.items.map(it => itemHTML(it, ctxFn ? ctxFn(it) : null)).join('') + '</div></li>';
}
function infoRowHTML(inf){ const f = f12(hm(inf.time)); return '<li class="info-row"><div class="slot-time" aria-hidden="true"><b>' + f.t + '</b><small>' + f.ap + '</small></div><p>' + svg('badge') + esc(inf.text.replace(' | ', ' · ')) + '</p></li>'; }
// Finished items fold into one "Completed" row at the top of a timeline.
function doneHTML(view, rows, items){
  if (!items.length) return '';
  const open = !!S.done[view], n = items.length;
  const a = Math.min.apply(null, items.map(i => i.sm)), b = Math.max.apply(null, items.map(i => i.em));
  return '<li class="done' + (open ? ' open' : '') + '"><button class="done-head" type="button" data-act="done" data-view="' + view + '" aria-expanded="' + open + '" aria-controls="done-' + view + '">' +
    '<span class="done-ic">' + svg('check') + '</span><span class="done-label"><b>Completed</b><span>' + n + ' · ' + fRange(a, b) + '</span></span>' + svg('chev', 'done-chev') + '</button>' +
    '<div class="done-body" id="done-' + view + '"' + (open ? '' : ' inert') + '><div class="done-in"><ol class="tl done-tl" aria-label="Completed">' + rows.map(r => r.html).join('') + '</ol></div></div></li>';
}
const allDoneHTML = msg => '<li class="all-done">' + svg('check') + msg + '</li>';
const bySm = (a, b) => a.sm - b.sm;
function nowRowHTML(){ return '<li class="now-row" aria-hidden="true"><span class="now-label">' + f12(nowMin()).t + '</span><i></i></li>'; }
function withNowRow(rows){
  if (phase() !== 'during') return rows;
  const nm = nowMin(); let k = rows.findIndex(r => r.sm > nm); if (k < 0) k = rows.length;
  rows.splice(k, 0, {sm: nm, html: nowRowHTML()});
  return rows;
}

/* ---------- status badge ---------- */
function bigCount(ms){
  const m = Math.max(0, Math.ceil(ms / 60000)), h = Math.floor(m / 60), r = m % 60;
  if (h >= 24) { const d = Math.floor(h / 24); return d + '<small>d</small> ' + (h % 24) + '<small>h</small>'; }
  if (h > 0) return h + '<small>h</small> ' + String(r).padStart(2, '0') + '<small>m</small>';
  return r + '<small>min</small>';
}
function choose(list){
  return list.find(i => S.picks.has(i.id) && i.kind === 'talk') || list.find(i => i.kind === 'talk' && i.loc === 'main') || list.find(i => i.kind === 'talk') ||
         list.find(i => S.picks.has(i.id)) || list.find(i => i.loc !== 'lcl') || list[0];
}
// Minimal status card: one label line, one big line, at most one "next" line.
function renderStatus(){
  const el = $('#status'); if (!el) return;
  const t = now(), ph = phase(t);
  const head = (l, r) => '<span class="b-head"><span>' + l + '</span><span class="r">' + (r || '') + '</span></span>';
  const where = it => LOC[it.loc].short + ' <span class="b-hall">' + LOC[it.loc].hall + '</span>';
  const more = '<span class="b-more">More details' + svg('chev') + '</span>';
  const who = it => '<span class="who b-who t-' + it.theme + '">' + (it.sp && it.sp.length ? '<span class="faces">' + it.sp.slice(0, 3).map(k => av(k, 24)).join('') + '</span><span class="who-names">' + '<i class="cdot" aria-hidden="true"></i>' + esc(spNames(it).join(', ')) + ' <span class="b-sep">·</span> ' + where(it) + '</span>' : '<span class="who-names"><i class="cdot" aria-hidden="true"></i>' + where(it) + '</span>') + '</span>';
  const next = (it, label) => it ? '<button class="b-next" type="button" data-open="' + it.id + '"><span class="b-k">' + label + '</span><span class="b-v">' + esc(it.title) + '</span><span class="b-k">' + f12(it.sm).t + '</span></button>' : '';
  let h = '';
  if (archived()){
    const talks = ITEMS.filter(i => i.kind === 'talk' && lcOK(i));
    const speakers = new Set([].concat.apply([], talks.map(i => i.sp || []))).size;
    h = head('Config India 2026', 'Thu, Oct 15, 2026') +
        '<span class="b-title">That’s a wrap on Day 2.</span>' +
        '<span class="b-sub">' + talks.length + ' talks · ' + speakers + ' speakers · BIEC, Bengaluru</span>' +
        '<button class="b-replay" type="button" data-act="replay">' + svg('clock') + 'Replay the day</button>';
  } else if (ph === 'before'){
    const mine = picked(), first = mine.find(i => i.kind === 'talk') || mine[0];
    h = head('Doors open in') +
        '<span class="b-big" aria-label="Doors open in ' + fIn(toMs(DOORS) - t) + '">' + bigCount(toMs(DOORS) - t) + '</span>' +
        next(first || KEYNOTES[0], first ? 'First' : 'Keynote');
  } else if (ph === 'during'){
    const cur = choose(ITEMS.filter(i => isLive(i, t) && vis(i)));
    const up = ITEMS.filter(i => i.s > t && vis(i));
    const nextTalk = up.find(i => i.kind === 'talk' && i.loc === 'main') || up.find(i => i.kind === 'talk');
    if (cur){
      h = '<button class="b-now" type="button" data-open="' + cur.id + '">' + head('<span class="b-live"><i></i>Now</span>', more) +
          '<span class="b-title">' + esc(ctxTitle(cur)) + '</span>' + who(cur) +
          '<span class="b-foot"><span class="b-prog"><i data-prog="' + cur.id + '" style="--p:' + progPct(cur, t) + '%"></i></span><span class="b-left" data-left="' + cur.id + '">' + fIn(cur.e - t) + ' left</span></span></button>';
    } else if (nextTalk){
      h = '<button class="b-now" type="button" data-open="' + nextTalk.id + '">' + head('Up next', more) +
          '<span class="b-title">' + esc(nextTalk.title) + '</span>' + who(nextTalk) +
          '<span class="b-foot"><span class="b-left" data-in="' + nextTalk.id + '" data-pre="Starts in ">Starts in ' + fIn(nextTalk.s - t) + '</span></span></button>';
    } else {
      h = head('Config India') + '<span class="b-title">That was the last talk.</span>';
    }
  } else {
    h = head('Config India 2026') + '<span class="b-title">That’s a wrap.</span>';
  }
  el.innerHTML = h;
}

/* ---------- schedule ---------- */
function renderSchedule(){
  const v = V.schedule;
  if (!v.firstChild){
    v.innerHTML = '<h1 class="sr">Schedule, Thursday Oct 15</h1>' +
      '<div class="badge" id="status"></div>' +
      '<div class="chips-wrap" id="chipsWrap"><div class="chips" id="chips" role="group" aria-label="Filter the schedule"></div>' +
      '<button class="lc-chip" id="lcChip" type="button" role="switch" aria-checked="false" data-act="lc" aria-label="Show the ' + LC_N + ' LC items (Leadership Collective, invite-only)" title="Leadership Collective (invite-only)"><span class="cdots lc-dot" aria-hidden="true"><i class="t-lounge"></i></span>LC<span class="n">' + LC_N + '</span><span class="mini-switch" aria-hidden="true"><i></i></span></button></div>' +
      '<ol class="tl" id="tl" aria-label="Sessions in time order"></ol>' +
      '<p class="foot">Unofficial community project. Not affiliated with Figma.</p>';
  }
  renderStatus();
  $('#lcChip').setAttribute('aria-checked', S.showLC);
  // Drop a chip that would show exactly what an earlier one shows (with LC hidden, every talk is on the Main Stage).
  const seen = new Map(); let on = S.filter;
  $('#chips').innerHTML = FILTERS.map(f => {
    const its = ITEMS.filter(it => lcOK(it) && matches(it, f[0])), key = its.map(it => it.id).join();
    if (seen.has(key)){ if (on === f[0]) on = seen.get(key); return ''; }
    seen.set(key, f[0]);
    // the colours of the cards this chip shows ("All" is everything, so no dots)
    const th = f[0] === 'all' ? [] : THEME_ORDER.filter(x => its.some(it => it.theme === x));
    return {f, n: its.length, th};
  }).filter(Boolean).map(({f, n, th}) => '<button class="chip" type="button" data-filter="' + f[0] + '" aria-pressed="' + (on === f[0]) + '">' + (th.length ? '<span class="cdots" aria-hidden="true">' + th.map(x => '<i class="t-' + x + '"></i>').join('') + '</span>' : '') + f[1] + '<span class="n">' + n + '</span></button>').join('');
  const t = now();
  const list = ITEMS.filter(it => lcOK(it) && matches(it, S.filter));
  // after the event there's no "Completed" fold, even while replaying: the day stays laid out in full
  const done = ARCHIVE ? [] : list.filter(it => isPast(it, t)), rest = ARCHIVE ? list : list.filter(it => !isPast(it, t));
  let rows = groupBy(rest).map(g => ({sm: g.sm, html: slotHTML(g)}));
  const doneRows = groupBy(done).map(g => ({sm: g.sm, html: slotHTML(g)}));
  D.info.forEach(inf => (done.length ? doneRows : rows).push({sm: hm(inf.time) - 0.5, html: infoRowHTML(inf)}));
  rows.sort(bySm); doneRows.sort(bySm);
  rows = withNowRow(rows);
  $('#tl').innerHTML = doneHTML('schedule', doneRows, done) + rows.map(r => r.html).join('') +
    (!rest.length && done.length ? allDoneHTML(S.filter === 'all' ? 'That’s everything for today.' : 'Everything in this filter has finished.') : '');
}
function matches(it, f){ if (f === 'all') return true; if (f === 'talks') return it.kind === 'talk'; return it.loc === f; }

/* ---------- plan ---------- */
// My plan = [title + actions] [timeline].
function ensurePlanShell(){
  const v = V.plan;
  if ($('#planTop', v)) return;
  v.innerHTML = '<div id="planTop"></div><div id="planBody"></div>';
}
function renderPlan(){
  const mine = picked();
  let top = '';
  const talks = mine.filter(i => i.kind === 'talk');
  const talkMin = talks.reduce((a, b) => a + (b.em - b.sm), 0);
  const clashMap = {}; let clashCount = 0;
  talks.forEach((a, x) => talks.forEach((b, y) => { if (y > x && overlaps(a, b)) { clashCount++; (clashMap[a.id] = clashMap[a.id] || []).push(b); (clashMap[b.id] = clashMap[b.id] || []).push(a); } }));
  let h = '<div class="lt" id="lt-plan"><p class="eyebrow">Thu, Oct 15 · IST</p><h1 class="lt-title">My plan</h1>';
  if (mine.length){
    h += '<div class="stats"><span class="stat">' + mine.length + ' picked</span>' + (talks.length ? '<span class="stat">' + fDur(talkMin) + ' of talks</span>' : '') +
         '<span class="stat">' + fRange(mine[0].sm, Math.max.apply(null, mine.map(i => i.em))) + '</span>' +
         (clashCount ? '<span class="stat warn">' + svg('warn').replace('class="ic"', 'class="ic" style="width:15px;height:15px"') + clashCount + ' overlap' + (clashCount > 1 ? 's' : '') + '</span>' : '') + '</div>';
  }
  h += '</div>';
  if (!mine.length){
    top = h; h = '';
    h += '<div class="empty"><div class="empty-art" aria-hidden="true"></div><h2>Nothing planned yet</h2><p>Tap + on any session. It lands here in time order, with free time and overlaps worked out.</p>' +
         '<div class="empty-actions"><button class="btn primary" type="button" data-act="keynotes">' + svg('plus') + 'Add the 3 keynotes</button><button class="btn" type="button" data-goto="schedule">Browse the schedule</button>' +
         '<button class="btn" type="button" data-act="friends">' + svg('users') + (S.friends.length ? 'Friends’ plans (' + S.friends.length + ')' : 'Add friends') + '</button></div></div>';
  } else {
    h += '<div class="plan-actions"><button class="btn primary" type="button" data-act="share">' + svg('share') + 'Share plan</button><button class="btn" type="button" data-act="friends">' + svg('users') + 'Add friends</button></div>';
    if (S.friends.length){
      h += '<div class="friends-strip">' + S.friends.map((f, i) => { const shared = f.ids.filter(id => S.picks.has(id)).length; return '<button class="fchip" type="button" data-act="friends"><span class="pal" style="--pc:' + friendColor(i) + '">' + esc(initial(f.name)) + '</span>' + esc(f.name) + '<small>' + shared + ' together</small></button>'; }).join('') + '</div>';
    }
    top = h; h = '';
    // rows: groups of picked items, plus free-time rows between talks
    const t = now(), ctx = it => ({clash: clashMap[it.id]});
    const doneMine = ARCHIVE ? [] : mine.filter(it => isPast(it, t)), restMine = ARCHIVE ? mine : mine.filter(it => !isPast(it, t));
    let rows = groupBy(restMine).map(g => ({sm: g.sm, html: slotHTML(g, ctx)}));
    const doneRows = groupBy(doneMine).map(g => ({sm: g.sm, html: slotHTML(g, ctx)}));
    const anyLC = mine.some(i => i.loc === 'lcl');
    let end = null;
    talks.forEach(tk => {
      if (end != null && tk.sm - end >= 15) (doneMine.length && toMs(tk.sm) <= t ? doneRows : rows).push({sm: end + 0.01, html: gapHTML(end, tk.sm, anyLC || S.showLC)});
      end = end == null ? tk.em : Math.max(end, tk.em);
    });
    rows.sort(bySm); doneRows.sort(bySm);
    rows = withNowRow(rows);
    h += '<ol class="tl" style="margin-top:22px" aria-label="Your sessions in time order">' + doneHTML('plan', doneRows, doneMine) + rows.map(r => r.html).join('') +
         (!restMine.length && doneMine.length ? allDoneHTML('Your plan is done for today.') : '') + '</ol>';
  }
  h += planEditHTML() + '<p class="foot">' + storageLine() + '</p>';
  ensurePlanShell();
  $('#planTop').innerHTML = top;
  $('#planBody').innerHTML = h;
}
function gapHTML(a, b, anyLC){
  const ga = toMs(a), gb = toMs(b);
  const sugs = ITEMS.filter(it => !S.picks.has(it.id) && (anyLC || it.loc !== 'lcl') && (
      (it.kind === 'event' && it.s < gb && it.e > ga) ||
      (it.kind === 'talk' && it.s >= ga && it.e <= gb))).sort((x, y) => x.s - y.s);
  const f = f12(a);
  // every unpicked option in the gap, in time order; meals and lounges already open when the gap starts show when they close
  const when = it => it.s < ga ? 'until ' + fT(it.em) : fT(it.sm);
  return '<li class="gap"><div class="slot-time" aria-hidden="true" style="position:static"><b>' + f.t + '</b><small>' + f.ap + '</small></div><div class="gap-body"><p class="gap-title">' + fDur(b - a) + ' free</p>' +
    (sugs.length ? '<div class="sugs">' + sugs.map(it => '<button class="sug t-' + it.theme + '" type="button" data-open="' + it.id + '" aria-label="' + esc(it.title) + ', ' + when(it) + '"><i></i><b class="sug-t">' + when(it) + '</b><span>' + esc(it.title) + '</span></button>').join('') + '</div>' : '') + '</div></li>';
}
// Friends and "clear everything", folded under a quiet button at the end of My plan.
function planEditHTML(){
  if (!S.picks.size && !S.friends.length) return '';
  return '<div class="plan-edit"><button class="plan-edit-btn" type="button" data-act="plan-edit" aria-expanded="' + planEditOpen + '" aria-controls="planEdit">' + svg('sliders') + 'Manage plan' + svg('chev') + '</button>' +
    '<ul class="list" id="planEdit" style="--inset:48px"' + (planEditOpen ? '' : ' hidden') + '>' +
      '<li><button class="list-link" type="button" data-act="friends"><span style="display:flex;gap:12px;align-items:center">' + svg('users') + (S.friends.length ? 'Friends’ plans (' + S.friends.length + ')' : 'Compare plans with friends') + '</span>' + svg('chev') + '</button></li>' +
      '<li><button class="list-link" type="button" data-act="clear" id="clearBtn" style="color:var(--live)"><span style="display:flex;gap:12px;align-items:center">' + svg('trash') + '<span id="clearLabel">Clear my plan and friends</span></span></button></li>' +
    '</ul></div>';
}
function storageLine(){
  if (S.storage === 'memory') return 'This browser is blocking storage, so your plan lasts only while this page stays open.';
  return 'Saved in this browser. Nothing leaves your phone.';
}

/* ---------- speakers ---------- */
function renderSpeakers(){
  const v = V.speakers;
  if (!v.firstChild){
    v.innerHTML = '<div class="lt" id="lt-speakers"><p class="eyebrow" id="spEyebrow"></p><h1 class="lt-title">Speakers</h1></div>' +
      '<div class="field">' + svg('search') + '<input id="spq" type="search" placeholder="Name, company or talk" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="search" aria-label="Search speakers"></div>' +
      '<div class="sp-chips" id="spChips" role="group" aria-label="Filter speakers"></div>' +
      '<ul class="list sp-list" id="spList" aria-label="Speakers"></ul><div class="sp-lc" id="spLC"></div>';
    $('#spq').addEventListener('input', () => renderSpeakerList());
    $('#spChips').addEventListener('click', e => { const b = e.target.closest('[data-spf]'); if (!b || b.dataset.spf === spFilter) return; spFilter = b.dataset.spf; haptic(6); renderSpeakerList(); });
  }
  renderSpeakerList();
}
const norm = s => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
function speakerHay(k){ const s = SP[k]; return norm([s.name, s.role, s.org].concat(s.items.map(id => BY[id].title)).join(' ')); }
function renderSpeakerList(){
  const q = norm(($('#spq') || {}).value || '').trim();
  const shown = SP_KEYS.filter(spOK), hiddenN = SP_KEYS.length - shown.length;
  $('#spEyebrow').textContent = shown.length + ' speakers · ' + TALKS.filter(lcOK).length + ' talks';
  $('#spLC').innerHTML = (hiddenN || S.showLC) ? lcToggleHTML(S.showLC ? 'All speakers shown' : hiddenN + ' speakers hidden') : '';
  // colour pills: where each speaker is on (a speaker on two stages shows under both)
  const has = (k, th) => SP[k].items.some(id => BY[id].theme === th && lcOK(BY[id]));
  const pills = SP_FILTERS.filter(f => f[0] !== 'lounge' || S.showLC).map(f => ({f, n: f[0] === 'all' ? shown.length : shown.filter(k => has(k, f[0])).length})).filter(p => p.n);
  if (!pills.some(p => p.f[0] === spFilter)) spFilter = 'all';
  $('#spChips').innerHTML = pills.map(({f, n}) => '<button class="chip" type="button" data-spf="' + f[0] + '" aria-pressed="' + (spFilter === f[0]) + '">' + (f[0] === 'all' ? '' : '<span class="cdots" aria-hidden="true"><i class="t-' + f[0] + '"></i></span>') + f[1] + '<span class="n">' + n + '</span></button>').join('');
  const keys = shown.filter(k => (spFilter === 'all' || has(k, spFilter)) && (!q || q.split(/\s+/).every(w => speakerHay(k).indexOf(w) >= 0)));
  $('#spList').innerHTML = keys.length ? keys.map(speakerRow).join('') : '<li class="none">' + (q ? 'No speaker matches “' + esc(q) + '”.' : 'No speakers here.') + '</li>';
}
function speakerRow(k){
  const s = SP[k], it = BY[s.items[0]];
  return '<li><button class="sp-row" type="button" data-speaker="' + k + '">' + av(k, 44) + '<span style="min-width:0"><span class="sp-name">' + esc(s.name) + (s.pr ? '<small>' + esc(s.pr) + '</small>' : '') + '</span><span class="sp-role">' + esc([s.role, s.org].filter(Boolean).join(', ')) + '</span></span><span class="sp-when t-' + it.theme + '"><i></i>' + f12(it.sm).t + '<br>' + f12(it.sm).ap + '</span></button></li>';
}

/* ---------- info ---------- */
function renderInfo(){
  const v = V.info;
  v.innerHTML =
    '<div class="lt" id="lt-info"><p class="eyebrow">Thu, Oct 15</p><h1 class="lt-title">Venue &amp; info</h1></div>' +
    '<ul class="list" style="--inset:48px">' +
      '<li><a class="irow irow-link" href="https://www.google.com/maps/search/?api=1&amp;query=Bangalore+International+Exhibition+Centre" target="_blank" rel="noopener noreferrer" aria-label="Bangalore International Exhibition Centre, Tumakuru Road, Bengaluru. Open in Google Maps">' + svg('pin') + '<div><b>Bangalore International Exhibition Centre</b><span>Tumakuru Road, Bengaluru</span></div>' + svg('ext') + '</a></li>' +
      '<li class="irow">' + svg('live') + '<div><b>Hall 5 · Main Stage</b><span>Keynotes and talks, all livestreamed.</span></div></li>' +
      '<li class="irow">' + svg('cup') + '<div><b>Hall 4 · Cafe</b><span>Breakfast, morning tea, lunch and the closing reception.</span></div></li>' +
      '<li class="irow">' + svg('sofa') + '<div><b>Hall 4 · Leadership Collective Lounge</b><span>Sessions, meals and a reception.</span></div></li>' +
    '</ul>' +
    '<p class="group-label">Leadership Collective (LC)</p>' + lcToggleHTML(S.showLC ? 'Shown everywhere' : 'Hidden everywhere') +
    '<p class="lc-note">' + (ARCHIVE ? 'Invite-only: these sessions were for LC pass holders.' : 'Invite-only: you need an LC pass to get in.') + ' Anything already in your plan stays there either way.</p>' +
    '<p class="group-label">About this app</p><ul class="list">' +
      '<li class="prose"><p>Config Pokedex is an unofficial community project. It is not made, endorsed or sponsored by Figma, and has no affiliation with Figma, Inc. or Config. ' + (ARCHIVE ? 'It was a pocket version of the Config India 2026 Day 2 agenda for Thu, Oct 15, 2026, and stays up as a record of the day. The <a href="https://config.figma.com/india/agenda/?day=2" target="_blank" rel="noopener noreferrer">official agenda</a> has Figma’s own page for every session.' : 'It’s a pocket version of the Config India 2026 Day 2 agenda. Adding a session here doesn’t reserve a seat. Check the <a href="https://config.figma.com/india/agenda/?day=2" target="_blank" rel="noopener noreferrer">official agenda</a> for last-minute changes.') + '</p></li>' +
    '</ul>' +
    '<p class="credit">Made using lots of love &amp; tokens by <a href="https://x.com/waqarkh4n" target="_blank" rel="noopener noreferrer">@waqarkh4n</a></p>' +
    '<p class="foot tm">Figma and Config are trademarks of Figma, Inc. Session details and speaker photos come from the public Config agenda and belong to their owners.</p>';
}

/* ======================================================================
   Sheets
   ====================================================================== */
const sheet = $('#sheet'), scrim = $('#scrim'), sbody = $('#sheetBody');
const Sheet = {stack: [], opener: null};
function sheetHTML(view){
  if (view.type === 'session') return sessionSheet(BY[view.id]);
  if (view.type === 'speaker') return speakerSheet(view.id);
  if (view.type === 'friends') return friendsSheet();
  if (view.type === 'search') return searchSheet();
  if (view.type === 'share') return shareSheet();
  if (view.type === 'incoming') return incomingSheet(view);
  if (view.type === 'copy') return '<h2 class="sh-title" id="sheetTitle" style="font-size:24px">Copy your plan</h2><p class="hint">Your browser blocked automatic copying. Select the text below and copy it.</p><textarea class="copy-box" id="copyBox" readonly>' + esc(view.text) + '</textarea>';
  return '';
}
function crumb(view){ return view.type === 'speaker' ? 'Speaker' : view.type === 'search' ? 'Search' : ''; }
function paintSheet(anim, keepScroll){
  const view = Sheet.stack[Sheet.stack.length - 1]; if (!view) return;
  const y = sbody.scrollTop;
  sheet.classList.toggle('tall', view.type === 'search');
  sbody.innerHTML = sheetHTML(view);
  $('#sheetBack').hidden = Sheet.stack.length < 2;
  $('#sheetCrumb').textContent = crumb(view);
  if (keepScroll) sbody.scrollTop = y; else sbody.scrollTop = 0;
  if (anim){ sbody.classList.remove('anim'); void sbody.offsetWidth; sbody.classList.add('anim'); }
  if (view.type === 'share') wireShare();
  if (view.type === 'search'){ const q = $('#sq'); q.value = view.q || ''; q.addEventListener('input', () => { view.q = q.value; renderSearch(); }); renderSearch(); }
}
function openSheet(view){
  if (!sheet.hidden){ Sheet.stack.push(view); paintSheet(true); return; }
  Sheet.opener = document.activeElement;
  Sheet.stack = [view];
  paintSheet(false);
  sheet.hidden = false; scrim.hidden = false;
  document.documentElement.classList.add('locked');
  void sheet.offsetWidth;
  sheet.classList.add('show'); scrim.classList.add('show');
  $('#toast').classList.add('over-sheet');
  if (view.type === 'search') { const q = $('#sq'); if (q) q.focus(); }
  else setTimeout(() => { const c = $('#sheetClose'); if (c && !sheet.hidden) c.focus({preventScroll: true}); }, 60);
}
function closeSheet(){
  if (sheet.hidden) return;
  sheet.classList.remove('show'); scrim.classList.remove('show');
  sheet.style.transform = '';
  $('#toast').classList.remove('over-sheet');
  document.documentElement.classList.remove('locked');
  const done = () => { if (!sheet.classList.contains('show')){ sheet.hidden = true; scrim.hidden = true; sbody.innerHTML = ''; Sheet.stack = []; } };
  setTimeout(done, 460);
  const o = Sheet.opener; Sheet.opener = null;
  if (o && document.contains(o)) try { o.focus({preventScroll: true}); } catch (e) {}
}
function backSheet(){ if (Sheet.stack.length > 1){ Sheet.stack.pop(); paintSheet(true); } else closeSheet(); }
$('#sheetClose').addEventListener('click', closeSheet);
$('#sheetBack').addEventListener('click', backSheet);
scrim.addEventListener('click', closeSheet);
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !sheet.hidden){ e.preventDefault(); closeSheet(); }
  if (e.key === 'Tab' && !sheet.hidden){
    const f = $$('button:not([hidden]), a[href], input, textarea', sheet).filter(x => x.offsetParent !== null);
    if (!f.length) return;
    if (e.shiftKey && document.activeElement === f[0]){ e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && document.activeElement === f[f.length - 1]){ e.preventDefault(); f[0].focus(); }
  }
});
// drag the sheet head down to dismiss
(function(){
  const head = $('#sheetHead'); let y0 = null, dy = 0, t0 = 0;
  head.addEventListener('pointerdown', e => { if (e.target.closest('button')) return; y0 = e.clientY; dy = 0; t0 = performance.now(); sheet.classList.add('dragging'); try { head.setPointerCapture(e.pointerId); } catch (x) {} });
  head.addEventListener('pointermove', e => { if (y0 == null) return; dy = Math.max(0, e.clientY - y0); sheet.style.transform = 'translate(-50%,' + dy + 'px)'; });
  const end = () => { if (y0 == null) return; const v = dy / Math.max(1, performance.now() - t0); sheet.classList.remove('dragging'); y0 = null; if (dy > 110 || v > 0.6) closeSheet(); else sheet.style.transform = ''; };
  head.addEventListener('pointerup', end); head.addEventListener('pointercancel', end);
})();

function miniRow(it){
  const on = S.picks.has(it.id);
  return '<div class="mini t-' + it.theme + (on ? ' is-picked' : '') + '" data-id="' + it.id + '"><button class="hit" type="button" data-open="' + it.id + '" aria-label="' + esc(fullTitle(it)) + ', ' + fRange(it.sm, it.em) + '"></button><div style="min-width:0"><p class="mini-k"><i></i>' + fRange(it.sm, it.em) + ' · ' + LOC[it.loc].short + '</p><p class="mini-t">' + esc(ctxTitle(it)) + '</p></div>' + addBtn(it) + '</div>';
}
function sessionSheet(it){
  const t = now(), live = isLive(it, t), past = isPast(it, t), on = S.picks.has(it.id), L = LOC[it.loc];
  const clash = clashesFor(it);
  const same = ITEMS.filter(o => o.id !== it.id && overlaps(o, it) && (it.loc === 'lcl' || vis(o)));
  let status = '';
  if (live) status = '<span class="pill live"><i></i>Live · <span data-left="' + it.id + '">' + fIn(it.e - t) + ' left</span></span>';
  else if (past) status = '<span class="pill soon">Ended</span>';
  else if (!archived() && phase(t) !== 'after') status = '<span class="pill soon" data-in="' + it.id + '" data-pre="Starts in ">Starts in ' + fIn(it.s - t) + '</span>';
  return '<div class="t-' + it.theme + '">' +
    (status ? '<div class="sh-tags">' + status + '</div>' : '') +
    (cardEye(it) ? '<p class="sh-eyebrow">' + esc(cardEye(it)) + '</p>' : '') +
    '<h2 class="sh-title" id="sheetTitle">' + esc(ctxTitle(it)) + '</h2>' +
    (it.desc && it.desc.length ? '<div class="body-copy sh-lede">' + it.desc.map(p => '<p>' + esc(p) + '</p>').join('') + '</div>' : '') +
    '<dl class="facts"><div class="fact"><dt>When</dt><dd>' + fRange(it.sm, it.em) + (it.doors ? '<span>Doors ' + fT(hm(it.doors)) + '</span>' : '') + '</dd></div>' +
    '<div class="fact"><dt>Where</dt><dd>' + L.name + '<span>' + L.hall + ' at BIEC</span></dd></div></dl>' +
    '<div class="sh-actions"><button class="btn primary' + (on ? ' on' : '') + '" type="button" data-toggle="' + it.id + '" aria-pressed="' + on + '">' + (on ? svg('check') + 'In your plan · tap to remove' : svg('plus') + 'Add to my plan') + '</button>' +
    '<a class="btn block" href="' + esc(it.url) + '" target="_blank" rel="noopener noreferrer">' + svg('ext') + 'Official page</a></div>' +
    (clash.length ? '<p class="note warn">' + svg('warn') + '<span>' + (on ? 'Overlaps with ' : 'This overlaps with ') + clash.map(c => esc(shortTitle(c, 50)) + ' (' + fT(c.sm) + ')').join(' and ') + (on ? ' in your plan.' : ', already in your plan.') + '</span></p>' : '') +
    (palsHTML(it.id) ? '<div style="margin-top:12px">' + palsHTML(it.id) + '</div>' : '') +
    ((it.live || it.loc === 'lcl') ? '<div class="sh-flags">' + (it.live ? '<span>' + svg('live') + 'Livestreamed</span>' : '') + (it.loc === 'lcl' ? '<span>' + svg('lock') + 'Invite-only</span>' : '') + '</div>' : '') +
    ((it.sp || []).length ? '<section class="sec"><h3 class="h-sec">' + (it.sp.length > 1 ? 'Speakers' : 'Speaker') + '</h3><div class="people">' + it.sp.map(k => { const s = SP[k]; return '<button class="person" type="button" data-speaker="' + k + '">' + av(k, 52, 'sq') + '<span style="min-width:0"><b>' + esc(s.name) + '</b><span>' + esc([s.role, s.org].filter(Boolean).join(', ')) + '</span></span>' + svg('chev') + '</button>'; }).join('') + '</div></section>' : '') +
    (same.length ? '<section class="sec"><h3 class="h-sec">At the same time</h3>' + same.map(miniRow).join('') + '</section>' : '') +
    '</div>';
}
function speakerSheet(k){
  const s = SP[k];
  const label = {linkedin: 'LinkedIn', x: 'X', instagram: 'Instagram', youtube: 'YouTube'};
  const links = Object.keys(s.so || {}).filter(n => label[n]).map(n => '<a class="link-pill" href="' + esc(s.so[n]) + '" target="_blank" rel="noopener noreferrer">' + label[n] + svg('ext') + '</a>').join('');
  return '<div class="spk-head">' + av(k, 96, 'sq lg') + '<div><h2 class="sh-title" id="sheetTitle">' + esc(s.name) + '</h2>' + (s.pr ? '<p class="spk-pr">' + esc(s.pr) + '</p>' : '') + '</div></div>' +
    '<p class="spk-role">' + esc(s.role) + '<span>' + esc(s.org) + '</span></p>' +
    '<div class="links">' + links + '<a class="link-pill" href="' + esc(BY[s.items[0]].url) + '" target="_blank" rel="noopener noreferrer">' + (PH[k] ? 'Full bio' : 'Photo &amp; full bio') + svg('ext') + '</a></div>' +
    '<section class="sec"><h3 class="h-sec">On stage</h3>' + s.items.map(id => miniRow(BY[id])).join('') + '</section>' +
    (s.bio && s.bio.length ? '<section class="sec"><h3 class="h-sec">In short</h3><div class="body-copy">' + s.bio.map(p => '<p>' + esc(p) + '</p>').join('') + '</div></section>' : '');
}
function friendsSheet(){
  const steps = ['Your friend opens Config Pokedex, adds their sessions, then taps <b>Share plan</b> in My plan.',
                 'They send you the link on WhatsApp. Tap it and choose <b>Compare with my plan</b>. Their sessions show up next to yours.'];
  return '<h2 class="sh-title" id="sheetTitle" style="font-size:27px">Plans with friends</h2>' +
    '<ol class="steps">' + steps.map(t => '<li><span>' + t + '</span></li>').join('') + '</ol>' +
    '<p class="hint fs-send">To send yours, tap <button class="link-btn" type="button" data-act="share">Share plan</button>.</p>' +
    (S.friends.length ? '<section class="sec"><h3 class="h-sec">Comparing with</h3><ul class="flist">' + S.friends.map((f, i) => { const shared = f.ids.filter(id => S.picks.has(id)).length; return '<li><span class="pal" style="--pc:' + friendColor(i) + '">' + esc(initial(f.name)) + '</span><div style="min-width:0"><b>' + esc(f.name) + '</b><span>' + f.ids.length + ' picked · ' + shared + ' with you</span></div><div class="fl-act">' + (f.ids.some(id => !S.picks.has(id)) ? '<button class="go" type="button" data-act="friend-merge" data-i="' + i + '" aria-label="Add ' + esc(f.name) + '’s sessions to your plan">Add to mine</button>' : '') + '<button type="button" data-act="friend-remove" data-i="' + i + '" aria-label="Remove ' + esc(f.name) + '’s plan">Remove</button></div></li>'; }).join('') + '</ul></section>' : '');
}
function searchSheet(){
  return '<h2 class="sr" id="sheetTitle">Search</h2><div class="field">' + svg('search') + '<input id="sq" type="search" placeholder="Sessions, speakers, companies" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="search" aria-label="Search sessions and speakers"></div><div id="sres"></div>';
}
function renderSearch(){
  const box = $('#sres'); if (!box) return;
  const q = norm(($('#sq') || {}).value || '').trim();
  if (!q){
    box.innerHTML = '<p class="hint">Try</p><div class="hint-chips">' + ['Make', 'Swiggy', 'design system', 'keynote', 'lunch', 'Atlassian'].map(w => '<button class="sug" type="button" data-q="' + w + '"><span>' + w + '</span></button>').join('') + '</div>';
    return;
  }
  const words = q.split(/\s+/);
  const hit = h => words.every(w => h.indexOf(w) >= 0);
  const its = ITEMS.filter(it => hit(norm([it.title, it.eyebrow || '', THEME[it.theme], LOC[it.loc].name, (it.desc || []).join(' '), spNames(it).join(' '), (it.sp || []).map(k => SP[k].org).join(' ')].join(' '))));
  const sps = SP_KEYS.filter(k => hit(norm([SP[k].name, SP[k].role, SP[k].org].join(' '))));
  box.innerHTML = (its.length ? '<p class="sres-label">Sessions · ' + its.length + '</p>' + its.map(miniRow).join('') : '') +
    (sps.length ? '<p class="sres-label">Speakers · ' + sps.length + '</p><div class="people">' + sps.map(k => { const s = SP[k]; return '<button class="person" type="button" data-speaker="' + k + '">' + av(k, 52, 'sq') + '<span style="min-width:0"><b>' + esc(s.name) + '</b><span>' + esc([s.role, s.org].filter(Boolean).join(', ')) + '</span></span>' + svg('chev') + '</button>'; }).join('') + '</div>' : '') +
    (!its.length && !sps.length ? '<p class="hint">Nothing matches “' + esc(q) + '”.</p>' : '');
}

/* ======================================================================
   Actions
   ====================================================================== */
let toastTimer = 0;
function toast(msg, action, o){
  const el = $('#toast'); o = o || {};
  el.classList.toggle('rich', !!o.title);
  el.innerHTML = (o.icon ? svg(o.icon) : '') + '<span class="toast-msg">' + (o.title ? '<b>' + esc(o.title) + '</b>' : '') + (Array.isArray(msg) ? msg.filter(Boolean).map(m => '<span>' + esc(m) + '</span>').join('') : esc(msg)) + '</span>' + (action ? '<button type="button">' + esc(action.label) + '</button>' : '');
  if (action) el.querySelector('button').addEventListener('click', () => { hideToast(); action.fn(); });
  el.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(hideToast, o.ms || (action ? 4200 : 2600));
}
// From config.figma.com: Leadership Collective is invite-only, its sessions are "for Leadership Collective attendees".
const LC_NOTE = ARCHIVE ? 'This one was for Leadership Collective attendees only.' : 'This one’s for Leadership Collective attendees, so not everyone can get in. Have an LC pass? You’re all set.';
function hideToast(){ $('#toast').classList.remove('show'); }
function haptic(ms){ try { if (navigator.vibrate) navigator.vibrate(ms || 8); } catch (e) {} }

function setPick(id, on){ if (on) S.picks.add(id); else S.picks.delete(id); saveState(true); }
function toggle(id){
  const it = BY[id]; if (!it) return;
  const on = !S.picks.has(id);
  setPick(id, on); haptic();
  // instant, animated feedback on every visible toggle for this item
  $$('.add[data-toggle="' + id + '"]').forEach(b => { b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); b.setAttribute('aria-label', (on ? 'Remove from my plan: ' : 'Add to my plan: ') + fullTitle(it)); });
  $$('[data-id="' + id + '"]').forEach(c => c.classList.toggle('is-picked', on));
  updateBadge(true);
  if (on){
    const c = clashesFor(it), view = S.tab === 'plan' ? null : {label: 'View', fn: () => { closeSheet(); go('plan'); }};
    const over = c.length ? 'Overlaps with ' + dot(shortTitle(c[0], 44)) : '';
    if (it.loc === 'lcl') toast([LC_NOTE, over], view, {title: 'Added · Invite-only', icon: 'lock', ms: c.length ? 8000 : 6500});
    else toast(c.length ? 'Added. It overlaps with ' + dot(shortTitle(c[0], 34)) : 'Added to your plan', view);
  } else {
    toast('Removed from your plan', {label: 'Undo', fn: () => { setPick(id, true); refreshAll(); updateBadge(true); }});
  }
  dirty.plan = true; dirty.info = true;
  const hadFocus = document.activeElement && document.activeElement.dataset && document.activeElement.dataset.toggle === id;
  if (S.tab === 'plan') renderPlan();
  renderStatus();
  if (!sheet.hidden){
    const top = Sheet.stack[Sheet.stack.length - 1];
    if (top && top.type === 'search') renderSearch(); else paintSheet(false, true);
  }
  if (hadFocus){ const scope = sheet.hidden ? V[S.tab] : sheet; const b = scope.querySelector('[data-toggle="' + id + '"]'); if (b) b.focus({preventScroll: true}); }
}
function updateBadge(bump){
  const b = $('#planBadge'), n = S.picks.size;
  b.hidden = !n; b.textContent = n;
  renderLanes(); updateScrubber();
  if (bump && n){ b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump'); }
}
// A link carries the plan in its #hash (never sent to a server). Opened inside an embed (the Claude page),
// the page has no address of its own, so links point at the live site.
const SITE = 'https://config-india.vercel.app/';
const OWN_URL = (() => { try { return window.top === window.self && /^https?:$/.test(location.protocol); } catch (e) { return false; } })();
function shareLink(){ return (OWN_URL ? location.origin + location.pathname : SITE) + '#p=' + encodePlan(Array.from(S.picks)) + (S.me ? '&n=' + encodeURIComponent(S.me) : ''); }
function planText(){
  const mine = picked(); if (!mine.length) return null;
  const lines = [(S.me ? S.me + '’s' : 'My') + ' Config India plan · Thu, Oct 15', ''];
  mine.forEach(it => lines.push(fT(it.sm) + ' · ' + (it.kind === 'event' ? ctxTitle(it) : fullTitle(it))));
  lines.push('');
  lines.push('Compare with yours: ' + shareLink());
  return lines.join('\n');
}
const waURL = () => 'https://wa.me/?text=' + encodeURIComponent(planText() || '');
function shareSheet(){
  const txt = planText() || '';
  return '<h2 class="sh-title" id="sheetTitle" style="font-size:27px">Share your plan</h2>' +
    '<p class="hint" style="margin-top:8px">Friends tap the link to see your sessions next to theirs.</p>' +
    '<div class="form" style="margin-top:14px"><div><label for="myname">Your first name</label><input id="myname" type="text" maxlength="24" autocomplete="given-name" required aria-required="true" aria-describedby="nameErr" placeholder="So friends know whose plan it is" value="' + esc(S.me) + '"><p class="err" id="nameErr" role="alert"></p></div></div>' +
    '<div class="sh-actions">' +
      '<a class="btn primary" id="shareWA" href="' + esc(waURL()) + '" target="_blank" rel="noopener noreferrer">' + svg('chat') + 'Send on WhatsApp</a>' +
      (navigator.share ? '<button class="btn block" type="button" data-act="share-native">' + svg('share') + 'More options</button>' : '') +
      '<button class="btn block" type="button" data-act="share-copy">' + svg('link') + 'Copy link</button>' +
    '</div>' +
    '<section class="sec"><h3 class="h-sec">Message</h3><p class="share-preview" id="sharePrev">' + esc(txt) + '</p></section>';
}
// Sharing needs a name, so friends know whose plan they're opening.
function needName(){
  if (S.me) return false;
  const inp = $('#myname'), err = $('#nameErr');
  if (err) err.textContent = 'Add your first name first, so friends know whose plan it is.';
  if (inp){ inp.setAttribute('aria-invalid', 'true'); inp.focus(); }
  haptic(12);
  return true;
}
function wireShare(){
  const inp = $('#myname'); if (!inp) return;
  const wa = $('#shareWA'); if (wa) wa.addEventListener('click', e => { if (needName()) e.preventDefault(); });
  inp.addEventListener('input', () => {
    S.me = inp.value.replace(/\s+/g, ' ').trim().slice(0, 24); saveState(false);
    if (S.me){ inp.removeAttribute('aria-invalid'); const err = $('#nameErr'); if (err) err.textContent = ''; }
    const a = $('#shareWA'); if (a) a.href = waURL();
    const pv = $('#sharePrev'); if (pv) pv.textContent = planText() || '';
  });
}
async function copyShare(){
  const txt = shareLink();
  let ok = false;
  try { await navigator.clipboard.writeText(txt); ok = true; } catch (e) { ok = false; }
  if (ok) toast('Link copied. Paste it anywhere.');
  else { openSheet({type: 'copy', text: txt}); setTimeout(() => { const b = $('#copyBox'); if (b){ b.focus(); b.select(); } }, 80); }
}
// Someone opened a shared link: show their plan, then let them compare or copy it in.
function readShared(){
  const m = /^#p=([0-9A-Za-z-]+)(?:&n=([^&]*))?$/.exec(location.hash || '');
  if (!m) return;
  try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {}
  const ids = decodePlan(m[1]);
  let name = ''; try { name = m[2] ? decodeURIComponent(m[2]).replace(/\s+/g, ' ').trim().slice(0, 24) : ''; } catch (e) {}
  if (!ids || !ids.length){ toast('That plan link doesn’t look right. Ask your friend to share it again.'); return; }
  openSheet({type: 'incoming', ids, name});
}
function incomingSheet(v){
  const shared = v.ids.filter(id => S.picks.has(id)).length;
  const known = S.friends.some(f => f.code === encodePlan(v.ids));
  return '<h2 class="sh-title" id="sheetTitle" style="font-size:27px">' + (v.name ? esc(v.name) + '’s plan' : 'A friend’s plan') + '</h2>' +
    '<p class="hint" style="margin-top:8px">' + v.ids.length + ' session' + (v.ids.length > 1 ? 's' : '') + (S.picks.size ? ' · ' + shared + ' also in yours' : '') + '</p>' +
    '<div class="sh-actions">' +
      '<button class="btn primary" type="button" data-act="incoming-compare">' + svg('users') + (known ? 'Already comparing · update' : 'Compare with my plan') + '</button>' +
      '<button class="btn block" type="button" data-act="incoming-add">' + svg('plus') + 'Add all to my plan</button>' +
    '</div>' +
    '<section class="sec"><h3 class="h-sec">Their sessions</h3>' + v.ids.map(id => BY[id]).filter(Boolean).sort((a, b) => a.s - b.s).map(miniRow).join('') + '</section>';
}
let clearArmed = 0;
const actions = {
  'plan-edit'(t){ planEditOpen = !planEditOpen; t.setAttribute('aria-expanded', planEditOpen); const l = $('#planEdit'); if (l) l.hidden = !planEditOpen; if (planEditOpen) requestAnimationFrame(() => l.scrollIntoView({block: 'nearest', behavior: 'smooth'})); },
  search(){ openSheet({type: 'search', q: ''}); },
  replay(){ setScrubOpen(true); setSim(625); haptic(6); },     // drop in at the opening keynote
  lc(t){
    S.showLC = !S.showLC;
    if (!S.showLC && S.filter === 'lcl') S.filter = 'all';
    saveState(false); haptic(6);
    $$('.lc-toggle, .lc-chip').forEach(b => b.setAttribute('aria-checked', S.showLC));   // let the knob slide first
    const refocus = document.activeElement === t, view = S.tab;
    setTimeout(() => {
      refreshAll();
      if (refocus){ const b = V[view].querySelector('.lc-chip, .lc-toggle'); if (b && document.activeElement !== b) b.focus({preventScroll: true}); }
      toast(S.showLC ? 'Showing LC (Leadership Collective) items' : 'LC items hidden');
    }, 230);
  },
  done(t){
    const li = t.closest('.done'), view = t.dataset.view; if (!li) return;
    const open = !li.classList.contains('open');
    li.classList.toggle('open', open); t.setAttribute('aria-expanded', open);
    const body = li.querySelector('.done-body'); if (body) body.inert = !open;
    S.done[view] = open; saveState(false);
  },
  share(){ if (!S.picks.size){ toast('Add a session first, then share your plan.'); return; } openSheet({type: 'share'}); },
  'share-native'(){ if (needName()) return; const txt = planText(); if (txt && navigator.share) navigator.share({text: txt}).catch(() => {}); },
  'share-copy'(){ if (needName()) return; copyShare(); },
  'incoming-compare'(){
    const v = Sheet.stack[Sheet.stack.length - 1]; if (!v || v.type !== 'incoming') return;
    const code = encodePlan(v.ids);
    let i = S.friends.findIndex(f => f.code === code || (v.name && f.name.toLowerCase() === v.name.toLowerCase()));
    const name = v.name ? cleanName(v.name) : (i >= 0 ? S.friends[i].name : 'Friend ' + (S.friends.length + 1));
    if (i >= 0) S.friends[i] = {name, code, ids: v.ids};
    else { if (S.friends.length >= 8){ toast('You can compare with up to 8 friends. Remove one first.'); return; } S.friends.push({name, code, ids: v.ids}); }
    saveState(true); closeSheet();
    toast('Comparing with ' + name + ' · ' + v.ids.filter(id => S.picks.has(id)).length + ' sessions together', {label: 'View', fn: () => go('plan')});
    refreshAll();
  },
  'incoming-add'(){
    const v = Sheet.stack[Sheet.stack.length - 1]; if (!v || v.type !== 'incoming') return;
    const add = v.ids.filter(id => BY[id] && !S.picks.has(id));
    if (!add.length){ toast('All of these are already in your plan.'); return; }
    add.forEach(id => S.picks.add(id)); saveState(true); updateBadge(true); closeSheet();
    toast('Added ' + add.length + ' session' + (add.length > 1 ? 's' : '') + ' to your plan', {label: 'Undo', fn: () => { add.forEach(id => S.picks.delete(id)); saveState(true); updateBadge(false); refreshAll(); }});
    refreshAll();
  },
  friends(){ openSheet({type: 'friends'}); },
  'friend-merge'(t){ const f = S.friends[+t.dataset.i]; if (!f) return; const before = new Set(S.picks); const add = f.ids.filter(id => BY[id] && !S.picks.has(id)); if (!add.length) return; add.forEach(id => S.picks.add(id)); saveState(true); updateBadge(true); haptic(); toast('Added ' + add.length + ' of ' + f.name + '’s sessions to yours', {label: 'Undo', fn: () => { S.picks = before; saveState(true); updateBadge(false); refreshAll(); }}); refreshAll(); },
  'friend-remove'(t){ const i = +t.dataset.i; const f = S.friends[i]; if (!f) return; S.friends.splice(i, 1); saveState(true); toast('Removed ' + f.name + '’s plan', {label: 'Undo', fn: () => { S.friends.splice(i, 0, f); saveState(true); refreshAll(); }}); refreshAll(); },
  keynotes(){ KEYNOTES.forEach(k => S.picks.add(k.id)); saveState(true); updateBadge(true); haptic(); toast('Added the 3 keynotes'); refreshAll(); },
  clear(t){
    const lab = $('#clearLabel');
    if (Date.now() - clearArmed > 4000){ clearArmed = Date.now(); if (lab) lab.textContent = 'Tap again to clear everything'; setTimeout(() => { const l = $('#clearLabel'); if (l && Date.now() - clearArmed >= 4000) l.textContent = 'Clear my plan and friends'; }, 4100); return; }
    clearArmed = 0;
    const before = {picks: Array.from(S.picks), friends: S.friends.slice()};
    S.picks = new Set(); S.friends = []; saveState(true); updateBadge(false);
    toast('Plan cleared', {label: 'Undo', fn: () => { S.picks = new Set(before.picks); S.friends = before.friends; saveState(true); updateBadge(false); refreshAll(); }});
    refreshAll();
  }
};

document.addEventListener('click', e => {
  const t = e.target.closest('[data-toggle],[data-open],[data-speaker],[data-goto],[data-act],[data-filter],[data-tab],[data-q]');
  if (!t) return;
  const ds = t.dataset;
  if (ds.toggle){ e.preventDefault(); toggle(ds.toggle); return; }
  if (ds.open){ e.preventDefault(); openSheet({type: 'session', id: ds.open}); return; }
  if (ds.speaker){ e.preventDefault(); openSheet({type: 'speaker', id: ds.speaker}); return; }
  if (ds.goto){ closeSheet(); go(ds.goto); return; }
  if (ds.tab){ go(ds.tab); return; }
  if (ds.filter){ if (S.filter !== ds.filter){ S.filter = ds.filter; saveState(false); renderSchedule(); const tl = $('#tl'), stickH = $('#bar').getBoundingClientRect().bottom + $('#chipsWrap').offsetHeight; const target = tl.getBoundingClientRect().top + window.scrollY - stickH - 6; if (window.scrollY > target) window.scrollTo(0, Math.max(0, target)); const c = $('[data-filter="' + ds.filter + '"]'); if (c){ c.focus({preventScroll: true}); c.scrollIntoView({inline: 'nearest', block: 'nearest'}); } } return; }
  if (ds.q){ const q = $('#sq'); if (q){ q.value = ds.q; const v = Sheet.stack[Sheet.stack.length - 1]; if (v) v.q = ds.q; renderSearch(); q.focus(); } return; }
  if (ds.act && actions[ds.act]){ e.preventDefault(); actions[ds.act](t, e); }
});

/* ======================================================================
   Navigation, scroll chrome, clock
   ====================================================================== */
const scrollMem = {};
const dirty = {schedule: false, plan: true, speakers: true, info: true};
const RENDER = {schedule: renderSchedule, plan: renderPlan, speakers: renderSpeakers, info: renderInfo};
function go(tab){
  if (!V[tab]) return;
  if (tab === S.tab){ window.scrollTo({top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'}); return; }
  scrollMem[S.tab] = window.scrollY;
  S.tab = tab;
  Object.keys(V).forEach(k => { V[k].hidden = k !== tab; V[k].classList.remove('anim'); });
  if (dirty[tab] || !V[tab].firstChild || tab === 'plan' || tab === 'info'){ RENDER[tab](); dirty[tab] = false; }
  void V[tab].offsetWidth; V[tab].classList.add('anim');
  $$('.tab').forEach(b => { if (b.dataset.tab === tab) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
  $('#barTitle').textContent = TITLES[tab];
  window.scrollTo(0, scrollMem[tab] || 0);
  scrubLayout();
  chrome();
}
function refreshAll(){
  Object.keys(dirty).forEach(k => { dirty[k] = true; });
  RENDER[S.tab](); dirty[S.tab] = false;
  if (S.tab !== 'schedule' && V.schedule.firstChild){ renderSchedule(); dirty.schedule = false; }
  if (!sheet.hidden){ const top = Sheet.stack[Sheet.stack.length - 1]; if (top && top.type === 'search') renderSearch(); else paintSheet(false, true); }
  updateBadge(false);
}
let chromeQueued = false;
function chrome(){
  chromeQueued = false;
  const bar = $('#bar'), y = window.scrollY;
  bar.classList.toggle('scrolled', y > 44);
  const cw = $('#chipsWrap');
  const stuck = S.tab === 'schedule' && cw && cw.getBoundingClientRect().top <= bar.getBoundingClientRect().bottom + 0.5;
  if (cw) cw.classList.toggle('stuck', !!stuck);
  bar.classList.toggle('flush', !!stuck);
  nowBar();
}
// The session the status card shows, kept in the top bar while you scroll (Schedule and My plan).
let nowSig = '';
function nowBar(){
  const bar = $('#bar'), el = $('#barNow'), t = now();
  const cur = (S.tab === 'schedule' || S.tab === 'plan') && phase(t) === 'during' ? choose(ITEMS.filter(i => isLive(i, t) && vis(i))) : null;
  bar.classList.toggle('has-now', !!cur);
  el.tabIndex = cur && bar.classList.contains('scrolled') ? 0 : -1;
  const sig = cur ? cur.id + fIn(cur.e - t) : '';
  if (sig === nowSig) return; nowSig = sig;
  if (!cur){ el.removeAttribute('data-open'); return; }
  el.dataset.open = cur.id;
  el.setAttribute('aria-label', 'Now: ' + ctxTitle(cur) + ', ' + fIn(cur.e - t) + ' left. Open details');
  el.innerHTML = '<i aria-hidden="true"></i><span class="bn-k">Now</span><span class="bn-t">' + esc(ctxTitle(cur)) + '</span><span class="bn-m">' + fIn(cur.e - t).replace(' min', 'm') + '</span>';
}
window.addEventListener('scroll', () => { if (!chromeQueued){ chromeQueued = true; requestAnimationFrame(chrome); } }, {passive: true});
window.addEventListener('resize', () => requestAnimationFrame(chrome));

// Live clock: re-render only when something actually changes state.
function timeSig(){ const t = now(); return phase(t) + ITEMS.map(it => t >= it.e ? 2 : t >= it.s ? 1 : (it.s - t <= 30 * 60000 ? 3 : 0)).join(''); }
let lastSig = timeSig(), lastMin = -1;
function tick(){
  const sig = timeSig(), m = Math.floor(nowMin());
  if (simBase == null) updateScrubber();
  if (sig !== lastSig){ lastSig = sig; refreshAll(); lastMin = m; return; }
  if (m !== lastMin){
    lastMin = m;
    renderStatus();
    $$('.now-label').forEach(l => { l.textContent = f12(nowMin()).t; });
    $$('[data-prog]').forEach(i => { const it = BY[i.dataset.prog]; if (it) i.style.setProperty('--p', progPct(it, now()) + '%'); });
    $$('[data-in]').forEach(p => { const it = BY[p.dataset.in]; if (it) p.textContent = (p.dataset.pre || '') + fIn(it.s - now()); });
    $$('[data-left]').forEach(p => { const it = BY[p.dataset.left]; if (it) p.textContent = fIn(it.e - now()) + ' left'; });
  }
  nowBar();
}
setInterval(tick, 15000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) tick(); });
window.addEventListener('hashchange', () => { if (/^#p=/.test(location.hash)) { readShared(); return; } readSim(); handleHashTab(); lastSig = ''; tick(); updateScrubber(); });
function handleHashTab(){ const h = (location.hash || '').slice(1); if (V[h]) go(h); }

/* ---------- time scrubber: preview any moment of Oct 15 ---------- */
const SMIN = 360, SMAX = 1260, SSTEP = 5;            // 6:00 AM – 9:00 PM, 5-minute steps
const range = $('#scrubRange'), track = $('#scrubTrack'), lanes = $('#scrubLanes');
let scrubOpen = false;                              // starts collapsed to the pill on every visit
let dragging = false, followY = null, raf = 0, pendingMin = null;

// The track maps only the sessions in your plan, one lane per venue (Main Stage, Cafe, LC Lounge).
function renderLanes(){
  const el = document.getElementById('scrubLanes'); if (!el) return;
  const mine = picked();
  el.innerHTML = mine.length ? mine.map(it => {
    const a = Math.max(it.sm, SMIN), b = Math.min(it.em, SMAX); if (b <= a) return '';
    const l = (a - SMIN) / (SMAX - SMIN) * 100, w = (b - a) / (SMAX - SMIN) * 100;
    return '<i class="tk ' + it.loc + ' t-' + it.theme + '" style="left:' + l.toFixed(2) + '%;width:calc(' + w.toFixed(2) + '% - 1.5px)"></i>';
  }).join('') + clashMarks(mine) : '<span class="lanes-empty">Your picks show up here</span>';
}

// Red marks wherever two talks in your plan overlap.
function clashMarks(mine){
  const talks = mine.filter(it => it.kind === 'talk'), spans = [];
  talks.forEach((a, x) => talks.forEach((b, y) => { if (y > x && overlaps(a, b)) spans.push([Math.max(a.sm, b.sm), Math.min(a.em, b.em)]); }));
  return spans.map(([a, b]) => '<i class="tk-clash" style="left:' + ((a - SMIN) / (SMAX - SMIN) * 100).toFixed(2) + '%;width:' + ((b - a) / (SMAX - SMIN) * 100).toFixed(2) + '%"></i>').join('');
}
function scrubLayout(){
  const root = document.documentElement;
  root.classList.toggle('scrub-hidden', !(S.tab === 'schedule' || S.tab === 'plan'));
  root.classList.toggle('scrub-closed', !scrubOpen);
}
function setScrubOpen(open){
  scrubOpen = open;
  scrubLayout(); updateScrubber();
  const f = open ? $('#scrubMin') : $('#scrubPill'); if (f) f.focus({preventScroll: true});
}
function istLabel(ms){
  const d = new Date(ms + IST), mins = d.getUTCHours() * 60 + d.getUTCMinutes();
  const sameDay = ms >= DAY0 && ms < DAY0 + 86400000;
  return (sameDay ? '' : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getUTCDay()] + ' ') + fT(mins);
}
function momentWord(t){
  const p = phase(t);
  if (p === 'before') return 'before doors';
  if (p === 'after') return 'after hours';
  const mine = picked();
  if (mine.length){
    const both = mine.filter(i => i.kind === 'talk' && isLive(i, t));
    if (both.length > 1) return 'clash';
    const cur = mine.find(i => i.kind === 'talk' && isLive(i, t)) || mine.find(i => isLive(i, t));
    if (cur) return 'at ' + shortTitle(cur, 26);
    const nx = mine.find(i => i.s > t);
    return nx ? 'free until ' + f12(nx.sm).t : 'plan done';
  }
  const n = ITEMS.filter(i => i.kind === 'talk' && isLive(i, t) && lcOK(i)).length;
  return n ? n + ' talk' + (n > 1 ? 's' : '') + ' live' : 'between talks';
}
function updateScrubber(){
  const live = simBase == null, t = now(), nm = (t - DAY0) / 60000;
  const clamped = Math.max(SMIN, Math.min(SMAX, nm));
  if (!dragging) range.value = String(Math.round(clamped / SSTEP) * SSTEP);
  $('#scrubPast').style.setProperty('--p', ((clamped - SMIN) / (SMAX - SMIN)).toFixed(4));
  range.classList.toggle('preview', !live);
  $('#scrubState').classList.toggle('preview', !live);
  $('#scrubState').classList.toggle('archive', ARCHIVE && live);
  $('#scrubStateText').textContent = ARCHIVE ? (live ? 'Day 2' : 'Replay') : live ? 'Live' : 'Preview';
  $('#scrubLive').textContent = ARCHIVE ? 'Done' : 'Go live';
  if (ARCHIVE && live){
    $('#scrubTime').innerHTML = 'Thu, Oct 15<small>drag to replay</small>';
    range.setAttribute('aria-valuetext', 'Thursday, October 15, 2026. Drag to replay the day');
    $('#scrubLive').hidden = true;
    $('#scrubPillText').textContent = 'Replay the day';
    return;
  }
  const label = live ? istLabel(t) : fT(Math.round(nm));
  const word = live ? 'IST' : momentWord(t);
  $('#scrubTime').innerHTML = esc(label) + '<small' + (/^clash/.test(word) ? ' class="clash"' : '') + '>' + word + '</small>';
  range.setAttribute('aria-valuetext', (live ? 'Live, ' : 'Previewing ') + label);
  $('#scrubLive').hidden = live;
  $('#scrubPillText').innerHTML = live ? 'Live · ' + esc(istLabel(t)) : '<b>' + (ARCHIVE ? 'Replay' : 'Preview') + '</b> · ' + esc(label);
}
function minFromX(x){
  const r = lanes.getBoundingClientRect(), f = Math.max(0, Math.min(1, (x - r.left) / r.width));
  return Math.round((SMIN + f * (SMAX - SMIN)) / SSTEP) * SSTEP;
}
// If you're down in the timeline when you start scrubbing, the list follows the red now-line.
function beginScrub(){
  followY = null;
  if (S.tab !== 'schedule' && S.tab !== 'plan') return;
  const v = V[S.tab], tl = v.querySelector('.tl');
  if (!tl || tl.getBoundingClientRect().top > window.innerHeight * 0.35) return;
  const r = v.querySelector('.now-row');
  followY = r ? r.getBoundingClientRect().top : window.innerHeight * 0.42;
}
function setSim(min){
  simBase = min == null ? null : toMs(min);
  const before = lastSig;
  tick();
  if (min != null && lastSig !== before) haptic(4);
  if (followY != null){ const r = V[S.tab].querySelector('.now-row'); if (r) window.scrollBy(0, r.getBoundingClientRect().top - followY); }
  updateScrubber();
}
function queueSim(min){
  pendingMin = min; range.value = String(min);
  if (!raf) raf = requestAnimationFrame(() => { raf = 0; setSim(pendingMin); });
}
track.addEventListener('pointerdown', e => {
  if (e.button > 0) return;
  e.preventDefault();
  dragging = true; beginScrub();
  try { track.setPointerCapture(e.pointerId); } catch (x) {}
  try { range.focus({preventScroll: true}); } catch (x) {}
  queueSim(minFromX(e.clientX));
});
track.addEventListener('pointermove', e => { if (dragging) queueSim(minFromX(e.clientX)); });
const endDrag = () => { if (!dragging) return; dragging = false; followY = null; updateScrubber(); };
track.addEventListener('pointerup', endDrag);
track.addEventListener('pointercancel', endDrag);
track.addEventListener('lostpointercapture', endDrag);
range.addEventListener('input', () => { if (!dragging && followY == null) beginScrub(); queueSim(+range.value); });
range.addEventListener('change', () => { if (!dragging) followY = null; });
$('#scrubLive').addEventListener('click', () => { followY = null; setSim(null); haptic(6); });
$('#scrubMin').addEventListener('click', () => setScrubOpen(false));
$('#scrubPill').addEventListener('click', () => setScrubOpen(true));

/* ---------- boot ---------- */
readSim();
loadState();
renderSchedule();
updateBadge(false);
handleHashTab();
readShared();
scrubLayout();
updateScrubber();
chrome();
if (S.tab === 'schedule' && phase() === 'during'){
  requestAnimationFrame(() => { const r = V.schedule.querySelector('.now-row'); if (r){ const y = r.getBoundingClientRect().top + window.scrollY - window.innerHeight * 0.42; if (y > 0) window.scrollTo(0, y); } });
}
lastMin = Math.floor(nowMin());
})();
