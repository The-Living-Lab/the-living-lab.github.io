const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const dist = path.join(root, "dist");

function copyDir(src, dest, shouldSkip, scope) {
  if (!fs.existsSync(src)) return;
  const base = scope || src;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    const rel = path.relative(base, from).replace(/\\/g, "/");
    if (shouldSkip && shouldSkip(rel)) continue;
    if (entry.isDirectory()) copyDir(from, to, shouldSkip, base);
    else fs.copyFileSync(from, to);
  }
}

function isHidden(entry) {
  return String(entry && entry.status || "").trim().toLowerCase() === "hidden";
}

function projectPublishSets() {
  const dir = path.join(root, "projects");
  const hiddenJson = new Set();
  const hiddenHtml = new Set();
  const publishedHtml = new Set();
  if (!fs.existsSync(dir)) return { hiddenJson, hiddenHtml, publishedHtml };
  for (const name of fs.readdirSync(dir)) {
    if (!name.endsWith(".json")) continue;
    const project = JSON.parse(fs.readFileSync(path.join(dir, name), "utf8"));
    const htmlValue = fieldValue(project.html_file || project.student_file);
    const htmlLink = localHtmlPath(htmlValue).split(/[?#]/)[0];
    if (isHidden(project)) {
      hiddenJson.add(name);
      if (htmlLink) hiddenHtml.add(htmlLink);
    } else if (htmlLink) {
      publishedHtml.add(htmlLink);
    }
  }
  return { hiddenJson, hiddenHtml, publishedHtml };
}

fs.mkdirSync(dist, { recursive: true });
for (const entry of fs.readdirSync(dist)) {
  fs.rmSync(path.join(dist, entry), { recursive: true, force: true });
}
fs.copyFileSync(path.join(root, "index.html"), path.join(dist, "index.html"));
fs.mkdirSync(path.join(dist, "team"), { recursive: true });
fs.copyFileSync(path.join(root, "team", "index.html"), path.join(dist, "team", "index.html"));
const eventsFile = path.join(root, "events.json");
const events = JSON.parse(fs.readFileSync(eventsFile, "utf8"));
const publishedEvents = Array.isArray(events) ? events.filter((event) => !isHidden(event)) : [];
fs.writeFileSync(path.join(dist, "events.json"), JSON.stringify(publishedEvents, null, 2) + "\n");
copyDir(path.join(root, "assets"), path.join(dist, "assets"));
copyDir(path.join(root, "media"), path.join(dist, "media"));
const projectSets = projectPublishSets();
copyDir(path.join(root, "projects"), path.join(dist, "projects"), (rel) => {
  const fileName = rel.split("/").pop();
  if (fileName.endsWith(".json") && projectSets.hiddenJson.has(fileName)) return true;
  const publicPath = `/projects/${rel}`;
  return projectSets.hiddenHtml.has(publicPath) && !projectSets.publishedHtml.has(publicPath);
});
copyDir(path.join(root, "events"), path.join(dist, "events"));
fs.mkdirSync(path.join(dist, "news"), { recursive: true });
fs.copyFileSync(path.join(root, "news", "index.html"), path.join(dist, "news", "index.html"));

function fieldValue(value) {
  if (!value) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "object") return String(value.src || value.path || value.url || "").trim();
  return "";
}

function isHttp(value) {
  return /^https?:\/\//i.test(value);
}

function localHtmlPath(value) {
  if (!value || isHttp(value)) return "";
  const queryAt = value.search(/[?#]/);
  const filePath = (queryAt === -1 ? value : value.slice(0, queryAt)).replace(/\\/g, "/");
  const suffix = queryAt === -1 ? "" : value.slice(queryAt);
  const withSlash = filePath.startsWith("projects/html/") ? `/${filePath}` : filePath;
  if (!withSlash.startsWith("/projects/html/") || withSlash.includes("..") || !/\.html?$/i.test(withSlash)) return "";
  return withSlash + suffix;
}

function projectType(value) {
  const type = String(value || "").toLowerCase();
  if (type === "html" || type === "html file") return "html";
  if (type === "app" || type === "deployed app") return "app";
  return "";
}

function nameList(value) {
  if (!value) return [];
  const items = Array.isArray(value) ? value : [value];
  return items.flatMap((item) => {
    if (typeof item === "string") {
      const text = item.trim();
      return text ? [text] : [];
    }
    if (item && typeof item === "object") {
      const text = String(item.name || item.label || item.value || "").trim();
      return text ? [text] : [];
    }
    return [];
  });
}

function projectLink(project) {
  const type = projectType(project.project_type);
  const appLink = fieldValue(project.live_link);
  const htmlValue = fieldValue(project.html_file || project.student_file);
  const htmlLink = localHtmlPath(htmlValue) || (isHttp(htmlValue) && /\.html?($|[?#])/i.test(htmlValue) ? htmlValue : "");
  if (type === "html") return htmlLink;
  if (type === "app") return isHttp(appLink) ? appLink : "";
  if (isHttp(appLink)) return appLink;
  return htmlLink;
}

const projectsDir = path.join(root, "projects");
const projects = [];
if (fs.existsSync(projectsDir)) {
  for (const name of fs.readdirSync(projectsDir)) {
    if (!name.endsWith(".json")) continue;
    const project = JSON.parse(fs.readFileSync(path.join(projectsDir, name), "utf8"));
    const description = project.description || project.summary || "";
    const liveLink = projectLink(project);
    if (!project.title || !liveLink || isHidden(project)) continue;
    projects.push({
      title: String(project.title),
      authors: nameList(project.author),
      guest_authors: nameList(project.guest_authors),
      description: String(description),
      thumbnail: project.thumbnail ? String(project.thumbnail) : "",
      project_type: projectType(project.project_type) || (isHttp(liveLink) ? "app" : "html"),
      live_link: liveLink
    });
  }
}
projects.sort((a, b) => a.title.localeCompare(b.title));
const manifest = JSON.stringify(projects, null, 2);
fs.writeFileSync(path.join(dist, "projects.json"), manifest);
fs.writeFileSync(path.join(root, "projects.json"), manifest);
console.log(`Wrote ${projects.length} project(s) to projects.json`);

const teamDir = path.join(root, "team");
const rootTeamPath = path.join(root, "team.json");
const team = [];
const teamRecordsAll = [];
let sawTeamFiles = false;
if (fs.existsSync(teamDir)) {
  for (const name of fs.readdirSync(teamDir)) {
    if (!name.endsWith(".json")) continue;
    sawTeamFiles = true;
    const person = JSON.parse(fs.readFileSync(path.join(teamDir, name), "utf8"));
    if (!person || !person.name) continue;
    const record = {
      name: String(person.name),
      role: person.role ? String(person.role) : "",
      focused_role: person.focused_role ? String(person.focused_role) : (person.focus ? String(person.focus) : ""),
      photo: fieldValue(person.photo),
      link: person.link ? String(person.link).trim() : ""
    };
    teamRecordsAll.push(record);
    if (!isHidden(person)) team.push(record);
  }
}
if (sawTeamFiles) {
  const teamManifest = JSON.stringify(team, null, 2);
  fs.writeFileSync(path.join(dist, "team.json"), teamManifest);
  fs.writeFileSync(rootTeamPath, teamManifest);
  console.log(`Wrote ${team.length} team member(s) to team.json`);
} else if (fs.existsSync(rootTeamPath)) {
  const saved = JSON.parse(fs.readFileSync(rootTeamPath, "utf8"));
  const published = Array.isArray(saved) ? saved.filter((person) => !isHidden(person)) : [];
  const teamManifest = JSON.stringify(published, null, 2);
  fs.writeFileSync(path.join(dist, "team.json"), teamManifest);
  fs.writeFileSync(rootTeamPath, teamManifest);
  console.log(`No team member files found; copied existing team.json (${published.length} member(s)) to dist/`);
} else {
  fs.writeFileSync(path.join(dist, "team.json"), "[]\n");
  console.log("No team members found; wrote an empty team.json to dist/");
}
function slugify(value) {
  return String(value || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function loadTeamRecords() {
  if (team.length > 0) return team;
  if (!fs.existsSync(rootTeamPath)) return [];
  const saved = JSON.parse(fs.readFileSync(rootTeamPath, "utf8"));
  return Array.isArray(saved) ? saved : [];
}

const teamRecords = teamRecordsAll.length > 0 ? teamRecordsAll : loadTeamRecords();
const teamByName = new Map(teamRecords.map((person) => [person.name.trim().toLowerCase(), person]));
const newsDir = path.join(root, "news");
const news = [];
if (fs.existsSync(newsDir)) {
  for (const name of fs.readdirSync(newsDir)) {
    if (!name.endsWith(".json")) continue;
    const article = JSON.parse(fs.readFileSync(path.join(newsDir, name), "utf8"));
    const slug = slugify(name.replace(/\.json$/i, ""));
    if (!article || !article.title || !slug || isHidden(article)) continue;
    const date = String(article.date || "").slice(0, 10);
    news.push({
      slug,
      title: String(article.title),
      date: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : "",
      summary: article.summary ? String(article.summary) : "",
      body: article.body ? String(article.body) : "",
      image: fieldValue(article.image),
      authors: nameList(article.author).map((authorName) => {
        const person = teamByName.get(authorName.toLowerCase());
        return {
          name: authorName,
          photo: person ? fieldValue(person.photo) : "",
          link: person && person.link ? String(person.link) : ""
        };
      }),
      guest_authors: nameList(article.guest_authors)
    });
  }
}
news.sort((a, b) => (b.date || "").localeCompare(a.date || "") || a.title.localeCompare(b.title));
const newsManifest = JSON.stringify(news, null, 2);
fs.writeFileSync(path.join(dist, "news.json"), newsManifest);
fs.writeFileSync(path.join(root, "news.json"), newsManifest);
const articleTemplate = fs.readFileSync(path.join(root, "news", "article.html"), "utf8");
for (const article of news) {
  const articleDir = path.join(dist, "news", article.slug);
  fs.mkdirSync(articleDir, { recursive: true });
  fs.writeFileSync(path.join(articleDir, "index.html"), articleTemplate.replaceAll("__ARTICLE_SLUG__", article.slug));
}
console.log(`Wrote ${news.length} news article(s) to news.json`);
console.log("Copied index.html, assets/, media/, team/, events/, news/, and projects/ to dist/");
