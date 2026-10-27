// ===== Supabase 연결 정보 (공개 키만 사용) =====
const SUPABASE_URL = "https://bxamxkiokjcjnktppung.supabase.co";
const SUPABASE_KEY = "sb_publishable_WsZYigFVEGAQ4VYqqRhrEw_bgVVDMDg";

// Supabase 표에 요청을 보내는 공통 함수
async function api(path, options = {}) {
  const res = await fetch(SUPABASE_URL + "/rest/v1/" + path, {
    ...options,
    headers: {
      apikey: SUPABASE_KEY,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  return res;
}

async function getJson(path) {
  const res = await api(path);
  if (!res.ok) throw new Error("불러오기 실패 (" + res.status + ")");
  return res.json();
}

// http/https 주소만 연다 (이상한 주소는 막기)
function safeUrl(url) {
  return typeof url === "string" && /^https?:\/\//i.test(url) ? url : "";
}

function $(id) {
  return document.getElementById(id);
}

// ===== 이 브라우저의 번호(client_id)와 좋아요 기록 =====
function getClientId() {
  let id = null;
  try { id = localStorage.getItem("resume_client_id"); } catch (e) {}
  if (!id) {
    id = window.crypto && crypto.randomUUID
      ? crypto.randomUUID()
      : Date.now().toString(36) + Math.random().toString(36).slice(2, 12);
    try { localStorage.setItem("resume_client_id", id); } catch (e) {}
  }
  return id;
}

function getLiked() {
  try {
    return JSON.parse(localStorage.getItem("resume_liked") || "[]");
  } catch (e) {
    return [];
  }
}

function saveLiked(projectId) {
  const liked = getLiked();
  if (!liked.includes(projectId)) liked.push(projectId);
  try { localStorage.setItem("resume_liked", JSON.stringify(liked)); } catch (e) {}
}

const clientId = getClientId();

// ===== 프로필 =====
async function loadProfile() {
  const rows = await getJson("profile?id=eq.1&select=*");
  const p = rows[0];
  if (!p) return;

  document.title = p.name ? p.name + " · 포트폴리오" : "포트폴리오";

  const photo = safeUrl(p.photo_url);
  if (photo) $("photo").style.backgroundImage = 'url("' + photo + '")';

  $("name").textContent = p.name;
  $("title").textContent = p.title;
  $("badge").textContent = p.career_badge;
  $("c-name").textContent = p.name;
  $("c-email").textContent = p.email;
  $("c-phone").textContent = p.phone;
  $("c-location").textContent = p.location;

  // 한 줄 소개: 이름 부분에만 파란 밑줄
  const headline = $("headline");
  headline.textContent = "";
  const at = p.name ? p.headline.indexOf(p.name) : -1;
  if (at >= 0) {
    const hl = document.createElement("span");
    hl.className = "hl";
    hl.textContent = p.name;
    headline.append(p.headline.slice(0, at), hl, p.headline.slice(at + p.name.length));
  } else {
    headline.textContent = p.headline;
  }

  $("intro").textContent = p.intro;
  $("education").textContent = p.education;
  $("skills").textContent = p.skills;
  $("experience").textContent = p.experience;
  $("quote").textContent = p.quote;
}

// ===== 포트폴리오 카드 =====

// 카드 하나의 좋아요 수 세기
async function countLikes(projectId) {
  const res = await api("likes?select=id&project_id=eq." + projectId, {
    method: "HEAD",
    headers: { Prefer: "count=exact" },
  });
  const range = res.headers.get("Content-Range") || "";  // 예: "0-2/3" 또는 "*/0"
  const total = parseInt(range.split("/")[1], 10);
  return isNaN(total) ? 0 : total;
}

function heartSvg() {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  const path = document.createElementNS(ns, "path");
  path.setAttribute("d", "M12 21s-8-5.5-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.5-8 11-8 11z");
  svg.appendChild(path);
  return svg;
}

function makeCard(project, likeCount) {
  const card = document.createElement("article");
  card.className = "card";

  // 카드를 누르면 첨부 파일, 없으면 썸네일을 새 탭으로
  const link = safeUrl(project.file_url) || safeUrl(project.thumbnail_url);
  const open = document.createElement("button");
  open.type = "button";
  open.className = "card-open";
  if (link) {
    open.addEventListener("click", () => window.open(link, "_blank", "noopener"));
  } else {
    open.disabled = true;
  }

  // 브라우저 창 모양 썸네일
  const browser = document.createElement("div");
  browser.className = "browser";
  const bar = document.createElement("div");
  bar.className = "browser-bar";
  bar.append(document.createElement("span"), document.createElement("span"), document.createElement("span"));
  const view = document.createElement("div");
  view.className = "browser-view";
  const thumb = safeUrl(project.thumbnail_url);
  if (thumb) view.style.backgroundImage = 'url("' + thumb + '")';
  browser.append(bar, view);

  // 글자 부분
  const body = document.createElement("div");
  body.className = "card-body";

  const meta = document.createElement("p");
  meta.className = "card-meta";
  meta.textContent = [project.number, project.category].filter(Boolean).join(" · ");

  const title = document.createElement("h4");
  title.className = "card-title";
  title.textContent = project.title;

  const desc = document.createElement("p");
  desc.className = "card-desc";
  desc.textContent = project.description;

  const tags = document.createElement("div");
  tags.className = "tags";
  (project.tags || []).forEach((t) => {
    const tag = document.createElement("span");
    tag.className = "tag";
    tag.textContent = t;
    tags.appendChild(tag);
  });

  body.append(meta, title, desc, tags);
  open.append(browser, body);

  // 좋아요 버튼
  const like = document.createElement("button");
  like.type = "button";
  like.className = "like";
  const num = document.createElement("span");
  num.textContent = likeCount;
  like.append(heartSvg(), num);

  let count = likeCount;
  if (getLiked().includes(project.id)) like.classList.add("liked");

  like.addEventListener("click", async () => {
    if (like.classList.contains("liked") || like.disabled) return;
    like.disabled = true;
    try {
      const res = await api("likes", {
        method: "POST",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ project_id: project.id, client_id: clientId }),
      });
      if (res.ok) {
        count += 1;
        num.textContent = count;
        saveLiked(project.id);
        like.classList.add("liked");
      } else if (res.status === 409) {
        // 이 브라우저는 이미 눌렀던 카드
        saveLiked(project.id);
        like.classList.add("liked");
      } else {
        alert("좋아요를 남기지 못했어요. 잠시 후 다시 눌러 주세요.");
      }
    } catch (e) {
      alert("좋아요를 남기지 못했어요. 인터넷 연결을 확인해 주세요.");
    }
    like.disabled = false;
  });

  card.append(open, like);
  return card;
}

async function loadProjects() {
  const box = $("cards");
  const projects = await getJson("projects?select=*&order=sort_order.asc,id.asc");
  const counts = await Promise.all(projects.map((p) => countLikes(p.id).catch(() => 0)));

  box.textContent = "";
  if (projects.length === 0) {
    const empty = document.createElement("p");
    empty.className = "note";
    empty.textContent = "아직 등록된 프로젝트가 없어요.";
    box.appendChild(empty);
    return;
  }
  projects.forEach((p, i) => box.appendChild(makeCard(p, counts[i])));
}

// ===== 방명록 =====
function formatDate(iso) {
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, "0");
  return d.getFullYear() + "." + pad(d.getMonth() + 1) + "." + pad(d.getDate()) +
    " " + pad(d.getHours()) + ":" + pad(d.getMinutes());
}

function makeEntry(row) {
  const li = document.createElement("li");
  const head = document.createElement("div");
  head.className = "gb-head";
  const nick = document.createElement("span");
  nick.className = "gb-nick";
  nick.textContent = row.nickname;
  const date = document.createElement("span");
  date.className = "gb-date";
  date.textContent = formatDate(row.created_at);
  head.append(nick, date);

  const msg = document.createElement("p");
  msg.className = "gb-msg";
  msg.textContent = row.message;

  li.append(head, msg);
  return li;
}

async function loadGuestbook() {
  const list = $("gb-list");
  const rows = await getJson("resume_guestbook?select=*&order=created_at.desc&limit=100");
  list.textContent = "";
  rows.forEach((row) => list.appendChild(makeEntry(row)));
  $("gb-status").textContent = rows.length === 0 ? "첫 번째 글을 남겨 주세요." : "";
}

async function submitGuestbook() {
  const nickInput = $("gb-nickname");
  const msgInput = $("gb-message");
  const status = $("gb-status");
  const button = $("gb-submit");
  const nickname = nickInput.value.trim();
  const message = msgInput.value.trim();

  if (!nickname || !message) {
    status.textContent = "별명과 한마디를 모두 적어 주세요.";
    return;
  }

  button.disabled = true;
  status.textContent = "남기는 중…";
  try {
    const res = await api("resume_guestbook", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ nickname, message }),
    });
    if (!res.ok) throw new Error();
    const [row] = await res.json();
    $("gb-list").prepend(makeEntry(row));  // 목록 맨 위에
    msgInput.value = "";
    status.textContent = "";
  } catch (e) {
    status.textContent = "남기지 못했어요. 잠시 후 다시 시도해 주세요.";
  }
  button.disabled = false;
}

$("gb-submit").addEventListener("click", submitGuestbook);
$("gb-message").addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.isComposing) submitGuestbook();
});

// ===== 시작 =====
loadProfile().catch(() => {
  $("headline").textContent = "프로필을 불러오지 못했어요.";
});
loadProjects().catch(() => {
  $("cards").textContent = "프로젝트를 불러오지 못했어요.";
});
loadGuestbook().catch(() => {
  $("gb-status").textContent = "방명록을 불러오지 못했어요.";
});
