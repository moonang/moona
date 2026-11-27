// @ts-nocheck
// Shared (server + browser) helpers: dates, time zones, moon phases and the 17 occasions.
function mulberry(seed){ return function(){ seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function hashStr(s){ let h = 2166136261; for (const c of String(s)){ h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
function fmt(iso, tz, opts){ return new Intl.DateTimeFormat("en-GB", Object.assign({timeZone: tz}, opts)).format(new Date(iso)); }
const dayLabel = (iso, tz="Africa/Lagos") => fmt(iso, tz, {weekday:"short", day:"numeric", month:"short"});
const timeLabel = (iso, tz) => fmt(iso, tz, {hour:"2-digit", minute:"2-digit", hourCycle:"h23"});
const tzShort = tz => tz === "Europe/London" ? "UK" : "WAT";
const ymd = (ts, tz="Africa/Lagos") => new Intl.DateTimeFormat("en-CA", {timeZone:tz, year:"numeric", month:"2-digit", day:"2-digit"}).format(new Date(ts));
function tzOffsetMs(utcMs, tz){
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-US",{timeZone:tz, hourCycle:"h23", year:"numeric", month:"2-digit", day:"2-digit", hour:"2-digit", minute:"2-digit", second:"2-digit"}).formatToParts(new Date(utcMs)).map(x=>[x.type,x.value]));
  return Date.UTC(+p.year, +p.month-1, +p.day, +p.hour % 24, +p.minute, +p.second) - utcMs;
}
function zonedToIso(dateStr, timeStr, tz){
  const [y,m,d] = dateStr.split("-").map(Number); const [h,mi] = (timeStr || "12:00").split(":").map(Number);
  const guess = Date.UTC(y, m-1, d, h, mi);
  return new Date(guess - tzOffsetMs(guess, tz)).toISOString();
}
function gcalStamp(iso){ return new Date(iso).toISOString().replace(/[-:]/g,"").replace(/\.\d{3}/,""); }
function untilLabel(iso){
  const days = Math.round((new Date(ymd(iso)) - new Date(ymd(Date.now()))) / 86400000);
  return days < 0 ? "Already happened" : days === 0 ? "Today" : days === 1 ? "Tomorrow" : days < 14 ? `In ${days} days` : days < 60 ? `In ${Math.round(days/7)} weeks` : `In ${Math.round(days/30)} months`;
}

const AV = ["#7a5cff","#1f9d6b","#e0603a","#2f7fd8","#c2408c","#b08a1a","#3a9aa6","#d04848"];

const initials = n => String(n).split(/\s+/).filter(Boolean).map(s=>s[0]).slice(0,2).join("").toUpperCase();

const SYNODIC = 29.530588853, NEW_MOON_REF = Date.UTC(2000,0,6,18,14);
function moonInfo(iso){
  const days = (new Date(iso).getTime() - NEW_MOON_REF)/86400000, age = ((days % SYNODIC) + SYNODIC) % SYNODIC, frac = age / SYNODIC;
  const lit = Math.round((1 - Math.cos(2*Math.PI*frac)) / 2 * 100);
  const names = ["new moon","waxing crescent","first quarter","waxing gibbous","full moon","waning gibbous","last quarter","waning crescent"];
  return { frac, lit, name: names[Math.round(frac*8) % 8] };
}
const cap1 = s => s[0].toUpperCase() + s.slice(1);

const KINDS = {
  birthday:  { vis:"private", label:"Birthday party", emoji:"🎂", c:["#ff4f93","#4a1fb8"], motif:"confetti", mins:180, cap:30, mode:"In person", approval:false, hide:false, plus:true, maxPlus:2, cert:false,
    questions:["Child's name and age","Allergies or dietary needs"], bring:["Paper plates and cups","Juice and water","Small chops tray","Party bags"] },
  playdate:  { vis:"private", label:"Children's playdate", emoji:"🧸", c:["#29B6D8","#5B2DB8"], motif:"hills", mins:180, cap:10, mode:"In person", approval:true, hide:true, plus:false, maxPlus:0, cert:false,
    questions:["Child's name and age","Allergies or medical notes","Who's dropping off and collecting?"], bring:["Snacks to share","Change of clothes","A favourite toy or game","Water bottle"] },
  hen:       { vis:"private", label:"Hen party", emoji:"🥂", c:["#ff8a6b","#7d1f4f"], motif:"bubbles", mins:480, cap:16, mode:"In person", approval:true, hide:true, plus:false, maxPlus:0, cert:false,
    questions:["How do you know the bride?","Dietary needs"], bring:["Sash and tiara","Playlist","Bubbly for the toast","Polaroid camera"] },
  retreat:   { vis:"private", label:"Office retreat", emoji:"🌿", c:["#3aa57a","#0c302e"], motif:"hills", mins:2880, cap:25, mode:"In person", approval:false, hide:true, plus:true, maxPlus:1, cert:false,
    questions:["Dietary needs","Room preference"], bring:["Speaker","Board games","First-aid kit"] },
  launch:    { vis:"public", label:"Launch party", emoji:"🚀", c:["#ffb03a","#b8285c"], motif:"rays", mins:180, cap:80, mode:"In person", approval:true, hide:false, plus:true, maxPlus:1, cert:false,
    questions:["Company or organisation","How did you hear about us?"], bring:[] },
  webinar:   { vis:"public", label:"Webinar", sub:"or online talk", emoji:"💻", c:["#2F6FED","#0A1F4D"], motif:"rays", mins:60, cap:100, mode:"Online", approval:false, hide:false, plus:false, maxPlus:0, cert:false,
    questions:["Job title and organisation","What would you like the speakers to cover?"], bring:[] },
  committee: { vis:"private", label:"Committee meeting", emoji:"📋", c:["#4a86c8","#0f1d44"], motif:"rings", mins:90, cap:15, mode:"In person", approval:false, hide:false, plus:false, maxPlus:0, cert:false,
    questions:["Anything to add to the agenda?"], bring:["Minutes of the last meeting","Finance update","Refreshments"] },
  training:  { vis:"private", label:"Team training", emoji:"⚽", c:["#2EB872","#0B3D2A"], motif:"pitch", mins:90, cap:30, mode:"In person", approval:false, hide:false, plus:false, maxPlus:0, cert:false, repeat:"weekly",
    questions:["Position or role","Emergency contact number"], bring:["Cones and bibs","Balls","First-aid kit","Water"] },
  workshop:  { vis:"public", label:"Workshop", sub:"or class", emoji:"✏️", c:["#e6a23c","#40240e"], motif:"hatch", mins:120, cap:40, mode:"In person", approval:false, hide:false, plus:false, maxPlus:0, cert:true,
    questions:["Organisation","What do you hope to learn?"], bring:[] },
  catchup:   { vis:"private", label:"Catch-up", emoji:"☕", c:["#d9825b","#3b1f2b"], motif:"orbits", mins:120, cap:10, mode:"In person", approval:false, hide:false, plus:false, maxPlus:0, cert:false,
    questions:[], bring:[] },
  lunch:     { vis:"public", label:"Lunch meetup", emoji:"🥗", c:["#FFB84D","#7A2E2E"], motif:"rays", mins:90, cap:12, mode:"In person", approval:false, hide:false, plus:false, maxPlus:0, cert:false,
    questions:["Dietary needs"], bring:[] },
  teammeet:  { vis:"private", label:"Team meetup", emoji:"🤝", c:["#5b7cfa","#121c48"], motif:"network", mins:120, cap:40, mode:"In person", approval:false, hide:false, plus:false, maxPlus:0, cert:false,
    questions:["Team or department","Dietary needs"], bring:[] },
  cinema:    { vis:"public", label:"Cinema meetup", emoji:"🎬", c:["#e2473b","#1a0b16"], motif:"film", mins:180, cap:12, mode:"In person", approval:false, hide:false, plus:true, maxPlus:1, cert:false,
    questions:["Snack order?"], bring:[] },
  sippaint:  { vis:"public", label:"Sip & paint", emoji:"🎨", c:["#FF5FA2","#2A1A6E"], motif:"splatter", mins:180, cap:30, mode:"In person", approval:false, hide:false, plus:true, maxPlus:1, cert:false,
    questions:["Any experience painting?","Dietary needs"], bring:[] },
  wedding:   { vis:"private", label:"Wedding", emoji:"💍", c:["#e8c39e","#5a2238"], motif:"petals", mins:480, cap:200, mode:"In person", approval:true, hide:false, plus:true, maxPlus:1, cert:false,
    questions:["Dietary needs","A song that will get you on the dance floor"], bring:[] },
  babyshower:{ vis:"private", label:"Baby shower", emoji:"🍼", c:["#8fd0ef","#5546aa"], motif:"bubbles", mins:180, cap:30, mode:"In person", approval:false, hide:true, plus:false, maxPlus:0, cert:false,
    questions:["Guess the baby's weight!","Dietary needs"], bring:["Nappies (any size)","Baby wipes","A note for the baby"] },
  naming:    { vis:"private", label:"Naming ceremony", emoji:"🌿", c:["#f0b03c","#4a2810"], motif:"rays", mins:240, cap:80, mode:"In person", approval:false, hide:false, plus:true, maxPlus:2, cert:false,
    questions:["Dietary needs"], bring:[] },
  dinner:    { vis:"private", label:"Dinner party", emoji:"🍷", c:["#b33a55","#1c0e1a"], motif:"petals", mins:180, cap:10, mode:"In person", approval:false, hide:true, plus:true, maxPlus:1, cert:false,
    questions:["Dietary needs"], bring:["Dessert","Wine or soft drinks","Bread"] },
  other:     { vis:"public", label:"Other", sub:"Create your own", emoji:"✨", c:["#8b7cf6","#191b4a"], motif:"orbits", mins:120, cap:50, mode:"In person", approval:false, hide:false, plus:true, maxPlus:1, cert:false, questions:[], bring:[] }
};

const money = (n, cur = "NGN") => n === 0 ? "Free" : (cur === "GBP" ? "£" : "₦") + Number(n).toLocaleString("en-GB");
/** Moona (free): up to 100 guests per event, counting plus-ones. Moona Pro and Event Boost lift it. */
// ---------- categories: the filters on What's on ----------
export const CATEGORIES = [
  { key: "business", label: "Business", emoji: "💼" },
  { key: "learning", label: "Learning", emoji: "🎓" },
  { key: "social",   label: "Social",   emoji: "🎉" },
  { key: "family",   label: "Family",   emoji: "🧸" },
] as const;
export type Category = (typeof CATEGORIES)[number]["key"];
/** Default category for each occasion. Hosts can change it on public events. Keep in step with public.kind_category() in schema.sql. */
export const KIND_CAT: Record<string, Category> = {
  launch: "business", committee: "business", teammeet: "business", retreat: "business",
  webinar: "learning", workshop: "learning", training: "learning",
  lunch: "social", cinema: "social", sippaint: "social", dinner: "social", catchup: "social", hen: "social", other: "social",
  birthday: "family", playdate: "family", wedding: "family", babyshower: "family", naming: "family",
};
export const isCategory = (v: unknown): v is Category => CATEGORIES.some((c) => c.key === v);
export const categoryOf = (ev: { kind: string; category?: string | null }): Category =>
  isCategory(ev.category) ? ev.category : KIND_CAT[ev.kind] || "social";

export const PRO_PRICE_NGN = 50000;       // Moona Pro, introductory annual price (first 500 subscribers, fixed 2 years)
export const PRO_LIST_PRICE_NGN = 100000; // usual annual price after the first 500
export const BOOST_PRICE_NGN = 10000;
export const TICKET_FEE_FREE = 0.05;  // Moona fee on paid tickets, free plan
export const TICKET_FEE_PRO = 0.035;  // Moona fee on paid tickets, Moona Pro
const FREE_GUEST_CAP = 100;
export { FREE_GUEST_CAP, mulberry, hashStr, fmt, dayLabel, timeLabel, tzShort, ymd, tzOffsetMs, zonedToIso, gcalStamp, untilLabel, AV, initials, SYNODIC, moonInfo, cap1, KINDS, money };
