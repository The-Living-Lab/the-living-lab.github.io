const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const eventsFile = path.join(root, "events.json");
const archiveDir = path.join(root, "past-events");
const calendarUrl = "https://www.gse.upenn.edu/news-and-events/events-calendar";
const pageCap = 30;

function textFrom(html) {
  return String(html || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#(\d+);/g, (_, digits) => String.fromCharCode(Number(digits)))
    .replace(/&#x([0-9a-f]+);/gi, (_, digits) => String.fromCharCode(parseInt(digits, 16)))
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#039;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function dateKey(value) {
  const text = String(value || "").slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : "";
}

function todayKey() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date());
  const find = (type) => parts.find((part) => part.type === type).value;
  return `${find("year")}-${find("month")}-${find("day")}`;
}

function dateFromStamp(stamp) {
  const date = new Date(Number(stamp) * 1000);
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const find = (type) => parts.find((part) => part.type === type).value;
  return `${find("year")}-${find("month")}-${find("day")}`;
}

function clockMinutes(time) {
  const match = String(time || "").match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return 24 * 60;
  let hour = Number(match[1]) % 12;
  if (/pm/i.test(match[3])) hour += 12;
  return hour * 60 + Number(match[2]);
}

function isHidden(entry) {
  return String(entry && entry.status || "").trim().toLowerCase() === "hidden";
}

function isGse(entry) {
  return String(entry && entry.source || "").trim().toLowerCase() === "gse";
}

function isPast(entry, today) {
  const key = dateKey(entry && entry.date);
  return Boolean(key && key < today);
}

function slug(value) {
  const text = String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return text || "event";
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function writeJson(file, value) {
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + "\n");
}

function loadCurrentEvents() {
  if (!fs.existsSync(eventsFile)) return [];
  const events = readJson(eventsFile);
  if (!Array.isArray(events)) throw new Error("events.json is not a list");
  return events;
}

function loadArchive() {
  const byId = new Map();
  if (!fs.existsSync(archiveDir)) return byId;
  for (const name of fs.readdirSync(archiveDir)) {
    if (!name.endsWith(".json")) continue;
    const event = readJson(path.join(archiveDir, name));
    if (!event || typeof event !== "object") continue;
    const id = String(event.source_id || name.replace(/\.json$/, "")).trim();
    if (id) byId.set(id, { ...event, source_id: event.source_id || id, file: name });
  }
  return byId;
}

function eventBlocks(html) {
  const blocks = [];
  const pattern = /<li class="node node--type-event[\s\S]*?(?=<li class="node node--type-event|<\/ul>)/g;
  for (const match of html.matchAll(pattern)) blocks.push(match[0]);
  return blocks;
}

function detailText(block, title) {
  const pattern = /<div class="event_list_item_detail">([\s\S]*?)<\/div>\s*(?=<div class="event_list_item_detail">|<\/div>\s*<\/div>\s*<\/li>)/g;
  for (const match of block.matchAll(pattern)) {
    const detail = match[1];
    const heading = detail.match(/event_list_item_detail_title">([\s\S]*?)<\/span>/);
    if (textFrom(heading ? heading[1] : "") !== title) continue;
    const label = detail.match(/event_list_item_detail_label">([\s\S]*)$/);
    return textFrom(label ? label[1] : "");
  }
  return "";
}

function parseEvent(block) {
  const titleMatch = block.match(/event_list_item_title_link_label">([\s\S]*?)<\/span>/);
  const linkMatch = block.match(/<a href="([^"]+)" class="event_list_item_title_link">/);
  const descriptionMatch = block.match(/event_list_item_description">([\s\S]*?)<\/div>/);
  const stampMatch = block.match(/datetime="(\d+)"/);
  const title = textFrom(titleMatch ? titleMatch[1] : "");
  const href = linkMatch ? linkMatch[1].replace(/&amp;/g, "&") : "";
  const date = stampMatch ? dateFromStamp(stampMatch[1]) : "";
  if (!title || !href || !date) return null;
  const sourceId = new URL(href, "https://www.gse.upenn.edu").pathname;
  const time = detailText(block, "Date & Time").replace(new RegExp(`^${textFrom(block.match(/event_list_item_detail_time_start">([\s\S]*?)<\/span>/)?.[1] || "")}(, \\d{4})?\\s*`), "").trim();
  const clock = textFrom((block.match(/event_list_item_detail_label_date">([\s\S]*?)<\/span>/) || [])[1]);
  return {
    title,
    status: "published",
    date,
    location: detailText(block, "Location"),
    summary: textFrom(descriptionMatch ? descriptionMatch[1] : ""),
    time: clock || time,
    link: new URL(href, "https://www.gse.upenn.edu").href,
    source: "gse",
    source_id: sourceId
  };
}

function nextPage(html, currentUrl) {
  const match = html.match(/pagination_arrow_right\s*"\s*href="([^"]+)"/);
  if (!match) return "";
  const next = new URL(match[1].replace(/&amp;/g, "&"), currentUrl).href;
  return next === currentUrl ? "" : next;
}

async function fetchCalendar() {
  const events = [];
  const seenPages = new Set();
  const seenIds = new Set();
  let url = calendarUrl;
  for (let page = 0; page < pageCap && url; page += 1) {
    if (seenPages.has(url)) break;
    seenPages.add(url);
    const response = await fetch(url, {
      headers: { "user-agent": "LivingLabEventsSync/1.0" }
    });
    if (!response.ok) throw new Error(`Penn GSE calendar returned ${response.status} for ${url}`);
    const html = await response.text();
    const blocks = eventBlocks(html);
    if (page === 0 && blocks.length === 0) throw new Error("Penn GSE calendar did not contain any events");
    if (blocks.length === 0) break;
    for (const block of blocks) {
      const event = parseEvent(block);
      if (!event || seenIds.has(event.source_id)) continue;
      seenIds.add(event.source_id);
      events.push(event);
    }
    url = nextPage(html, url);
  }
  return events;
}

function fileNameFor(event, usedNames) {
  const fromId = String(event.source_id || "").split("/").filter(Boolean).pop();
  let base = slug(fromId || `${event.title}-${event.date || ""}`);
  let name = `${base}.json`;
  let count = 2;
  while (usedNames.has(name)) {
    name = `${base}-${count}.json`;
    count += 1;
  }
  usedNames.add(name);
  return name;
}

function withHiddenStatus(event, previous) {
  if (previous && isHidden(previous)) return { ...event, status: "hidden" };
  return event;
}

async function main() {
  const today = todayKey();
  const current = loadCurrentEvents();
  const archive = loadArchive();
  let fetched;
  try {
    fetched = await fetchCalendar();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
    return;
  }
  if (!fetched.length) {
    console.error("Penn GSE calendar did not contain any events");
    process.exitCode = 1;
    return;
  }

  const previousById = new Map();
  for (const event of current) {
    if (event.source_id) previousById.set(event.source_id, event);
  }
  for (const [id, event] of archive) previousById.set(id, previousById.get(id) || event);

  const upcomingImported = fetched
    .filter((event) => dateKey(event.date) >= today)
    .map((event) => withHiddenStatus(event, previousById.get(event.source_id)))
    .sort((a, b) => a.date.localeCompare(b.date) || clockMinutes(a.time) - clockMinutes(b.time) || a.title.localeCompare(b.title));
  const importedIds = new Set(upcomingImported.map((event) => event.source_id));

  const kept = [];
  const toArchive = [];
  for (const event of current) {
    if (isGse(event)) {
      if (!importedIds.has(event.source_id) && isPast(event, today)) toArchive.push(event);
      continue;
    }
    if (isPast(event, today)) toArchive.push(event);
    else kept.push(event);
  }

  const usedNames = new Set(
    [...archive.values()].map((event) => event.file).filter(Boolean)
  );
  fs.mkdirSync(archiveDir, { recursive: true });
  for (const event of toArchive) {
    const sourceId = String(event.source_id || slug(`${event.title}-${event.date || ""}`)).trim();
    const previous = archive.get(sourceId);
    const record = withHiddenStatus({ ...event, source_id: sourceId }, previous);
    const file = previous && previous.file ? previous.file : fileNameFor(record, usedNames);
    const stored = { ...record };
    delete stored.file;
    writeJson(path.join(archiveDir, file), stored);
    archive.set(sourceId, { ...stored, file });
  }

  writeJson(eventsFile, kept.concat(upcomingImported));
  console.log(`Kept ${kept.length} hand-entered upcoming event(s)`);
  console.log(`Imported ${upcomingImported.length} upcoming Penn GSE event(s)`);
  console.log(`Archived ${toArchive.length} past event(s)`);
}

main();
