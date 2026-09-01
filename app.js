const KEY="city_group_inventory_v1";
let inventory=JSON.parse(localStorage.getItem(KEY)||"[]");

const $=id=>document.getElementById(id);

function norm(s){
  return String(s||"")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}.\s-]/gu," ")
    .replace(/\s+/g," ")
    .trim();
}

/* =========================
   PRODUCT NORMALIZATION
========================= */

function productNorm(s){
  let v=norm(s);

  v=v.replace(/gadde|gadday|gadda/gi,"gadda");
  v=v.replace(/गद्दे|गद्दा/g,"gadda");

  return v;
}


/* =========================
   UNIQUE PRODUCT KEY
========================= */

function itemKey(x){

  return [
    productNorm(x.product),
    norm(x.density),
    norm(x.thickness)
      .replace(/इंच/g,"inch"),
    norm(x.unit || "pcs")
  ].join("|");
}


/* =========================
   MERGE DUPLICATES
========================= */

function mergeDuplicates(){

  const merged=[];
  const seen=new Map();

  for(const x of inventory){

    const key=itemKey(x);

    if(seen.has(key)){

      const existing=
        merged[seen.get(key)];

      existing.stock=
        Number(existing.stock||0) +
        Number(x.stock||0);

      if(
        !Number(existing.rate||0) &&
        Number(x.rate||0)
      ){
        existing.rate=
          Number(x.rate||0);
      }

    }else{

      const copy={
        ...x,
        stock:Number(x.stock||0),
        rate:Number(x.rate||0)
      };

      seen.set(
        key,
        merged.length
      );

      merged.push(copy);
    }
  }

  inventory=merged;

  localStorage.setItem(
    KEY,
    JSON.stringify(inventory)
  );
}


/* =========================
   SAVE
========================= */

function save(){

  localStorage.setItem(
    KEY,
    JSON.stringify(inventory)
  );

  render();
}


/* =========================
   ESCAPE HTML
========================= */

function esc(s){

  return String(s ?? "")
    .replace(
      /[&<>"']/g,
      m=>({
        "&":"&amp;",
        "<":"&lt;",
        ">":"&gt;",
        '"':"&quot;",
        "'":"&#039;"
      }[m])
    );
}


/* =========================
   RENDER
========================= */

function render(){

  const q=
    norm($("search").value);

  const rows=
    inventory.filter(x=>
      [
        x.product,
        x.density,
        x.thickness,
        x.unit
      ].some(v=>
        norm(v).includes(q)
      )
    );

  $("inventoryBody").innerHTML=
    rows.map(x=>`

      <tr>

        <td>${esc(x.product)}</td>

        <td>${esc(x.density)}</td>

        <td>${esc(x.thickness)}</td>

        <td>${esc(x.unit)}</td>

        <td>${Number(x.stock||0)}</td>

        <td>
          ₹${Number(x.rate||0)
            .toLocaleString("en-IN")}
        </td>

      </tr>

    `).join("");

  $("empty").style.display=
    rows.length ? "none" : "block";


  const units=
    inventory.reduce(
      (total,x)=>
        total+Number(x.stock||0),
      0
    );


  const value=
    inventory.reduce(
      (total,x)=>
        total+
        Number(x.stock||0)*
        Number(x.rate||0),
      0
    );


  $("totalUnits").textContent=
    units;

  $("inventoryValue").textContent=
    "₹"+
    value.toLocaleString("en-IN");
}


/* =========================
   PRODUCT FORM
========================= */

function openProduct(){

  $("productDialog").showModal();
}


$("inventoryBtn").onclick=
  openProduct;


$("stockInBtn").onclick=()=>{

  $("command").value=
    "stock in ";

  $("command").focus();
};


$("stockOutBtn").onclick=()=>{

  $("command").value=
    "stock out ";

  $("command").focus();
};


$("rateBtn").onclick=()=>{

  $("search").focus();
};


$("cancelProduct").onclick=()=>{

  $("productDialog").close();
};


/* =========================
   ADD PRODUCT
========================= */

$("productForm").onsubmit=e=>{

  e.preventDefault();


  const item={

    product:
      $("product").value.trim(),

    density:
      $("density").value.trim(),

    thickness:
      $("thickness").value.trim(),

    unit:
      $("unit").value.trim() || "pcs",

    stock:
      Number($("stock").value||0),

    rate:
      Number($("rate").value||0)
  };


  if(!item.product){

    $("status").textContent=
      "Please enter product name.";

    return;
  }


  /* IMPORTANT:
     Existing same product =
     update stock instead of
     creating another row.
  */

  const existing=
    inventory.find(
      x=>itemKey(x)===itemKey(item)
    );


  if(existing){

    existing.stock=
      Number(existing.stock||0)+
      item.stock;

    if(item.rate>0){

      existing.rate=
        item.rate;
    }

  }else{

    inventory.push(item);
  }


  save();


  $("productForm").reset();

  $("unit").value="pcs";

  $("stock").value="0";

  $("rate").value="0";


  $("productDialog").close();


  $("status").textContent=
    "Product saved successfully.";
};


/* =========================
   FIND PRODUCT
========================= */

function findProduct(text){

  const n=
    norm(text)
      .replace(/इंच/g,"inch");


  /* First:
     Density + Thickness
  */

  const bySpec=
    inventory.find(x=>{

      const d=
        norm(x.density);

      const t=
        norm(x.thickness)
          .replace(/इंच/g,"inch");

      return(
        d &&
        t &&
        n.includes(d) &&
        n.includes(t)
      );
    });


  if(bySpec){

    return bySpec;
  }


  /* Second:
     Product name
  */

  return inventory.find(x=>{

    const p=
      productNorm(x.product);

    return(
      p &&
      productNorm(n).includes(p)
    );

  }) || null;
}


/* =========================
   PROCESS COMMAND
========================= */

function processCommand(){

  const raw=
    $("command").value.trim();


  if(!raw){

    $("status").textContent=
      "Please speak or type a command.";

    return;
  }


  const n=
    norm(raw);


  /* QUANTITY */

  let qtyMatch=
    n.match(
      /(\d+(?:\.\d+)?)\s*
      (?:gadde|gadda|gadday|pcs|piece|pieces|
      unit|units|नग|गद्दे|गद्दा)/ix
    );


  let qty;


  if(qtyMatch){

    qty=
      Number(qtyMatch[1]);

  }else{

    const numberMatch=
      n.match(
        /\b(\d+(?:\.\d+)?)\b/
      );

    qty=
      numberMatch
        ? Number(numberMatch[1])
        : 1;
  }


  if(!qty || qty<=0){

    $("status").textContent=
      "Please enter a valid quantity.";

    return;
  }


  /* STOCK OUT */

  const isOut=
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


  /* FIND */

  const product=
    findProduct(raw);


  if(!product){

    $("status").textContent=
      "Product not found. Add it first.";

    return;
  }


  /* STOCK OUT */

  if(isOut){

    const available=
      Number(product.stock||0);


    if(available<qty){

      $("status").textContent=
        `Not enough stock. Available: ${available}`;

      return;
    }


    product.stock=
      available-qty;


    $("status").textContent=
      `Stock Out: ${qty} ${product.unit} from ${product.product}.`;


    save();

    return;
  }


  /* STOCK IN */

  product.stock=
    Number(product.stock||0)+qty;


  $("status").textContent=
    `Stock In: ${qty} ${product.unit} to ${product.product}.`;


  save();
}


/* =========================
   PROCESS BUTTON
========================= */

$("processBtn").onclick=
  processCommand;


/* =========================
   SEARCH
========================= */

$("search").oninput=
  render;


/* =========================
   VOICE
   DO NOT CHANGE THIS
========================= */

let recognition=null;


$("speakBtn").onclick=()=>{

  const SR=
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;


  if(!SR){

    $("status").textContent=
      "Voice recognition is not supported in this browser. Type the command instead.";

    return;
  }


  try{

    recognition=
      new SR();


    recognition.lang=
      "hi-IN";


    recognition.interimResults=
      false;


    recognition.maxAlternatives=
      1;


    recognition.onstart=()=>{

      $("status").textContent=
        "Listening… बोलिए।";
    };


    recognition.onresult=e=>{

      const text=
        e.results[0][0].transcript;


      $("command").value=
        text;


      $("status").textContent=
        "Voice captured. Tap Process.";
    };


    recognition.onerror=e=>{

      $("status").textContent=
        "Voice error: "+e.error;
    };


    recognition.onend=()=>{};


    recognition.start();


  }catch(e){

    $("status").textContent=
      "Voice could not start. Please allow microphone permission and use the HTTPS app URL.";
  }
};


/* =========================
   REMOVE EXISTING DUPLICATES
   ON FIRST LOAD
========================= */

mergeDuplicates();

render();
