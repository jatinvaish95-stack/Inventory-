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
    .replace(/बिक गये/g, " bik gaye ")
    .replace(/बिक गए/g, " bik gaye ")
    .replace(/बिकगये/g, " bik gaye ")
    .replace(/बिकगए/g, " bik gaye ")
    .replace(/[^\p{L}\p{N}.\s-]/gu, " ")
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
   RENDER INVENTORY
========================= */

function render() {

  const searchBox = $("search");

  const q = norm(
    searchBox ? searchBox.value : ""
  );

  const rows = inventory.filter(x =>
    [
      x.product,
      x.density,
      x.thickness,
      x.unit
    ].some(v => norm(v).includes(q))
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

  if ($("empty")) {
    $("empty").style.display =
      rows.length ? "none" : "block";
  }

  const units = inventory.reduce(
    (a, x) => a + Number(x.stock || 0),
    0
  );

  const value = inventory.reduce(
    (a, x) =>
      a +
      Number(x.stock || 0) *
      Number(x.rate || 0),
    0
  );

  if ($("totalUnits")) {
    $("totalUnits").textContent = units;
  }

  if ($("inventoryValue")) {
    $("inventoryValue").textContent =
      "₹" + value.toLocaleString("en-IN");
  }
}


/* =========================
   NUMBER WORDS
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


/* =========================
   QUANTITY
========================= */

function qtyOf(text) {

  const n = norm(text);

  /*
     MOST IMPORTANT:
     Quantity immediately before
     gadde / gadda / pcs etc.
  */

  let m = n.match(
    /(\d+(?:\.\d+)?)\s*(?:gadde|gadda|pcs|piece|pieces|unit|units|नग)\b/i
  );

  if (m) {
    return Number(m[1]);
  }


  /*
     Hindi / English word immediately
     before gadde.
     
     Example:
     "do gadde bik gaye"
     "दो gadde bik gaye"
  */

  const parts = n.split(/\s+/);

  for (let i = 0; i < parts.length; i++) {

    const current = parts[i];

    if (
      current === "gadde" ||
      current === "gadda"
    ) {

      if (i > 0) {

        const previous = parts[i - 1];

        if (words[previous] !== undefined) {
          return words[previous];
        }

        if (/^\d+(?:\.\d+)?$/.test(previous)) {
          return Number(previous);
        }
      }
    }
  }


  /*
     If no product quantity found,
     use number words from RIGHT side.
  */

  for (let i = parts.length - 1; i >= 0; i--) {

    if (words[parts[i]] !== undefined) {
      return words[parts[i]];
    }
  }


  /*
     Last numeric value,
     but avoid density/thickness confusion
     whenever possible.
  */

  const nums = n.match(
    /\b\d+(?:\.\d+)?\b/g
  );

  if (nums && nums.length) {

    /*
       If there are 3 numbers:
       40 density 4 inch 2 gadde

       quantity = last number = 2
    */

    return Number(nums[nums.length - 1]);
  }

  return 1;
}


/* =========================
   STOCK OUT / SALE
========================= */

function isOut(text) {

  const n = norm(text);

  return (
    /\bbik\b/.test(n) ||
    /\bbike\b/.test(n) ||
    /\bbicke\b/.test(n) ||
    /\bbiki\b/.test(n) ||
    /\bbikgaye\b/.test(n) ||
    /\bbikgaya\b/.test(n) ||
    /\bsell\b/.test(n) ||
    /\bsold\b/.test(n) ||
    /\bsale\b/.test(n) ||
    /\bout\b/.test(n) ||
    /\bremove\b/.test(n) ||
    /\bnikal\b/.test(n) ||
    /\bnikala\b/.test(n) ||
    /\bnikle\b/.test(n) ||
    /\bgaye\b/.test(n) ||
    /\bgaya\b/.test(n) ||
    n.includes("बिक") ||
    n.includes("बेच") ||
    n.includes("बिके") ||
    n.includes("गये") ||
    n.includes("गए") ||
    n.includes("गया") ||
    n.includes("निकाल")
  );
}


/* =========================
   FIND PRODUCT
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


    /*
       Prefer product which actually
       has stock.
    */

    if (Number(x.stock || 0) > 0) {
      score += 2;
    }


    if (score > bestScore) {

      bestScore = score;
      best = x;
    }
  });


  /*
     Density + thickness identify product.
  */

  return bestScore >= 10
    ? best
    : null;
}


/* =========================
   PROCESS COMMAND
========================= */

function processCommand() {

  const commandBox = $("command");

  if (!commandBox) return;

  const raw = commandBox.value.trim();

  if (!raw) {

    $("status").textContent =
      "Please speak or type a command.";

    return;
  }


  const n = norm(raw);

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


  const current =
    Number(p.stock || 0);


  /* =========================
     STOCK OUT
  ========================= */

  if (out) {

    if (current < qty) {

      $("status").textContent =
        `Not enough stock. Available: ${current}`;

      return;
    }


    /*
       IMPORTANT:
       SALE = SUBTRACT
    */

    p.stock = current - qty;


    $("status").textContent =
      `Stock Out: ${qty} ${p.unit || "pcs"} from ${p.product}.`;

  }


  /* =========================
     STOCK IN
  ========================= */

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

if ($("processBtn")) {
  $("processBtn").onclick =
    processCommand;
}


if ($("search")) {
  $("search").oninput =
    render;
}


/* =========================
   VOICE
========================= */

let recognition = null;

if ($("speakBtn")) {

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

    }

    catch (e) {

      $("status").textContent =
        "Voice could not start. Allow microphone permission and use HTTPS/live app.";
    }
  };
}


/* =========================
   INITIAL RENDER
========================= */

render();
