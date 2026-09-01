document.addEventListener("DOMContentLoaded", () => {

  const KEY = "city_group_inventory_v1";

  let inventory = [];
  try {
    inventory = JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch (e) {
    inventory = [];
  }

  const $ = id => document.getElementById(id);

  function save() {
    localStorage.setItem(KEY, JSON.stringify(inventory));
    render();
  }

  function norm(s) {
    return String(s || "")
      .toLowerCase()
      .replace(/[^\p{L}\p{N}.\s-]/gu, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function esc(s) {
    return String(s || "").replace(/[&<>"']/g, m => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[m]));
  }

  function render() {

    const searchBox = $("search");
    const q = searchBox ? norm(searchBox.value) : "";

    const rows = inventory.filter(x =>
      [
        x.product,
        x.density,
        x.thickness,
        x.unit
      ].some(v => norm(v).includes(q))
    );

    if ($("inventoryBody")) {
      $("inventoryBody").innerHTML = rows.map(x => `
        <tr>
          <td>${esc(x.product)}</td>
          <td>${esc(x.density)}</td>
          <td>${esc(x.thickness)}</td>
          <td>${esc(x.unit)}</td>
          <td>${Number(x.stock || 0)}</td>
          <td>₹${Number(x.rate || 0).toLocaleString("en-IN")}</td>
        </tr>
      `).join("");
    }

    if ($("empty")) {
      $("empty").style.display = rows.length ? "none" : "block";
    }

    const units = inventory.reduce(
      (a, x) => a + Number(x.stock || 0), 0
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


  // -------------------------
  // PRODUCT SEARCH
  // -------------------------

  function findProduct(text) {

    const n = norm(text);

    // First try density + thickness
    const match = inventory.find(x => {

      const d = norm(x.density);
      const t = norm(x.thickness);

      return (
        d &&
        t &&
        n.includes(d) &&
        n.includes(t)
      );
    });

    if (match) return match;

    // Otherwise try product name
    return inventory.find(x => {

      const p = norm(x.product);

      return p && n.includes(p);
    });
  }


  // -------------------------
  // PROCESS COMMAND
  // -------------------------

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

    // Quantity
    let qty = 1;

    const qtyMatch = n.match(
      /(\d+(?:\.\d+)?)\s*(?:gadde|gadda|gadday|pcs|piece|pieces|unit|units|नग|गद्दे|गद्दा)/i
    );

    if (qtyMatch) {
      qty = Number(qtyMatch[1]);
    } else {

      const numberMatch = n.match(/\b(\d+(?:\.\d+)?)\b/);

      if (numberMatch) {
        qty = Number(numberMatch[1]);
      }
    }

    if (!qty || qty <= 0) {
      qty = 1;
    }

    const product = findProduct(raw);

    if (!product) {
      $("status").textContent =
        "Product not found. Please add it first.";
      return;
    }


    // Stock Out words
    const isOut =
      /\b(bik|biki|bicke|bika|sell|sold|out|remove|nikal|nikala|gaye|gaya|gayi)\b/i.test(n)
      ||
      /बिक|बेच|बिके|बिका|गये|गया|गयी|निकाल/.test(n);


    if (isOut) {

      if (Number(product.stock || 0) < qty) {

        $("status").textContent =
          `Not enough stock. Available: ${product.stock || 0}`;

        return;
      }

      product.stock =
        Number(product.stock || 0) - qty;

      $("status").textContent =
        `Stock Out: ${qty} ${product.unit || "pcs"} from ${product.product}.`;

    } else {

      product.stock =
        Number(product.stock || 0) + qty;

      $("status").textContent =
        `Stock In: ${qty} ${product.unit || "pcs"} to ${product.product}.`;
    }

    save();
  }


  // -------------------------
  // PRODUCT DIALOG
  // -------------------------

  if ($("inventoryBtn")) {
    $("inventoryBtn").onclick = () => {

      if ($("productDialog")) {
        $("productDialog").showModal();
      }
    };
  }


  // -------------------------
  // STOCK IN BUTTON
  // -------------------------

  if ($("stockInBtn")) {
    $("stockInBtn").onclick = () => {

      $("command").value = "stock in ";
      $("command").focus();

      $("status").textContent =
        "Type quantity and product, then tap Process.";
    };
  }


  // -------------------------
  // STOCK OUT BUTTON
  // -------------------------

  if ($("stockOutBtn")) {
    $("stockOutBtn").onclick = () => {

      $("command").value = "stock out ";
      $("command").focus();

      $("status").textContent =
        "Type quantity and product, then tap Process.";
    };
  }


  // -------------------------
  // RATE LIST / SEARCH
  // -------------------------

  if ($("rateBtn")) {
    $("rateBtn").onclick = () => {

      if ($("search")) {
        $("search").focus();
      }
    };
  }


  // -------------------------
  // CANCEL PRODUCT
  // -------------------------

  if ($("cancelProduct")) {
    $("cancelProduct").onclick = () => {

      if ($("productDialog")) {
        $("productDialog").close();
      }
    };
  }


  // -------------------------
  // ADD PRODUCT
  // -------------------------

  if ($("productForm")) {

    $("productForm").onsubmit = e => {

      e.preventDefault();

      const product = {
        product: $("product").value.trim(),
        density: $("density").value.trim(),
        thickness: $("thickness").value.trim(),
        unit: $("unit").value.trim() || "pcs",
        stock: Number($("stock").value || 0),
        rate: Number($("rate").value || 0)
      };

      inventory.push(product);

      save();

      $("productForm").reset();

      if ($("unit")) $("unit").value = "pcs";
      if ($("stock")) $("stock").value = "0";
      if ($("rate")) $("rate").value = "0";

      if ($("productDialog")) {
        $("productDialog").close();
      }

      $("status").textContent =
        "Product saved successfully.";
    };
  }


  // -------------------------
  // PROCESS BUTTON
  // -------------------------

  if ($("processBtn")) {
    $("processBtn").onclick = processCommand;
  }


  // -------------------------
  // SEARCH
  // -------------------------

  if ($("search")) {
    $("search").oninput = render;
  }


  // -------------------------
  // VOICE RECOGNITION
  // -------------------------

  let recognition = null;

  if ($("speakBtn")) {

    $("speakBtn").onclick = () => {

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

        recognition.onresult = e => {

          const text =
            e.results[0][0].transcript;

          $("command").value = text;

          $("status").textContent =
            "Voice captured. Tap Process.";
        };

        recognition.onerror = e => {

          $("status").textContent =
            "Voice error: " + e.error;
        };

        recognition.start();

      } catch (e) {

        $("status").textContent =
          "Voice could not start. Please allow microphone permission and use HTTPS.";
      }
    };
  }


  // Initial display
  render();

});
