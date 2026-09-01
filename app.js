const KEY="city_group_inventory_v1";
let inventory=JSON.parse(localStorage.getItem(KEY)||"[]");

const $=id=>document.getElementById(id);
function save(){localStorage.setItem(KEY,JSON.stringify(inventory));render();}
function norm(s){return String(s||"").toLowerCase().replace(/[^\p{L}\p{N}.\s-]/gu," ").replace(/\s+/g," ").trim();}
function render(){
  const q=norm($("search").value);
  const rows=inventory.filter(x=>[x.product,x.density,x.thickness,x.unit].some(v=>norm(v).includes(q)));
  $("inventoryBody").innerHTML=rows.map(x=>`<tr><td>${esc(x.product)}</td><td>${esc(x.density)}</td><td>${esc(x.thickness)}</td><td>${esc(x.unit)}</td><td>${x.stock}</td><td>₹${Number(x.rate||0).toLocaleString("en-IN")}</td></tr>`).join("");
  $("empty").style.display=rows.length?"none":"block";
  const units=inventory.reduce((a,x)=>a+Number(x.stock||0),0);
  const value=inventory.reduce((a,x)=>a+Number(x.stock||0)*Number(x.rate||0),0);
  $("totalUnits").textContent=units;
  $("inventoryValue").textContent="₹"+value.toLocaleString("en-IN");
}
function esc(s){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));}
function openProduct(){ $("productDialog").showModal(); }
$("inventoryBtn").onclick=openProduct;
$("stockInBtn").onclick=()=>{$("command").value="stock in ";$("command").focus()};
$("stockOutBtn").onclick=()=>{$("command").value="stock out ";$("command").focus()};
$("rateBtn").onclick=()=>{$("search").focus()};

$("cancelProduct").onclick=()=>$("productDialog").close();
$("productForm").onsubmit=e=>{
 e.preventDefault();
 inventory.push({product:$("product").value.trim(),density:$("density").value.trim(),thickness:$("thickness").value.trim(),unit:$("unit").value.trim()||"pcs",stock:Number($("stock").value||0),rate:Number($("rate").value||0)});
 save(); $("productForm").reset(); $("unit").value="pcs"; $("stock").value="0"; $("rate").value="0"; $("productDialog").close();
 $("status").textContent="Product saved successfully.";
};

function findProduct(text){
 const n=norm(text);
 return inventory.find(x=>{
   const d=norm(x.density), t=norm(x.thickness), p=norm(x.product);
   return (d && n.includes(d)) && (t && n.includes(t));
 }) || inventory.find(x=>p && n.includes(p));
}
function processCommand(){
 const raw=$("command").value.trim();
 if(!raw){$("status").textContent="Please speak or type a command.";return}
 const n=norm(raw);
 let qtyMatch=n.match(/(\d+(?:\.\d+)?)\s*(?:gadde|gadda|pcs|piece|pieces|unit|units|नग|गद्दे|गद्दा)/i);
 let qty=qtyMatch?Number(qtyMatch[1]):(n.match(/\b(\d+)\b/)||[])[1];
 qty=Number(qty||1);
 const p=findProduct(raw);
 if(!p){$("status").textContent="Product not found. Add it first.";return}
 const isOut=/\b(bik|bicke|biki|sell|sold|out|remove|nikal|gaye|gaya)\b|बिक|बेच|बिके|गये|गया|निकाल/.test(n);
 if(isOut){
   if(p.stock<qty){$("status").textContent=`Not enough stock. Available: ${p.stock}`;return}
   p.stock-=qty;
   $("status").textContent=`Stock Out: ${qty} ${p.unit} from ${p.product}.`;
 }else{
   p.stock+=qty;
   $("status").textContent=`Stock In: ${qty} ${p.unit} to ${p.product}.`;
 }
 save();
}
$("processBtn").onclick=processCommand;
$("search").oninput=render;

let recognition=null;
$("speakBtn").onclick=()=>{
 const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
 if(!SR){$("status").textContent="Voice recognition is not supported in this browser. Type the command instead.";return}
 try{
  recognition=new SR();
  recognition.lang="hi-IN"; recognition.interimResults=false; recognition.maxAlternatives=1;
  recognition.onstart=()=>{$("status").textContent="Listening… बोलिए।"};
  recognition.onresult=e=>{$("command").value=e.results[0][0].transcript;$("status").textContent="Voice captured. Tap Process.";};
  recognition.onerror=e=>$("status").textContent="Voice error: "+e.error;
  recognition.onend=()=>{};
  recognition.start();
 }catch(e){$("status").textContent="Voice could not start. Please allow microphone permission and use the HTTPS app URL."}
};
render();
