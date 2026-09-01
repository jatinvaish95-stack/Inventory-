const KEY = "city_group_inventory_v1";

let inventory = JSON.parse(
  localStorage.getItem(KEY) || "[]"
);

const $ = id => document.getElementById(id);


/* =========================
   SAVE
========================= */

function save() {
  localStorage.setItem(KEY, JSON.stringify(inventory));
  render();
}


/* =========================
   NORMALIZE
========================= */

function norm(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}.\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}


/* =========================
   ESCAPE HTML
========================= */

function esc(s) {
  return String(s ?? "").replace(
    /[&<>"']/g,
    m => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[m])
  );
}


/* =========================
   RENDER
========================= */

function render() {

  const search = $("search");

  const q = search ? norm(search.value) : "";

  const rows = inventory.filter(x =>
    [
      x.product,
      x.density,
      x.thickness,
      x.unit
    ].some(v => norm(v).includes(q))
  );


  $("inventoryBody").innerHTML =
    rows.map(x => `
      <tr>
        <td>${esc(x.product)}</td>
        <td>${esc(x.density)}</td>
        <td>${esc(x.thickness)}</td>
        <td>${esc(x.unit)}</td>
        <td>${Number(x.stock || 0)}</td>
        <td>₹${Number(x.rate || 0).toLocaleString("en-IN")}</td>
      </tr>
    `).join("");


  $("empty").style.display =
    rows.length ? "none" : "block";


  const units = inventory.reduce(
    (total, x) =>
      total + Number(x.stock || 0),
    0
  );


  const value = inventory.reduce(
    (total, x) =>
      total +
      Number(x.stock || 0) *
      Number(x.rate || 0),
    0
  );


  $("totalUnits").textContent = units;

  $("inventoryValue").textContent =
    "₹" + value.toLocaleString("en-IN");
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
   QUICK BUTTONS
========================= */

$("inventoryBtn").onclick = openProduct;


$("stockInBtn").onclick = () => {

  $("command").value = "stock in ";

  $("command").focus();

};


$("stockOutBtn").onclick = () => {

  $("command").value = "stock out ";

  $("command").focus();

};


$("rateBtn").onclick = () => {

  $("search").focus();

};


/* =========================
   CANCEL
========================= */

$("cancelProduct").onclick = () => {

  $("productDialog").close();

};


/* =========================
   ADD PRODUCT
========================= */

$("productForm").onsubmit = e => {

  e.preventDefault();


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

  $("unit").value = "pcs";

  $("stock").value = "0";

  $("rate").value = "0";


  $("productDialog").close();


  $("status").textContent =
    "Product saved successfully.";
};


/* =========================
   PRODUCT NAME ALIASES
========================= */

function productWords(product) {

  const p = norm(product);

  if (
    p === "gadda" ||
    p === "gadde" ||
    p === "gadday"
  ) {
    return [
      "gadda",
      "gadde",
      "gadday"
    ];
  }

  return [p];
}


/* =========================
   FIND PRODUCT
========================= */

function findProduct(text, isOut) {

  const n = norm(text);


  /* --------------------------------
     FIRST: DENSITY + THICKNESS
  -------------------------------- */

  const matches = inventory.filter(x => {

    const d = norm(x.density);

    const t = norm(x.thickness);

    if (!d || !t) {
      return false;
    }

    return (
      n.includes(d) &&
      n.includes(t)
    );
  });


  if (matches.length > 0) {

    /* For Stock Out choose
       product having stock */

    if (isOut) {

      const available =
        matches.find(
          x => Number(x.stock || 0) > 0
        );

      if (available) {
        return available;
      }
    }

    return matches[0];
  }


  /* --------------------------------
     SECOND: PRODUCT NAME
  -------------------------------- */

  const found =
    inventory.find(x => {

      const words =
        productWords(x.product);

      return words.some(word =>
        n.includes(norm(word))
      );

    });


  return found || null;
}


/* =========================
   DETECT STOCK OUT
========================= */

function isStockOutCommand(text) {

  const n = norm(text);


  const englishWords = [
    "bik",
    "bike",
    "bicke",
    "biki",
    "bikgaye",
    "bikgaya",
    "sell",
    "sold",
    "sale",
    "out",
    "remove",
    "nikal",
    "nikala",
    "nikle",
    "gaye",
    "gaya"
  ];


  for (const word of englishWords) {

    if (
      new RegExp("\\b" + word + "\\b", "i")
        .test(n)
    ) {
      return true;
    }
  }


  const hindiWords = [
    "बिक",
    "बेच",
    "बिके",
    "बिकगये",
    "बिकगया",
    "गये",
    "गया",
    "निकाल",
    "निकला",
    "बेचा"
  ];


  return hindiWords.some(word =>
    n.includes(word)
  );
}


/* =========================
   QUANTITY
========================= */

function getQuantity(text) {

  const n = norm(text);


  /* Example:
     2 gadde
     2 pcs
     2 piece
  */

  const match =
    n.match(
      /(\d+(?:\.\d+)?)\s*(gadde|gadda|gadday|pcs|piece|pieces|unit|units|नग|गद्दे|गद्दा)/i
    );


  if (match) {
    return Number(match[1]);
  }


  /* Any number */

  const number =
    n.match(/\b(\d+(?:\.\d+)?)\b/);


  if (number) {
    return Number(number[1]);
  }


  return 1;
}


/* =========================
   PROCESS COMMAND
========================= */

function processCommand() {

  const commandBox = $("command");

  const status = $("status");


  const raw =
    commandBox.value.trim();


  if (!raw) {

    status.textContent =
      "Please speak or type a command.";

    return;
  }


  const isOut =
    isStockOutCommand(raw);


  const qty =
    getQuantity(raw);


  if (!qty || qty <= 0) {

    status.textContent =
      "Please enter a valid quantity.";

    return;
  }


  const product =
    findProduct(raw, isOut);


  if (!product) {

    status.textContent =
      "Product not found. Please check density and thickness.";

    return;
  }


  /* =========================
     STOCK OUT
  ========================= */

  if (isOut) {

    const available =
      Number(product.stock || 0);


    if (available < qty) {

      status.textContent =
        `Not enough stock. Available: ${available}`;

      return;
    }


    product.stock =
      available - qty;


    save();


    status.textContent =
      `Stock Out: ${qty} ${product.unit} from ${product.product}.`;

    return;
  }


  /* =========================
     STOCK IN
  ========================= */

  product.stock =
    Number(product.stock || 0) + qty;


  save();


  status.textContent =
    `Stock In: ${qty} ${product.unit} to ${product.product}.`;
}


/* =========================
   PROCESS BUTTON
========================= */

$("processBtn").onclick =
  processCommand;


/* =========================
   SEARCH
========================= */

$("search").oninput =
  render;


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


    recognition.lang =
      "hi-IN";


    recognition.interimResults =
      false;


    recognition.maxAlternatives =
      1;


    recognition.onstart = () => {

      $("status").textContent =
        "Listening… बोलिए।";

    };


    recognition.onresult = e => {

      const text =
        e.results[0][0].transcript;


      $("command").value =
        text;


      $("status").textContent =
        "Voice captured. Tap Process.";

    };


    recognition.onerror = e => {

      $("status").textContent =
        "Voice error: " + e.error;

    };


    recognition.onend = () => {};


    recognition.start();

  } catch (e) {

    $("status").textContent =
      "Voice could not start. Please allow microphone permission and use the HTTPS app URL.";

  }
};


/* =========================
   START
========================= */

render();
