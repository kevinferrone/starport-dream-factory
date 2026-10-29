/* global DATA */
// A scripted tour of the Dream Factory. renderAt(t) is called with increasing t, once per frame.
const { GROUPS, KINDS } = DATA;
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");

// ---------------------------------------------------------------- pieces of the site
const CARDS_ICON = `<svg width="30" height="30" viewBox="0 0 48 48" aria-hidden><g stroke-linejoin="round"><rect x="6" y="11" width="20" height="28" rx="4" transform="rotate(-16 16 25)" fill="#2ed9a3" stroke="#23205a" stroke-width="2.5"/><rect x="22" y="11" width="20" height="28" rx="4" transform="rotate(16 32 25)" fill="#9b7bff" stroke="#23205a" stroke-width="2.5"/><rect x="14" y="7" width="20" height="30" rx="4" fill="#ff8a3d" stroke="#23205a" stroke-width="2.5"/><rect x="17.5" y="10.5" width="13" height="11" rx="2.5" fill="#fff6d6"/><path d="M24 12.2l1.5 3.1 3.4.5-2.5 2.4.6 3.4-3-1.6-3 1.6.6-3.4-2.5-2.4 3.4-.5z" fill="#ffcf33" stroke="#23205a" stroke-width="1.2"/><rect x="17.5" y="24.5" width="13" height="2.6" rx="1.3" fill="#fff" opacity="0.9"/><rect x="17.5" y="29" width="9" height="2.6" rx="1.3" fill="#fff" opacity="0.9"/></g></svg>`;

function topbar(signedIn, here) {
  const links = signedIn
    ? `<a class="icon-link" id="nav-home"><span class="emoji">🏠</span><span class="text">Home</span></a>
       <a class="icon-link" id="nav-cards">${CARDS_ICON}<span class="text">My cards</span></a>
       <button class="icon-link" aria-pressed="true"><span class="emoji">🔊</span><span class="text">Read aloud</span></button>
       <a class="icon-link" id="nav-grown"><span class="emoji">🔑</span><span class="text">Grown-ups</span></a>`
    : "";
  const maker =
    signedIn && here !== "home"
      ? `<nav class="maker-bar">${["creature", "equipment", "pet"]
          .map((k) => `<a class="maker ${k}${here === k ? " here" : ""}" id="mk-${k}"><img src="tiles/${k}.webp" alt=""><span>${KINDS[k].title}</span></a>`)
          .join("")}</nav>`
      : "";
  return `<header class="topbar"><a class="brand"><img class="mascot" src="flummox.webp" alt=""><span class="text">Dream Factory</span></a>${links}</header>${maker}`;
}
const footer = `<footer class="site-foot"><span>© 2026 Wider Path, LLC</span><a>Privacy policy</a><a>Terms</a><a>Contact</a></footer>`;

function screen(id, inner, here, signedIn = true) {
  return `<div class="screen" id="s-${id}"><div class="scroller"><div class="wrap">${topbar(signedIn, here)}<main>${inner}</main>${footer}</div></div></div>`;
}

// Cards: words wrapped one by one so "Read my card" can light them up.
let W = 0;
const words = (t) => t.split(/\s+/).filter(Boolean).map((w) => `<span class="w" data-w="${W++}">${esc(w)} </span>`).join("");
function card(kind, c) {
  W = 0;
  const title = words(c.name);
  const desc = words(c.description);
  let body = `<p class="desc">${desc}</p><div class="chips">${c.chips
    .map(([i, t]) => `<span class="chip"><span>${i}</span><span class="chip-text">${words(t)}</span></span>`)
    .join("")}</div>`;
  for (const r of c.rules) body += `<p class="rule${r.small ? " small" : ""}">${r.name ? `<strong>${words(r.name)}</strong>` : ""}${words(r.text)}</p>`;
  return `<article class="tcard ${kind}"><div class="inner"><img class="art" src="tiles/${kind}.webp" alt=""><div class="banner"><h3 class="card-title">${title}</h3><img class="kindmark" src="tiles/${kind}.webp" alt=""></div><div class="body">${body}</div><div class="foot">Starport Dream Factory</div></div></article>`;
}

const CARD = {
  creature: {
    name: "Tickletop Troll",
    description: "A wild-haired troll who tells knock-knock jokes all day and laughs loudest at its own punchlines.",
    chips: [["🎯", "Difficulty 12"], ["⭐", "Successes to defeat 3"]],
    rules: [
      { name: "Knock-Knock Ambush", text: "1 Player must succeed on a Smart roll against it or lose 2 tokens." },
      { name: "Giggle Fit", text: "Every Player loses 1 Sneaky token from laughing too hard." },
      { name: "Special: Tough Crowd", text: "Telling it a joke on a successful roll gains 2 successes instead of 1." },
    ],
  },
  equipment: {
    name: "Bottomless Backpack",
    description: "A cheerful backpack with a bedroll on top and a pocket that never, ever runs out of room.",
    chips: [["🪙", "Cost 25 Coins"], ["♾️", "Keep forever"]],
    rules: [
      { text: "Once per adventure, pull out any ordinary item you need. You also get +2 to your maximum Helpful tokens." },
      { text: "Using this item does not take your turn.", small: true },
    ],
  },
  pet: {
    name: "Jabber",
    description: "A chatty little monkey who waves hello to everyone and never stops talking.",
    chips: [["🪙", "Cost 12 Coins"]],
    rules: [
      { name: "Bonus", text: "+2 to your maximum Helpful tokens." },
      { name: "Smooth Talker", text: "Once per adventure, get +5 on one roll that involves talking." },
    ],
  },
};

function cardPage(kind) {
  return `<div class="card-stage" id="stage-${kind}">${card(kind, CARD[kind])}
    <button class="big-btn read-btn" id="read-${kind}"><span class="emoji">🔊</span><span class="lbl">Read my card</span></button>
    <div class="card-tools" id="tools-${kind}">
      <div class="actions">
        <button class="big-btn small plain" id="edit-${kind}"><span class="emoji">✏️</span>Edit my card</button>
        <button class="big-btn small mint" id="save-${kind}"><span class="emoji">💾</span><span class="lbl">Save my card</span></button>
        <button class="big-btn small gum" id="print-${kind}"><span class="emoji">🖨️</span>Print</button>
        <button class="big-btn small plain" id="pdf-${kind}"><span class="emoji">📄</span>Download PDF</button>
      </div>
    </div>
    <form class="card-editor panel" id="editor-${kind}" style="display:none">
      <h2><span class="emoji">✏️</span> Edit my card</h2>
      <p class="hint">Change any words or numbers. The picture stays the same.</p>
      <label class="edit-field"><span>Name</span><input type="text" id="ed-name" value="${CARD[kind].name}"></label>
      <label class="edit-field"><span>Description</span><textarea rows="3">${CARD[kind].description}</textarea></label>
      <div class="actions"><button class="big-btn small mint" type="button" id="ed-save"><span class="emoji">💾</span> Save changes</button><button class="big-btn small plain" type="button">Cancel</button></div>
    </form>
  </div>`;
}

function builder(kind) {
  const k = KINDS[kind];
  let html = `<div class="kind-${kind}"><div class="hero" style="padding-top:6px"><h1 class="build-title"><img src="tiles/${kind}.webp" alt="">${k.title}</h1></div>`;
  html += `<section class="panel drawing-panel" id="${kind}-drawing"><h2><span class="emoji">🖍️</span>Did you draw it? (optional)</h2><p class="hint">Take a photo of your drawing and the factory will bring it to life!</p><label class="pick drawing-pick" id="${kind}-addDrawing"><span class="emoji">📷</span>Add my drawing</label></section>`;
  for (const g of GROUPS[kind]) {
    const opt = (o) => `<button type="button" class="pick${g.id === "size" ? " wide" : ""}" aria-pressed="false" id="${kind}-${g.id}-${o.id}"><span class="emoji">${o.icon}</span>${esc(o.label)}</button>`;
    const grid = g.sections
      ? g.sections.map((s) => `<div><div class="section-title">${s.title}</div><div class="grid">${s.options.map(opt).join("")}</div></div>`).join("")
      : `<div class="grid">${g.options.map(opt).join("")}</div>`;
    html += `<section class="panel" id="${kind}-${g.id}"><h2><span class="emoji">${g.icon}</span>${g.title}</h2><p class="hint">${g.max === 1 ? "Pick 1" : `Pick up to ${g.max}`}, or skip it for a surprise</p>${grid}</section>`;
  }
  if (kind === "creature") {
    html += `<section class="panel" id="creature-diff"><h2><span class="emoji">🎯</span>Creature difficulty</h2><div class="dial"><span class="face" id="diff-face">🙂</span><span class="num" id="diff-num">10</span><input type="range" min="5" max="20" value="10" id="diff"></div></section>`;
  } else {
    html += `<section class="panel" id="${kind}-coins"><h2><span class="emoji">🪙</span>How many Coins is it worth?</h2><p class="hint">More Coins make it more powerful.</p><div class="dial"><span class="face" id="${kind}-coin-face">🎲</span><span class="num" id="${kind}-coin-num">?</span><input type="range" min="1" max="50" value="10" id="${kind}-coin"></div><button type="button" class="chip-toggle on" id="${kind}-factory">🎲 The factory picks</button></section>`;
  }
  html += `<section class="panel" id="${kind}-idea"><h2><span class="emoji">💭</span>Your idea (optional)</h2><p class="hint">Tell the factory anything else. A grown-up can help you type.</p><textarea class="idea" id="${kind}-ideabox" placeholder="It loves pancakes and is scared of puddles…"></textarea></section>`;
  html += `<div class="build-bar"><div style="text-align:center"><button class="big-btn" id="${kind}-build">${k.button}</button></div></div></div>`;
  return html;
}

const home = `<section class="hero"><h1><img class="logo" src="starport-logo.png" alt=""><span class="line2">Dream Factory</span></h1><p>Pick what you want to make. Press the buttons. Watch it come to life!</p></section>
<nav class="tiles">${["creature", "equipment", "pet"].map((k) => `<a class="tile ${k}" id="tile-${k}"><img class="tile-art" src="tiles/${k}.webp" alt="">${KINDS[k].title}</a>`).join("")}</nav>
<div class="meter"><span>⭐</span><span>18 of 20 creations left this month</span><a>Get more</a></div>`;

const login = `<section class="hero"><h1><img class="logo" src="starport-logo.png" alt=""><span class="line2">Dream Factory</span></h1><p>Build your own creatures, equipment and pets for Starport.</p></section>
<section class="panel" style="max-width:560px;margin:28px auto"><div class="form"><h2><span class="emoji">🔑</span> Grown-ups, sign in</h2>
<div class="gsi-box"><button type="button" class="google-btn" id="google"><svg width="22" height="22" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4.1 5.6l6.2 5.2C37 38.2 44 33 44 24c0-1.2-.1-2.3-.4-3.5z"/></svg>Continue with Google</button></div>
<div class="or"><span>or use your email</span></div>
<div class="form"><input type="email" placeholder="you@example.com" id="email"><button class="big-btn small" type="button"><span class="emoji">✨</span>Email me a sign-in link</button><button type="button" class="text-btn">I have a password</button></div>
<p class="hint">New here? Google or the sign-in link creates your account, with 3 free creations.</p></div></section>`;

const mini = (k) => `<a class="mini ${k}"><img src="tiles/${k}.webp" alt=""><span>${k === "creature" ? "Professor Tickles" : CARD[k].name}</span></a>`;
const myCards = `<div class="hero" style="padding-top:6px"><h1 style="font-size:56px;display:flex;align-items:center;justify-content:center;gap:12px">${CARDS_ICON.replace(/width="30" height="30"/, 'width="64" height="64"')} My cards</h1>
<div class="actions" style="margin-top:14px"><button class="big-btn small plain" id="sheet-all"><span class="emoji">🖨️</span>Print sheet of all my cards</button></div></div>
${["creature", "equipment", "pet"].map((k) => `<section class="shelf"><div class="shelf-head"><h2><img src="tiles/${k}.webp" alt="">${KINDS[k].title}<span class="count">(1)</span></h2><button class="big-btn small plain"><span class="emoji">🖨️</span>Print sheet of ${KINDS[k].title.toLowerCase()}</button></div><div class="gallery">${mini(k)}</div></section>`).join("")}`;

const gate = `<section class="panel gate"><h1><span>🔑</span> Grown-ups only</h1><p class="hint">This part is for parents. Please answer to continue.</p><div class="gate-form"><label class="gate-q">What is 7 × 8?</label><input type="text" id="gate-answer"><button class="big-btn small" type="button" id="gate-go">Continue</button></div></section>`;

const PLANS = [
  ["🌱", "Free", "$0", "3 creations to try it out"],
  ["⭐", "Star", "$4.99/month", "20 creations every month"],
  ["🌟", "Superstar", "$9.99/month", "50 creations every month"],
  ["💫", "Supernova", "$19.99/month", "100 creations every month"],
  ["🌌", "Galaxy", "$99/month", "Unlimited creations"],
];
const plans = `<div class="hero" style="padding-top:6px"><h1 style="font-size:56px"><span>🔑</span> Grown-ups</h1><p>18 of 20 creations left this month.</p></div>
<div class="plans">${PLANS.map(([i, n, p, b], idx) => `<div class="plan${idx === 1 ? " current" : ""}" id="plan-${idx}"><div style="font-size:52px">${i}</div><h2 style="margin:0">${n}</h2><div class="price">${p}</div><p class="hint">${b}</p>${idx === 1 ? `<span class="big-btn small plain">This is your plan</span>` : idx ? `<button class="big-btn small" style="width:100%">Choose ${n}</button>` : ""}</div>`).join("")}</div>
<section class="panel" style="max-width:560px;margin:0 auto 18px" id="reading"><div class="form"><h2><span class="emoji">📖</span> Card reading level</h2><p class="hint">New cards are written for this reader. The rules stay the same; only the words change.</p><select id="level"><option>Write cards for a 2nd grade reader</option></select><button class="big-btn small" type="button">Save reading level</button></div></section>`;

const machine = (kind, icons) => `<div class="machine" id="machine-${kind}" style="display:none"><div><div class="orbit"><div class="ring">${icons.map((i) => `<span>${i}</span>`).join("")}</div><div class="core"><img src="flummox.webp" alt=""></div></div><p>The Dream Factory is building…</p><small>Drawing the picture takes about a minute</small></div></div>`;

document.getElementById("screens").innerHTML = [
  screen("login", login, "", false),
  screen("home", home, "home"),
  screen("b-creature", builder("creature") + machine("creature", ["🦖", "🐙", "🦄", "👾"]), "creature"),
  screen("c-creature", cardPage("creature"), ""),
  screen("b-equipment", builder("equipment") + machine("equipment", ["🪄", "👑", "🧪", "🥾"]), "equipment"),
  screen("c-equipment", cardPage("equipment"), ""),
  screen("b-pet", builder("pet") + machine("pet", ["🐱", "🐸", "🦉", "🐰"]), "pet"),
  screen("c-pet", cardPage("pet"), ""),
  screen("cards", myCards, ""),
  screen("gate", gate, ""),
  screen("plans", plans, ""),
].join("");

// ---------------------------------------------------------------- the engine
const events = [];
const tweens = [];
const caps = [];
const says = [];
const rings = [];
let clock = 0;
let cur = { x: 1280 / 2, y: 720 / 2 };
let active = null;
const ease = (p) => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2);

const at = (t, fn) => events.push({ t, fn });
const tween = (t0, d, fn) => tweens.push({ t0, t1: t0 + d, fn, done: false });
function show(id) {
  at(clock, () => {
    document.querySelectorAll(".screen.on, .title-card.on").forEach((s) => s.classList.remove("on"));
    const el = document.getElementById(id.startsWith("intro") || id.startsWith("outro") ? id : `s-${id}`);
    el.classList.add("on");
    active = el;
  });
}
const wait = (s) => (clock += s);
const scrollY = (el) => {
  const m = /translateY\((-?[\d.]+)px\)/.exec(el.style.transform || "");
  return m ? -Number(m[1]) : 0;
};
/** Scroll the current page so `sel` sits `top` px from the top of the window. */
function scrollTo(sel, top = 110, d = 0.9) {
  const t0 = clock;
  at(t0, () => {
    const sc = $(".scroller", active);
    const from = scrollY(sc);
    const el = $(sel, active);
    const rect = el.getBoundingClientRect();
    const maxY = Math.max(0, sc.scrollHeight - 720);
    const to = Math.min(maxY, Math.max(0, from + rect.top - top));
    tween(t0, d, (p) => (sc.style.transform = `translateY(${-(from + (to - from) * p)}px)`));
  });
  clock += d;
}
/** Move the cursor onto an element (or a point). */
function moveTo(sel, d = 0.8, dx = 0, dy = 0) {
  const t0 = clock;
  at(t0, () => {
    let to;
    if (typeof sel === "string") {
      const r = $(sel, active).getBoundingClientRect();
      to = { x: r.left + r.width / 2 + dx, y: r.top + r.height / 2 + dy };
    } else to = sel;
    const from = { ...cur };
    tween(t0, d, (p) => (cur = { x: from.x + (to.x - from.x) * p, y: from.y + (to.y - from.y) * p }));
  });
  clock += d;
}
function click(fn, after = 0.35) {
  const t = clock;
  rings.push(t);
  if (fn) at(t + 0.12, fn);
  clock += after;
}
/** Drag a slider thumb from one value to another, with the cursor on the thumb. */
function slide(sel, a, b, d, onValue) {
  const pos = (el, v) => {
    const r = el.getBoundingClientRect();
    const min = Number(el.min), max = Number(el.max), thumb = 16;
    return { x: r.left + thumb / 2 + ((v - min) / (max - min)) * (r.width - thumb), y: r.top + r.height / 2 };
  };
  const t0 = clock;
  at(t0, () => {
    const el = $(sel, active);
    const from = { ...cur };
    const to = pos(el, a);
    tween(t0, 0.6, (p) => (cur = { x: from.x + (to.x - from.x) * p, y: from.y + (to.y - from.y) * p }));
  });
  clock += 0.6;
  rings.push(clock);
  clock += 0.15;
  const t1 = clock;
  at(t1, () => {
    const el = $(sel, active);
    tween(t1, d, (p) => {
      const v = Math.round(a + (b - a) * p);
      el.value = v;
      cur = pos(el, a + (b - a) * p);
      onValue(v);
    });
  });
  clock += d + 0.1;
}
const cap = (text, d) => caps.push({ t0: clock, t1: clock + d, text });
const say = (text, d = 1.1) => says.push({ t0: clock, t1: clock + d, text });
const press = (sel) => () => $(sel, active).setAttribute("aria-pressed", "true");
function type(sel, text, d) {
  const t0 = clock;
  at(t0, () => {
    const el = $(sel, active);
    const base = el.value;
    tween(t0, d, (p) => (el.value = base + text.slice(0, Math.round(text.length * p))));
  });
  clock += d;
}

// ---------------------------------------------------------------- the tour
show("intro");
wait(3);

show("login");
cap("Grown-ups sign in with <b>Google</b>, an <b>email link</b>, or a password", 4.6);
wait(0.5);
moveTo("#google", 1.2);
wait(1.2);
click(null, 1.7);

show("home");
cap("Pick what to make: <b>Creatures</b>, <b>Equipment</b> or <b>Pets</b>", 4.2);
moveTo("#tile-creature", 1);
say("Creatures");
wait(0.7);
moveTo("#tile-equipment", 0.6);
say("Equipment");
wait(0.6);
cap("Every button reads itself out loud for young readers", 3.2);
moveTo("#tile-pet", 0.6);
say("Pets");
wait(0.9);
moveTo("#tile-creature", 0.6);
wait(0.3);
click(null, 0.6);

show("b-creature");
cap("Kids can add their own drawing. The factory turns it into finished art", 3.6);
moveTo("#creature-addDrawing", 1);
say("Add my drawing");
wait(2.2);
scrollTo("#creature-personality", 100, 0.9);
cap("Then press picture buttons. Pick a few, or none for a surprise", 5.2);
moveTo("#creature-personality-funny", 0.7);
click(press("#creature-personality-funny"), 0.3);
say("Funny");
wait(0.7);
scrollTo("#creature-looks", 100, 0.7);
moveTo("#creature-looks-furry", 0.6);
click(press("#creature-looks-furry"), 0.3);
say("Furry");
wait(0.4);
moveTo("#creature-looks-horns", 0.5);
click(press("#creature-looks-horns"), 0.3);
say("Horns");
wait(0.6);
scrollTo("#creature-diff", 140, 0.8);
cap("Set the <b>creature difficulty</b>", 2.8);
slide("#diff", 10, 12, 1.2, (v) => {
  $("#diff-num", active).textContent = v;
  $("#diff-face", active).textContent = v <= 8 ? "😊" : v <= 12 ? "🙂" : v <= 16 ? "😬" : "😱";
});
say("Medium, 12");
wait(1);
scrollTo("#creature-idea", 120, 0.7);
cap("Add an idea in their own words", 3);
moveTo("#creature-ideabox", 0.6);
click(null, 0.2);
type("#creature-ideabox", "It tells knock-knock jokes", 1.6);
wait(0.6);
moveTo("#creature-build", 0.7);
say("Build my creature");
wait(0.3);
click(() => ($("#machine-creature", active).style.display = "grid"), 0.4);
{
  const t0 = clock;
  tween(t0, 3.4, (p) => {
    const ring = $("#machine-creature .ring", active);
    if (ring) ring.style.transform = `rotate(${p * 400}deg)`;
  });
}
cap("The factory writes fair rules and draws the picture", 3.4);
wait(3.4);

show("c-creature");
cap("A finished card, ready to play", 2.8);
moveTo({ x: 640, y: 300 }, 1);
wait(1.8);
scrollTo("#read-creature", 420, 0.8);
cap("<b>Read my card</b> reads every word aloud and lights it up", 5);
moveTo("#read-creature", 0.6);
click(() => ($("#read-creature .lbl", active).textContent = "Stop reading"), 0.2);
{
  const t0 = clock;
  tween(t0, 4.4, (p) => {
    const n = Math.floor(p * 26);
    active.querySelectorAll(".w.on").forEach((w) => w.classList.remove("on"));
    const w = $(`#stage-creature .w[data-w="${n}"]`, active);
    if (w && p < 1) w.classList.add("on");
  });
  clock += 4.6;
}
at(clock, () => ($("#read-creature .lbl", active).textContent = "Read my card"));
cap("<b>Edit my card</b> changes any words or numbers", 5.2);
moveTo("#edit-creature", 0.8);
click(() => {
  $("#tools-creature", active).style.display = "none";
  $("#editor-creature", active).style.display = "grid";
}, 0.4);
scrollTo("#editor-creature", 170, 0.6);
moveTo("#ed-name", 0.6);
click(null, 0.2);
{
  const t0 = clock;
  tween(t0, 1.6, (p) => {
    const name = p < 0.35 ? "Tickletop Troll".slice(0, Math.round(15 * (1 - p / 0.35))) : "Professor Tickles".slice(0, Math.round(17 * ((p - 0.35) / 0.65)));
    $("#ed-name", active).value = name;
    W = 0;
    $("#stage-creature .card-title", active).innerHTML = words(name || " ");
  });
  clock += 1.7;
}
moveTo("#ed-save", 0.6);
click(() => {
  $("#editor-creature", active).style.display = "none";
  $("#tools-creature", active).style.display = "block";
}, 0.5);
scrollTo("#tools-creature", 420, 0.5);
cap("Save it, print it, or download a tarot-size PDF", 4.4);
moveTo("#save-creature", 0.6);
click(() => ($("#save-creature .lbl", active).textContent = "Saved"), 0.5);
moveTo("#print-creature", 0.5);
say("Print");
wait(0.6);
moveTo("#pdf-creature", 0.5);
click(null, 0.3);
at(clock, () => {
  const d = document.createElement("div");
  d.className = "pdfdemo";
  d.id = "pdfdemo";
  d.innerHTML = `<div class="pdfpage">${$("#stage-creature .tcard", active).outerHTML}</div>`;
  active.appendChild(d);
});
wait(1.8);
at(clock, () => $("#pdfdemo")?.remove());
scrollTo(".topbar", 0, 0.8);
cap("Jump to any builder from the buttons at the top", 3.2);
moveTo("#mk-equipment", 0.8);
say("Equipment");
wait(0.4);
click(null, 0.5);

show("b-equipment");
wait(0.6);
scrollTo("#equipment-item", 90, 0.8);
cap("Pick an item: some <b>keep forever</b>, some are <b>used once</b>", 3.2);
moveTo("#equipment-item-bag", 0.7);
click(press("#equipment-item-bag"), 0.3);
say("Bag");
wait(1.4);
scrollTo("#equipment-coins", 160, 1);
cap("Choose how many <b>Coins</b> it's worth. More Coins, more power", 4.2);
at(clock, () => $("#equipment-factory", active).classList.remove("on"));
slide("#equipment-coin", 10, 25, 1.4, (v) => {
  $("#equipment-coin-num", active).textContent = v;
  $("#equipment-coin-face", active).textContent = v <= 4 ? "🪙" : v <= 14 ? "💰" : v <= 24 ? "💎" : "👑";
});
say("25 Coins");
wait(1.2);
moveTo("#equipment-build", 0.8);
click(() => ($("#machine-equipment", active).style.display = "grid"), 0.3);
{
  const t0 = clock;
  tween(t0, 1.6, (p) => {
    const ring = $("#machine-equipment .ring", active);
    if (ring) ring.style.transform = `rotate(${p * 200}deg)`;
  });
}
wait(1.6);

show("c-equipment");
cap("The card's cost matches the Coins they picked", 3.2);
moveTo({ x: 700, y: 520 }, 1);
wait(2.4);

show("b-pet");
at(clock, () => ($(".scroller", active).style.transform = "translateY(0px)"));
scrollTo("#pet-type", 90, 0.8);
cap("Pets work the same way", 2.6);
moveTo("#pet-type-monkey", 0.7);
click(press("#pet-type-monkey"), 0.3);
say("Monkey");
wait(0.6);
scrollTo("#pet-power", 90, 0.7);
moveTo("#pet-power-talker", 0.6);
click(press("#pet-power-talker"), 0.3);
say("Talker");
wait(0.5);
scrollTo("#pet-build", 560, 1);
moveTo("#pet-build", 0.6);
click(() => ($("#machine-pet", active).style.display = "grid"), 0.3);
{
  const t0 = clock;
  tween(t0, 1.4, (p) => {
    const ring = $("#machine-pet .ring", active);
    if (ring) ring.style.transform = `rotate(${p * 180}deg)`;
  });
}
wait(1.4);
show("c-pet");
moveTo({ x: 700, y: 480 }, 0.8);
wait(1.6);

cap("<b>My cards</b> keeps everything, sorted by kind", 3.6);
moveTo("#nav-cards", 0.8);
click(null, 0.3);
show("cards");
wait(1.4);
cap("Print 6 cards to a page, then cut them out", 3.4);
moveTo("#sheet-all", 0.8);
say("Print sheet");
wait(2.6);

cap("Grown-up settings sit behind a quick math question", 4.6);
moveTo("#nav-grown", 0.8);
click(null, 0.3);
show("gate");
moveTo("#gate-answer", 0.7);
click(null, 0.2);
type("#gate-answer", "56", 0.6);
moveTo("#gate-go", 0.6);
click(null, 0.5);
show("plans");
cap("Choose a plan, and set the <b>reading level</b> for the cards", 4.6);
moveTo("#plan-2", 1.2);
wait(1);
scrollTo("#reading", 200, 0.9);
moveTo("#level", 0.6);
wait(1.4);

show("outro");
wait(3.6);

const TOTAL = clock;
events.sort((a, b) => a.t - b.t);

// ---------------------------------------------------------------- one frame
let next = 0;
window.TOTAL = TOTAL;
window.renderAt = (t) => {
  while (next < events.length && events[next].t <= t + 1e-6) events[next++].fn();
  for (const tw of tweens) {
    if (tw.done || t < tw.t0) continue;
    const p = Math.min(1, (t - tw.t0) / (tw.t1 - tw.t0 || 1e-6));
    tw.fn(ease(p));
    if (p >= 1) tw.done = true;
  }
  const c = $("#cursor");
  const onTitle = document.querySelector(".title-card.on");
  c.style.display = onTitle ? "none" : "block";
  c.style.transform = `translate(${cur.x - 4}px, ${cur.y - 2}px)`;
  const ring = $("#ring");
  const r = rings.filter((x) => t >= x && t < x + 0.45).pop();
  if (r !== undefined && !onTitle) {
    const p = (t - r) / 0.45;
    ring.style.left = cur.x + "px";
    ring.style.top = cur.y + "px";
    ring.style.transform = `scale(${0.4 + p * 0.9})`;
    ring.style.opacity = String(1 - p);
  } else ring.style.opacity = "0";
  const capEl = $("#cap");
  const k = caps.filter((x) => t >= x.t0 && t < x.t1).pop();
  if (k) {
    capEl.innerHTML = k.text;
    const fade = Math.min(1, (t - k.t0) / 0.25, (k.t1 - t) / 0.25);
    capEl.style.opacity = String(fade);
  } else capEl.style.opacity = "0";
  const sayEl = $("#say");
  const s = says.filter((x) => t >= x.t0 && t < x.t1).pop();
  if (s && !onTitle) {
    sayEl.textContent = "🔊 " + s.text;
    sayEl.style.left = cur.x + 26 + "px";
    sayEl.style.top = cur.y - 44 + "px";
    sayEl.style.opacity = String(Math.min(1, (t - s.t0) / 0.15, (s.t1 - t) / 0.2));
  } else sayEl.style.opacity = "0";
};
