// NexaBot FIXED VERSION // - /obf command wired // - random filename suffix to avoid overwrite

import axios from "axios"; import crypto from "crypto"; import zlib from "zlib"; import FormData from "form-data";

/* ================= OWNER ================= */ const OWNER = { id: "7777604508", name: "Vinzz Offc", telegram: "@vinzz_officials", whatsapp: "https://wa.me/6285185667890" };

/* ================= CONSTANT ================= */ const TG_LIMIT = 3900;

/* ================= HELPERS ================= */ const rand = (n=4)=>Math.random().toString(36).slice(2,2+n); const withRand = (name)=>{ const i=name.lastIndexOf('.'); if(i===-1) return ${name}-${rand(6)}; return ${name.slice(0,i)}-${rand(6)}${name.slice(i)}; };

/* ================= BASE32 RFC4648 ================= */ const BASE32 = { alphabet: "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567", encode(input) { let bits = ""; for (const b of Buffer.from(input)) bits += b.toString(2).padStart(8, "0"); let out = ""; for (let i = 0; i < bits.length; i += 5) out += this.alphabet[parseInt(bits.slice(i, i + 5).padEnd(5, "0"), 2)]; while (out.length % 8 !== 0) out += "="; return out; }, decode(input) { input = input.replace(/=+$/, "").toUpperCase(); let bits = ""; for (const c of input) { const v = this.alphabet.indexOf(c); if (v >= 0) bits += v.toString(2).padStart(5, "0"); } const out = []; for (let i = 0; i + 8 <= bits.length; i += 8) out.push(parseInt(bits.slice(i, i + 8), 2)); return Buffer.from(out).toString(); } };

/* ================= UTILS ================= */ const esc = t => t.replace(/&/g,"&").replace(/</g,"<").replace(/>/g,">");

async function getFileText(token, file_id) { const api = https://api.telegram.org/bot${token}; const f = await axios.get(${api}/getFile?file_id=${file_id}); const path = f.data.result.file_path; const file = await axios.get(${api.replace("/bot","/file/bot")}/${path}, { responseType: "arraybuffer" }); return Buffer.from(file.data).toString(); }

function sendSmart(API, chatId, title, content, filename="result.txt") { if (content.length <= TG_LIMIT) { return axios.post(${API}/sendMessage, { chat_id: chatId, parse_mode: "HTML", text: <b>${title}</b>\n<code>${esc(content)}</code> }); } const form = new FormData(); form.append("chat_id", chatId); form.append("caption", title); form.append("document", Buffer.from(content), withRand(filename)); return axios.post(${API}/sendDocument, form, { headers: form.getHeaders() }); }

/* ================= MENUS ================= */ const MAIN_MENU = { inline_keyboard: [ [{ text:"🔐 Encode", callback_data:"encode" }], [{ text:"🔓 Decode", callback_data:"decode" }], [{ text:"🛡 Obfuscate", callback_data:"obf" }], [{ text:"⭐ Rate NexaBot", callback_data:"rate" }], [{ text:"👤 About Owner", callback_data:"owner" }] ]}; const BACK = { inline_keyboard: [[{ text:"⬅ Back to Main Menu", callback_data:"menu" }]] }; const RATING = { inline_keyboard: [ [{ text:"⭐", callback_data:"rate_1" }], [{ text:"⭐⭐", callback_data:"rate_2" }], [{ text:"⭐⭐⭐", callback_data:"rate_3" }], [{ text:"⭐⭐⭐⭐", callback_data:"rate_4" }], [{ text:"⭐⭐⭐⭐⭐", callback_data:"rate_5" }], [{ text:"⬅ Back", callback_data:"menu" }] ]};

/* ================= HANDLER ================= */ export default async function handler(req, res) { if (req.method !== "POST") return res.status(200).json({ ok:true }); const upd = req.body; if (upd.edited_message) return res.status(200).end();

const token = req.url.split("/").pop().split("?")[0]; if (!token) return res.status(200).end();

const API = https://api.telegram.org/bot${token}; const msg = upd.message; const cb  = upd.callback_query; if (!msg && !cb) return res.status(200).end();

const chatId = msg?.chat?.id || cb?.message?.chat?.id; const msgId  = cb?.message?.message_id; const text   = msg?.text || "";

res.status(200).end(); // anti-loop

/* ================= CALLBACK ================= */ if (cb) { axios.post(${API}/answerCallbackQuery, { callback_query_id: cb.id }).catch(()=>{}); const d = cb.data; if (d === "menu") return axios.post(${API}/editMessageText, { chat_id: chatId, message_id: msgId, parse_mode:"HTML", reply_markup: MAIN_MENU, text:<b>🚀 NexaBot</b>\n<i>Professional Encoder • Decoder • Obfuscator</i> }); if (d === "encode") return axios.post(${API}/editMessageText, { chat_id: chatId, message_id: msgId, parse_mode:"HTML", reply_markup: BACK, text:🔐 <b>ENCODER</b> }); if (d === "decode") return axios.post(${API}/editMessageText, { chat_id: chatId, message_id: msgId, parse_mode:"HTML", reply_markup: BACK, text:🔓 <b>DECODER</b> }); if (d === "obf")    return axios.post(${API}/editMessageText, { chat_id: chatId, message_id: msgId, parse_mode:"HTML", reply_markup: BACK, text:🛡 <b>CODE OBFUSCATION</b> }); if (d === "owner")  return axios.post(${API}/editMessageText, { chat_id: chatId, message_id: msgId, parse_mode:"HTML", reply_markup: BACK, text:👤 <b>${OWNER.name}</b>\nTelegram: ${OWNER.telegram}\nWhatsApp: ${OWNER.whatsapp} }); if (d === "rate")   return axios.post(${API}/editMessageText, { chat_id: chatId, message_id: msgId, parse_mode:"HTML", reply_markup: RATING, text:⭐ <b>RATE NEXABOT</b> }); if (d.startsWith("rate_")) { const s = d.split("_")[1]; axios.post(${API}/sendMessage, { chat_id: OWNER.id, text:⭐ New Rating\nUser: ${chatId}\nRating: ${"⭐".repeat(s)} }).catch(()=>{}); return axios.post(${API}/editMessageText, { chat_id: chatId, message_id: msgId, parse_mode:"HTML", reply_markup: BACK, text:✅ Thank you ${"⭐".repeat(s)} }); } }

/* ================= INPUT ================= */ async function resolveInput(rest) { if (rest) return rest; const r = msg?.reply_to_message; if (!r) return null; if (r.text) return r.text; if (r.document) return await getFileText(token, r.document.file_id); return null; }

function parseChain(str) { if (!str.startsWith("chain:")) return null; if (/[^a-z0-9_|:]/i.test(str)) return null; return str.replace("chain:","").split("|").filter(Boolean); }

function runChain(map, chain, input) { let out = input; for (const step of chain) { if (!map[step]) return { error: step }; out = mapstep; if (!out) return { error: step }; } return { out }; }

/* ================= COMMANDS ================= */ (async ()=>{ if (text === "/start") return axios.post(${API}/sendMessage, { chat_id: chatId, parse_mode:"HTML", reply_markup: MAIN_MENU, text:<b>🚀 NexaBot</b> });

if (text.startsWith("/enc ")) {
  const [, type, ...r] = text.split(" ");
  const input = await resolveInput(r.join(" "));
  if (!input) return;
  if (type.startsWith("chain:")) {
    const c = parseChain(type); if (!c) return;
    const r2 = runChain(ENC, c, input); if (r2.error) return;
    return sendSmart(API, chatId, "Encoded Output", r2.out);
  }
  if (!ENC[type]) return;
  return sendSmart(API, chatId, "Encoded Output", ENC[type](input));
}

if (text.startsWith("/dec ")) {
  const [, type, ...r] = text.split(" ");
  const input = await resolveInput(r.join(" "));
  if (!input) return;
  if (type.startsWith("chain:")) {
    const c = parseChain(type); if (!c) return;
    const r2 = runChain(DEC, [...c].reverse(), input); if (r2.error) return;
    return sendSmart(API, chatId, "Decoded Output", r2.out);
  }
  if (!DEC[type]) return;
  return sendSmart(API, chatId, "Decoded Output", DEC[type](input));
}

// >>> FIXED: OBF COMMAND <<<
if (text.startsWith("/obf ")) {
  const [, type, ...r] = text.split(" ");
  const input = await resolveInput(r.join(" "));
  if (!input) return;
  if (!OBF[type]) return;
  return sendSmart(API, chatId, "Obfuscated Code", OBF[type](input), `${type}.txt`);
}

})().catch(console.error); }

/* ================= ENCODE ================= */ const ENC = { b64:t=>Buffer.from(t).toString("base64"), b32:t=>BASE32.encode(t), hex:t=>Buffer.from(t).toString("hex"), bin:t=>[...t].map(c=>c.charCodeAt(0).toString(2)).join(" "), oct:t=>[...t].map(c=>c.charCodeAt(0).toString(8)).join(" "), ascii:t=>[...t].map(c=>c.charCodeAt(0)).join(","), rev:t=>t.split("").reverse().join(""), rot13:t=>t.replace(/[a-z]/gi,c=>String.fromCharCode(c.charCodeAt(0)+(c.toLowerCase()<"n"?13:-13))), rot47:t=>t.replace(/./g,c=>{let a=c.charCodeAt(0);return a>=33&&a<=126?String.fromCharCode(33+((a+14)%94)):c}), caesar:t=>[...t].map(c=>String.fromCharCode(c.charCodeAt(0)+5)).join(""), xor:t=>Buffer.from([...t].map(c=>c.charCodeAt(0)^77)).toString("base64"), url:t=>encodeURIComponent(t), html:t=>t.replace(/./g,c=>&#${c.charCodeAt(0)};), unicode:t=>t.replace(/./g,c=>"\u"+c.charCodeAt(0).toString(16)), escape:t=>escape(t), json:t=>JSON.stringify(t), md5:t=>crypto.createHash("md5").update(t).digest("hex"), sha1:t=>crypto.createHash("sha1").update(t).digest("hex"), sha256:t=>crypto.createHash("sha256").update(t).digest("hex"), sha512:t=>crypto.createHash("sha512").update(t).digest("hex"), gzip:t=>zlib.gzipSync(t).toString("base64"), deflate:t=>zlib.deflateSync(t).toString("base64"), doubleb64:t=>Buffer.from(Buffer.from(t).toString("base64")).toString("base64"), mirror:t=>{const m=t.length>>1;return t.slice(0,m)+t.slice(m).split("").reverse().join("")}, multi:t=>Buffer.from(Buffer.from(t).toString("base64").split("").reverse().join("")).toString("hex") };

/* ================= DECODE ================= */ const DEC = { b64:t=>Buffer.from(t,"base64").toString(), b32:t=>BASE32.decode(t), hex:t=>Buffer.from(t,"hex").toString(), bin:t=>t.split(" ").map(b=>String.fromCharCode(parseInt(b,2))).join(""), oct:t=>t.split(" ").map(o=>String.fromCharCode(parseInt(o,8))).join(""), ascii:t=>t.split(",").map(n=>String.fromCharCode(n)).join(""), rev:t=>t.split("").reverse().join(""), rot13:ENC.rot13, rot47:ENC.rot47, caesar:t=>[...t].map(c=>String.fromCharCode(c.charCodeAt(0)-5)).join(""), xor:t=>[...Buffer.from(t,"base64")].map(c=>String.fromCharCode(c^77)).join(""), url:t=>decodeURIComponent(t), html:t=>t.replace(/&#(\d+);/g,(m,g)=>String.fromCharCode(g)), unicode:t=>t.replace(/\u([\d\w]{4})/gi,(m,g)=>String.fromCharCode(parseInt(g,16))), unescape:t=>unescape(t), json:t=>JSON.parse(t), gzip:t=>zlib.gunzipSync(Buffer.from(t,"base64")).toString(), deflate:t=>zlib.inflateSync(Buffer.from(t,"base64")).toString(), doubleb64:t=>Buffer.from(Buffer.from(t,"base64").toString(),"base64").toString(), mirror:t=>{const m=t.length>>1;return t.slice(0,m)+t.slice(m).split("").reverse().join("")}, multi:t=>Buffer.from(Buffer.from(t,"hex").toString().split("").reverse().join(""),"base64").toString(), trim:t=>t.trim(), lower:t=>t.toLowerCase(), upper:t=>t.toUpperCase() };

/* ================= OBF ================= */ const OBF = { js:c=>(function(){const a="${Buffer.from(c).toString("base64")}";const d=atob(a);(new Function(d))();})();, html:c=>c.replace(/./g,x=>&#${x.charCodeAt(0)};), py:c=>import base64;exec(base64.b64decode("${Buffer.from(c).toString("base64")}")), php:c=><?php eval(base64_decode("${Buffer.from(c).toString("base64")}")); ?> };
