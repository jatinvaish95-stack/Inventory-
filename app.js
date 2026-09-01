const KEY = "city_group_inventory_v1";

let inventory = [];
try {
  inventory = JSON.parse(localStorage.getItem(KEY) || "[]");
  if (!Array.isArray(inventory)) inventory = [];
} catch (e) {
  inventory = [];
}

const $ = id => document.getElementById(id);

function norm(s) {
  return String(s ?? "")
    .toLowerCase()
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/इंच/g, " inch ")
    .replace(/डेंसिटी/g, " density ")
    .replace(/गद्दों/g, " gadde ")
    .replace(/गद्दे/g, " gadde ")
    .replace(/गद्दा/g, " gadda ")
    .replace(/[^\p{L}\p{N}.\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function save() {
  localStorage.setItem(KEY, JSON.stringify(inventory));
  render();
}

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, m => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[m]));
}

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
    (a, x) => a + Number(x.stock || 0) * Number(x.rate || 0),
    0
  );

  $("totalUnits").textContent = units;
  $("inventoryValue").textContent =
    "₹" + value.toLocaleString("en-IN");
}

/* -----------------------------
   PRODUCT MATCHING
----------------------------- */

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
      score += 5;
    }

    // Thickness
    if (
      t &&
      (
        n.includes(t) ||
        n.replace(/\s/g, "").includes(t.replace(/\s/g, ""))
      )
    ) {
      score += 5;
    }

    // Product name
    if (p && n.includes(p)) {
      score += 3;
    }

    // Gadda/Gadde variants
    if (
      ["gadda", "gadde", "gadday"].includes(p) &&
      /gadda|gadde|gadday/.test(n)
    ) {
      score += 3;
    }

    // IMPORTANT:
    // If multiple matching products exist,
    // prefer the one which actually has stock.
    if (Number(x.stock || 0) > 0) {
      score += 2;
    }

    if (score > bestScore) {
      bestScore = score;
      best = x;
    }
  });

  // Density + thickness is enough to identify product.
  return bestScore >= 10 ? best : null;
}

/* -----------------------------
   QUANTITY
----------------------------- */

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

function qtyOf(n) {

  // First priority:
  // number immediately before gadda/gadde
  let m = n.match(
    /(\d+(?:\.\d+)?)\s*(?:gadde|gadda|gadday|pcs|piece|pieces|unit|units|नग)\b/i
  );

  if (m) {
    return Number(m[1]);
  }

  // Hindi / English number words
  const parts = n.split(/\s+/);

  for (let i = parts.length - 1; i >= 0; i--) {
    if (words[parts[i]] !== undefined) {
      return words[parts[i]];
    }
  }

  // Otherwise use LAST numeric value.
  const nums = n.match(/\b\d+(?:\.\d+)?\b/g);

  if (nums && nums.length) {
    return Number(nums[nums.length - 1]);
  }

  return 1;
}

/* -----------------------------
   STOCK OUT DETECTION
----------------------------- */

function isOut(n) {
  return /(
    \bbik\b|
    \bbike\b|
    \bbicke\b|
    \bbiki\b|
    \bbikgaye\b|
    \bbikgaya\b|
    \bsell\b|
    \bsold\b|
    \bsale\b|
    \bout\b|
    \bremove\b|
    \bnikal\b|
    \bnikala\b|
    \bnikle\b|
    \bgaye\b|
    \bgaya\b|
    बिक|
    बेच|
    बिके|
    बिकगये|
    गये|
    गया|
    निकाल|
    निकला
  )/ix.test(n);
}

/* -----------------------------
   PROCESS COMMAND
----------------------------- */

function processCommand() {

  const raw = $("command").value.trim();

  if (!raw) {
    $("status").textContent =
      "Please speak or type a command.";
    return;
  }

  const n = norm(raw);

  const qty = qtyOf(n);
  const out = isOut(n);

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

  /* STOCK OUT / SALE */

  if (out) {

    if (current < qty) {
      $("status").textContent =
        `Not enough stock. Available: ${current}`;
      return;
    }

    p.stock = current - qty;

    $("status").textContent =
      `Stock Out: ${qty} ${p.unit || "pcs"} from ${p.product}.`;

  } else {

    /* STOCK IN */

    p.stock = current + qty;

    $("status").textContent =
      `Stock In: ${qty} ${p.unit || "pcs"} to ${p.product}.`;
  }

  save();
}

/* -----------------------------
   BUTTONS
----------------------------- */

$("processBtn").onclick = processCommand;

$("search").oninput = render;

/* -----------------------------
   VOICE
----------------------------- */

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

/* Initial render */
render();
