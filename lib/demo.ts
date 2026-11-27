// Sample events used when Supabase isn't connected yet (demo mode).
import { categoryOf, zonedToIso } from "./core";
import type { EventVM } from "./types";

const base = {
  mins: 180, tz: "Africa/Lagos", mode: "In person" as const, hide: false, approval: false, plus: false, maxPlus: 0,
  cur: "NGN" as const, cert: false, cpd: 0, sponsors: [] as string[], maybe: 0, guestCap: 100,
};
let n = 0;
const id = () => `demo-${++n}`;
const tiers = (...t: [string, number][]) => t.map(([name, price]) => ({ id: id(), name, price }));
const qs = (...q: string[]) => q.map((label) => ({ id: id(), label, is_child: /child/i.test(label) }));
const items = (...i: [string, string | null][]) => i.map(([item, takenBy]) => ({ id: id(), item, takenBy }));

const RAW: (Omit<EventVM, "category"> & { category?: EventVM["category"] })[] = [
  { ...base, id: id(), slug: "brightwell-launch", kind: "launch", visibility: "public", title: "Brightwell Business Account: Launch Night",
    host: "Brightwell Finance", start: zonedToIso("2026-12-03", "18:30", "Africa/Lagos"), venue: "Landmark Centre, Water Corporation Drive, Victoria Island, Lagos",
    area: "Victoria Island, Lagos", guestCap: 100000, approval: true, plus: true, maxPlus: 1, capacity: 150, sponsors: ["Eko Ventures", "Harbour Chambers", "Studio 9"],
    tiers: tiers(["Guest", 0]), questions: qs("Company or organisation", "How did you hear about us?"), bring: [], going: 54, maybe: 10,
    about: "We're launching the Brightwell Business Account and we'd love you in the room.\n\nA short live demo, a conversation with three of our first SME customers, then music and food.\n\n• Live product demo at 7pm\n• Founder Q&A\n• Cocktails and canapés until late" },
  { ...base, id: id(), slug: "rooftop-cinema", kind: "cinema", visibility: "public", title: "Rooftop Cinema: Nollywood Classics Night",
    host: "Eko Screen Club", start: zonedToIso("2026-12-19", "19:30", "Africa/Lagos"), venue: "Admiralty Road, Lekki Phase 1, Lagos", area: "Lekki Phase 1, Lagos",
    plus: true, maxPlus: 1, capacity: 80, tiers: tiers(["Standard", 8000], ["With popcorn combo", 12000]), questions: qs("Snack order?"), bring: [], going: 46, maybe: 7,
    about: "Under the stars with the films that made us. Two Nollywood classics, deckchairs, small chops and a bar.\n\n• Doors 7:30pm, first film 8pm\n• Blankets provided\n• Strictly 18+" },
  { ...base, id: id(), slug: "ai-contracts-webinar", kind: "webinar", visibility: "public", title: "AI and Your Contracts: Live Webinar",
    host: "Lagos Founders Circle", start: zonedToIso("2026-12-10", "15:00", "Africa/Lagos"), mins: 60, mode: "Online", venue: "Online · Zoom link emailed after you register", area: "Online",
    capacity: 100, cert: true, cpd: 1, tiers: tiers(["Free", 0]), questions: qs("Job title and organisation", "What would you like the speakers to cover?"), bring: [], going: 86, maybe: 11,
    about: "Practical, plain-English guidance for founders and small business owners on using AI tools without putting your contracts, client data or brand at risk.\n\nBring your questions: the last 20 minutes are open Q&A.\n\n• 45 minutes plus live Q&A\n• Joining link emailed when you register\n• Certificate of attendance for everyone who joins" },
  { ...base, id: id(), slug: "sip-paint", kind: "sippaint", visibility: "public", title: "Detty December Sip & Paint",
    host: "Canvas & Co Lagos", start: zonedToIso("2026-12-20", "16:00", "Africa/Lagos"), venue: "Bourdillon Road, Ikoyi, Lagos", area: "Ikoyi, Lagos",
    plus: true, maxPlus: 1, capacity: 30, tiers: tiers(["Ticket (all materials)", 15000]), questions: qs("Any experience painting?"), bring: [], going: 22, maybe: 4,
    about: "Paint, sip and unwind before the December madness kicks in. No experience needed, we'll guide you from blank canvas to masterpiece.\n\n• All materials and two drinks included\n• Take your painting home\n• Come solo or bring your crew" },
  { ...base, id: id(), slug: "zara-turns-7", kind: "birthday", visibility: "private", title: "Zara turns 7! Unicorn Party",
    host: "Kemi Adeyemi (Zara's mum)", start: zonedToIso("2026-12-05", "14:00", "Africa/Lagos"), venue: "Admiralty Way, Lekki Phase 1, Lagos", area: "Lekki Phase 1, Lagos",
    plus: true, maxPlus: 2, capacity: 25, tiers: tiers(["Guest", 0]), questions: qs("Child's name and age", "Allergies or dietary needs"),
    bring: items(["Paper plates and cups", "Ngozi"], ["Juice and water", null], ["Small chops tray", "Tunde"], ["Party bags", null]), going: 19, maybe: 3,
    about: "Zara is turning 7 and we're celebrating with unicorns, glitter and far too much cake!\n\nDrop-off from 2pm, pick-up at 5pm. Parents are welcome to stay for a drink.\n\n• Face painting and a bouncy castle\n• Pizza, small chops and cake\n• Party bags for every child" },
  { ...base, id: id(), slug: "ife-playdate", kind: "playdate", visibility: "private", title: "Ife's December Playdate",
    host: "Funmi Bello", start: zonedToIso("2026-12-12", "11:00", "Africa/Lagos"), mins: 180, venue: "Bourdillon Road, Ikoyi, Lagos", area: "Ikoyi, Lagos",
    hide: true, approval: true, capacity: 8, tiers: tiers(["Guest", 0]), questions: qs("Child's name and age", "Allergies or medical notes", "Who's dropping off and collecting?"),
    bring: items(["Snacks to share", null], ["Change of clothes", null], ["A favourite toy or game", "Ada"], ["Water bottle", null]), going: 5, maybe: 1,
    about: "A fun Saturday playdate for Ife and her friends. Games, crafts and a picnic lunch in the garden.\n\nI'll confirm each spot personally, so please add allergies and who's dropping off and collecting.\n\n• Drop-off 11am\n• Pick-up 2pm\n• Parents welcome to stay for a cup of tea" },
  { ...base, id: id(), slug: "family-fun-day", kind: "other", category: "family", visibility: "public", title: "Christmas Family Fun Day",
    host: "Lekki Community Club", start: zonedToIso("2026-12-20", "11:00", "Africa/Lagos"), mins: 300, venue: "Lekki Leisure Lake, Lekki, Lagos", area: "Lekki, Lagos",
    plus: true, maxPlus: 3, capacity: 100, tiers: tiers(["Free entry", 0]), questions: qs("Number of children coming"), bring: [], going: 64, maybe: 9,
    about: "A relaxed day out for the whole family before Christmas. Face painting, bouncy castles, a visit from Father Christmas and food stalls.\n\n• 11am to 4pm\n• Children must be with an adult\n• Free entry, register so we can plan numbers" },
];

export const DEMO_EVENTS: EventVM[] = RAW.map((e) => ({ ...e, category: categoryOf(e) }));
