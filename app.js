const KEY = "city_group_inventory_v1";

let inventory = [];

try {
  inventory = JSON.parse(localStorage.getItem(KEY) || "[]");
  if (!Array.isArray(inventory)) inventory = [];
} catch (e) {
  inventory = [];
}

const $ = id => document.getElementById(id);

/* =========================
   NORMALIZE TEXT
========================= */

function norm(s) {
  return String(s ?? "")
    .toLowerCase()
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/इंच/g, " inch ")
    .replace(/डेंसिटी/g, " density ")
    .replace(/गद्दों/g, " gadde ")
    .replace(/गद्दे/g, " gadde ")
    .replace(/गद्दा/g, " gadda ")
    .replace(/गद्दे/g, " gadde ")
    .replace(/\s+/g, " ")
    .trim();
}

/* =========================
   SAVE
========================= */

function save() {
  localStorage.setItem(KEY, JSON.stringify(inventory));
  render();
}

/* =========================
   ESCAPE HTML
========================= */

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, m => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[m]));
}

/* =========================
   RENDER
========================= */

function render() {

  const searchBox = $("search");
  const q = norm(searchBox ? searchBox.value : "");

  const rows = inventory.filter(x =>
    [x.product, x.density, x.thickness, x.unit]
      .some(v => norm(v).includes(q))
  );

  $("inventoryBody").innerHTML = rows.map(x => `
    <tr>
      <td>${esc(x.product)}</td>
      <td>${esc(x.density)}</td>
      <td>${esc(x.thickness)}</td>
      <td>${esc(x.unit || "pcs")}</td>
      <td>${Number(x.stock || 0)}</td>
      <td>₹${Number(x.rate || 0).toLocaleString("en-IN")}</td>
    </tr>
  `).join("");

  $("empty").style.display = rows.length ? "none" : "block";

  const units = inventory.reduce(
    (a, x) => a + Number(x.stock || 0),
    0
  );

  const value = inventory.reduce(
    (a, x) =>
      a + Number(x.stock || 0) * Number(x.rate || 0),
    0
  );

  $("totalUnits").textContent = units;

  $("inventoryValue").textContent =
    "₹" + value.toLocaleString("en-IN");
}

/* =========================
   PRODUCT MATCHING
========================= */

function findProduct(text) {

  const n = norm(text);

  let best = null;
  let bestScore = -1;

  inventory.forEach(x => {

    const d = norm(x.density);
    const t = norm(x.thickness);
    const p = norm(x.product);

    let score = 0;

    // Density
    if (d && n.includes(d)) {
      score += 10;
    }

    // Thickness
    if (
      t &&
      (
        n.includes(t) ||
        n.replace(/\s/g, "")
          .includes(t.replace(/\s/g, ""))
      )
    ) {
      score += 10;
    }

    // Product name
    if (p && n.includes(p)) {
      score += 5;
    }

    // Gadda variants
    if (
      ["gadda", "gadde", "gadday"].includes(p) &&
      /gadda|gadde|gadday/.test(n)
    ) {
      score += 5;
    }

    // Prefer item having stock
    if (Number(x.stock || 0) > 0) {
      score += 1;
    }

    if (score > bestScore) {
      bestScore = score;
      best = x;
    }
  });

  // Density + thickness required
  return bestScore >= 20 ? best : null;
}

/* =========================
   QUANTITY
========================= */

const words = {

  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,

  ek: 1,
  do: 2,
  teen: 3,
  char: 4,
  chaar: 4,
  paanch: 5,
  panch: 5,
  chhe: 6,
  che: 6,
  saat: 7,
  aath: 8,
  nau: 9,
  das: 10,

  एक: 1,
  दो: 2,
  तीन: 3,
  चार: 4,
  पाँच: 5,
  पांच: 5,
  छह: 6,
  छः: 6,
  सात: 7,
  आठ: 8,
  नौ: 9,
  दस: 10
};

function qtyOf(rawText) {

  const original = String(rawText || "").toLowerCase();
  const n = norm(rawText);

  /*
    IMPORTANT:
    First look for quantity immediately associated
    with gadda/gadde.

    Example:
    "40 density 4 inch ke do gadde bik gaye"
    => 2
  */

  let m = n.match(
    /\b(\d+(?:\.\d+)?)\s*(?:gadde|gadda|gadday|pcs|piece|pieces|unit|units)\b/i
  );

  if (m) {
    return Number(m[1]);
  }

  /*
    Hindi:
    "दो गद्दे"
  */

  m = original.match(
    /\b(एक|दो|तीन|चार|पाँच|पांच|छह|छः|सात|आठ|नौ|दस)\s*(?:गद्दे|गद्दों|गद्दा)\b/
  );

  if (m && words[m[1]] !== undefined) {
    return words[m[1]];
  }

  /*
    Roman Hindi:
    "do gadde"
  */

  m = n.match(
    /\b(ek|do|teen|char|chaar|paanch|panch|chhe|che|saat|aath|nau|das)\s+(?:gadde|gadda|gadday)\b/
  );

  if (m && words[m[1]] !== undefined) {
    return words[m[1]];
  }

  /*
    If the command contains "do/दो" and sale words,
    use 2 rather than the thickness number.
  */

  if (
    /\bdo\b/.test(n) ||
    /दो/.test(original)
  ) {
    return 2;
  }

  /*
    Last fallback:
    Look for a standalone quantity only if it is
    NOT density/thickness.

    Example:
    40 density 4 inch ...
    DO NOT choose 4.
  */

  const nums = n.match(/\b\d+(?:\.\d+)?\b/g) || [];

  if (nums.length) {

    // If command has "density 40 ... inch 4",
    // don't use density/thickness as quantity.
    const filtered = nums.filter(num => {

      const index = n.indexOf(num);

      const before = n.slice(
        Math.max(0, index - 15),
        index
      );

      if (/density\s*$/.test(before)) return false;
      if (/inch\s*$/.test(before)) return false;

      return true;
    });

    if (filtered.length) {
      return Number(filtered[filtered.length - 1]);
    }
  }

  return 1;
}

/* =========================
   STOCK OUT DETECTION
========================= */

function isOut(rawText) {

  const original = String(rawText || "").toLowerCase();
  const n = norm(rawText);

  /*
    SALE / STOCK OUT WORDS
  */

  const romanOut =
    /\b(bik|bike|bicke|biki|bikgaye|bikgaya|sell|sold|sale|out|remove|nikal|nikala|nikle|gaye|gaya)\b/i;

  const hindiOut =
    /(बिक|बिका|बिके|बिकेगा|बिकगये|बिकगया|बेच|बेचा|बेचे|बेचदिए|बेचदिया|गये|गया|निकाल|निकला|निकले)/;

  return romanOut.test(n) || hindiOut.test(original);
}

/* =========================
   PROCESS COMMAND
========================= */

function processCommand() {

  const raw = $("command").value.trim();

  if (!raw) {

    $("status").textContent =
      "Please speak or type a command.";

    return;
  }

  const qty = qtyOf(raw);
  const out = isOut(raw);

  if (!qty || qty <= 0) {

    $("status").textContent =
      "Please enter a valid quantity.";

    return;
  }

  const p = findProduct(raw);

  if (!p) {

    $("status").textContent =
      "Product not found. Check density and thickness.";

    return;
  }

  const current = Number(p.stock || 0);

  /* =====================
     STOCK OUT / SALE
  ===================== */

  if (out) {

    if (current < qty) {

      $("status").textContent =
        `Not enough stock. Available: ${current}`;

      return;
    }

    p.stock = current - qty;

    $("status").textContent =
      `Stock Out: ${qty} ${p.unit || "pcs"} from ${p.product}.`;

  }

  /* =====================
     STOCK IN
  ===================== */

  else {

    p.stock = current + qty;

    $("status").textContent =
      `Stock In: ${qty} ${p.unit || "pcs"} to ${p.product}.`;
  }

  save();
}

/* =========================
   BUTTONS
========================= */

$("processBtn").onclick = processCommand;

$("search").oninput = render;

/* =========================
   VOICE
========================= */

let recognition = null;

$("speakBtn").onclick = () => {

  const SR =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;

  if (!SR) {

    $("status").textContent =
      "Voice recognition is not supported. Type the command instead.";

    return;
  }

  try {

    recognition = new SR();

    recognition.lang = "hi-IN";
    recognition.interimResults = false;
    recognition.maxAlternatives = 3;

    recognition.onstart = () => {

      $("status").textContent =
        "Listening… बोलिए।";
    };

    recognition.onresult = e => {

      const text =
        e.results?.[0]?.[0]?.transcript || "";

      $("command").value = text;

      $("status").textContent =
        text
          ? "Voice captured. Tap Process."
          : "Voice not captured. Try again.";
    };

    recognition.onerror = e => {

      $("status").textContent =
        "Voice error: " + e.error;
    };

    recognition.onend = () => {};

    recognition.start();

  } catch (e) {

    $("status").textContent =
      "Voice could not start. Allow microphone permission and use HTTPS/live app.";
  }
};

/* =========================
   INITIAL RENDER
========================= */

render();
