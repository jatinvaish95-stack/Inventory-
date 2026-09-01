const KEY = "city_group_inventory_v1";

let inventory = [];

try {
  inventory = JSON.parse(localStorage.getItem(KEY) || "[]");
  if (!Array.isArray(inventory)) inventory = [];
} catch (e) {
  inventory = [];
}

const $ = id => document.getElementById(id);

/* -----------------------------
   NORMALIZE TEXT
----------------------------- */

function norm(s) {
  return String(s ?? "")
    .toLowerCase()
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/इंच/g, " inch ")
    .replace(/डेंसिटी/g, " density ")
    .replace(/गद्दों/g, " gadde ")
    .replace(/गद्दे/g, " gadde ")
    .replace(/गद्दा/g, " gadda ")
    .replace(/बिकगये/g, " bik gaye ")
    .replace(/बिकगए/g, " bik gaye ")
    .replace(/बिके/g, " bike ")
    .replace(/बिका/g, " bika ")
    .replace(/बेचे/g, " beche ")
    .replace(/बेचें/g, " bechein ")
    .replace(/बेचा/g, " becha ")
    .replace(/[^\p{L}\p{N}.\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/* -----------------------------
   SAVE
----------------------------- */

function save() {
  localStorage.setItem(KEY, JSON.stringify(inventory));
  render();
}

/* -----------------------------
   ESCAPE HTML
----------------------------- */

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, m => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[m]));
}

/* -----------------------------
   RENDER INVENTORY
----------------------------- */

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

    /* Density */

    if (d && n.includes(d)) {
      score += 5;
    }

    /* Thickness */

    if (
      t &&
      (
        n.includes(t) ||
        n.replace(/\s/g, "")
          .includes(t.replace(/\s/g, ""))
      )
    ) {
      score += 5;
    }

    /* Product name */

    if (p && n.includes(p)) {
      score += 3;
    }

    /* Gadda variants */

    if (
      ["gadda", "gadde", "gadday"].includes(p) &&
      /gadda|gadde|gadday/.test(n)
    ) {
      score += 3;
    }

    /* Prefer product having stock */

    if (Number(x.stock || 0) > 0) {
      score += 2;
    }

    if (score > bestScore) {
      bestScore = score;
      best = x;
    }

  });

  return bestScore >= 10 ? best : null;
}

/* -----------------------------
   NUMBER WORDS
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

  "एक": 1,
  "दो": 2,
  "तीन": 3,
  "चार": 4,
  "पाँच": 5,
  "पांच": 5,
  "छह": 6,
  "छः": 6,
  "सात": 7,
  "आठ": 8,
  "नौ": 9,
  "दस": 10
};

/* -----------------------------
   QUANTITY
   IMPORTANT FIX
----------------------------- */

function qtyOf(text) {

  const n = norm(text);

  /*
     RULE 1
     Number immediately before product quantity.

     Examples:
     2 gadde
     3 gadda
     2 pcs
     5 pieces
  */

  let m = n.match(
    /(\d+(?:\.\d+)?)\s*(?:gadde|gadda|gadday|pcs|piece|pieces|unit|units|नग)\b/i
  );

  if (m) {
    return Number(m[1]);
  }

  /*
     RULE 2
     Hindi / English quantity word immediately
     before gadda/gadde.
     
     Example:
     do gadde
     दो gadde
  */

  const tokens = n.split(/\s+/);

  for (let i = 1; i < tokens.length; i++) {

    const current = tokens[i];

    if (
      ["gadde", "gadda", "gadday", "pcs", "piece", "pieces"]
        .includes(current)
    ) {

      const previous = tokens[i - 1];

      if (words[previous] !== undefined) {
        return words[previous];
      }
    }
  }

  /*
     RULE 3
     Hindi quantity word near sale command.

     Example:
     40 density 4 inch ke do gadde bik gaye
  */

  for (let i = tokens.length - 1; i >= 0; i--) {

    if (words[tokens[i]] !== undefined) {

      /*
         Ignore numbers/words which are clearly
         part of density/thickness.

         We mainly want the quantity nearest
         to the product.
      */

      const after = tokens.slice(i + 1, i + 4).join(" ");

      if (
        /gadde|gadda|gadday|pcs|piece|pieces|unit|units/
          .test(after)
      ) {
        return words[tokens[i]];
      }
    }
  }

  /*
     RULE 4
     Numeric quantity immediately before
     "bik/sell/sold".

     Example:
     2 bik gaye
     2 sold
  */

  m = n.match(
    /(\d+(?:\.\d+)?)\s+(?:bik|bike|bika|sell|sold|sale|beche|becha)\b/i
  );

  if (m) {
    return Number(m[1]);
  }

  /*
     RULE 5
     For numeric commands, collect all numbers
     and REMOVE density + thickness numbers.

     Example:
     40 density 4 inch ke 2 gadde bik gaye

     Numbers:
     40 = density
     4  = thickness
     2  = quantity

     Result = 2
  */

  const nums = [...n.matchAll(/\b\d+(?:\.\d+)?\b/g)]
    .map(x => Number(x[0]));

  if (nums.length) {

    let filtered = [...nums];

    /*
       Remove density number
    */

    const densityMatch = n.match(
      /\b(\d+(?:\.\d+)?)\s*density\b/i
    );

    if (densityMatch) {
      const densityValue = Number(densityMatch[1]);

      const index = filtered.indexOf(densityValue);

      if (index !== -1) {
        filtered.splice(index, 1);
      }
    }

    /*
       Remove thickness number
    */

    const thicknessMatch = n.match(
      /\b(\d+(?:\.\d+)?)\s*inch\b/i
    );

    if (thicknessMatch) {
      const thicknessValue = Number(thicknessMatch[1]);

      const index = filtered.indexOf(thicknessValue);

      if (index !== -1) {
        filtered.splice(index, 1);
      }
    }

    /*
       Remaining last number is quantity.
    */

    if (filtered.length) {
      return Number(filtered[filtered.length - 1]);
    }
  }

  return 1;
}

/* -----------------------------
   STOCK OUT / SALE DETECTION
----------------------------- */

function isOut(text) {

  const n = norm(text);

  return (
    /\bbik\b/.test(n) ||
    /\bbike\b/.test(n) ||
    /\bbika\b/.test(n) ||
    /\bbik\s+gaye\b/.test(n) ||
    /\bbik\s+gaya\b/.test(n) ||
    /\bsell\b/.test(n) ||
    /\bsold\b/.test(n) ||
    /\bsale\b/.test(n) ||
    /\bout\b/.test(n) ||
    /\bremove\b/.test(n) ||
    /\bnikal\b/.test(n) ||
    /\bnikala\b/.test(n) ||
    /\bnikle\b/.test(n) ||
    /\bbeche\b/.test(n) ||
    /\bbecha\b/.test(n) ||
    /\bबेच\b/.test(n) ||
    /\bबिक\b/.test(n) ||
    /\bनिकाल\b/.test(n)
  );
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

  /*
     Find product FIRST
  */

  const p = findProduct(raw);

  if (!p) {

    $("status").textContent =
      "Product not found. Check density and thickness.";

    return;
  }

  /*
     Then determine quantity
  */

  const qty = qtyOf(n);

  /*
     Then determine IN / OUT
  */

  const out = isOut(n);

  if (!qty || qty <= 0) {

    $("status").textContent =
      "Please enter a valid quantity.";

    return;
  }

  const current = Number(p.stock || 0);

  /* -----------------------------
     STOCK OUT / SALE
  ----------------------------- */

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

  /* -----------------------------
     STOCK IN
  ----------------------------- */

  else {

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
   VOICE RECOGNITION
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

/* -----------------------------
   INITIAL RENDER
----------------------------- */

render();
