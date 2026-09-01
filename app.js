const KEY = "city_group_inventory_v1";

let inventory = JSON.parse(
  localStorage.getItem(KEY) || "[]"
);

const $ = id => document.getElementById(id);


/* =========================
   SAVE INVENTORY
========================= */

function save() {
  localStorage.setItem(
    KEY,
    JSON.stringify(inventory)
  );

  render();
}


/* =========================
   NORMALIZE TEXT
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
   RENDER INVENTORY
========================= */

function render() {

  const searchBox = $("search");

  const q = searchBox
    ? norm(searchBox.value)
    : "";

  const rows = inventory.filter(x =>
    [
      x.product,
      x.density,
      x.thickness,
      x.unit
    ].some(v =>
      norm(v).includes(q)
    )
  );

  $("inventoryBody").innerHTML =
    rows.map(x => `
      <tr>
        <td>${esc(x.product)}</td>
        <td>${esc(x.density)}</td>
        <td>${esc(x.thickness)}</td>
        <td>${esc(x.unit)}</td>
        <td>${Number(x.stock || 0)}</td>
        <td>
          ₹${Number(x.rate || 0)
            .toLocaleString("en-IN")}
        </td>
      </tr>
    `).join("");

  $("empty").style.display =
    rows.length ? "none" : "block";


  /* TOTAL STOCK */

  const units = inventory.reduce(
    (total, x) =>
      total + Number(x.stock || 0),
    0
  );


  /* INVENTORY VALUE */

  const value = inventory.reduce(
    (total, x) =>
      total +
      Number(x.stock || 0) *
      Number(x.rate || 0),
    0
  );


  $("totalUnits").textContent = units;

  $("inventoryValue").textContent =
    "₹" +
    value.toLocaleString("en-IN");
}


/* =========================
   OPEN PRODUCT FORM
========================= */

function openProduct() {

  const dialog = $("productDialog");

  if (dialog) {
    dialog.showModal();
  }
}


/* =========================
   QUICK ACTION BUTTONS
========================= */

$("inventoryBtn").onclick =
  openProduct;


$("stockInBtn").onclick = () => {

  $("command").value =
    "stock in ";

  $("command").focus();

};


$("stockOutBtn").onclick = () => {

  $("command").value =
    "stock out ";

  $("command").focus();

};


$("rateBtn").onclick = () => {

  $("search").focus();

};


/* =========================
   CANCEL PRODUCT
========================= */

$("cancelProduct").onclick = () => {

  $("productDialog").close();

};


/* =========================
   ADD NEW PRODUCT
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

    product: product,

    density: density,

    thickness: thickness,

    unit: unit,

    stock: stock,

    rate: rate

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
   FIND PRODUCT
========================= */

function findProduct(text, isOut) {

  const n = norm(text);


  /* --------------------------------
     STEP 1
     Match density + thickness
  -------------------------------- */

  const matches =
    inventory.filter(x => {

      const d = norm(x.density);

      const t = norm(x.thickness);

      return (
        d &&
        t &&
        n.includes(d) &&
        n.includes(t)
      );

    });


  if (matches.length > 0) {

    /*
      For Stock Out:
      choose the matching product
      which has available stock.
    */

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
     STEP 2
     Match product name
  -------------------------------- */

  const productAliases = {

    "gadda": [
      "gadda",
      "gadde",
      "gadday",
      "गद्दा",
      "गद्दे"
    ],

    "gadde": [
      "gadda",
      "gadde",
      "gadday",
      "गद्दा",
      "गद्दे"
    ]

  };


  const found =
    inventory.find(x => {

      const product =
        norm(x.product);

      if (!product) {
        return false;
      }


      /* Exact product text */

      if (n.includes(product)) {
        return true;
      }


      /* Gadda / Gadde matching */

      const aliases =
        productAliases[product] || [];


      return aliases.some(
        word =>
          n.includes(norm(word))
      );

    });


  return found || null;
}


/* =========================
   PROCESS STOCK COMMAND
========================= */

function processCommand() {

  const commandBox =
    $("command");

  const status =
    $("status");


  const raw =
    commandBox.value.trim();


  /* Empty command */

  if (!raw) {

    status.textContent =
      "Please speak or type a command.";

    return;
  }


  const n =
    norm(raw);


  /* --------------------------------
     FIND QUANTITY
  -------------------------------- */

  let qtyMatch =
    n.match(
      /(\d+(?:\.\d+)?)\s*(?:gadde|gadda|gadday|pcs|piece|pieces|unit|units|नग|गद्दे|गद्दा)/i
    );


  let qty;


  if (qtyMatch) {

    qty =
      Number(qtyMatch[1]);

  } else {

    const numberMatch =
      n.match(
        /\b(\d+(?:\.\d+)?)\b/
      );

    qty =
      numberMatch
        ? Number(numberMatch[1])
        : 1;
  }


  if (!qty || qty <= 0) {

    status.textContent =
      "Please enter a valid quantity.";

    return;
  }


  /* --------------------------------
     DETECT STOCK OUT
  -------------------------------- */

  const isOut =
    /\b(
      bik|
      bike|
      bicke|
      biki|
      bikgaye|
      bikgaya|
      sell|
      sold|
      sale|
      out|
      remove|
      nikal|
      nikala|
      nikle|
      gaye|
      gaya
    )\b/ix.test(n)
    ||
    /बिक|बेच|बिके|बिकगये|गये|गया|निकाल|निकला/.test(n);


  /* --------------------------------
     FIND PRODUCT
  -------------------------------- */

  const product =
    findProduct(raw, isOut);


  if (!product) {

    status.textContent =
      "Product not found. Please check density and thickness.";

    return;
  }


  /* --------------------------------
     STOCK OUT
  -------------------------------- */

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


    status.textContent =
      `Stock Out: ${qty} ${product.unit} from ${product.product}.`;


    save();

    return;
  }


  /* --------------------------------
     STOCK IN
  -------------------------------- */

  product.stock =
    Number(product.stock || 0) + qty;


  status.textContent =
    `Stock In: ${qty} ${product.unit} to ${product.product}.`;


  save();
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
   VOICE RECOGNITION
========================= */

let recognition = null;


$("speakBtn").onclick = () => {

  const SR =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;


  if (!SR) {

    $("status").textContent =
      "Voice recognition is not supported in this browser. Type the command instead.";

    return;
  }


  try {

    recognition =
      new SR();


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
   INITIAL LOAD
========================= */

render();
