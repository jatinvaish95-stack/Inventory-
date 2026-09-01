const KEY="city_group_inventory_v1";
let inventory=[];

try{
  inventory=JSON.parse(localStorage.getItem(KEY)||"[]");
  if(!Array.isArray(inventory)) inventory=[];
}catch(e){inventory=[]}

const $=id=>document.getElementById(id);

function norm(s){
  return String(s||"").toLowerCase()
    .replace(/inches?/g,"inch")
    .replace(/[^\p{L}\p{N}.\s-]/gu," ")
    .replace(/\s+/g," ").trim();
}

function save(){
  localStorage.setItem(KEY,JSON.stringify(inventory));
  render();
}

function esc(s){
  return String(s??"").replace(/[&<>"']/g,m=>({
    "&":"&amp;","<":"&lt;",">":"&gt;",
    '"':"&quot;","'":"&#039;"
  }[m]));
}

function render(){
  const q=norm($("search")?.value||"");
  const list=inventory.filter(x=>
    [x.product,x.density,x.thickness,x.unit]
    .some(v=>norm(v).includes(q))
  );

  $("inventoryBody").innerHTML=list.map(x=>`
    <tr>
      <td>${esc(x.product)}</td>
      <td>${esc(x.density)}</td>
      <td>${esc(x.thickness)}</td>
      <td>${esc(x.unit||"pcs")}</td>
      <td>${Number(x.stock||0)}</td>
      <td>₹${Number(x.rate||0).toLocaleString("en-IN")}</td>
    </tr>
  `).join("");

  $("empty").style.display=list.length?"none":"block";

  const total=inventory.reduce(
    (a,x)=>a+Number(x.stock||0),0
  );

  const value=inventory.reduce(
    (a,x)=>a+Number(x.stock||0)*Number(x.rate||0),0
  );

  $("totalUnits").textContent=total;
  $("inventoryValue").textContent=
    "₹"+value.toLocaleString("en-IN");
}

function openProduct(){
  $("productDialog").showModal();
}

$("inventoryBtn").onclick=openProduct;

$("stockInBtn").onclick=()=>{
  $("command").value="stock in ";
  $("command").focus();
};

$("stockOutBtn").onclick=()=>{
  $("command").value="stock out ";
  $("command").focus();
};

$("rateBtn").onclick=()=>{
  $("search").focus();
};

$("cancelProduct").onclick=()=>{
  $("productDialog").close();
};

$("productForm").onsubmit=e=>{
  e.preventDefault();

  const p={
    product:$("product").value.trim(),
    density:$("density").value.trim(),
    thickness:$("thickness").value.trim(),
    unit:$("unit").value.trim()||"pcs",
    stock:Number($("stock").value||0),
    rate:Number($("rate").value||0)
  };

  if(!p.product){
    $("status").textContent="Please enter product name.";
    return;
  }

  inventory.push(p);
  save();

  $("productForm").reset();
  $("unit").value="pcs";
  $("stock").value="0";
  $("rate").value="0";
  $("productDialog").close();

  $("status").textContent="Product saved successfully.";
};

function isOut(text){
  const n=norm(text);

  return /\b(bik|bike|bicke|biki|sell|sold|sale|out|remove|nikal|nikala|gaye|gaya)\b/i.test(n)
    || /बिक|बेच|बिके|गये|गया|निकाल|निकला/.test(n);
}

function getQty(text){
  const n=norm(text);

  const m=n.match(
    /(\d+(?:\.\d+)?)\s*(?:gadde|gadda|gadday|pcs|piece|pieces|unit|units|नग|गद्दे|गद्दा)/i
  );

  if(m) return Number(m[1]);

  const num=n.match(/\b(\d+(?:\.\d+)?)\b/);

  return num?Number(num[1]):1;
}

function findProduct(text,out){
  const n=norm(text);

  const dm=n.match(
    /(\d+(?:\.\d+)?)\s*(?:density|डेंसिटी)/
  );

  const tm=n.match(
    /(\d+(?:\.\d+)?)\s*(?:inch|इंच)/
  );

  if(dm&&tm){

    const d=norm(dm[1]);
    const t=norm(tm[1]+" inch");

    const matches=inventory.filter(x=>
      norm(x.density)===d &&
      norm(x.thickness)===t
    );

    if(matches.length){

      if(out){
        const available=matches.find(
          x=>Number(x.stock||0)>0
        );

        if(available) return available;
      }

      return matches[0];
    }
  }

  return inventory.find(x=>{
    const p=norm(x.product);

    if(!p) return false;

    if(n.includes(p)) return true;

    if(
      (p==="gadda"||p==="gadde") &&
      (
        n.includes("gadda")||
        n.includes("gadde")||
        n.includes("गद्दा")||
        n.includes("गद्दे")
      )
    ) return true;

    return false;
  })||null;
}

function processCommand(){

  const raw=$("command").value.trim();

  if(!raw){
    $("status").textContent=
      "Please speak or type a command.";
    return;
  }

  const out=isOut(raw);
  const qty=getQty(raw);
  const p=findProduct(raw,out);

  if(!p){
    $("status").textContent=
      "Product not found. Add it first.";
    return;
  }

  const stock=Number(p.stock||0);

  if(out){

    if(stock<qty){
      $("status").textContent=
        `Not enough stock. Available: ${stock}`;
      return;
    }

    p.stock=stock-qty;

    $("status").textContent=
      `Stock Out: ${qty} ${p.unit||"pcs"} from ${p.product}.`;

  }else{

    p.stock=stock+qty;

    $("status").textContent=
      `Stock In: ${qty} ${p.unit||"pcs"} to ${p.product}.`;
  }

  save();
}

$("processBtn").onclick=processCommand;

$("search").oninput=render;

let recognition=null;

$("speakBtn").onclick=()=>{

  const SR=
    window.SpeechRecognition||
    window.webkitSpeechRecognition;

  if(!SR){
    $("status").textContent=
      "Voice recognition is not supported. Type the command.";
    return;
  }

  recognition=new SR();
  recognition.lang="hi-IN";
  recognition.interimResults=false;
  recognition.maxAlternatives=1;

  recognition.onstart=()=>{
    $("status").textContent="Listening… बोलिए।";
  };

  recognition.onresult=e=>{
    $("command").value=
      e.results[0][0].transcript;

    $("status").textContent=
      "Voice captured. Tap Process.";
  };

  recognition.onerror=e=>{
    $("status").textContent=
      "Voice error: "+e.error;
  };

  try{
    recognition.start();
  }catch(e){}
};

render();
