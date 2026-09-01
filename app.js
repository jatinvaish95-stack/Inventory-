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
   TEXT NORMALIZE
========================= */

function norm(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}.\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}


/* =========================
   ESCAPE HTML
========================= */

function esc(value) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    ch => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[ch])
  );
}


/* =========================
   SAVE
========================= */

function save() {
  localStorage.setItem(KEY, JSON.stringify(inventory));
  render();
}


/* =========================
   RENDER
========================= */

function render() {

  const body = $("inventoryBody");

  if (!body) return;

  const search = $("search");
  const q = search ? norm(search.value) : "";

  const rows = inventory.filter(item => {

    return [
      item.product,
      item.density,
      item.thickness,
      item.unit
    ].some(value =>
      norm(value).includes(q)
    );
  });


  body.innerHTML = rows.map(item => `
    <tr>
      <td>${esc(item.product)}</td>
      <td>${esc(item.density)}</td>
      <td>${esc(item.thickness)}</td>
      <td>${esc(item.unit || "pcs")}</td>
      <td>${Number(item.stock || 0)}</td>
      <td>₹${Number(item.rate || 0).toLocaleString("en-IN")}</td>
    </tr>
  `).join("");


  if ($("empty")) {
    $("empty").style.display =
      rows.length ? "none" : "block";
  }


  const totalUnits = inventory.reduce(
    (total, item) =>
      total + Number(item.stock || 0),
    0
  );


  const totalValue = inventory.reduce(
    (total, item) =>
      total +
      Number(item.stock || 0) *
      Number(item.rate || 0),
    0
  );


  if ($("totalUnits")) {
    $("totalUnits").textContent = totalUnits;
  }


  if ($("inventoryValue")) {
    $("inventoryValue").textContent =
      "₹" + totalValue.toLocaleString("en-IN");
  }
}


/* =========================
   PRODUCT FORM
========================= */

function openProduct() {

  const dialog = $("productDialog");

  if (dialog) {
    dialog.showModal();
  }
}


/* =========================
   ADD PRODUCT
========================= */

function addProduct(event) {

  event.preventDefault();

  const product =
    $("product").value.trim();

  const density =
    $("density").value.trim();

  const thickness =
    $("thickness").value.trim();

  const unit =
    $("unit").value.trim() || "pcs";

  const stock =
    Number($("stock").value || 0);

  const rate =
    Number($("rate").value || 0);


  if (!product) {

    $("status").textContent =
      "Please enter product name.";

    return;
  }


  inventory.push({
    product,
    density,
    thickness,
    unit,
    stock,
    rate
  });


  save();


  $("productForm").reset();

  if ($("unit")) $("unit").value = "pcs";
  if ($("stock")) $("stock").value = "0";
  if ($("rate")) $("rate").value = "0";


  $("productDialog").close();


  $("status").textContent =
    "Product saved successfully.";
}


/* =========================
   DETECT STOCK OUT
========================= */

function isStockOut(text) {

  const n = norm(text);

  const english =
    /\b(bik|bike|bicke|biki|bikgaye|bikgaya|sell|sold|sale|out|remove|nikal|nikala|nikle|gaye|gaya)\b/i;

  const hindi =
    /बिक|बेच|बिके|बिकगये|बिकगया|गये|गया|निकाल|निकला|बेचा/;

  return english.test(n) || hindi.test(n);
}


/* =========================
   FIND QUANTITY
========================= */

function getQuantity(text) {

  const n = norm(text);


  /*
     First look for:
     2 gadde
     2 gadda
     2 pcs
     2 piece
     2 units
     2 नग
  */

  const withUnit = n.match(
    /(\d+(?:\.\d+)?)\s*(gadde|gadda|gadday|pcs|piece|pieces|unit|units|नग|गद्दे|गद्दा)/i
  );


  if (withUnit) {
    return Number(withUnit[1]);
  }


  /*
     Otherwise use a standalone number.
     Example:
     stock out 2
  */

  const number = n.match(
    /\b(\d+(?:\.\d+)?)\b/
  );


  if (number) {
    return Number(number[1]);
  }


  return 1;
}


/* =========================
   PRODUCT WORD MATCH
========================= */

function productWordMatch(text, product) {

  const n = norm(text);
  const p = norm(product);


  if (!p) return false;


  if (n.includes(p)) {
    return true;
  }


  if (
    (p === "gadda" || p === "gadde") &&
    (
      n.includes("gadda") ||
      n.includes("gadde") ||
      n.includes("gadday") ||
      n.includes("गद्दा") ||
      n.includes("गद्दे")
    )
  ) {
    return true;
  }


  return false;
}


/* =========================
   FIND PRODUCT
========================= */

function findProduct(text, stockOut) {

  const n = norm(text);


  /*
     Get density + thickness matches
  */

  const matches = inventory.filter(item => {

    const density =
      norm(item.density);

    const thickness =
      norm(item.thickness);


    return (
      density &&
      thickness &&
      n.includes(density) &&
      n.includes(thickness)
    );
  });


  if (matches.length) {

    /*
       If product name is also spoken,
       prefer that product.
    */

    const named = matches.filter(item =>
      productWordMatch(text, item.product)
    );


    const candidates =
      named.length ? named : matches;


    /*
       Stock OUT:
       choose the matching item
       which actually has stock.
    */

    if (stockOut) {

      const available =
        candidates
          .filter(item =>
            Number(item.stock || 0) > 0
          )
          .sort(
            (a, b) =>
              Number(b.stock || 0) -
              Number(a.stock || 0)
          );


      if (available.length) {
        return available[0];
      }


      /*
         Return first matching item
         so user gets "Available: 0"
         instead of Product not found.
      */

      return candidates[0];
    }


    return candidates[0];
  }


  /*
     Product-name-only matching
  */

  const byName =
    inventory.filter(item =>
      productWordMatch(text, item.product)
    );


  if (stockOut) {

    const available =
      byName
        .filter(item =>
          Number(item.stock || 0) > 0
        )
        .sort(
          (a, b) =>
            Number(b.stock || 0) -
            Number(a.stock || 0)
        );


    if (available.length) {
      return available[0];
    }
  }


  return byName[0] || null;
}


/* =========================
   PROCESS COMMAND
========================= */

function processCommand() {

  const command =
    $("command");

  const status =
    $("status");


  if (!command || !status) {
    return;
  }


  const raw =
    command.value.trim();


  if (!raw) {

    status.textContent =
      "Please speak or type a command.";

    return;
  }


  const qty =
    getQuantity(raw);


  if (!qty || qty <= 0) {

    status.textContent =
      "Please enter a valid quantity.";

    return;
  }


  const stockOut =
    isStockOut(raw);


  const product =
    findProduct(raw, stockOut);


  if (!product) {

    status.textContent =
      "Product not found. Please check density and thickness.";

    return;
  }


  const currentStock =
    Number(product.stock || 0);


  /* =====================
     STOCK OUT
  ===================== */

  if (stockOut) {

    if (currentStock < qty) {

      status.textContent =
        `Not enough stock. Available: ${currentStock}`;

      return;
    }


    product.stock =
      currentStock - qty;


    save();


    status.textContent =
      `Stock Out: ${qty} ${product.unit || "pcs"} from ${product.product}.`;

    return;
  }


  /* =====================
     STOCK IN
  ===================== */

  product.stock =
    currentStock + qty;


  save();


  status.textContent =
    `Stock In: ${qty} ${product.unit || "pcs"} to ${product.product}.`;
}


/* =========================
   VOICE
========================= */

let recognition = null;


function startVoice() {

  const SR =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;


  if (!SR) {

    $("status").textContent =
      "Voice recognition is not supported. Please type the command.";

    return;
  }


  try {

    recognition = new SR();

    recognition.lang = "hi-IN";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;


    recognition.onstart = () => {

      $("status").textContent =
        "Listening… बोलिए।";
    };


    recognition.onresult = event => {

      const text =
        event.results[0][0].transcript;


      $("command").value = text;


      $("status").textContent =
        "Voice captured. Tap Process.";
    };


    recognition.onerror = event => {

      $("status").textContent =
        "Voice error: " + event.error;
    };


    recognition.onend = () => {};


    recognition.start();

  } catch (error) {

    $("status").textContent =
      "Voice could not start. Please allow microphone permission and use HTTPS.";
  }
}


/* =========================
   CONNECT BUTTONS
========================= */

function setup() {

  if ($("inventoryBtn")) {
    $("inventoryBtn").onclick =
      openProduct;
  }


  if ($("stockInBtn")) {

    $("stockInBtn").onclick = () => {

      $("command").value =
        "stock in ";

      $("command").focus();

      $("status").textContent =
        "Type quantity and product, then tap Process.";
    };
  }


  if ($("stockOutBtn")) {

    $("stockOutBtn").onclick = () => {

      $("command").value =
        "stock out ";

      $("command").focus();

      $("status").textContent =
        "Type quantity and product, then tap Process.";
    };
  }


  if ($("rateBtn")) {

    $("rateBtn").onclick = () => {

      $("search").focus();
    };
  }


  if ($("cancelProduct")) {

    $("cancelProduct").onclick = () => {

      $("productDialog").close();
    };
  }


  if ($("productForm")) {

    $("productForm").onsubmit =
      addProduct;
  }


  if ($("processBtn")) {

    $("processBtn").onclick =
      processCommand;
  }


  if ($("search")) {

    $("search").oninput =
      render;
  }


  if ($("speakBtn")) {

    $("speakBtn").onclick =
      startVoice;
  }


  render();
}


/* =========================
   START APP
========================= */

if (document.readyState === "loading") {

  document.addEventListener(
    "DOMContentLoaded",
    setup
  );

} else {

  setup();
}
