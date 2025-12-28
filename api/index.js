import axios from "axios";
import crypto from "crypto";
import zlib from "zlib";

/* ================= OWNER ================= */
const OWNER = {
  id: "7777604508",
  name: "Vinzz Offc",
  telegram: "@vinzz_officials",
  whatsapp: "https://wa.me/6285185667890"
};

/* ================= HELPERS ================= */
const esc = t =>
  t.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");

async function getFileText(token, file_id) {
  const api = `https://api.telegram.org/bot${token}`;
  const f = await axios.get(`${api}/getFile?file_id=${file_id}`);
  const path = f.data.result.file_path;
  const file = await axios.get(
    `https://api.telegram.org/file/bot${token}/${path}`,
    { responseType: "arraybuffer" }
  );
  return Buffer.from(file.data).toString();
}

/* ================= HANDLER ================= */
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(200).json({ ok:true });

  try {
    const token = req.url.split("/").pop().split("?")[0];
    if (!token || !req.body) return res.status(200).end();

    const API = `https://api.telegram.org/bot${token}`;
    const send = (chat_id, text, kb={}) =>
      axios.post(`${API}/sendMessage`, {
        chat_id, text, parse_mode:"HTML", reply_markup:kb
      });

    const edit = (chat_id, message_id, text, kb={}) =>
      axios.post(`${API}/editMessageText`, {
        chat_id, message_id, text, parse_mode:"HTML", reply_markup:kb
      });

    const upd = req.body;
    const msg = upd.message;
    const cb  = upd.callback_query;
    if (!msg && !cb) return res.status(200).end();

    const chatId = msg?.chat?.id || cb?.message?.chat?.id;
    const msgId  = cb?.message?.message_id;
    const text   = msg?.text || "";

    /* ================= START ================= */
    if (text === "/start") {
      await send(chatId,
`<b>⚙️ Universal Encoder Toolkit</b>

• 🔐 Encode 27+
• 🔓 Decode 26+
• 🛡 Obfuscator
• 📎 Text & File Input
• 🔗 Chain Support`,
        MAIN_MENU
      );
      return res.status(200).end();
    }

    /* ================= CALLBACK ================= */
    if (cb) {
      const d = cb.data;
      if (d === "menu")
        await edit(chatId,msgId,"<b>⚙️ Universal Encoder Toolkit</b>",MAIN_MENU);
      else if (d === "encode")
        await edit(chatId,msgId,
`🔐 <b>ENCODE</b>
Reply text/file or:
<code>/enc b64 hello</code>
<code>/enc chain:b64|hex|rev</code>`,BACK);
      else if (d === "decode")
        await edit(chatId,msgId,
`🔓 <b>DECODE</b>
Reply text/file or:
<code>/dec b64</code>
<code>/dec chain:rev|hex</code>`,BACK);
      else if (d === "obf")
        await edit(chatId,msgId,
`🛡 <b>OBFUSCATOR</b>
<code>/obf js alert(1)</code>`,BACK);
      else if (d === "owner")
        await edit(chatId,msgId,
`👤 <b>OWNER</b>
${OWNER.name}
${OWNER.telegram}
${OWNER.whatsapp}`,BACK);
      return res.status(200).end();
    }

    /* ================= INPUT RESOLVER ================= */
    async function resolveInput(rest) {
      if (rest) return rest;
      if (!msg?.reply_to_message) return null;
      const r = msg.reply_to_message;
      if (r.text) return r.text;
      if (r.document) return await getFileText(token, r.document.file_id);
      return null;
    }

    /* ================= ENCODE ================= */
    if (text.startsWith("/enc ")) {
      const [, type, ...r] = text.split(" ");
      let input = await resolveInput(r.join(" "));
      if (!input) return send(chatId,"❌ No input");

      let out = input;
      if (type.startsWith("chain:")) {
        for (const c of type.replace("chain:","").split("|")) {
          if (!ENC[c]) return send(chatId,`❌ Encode ${c} not found`);
          out = ENC[c](out);
        }
      } else {
        if (!ENC[type]) return send(chatId,"❌ Encode type not found");
        out = ENC[type](input);
      }
      return send(chatId, `<b>Result</b>\n<code>${esc(out)}</code>`);
    }

    /* ================= DECODE ================= */
    if (text.startsWith("/dec ")) {
      const [, type, ...r] = text.split(" ");
      let input = await resolveInput(r.join(" "));
      if (!input) return send(chatId,"❌ No input");

      let out = input;
      if (type.startsWith("chain:")) {
        for (const c of type.replace("chain:","").split("|").reverse()) {
          if (!DEC[c]) return send(chatId,`❌ Decode ${c} not found`);
          out = DEC[c](out);
        }
      } else {
        if (!DEC[type]) return send(chatId,"❌ Decode type not found");
        out = DEC[type](input);
      }
      return send(chatId, `<b>Result</b>\n<code>${esc(out)}</code>`);
    }

    /* ================= OBF ================= */
    if (text.startsWith("/obf ")) {
      const [, type, ...r] = text.split(" ");
      const input = await resolveInput(r.join(" "));
      if (!input || !OBF[type]) return send(chatId,"❌ Invalid obf");
      return send(chatId, `<b>Obfuscated</b>\n<code>${esc(OBF[type](input))}</code>`);
    }

    res.status(200).end();

  } catch (e) {
    console.error(e);
    res.status(200).end();
  }
}

/* ================= MENUS ================= */
const MAIN_MENU = {
  inline_keyboard: [
    [{ text:"🔐 Encode", callback_data:"encode" }],
    [{ text:"🔓 Decode", callback_data:"decode" }],
    [{ text:"🛡 Obfuscate", callback_data:"obf" }],
    [{ text:"👤 Owner", callback_data:"owner" }]
  ]
};
const BACK = { inline_keyboard:[[ { text:"🔙 Back", callback_data:"menu" } ]] };

/* ================= ENCODE (27) ================= */
const ENC = {
  b64:t=>Buffer.from(t).toString("base64"),
  b32:t=>Buffer.from(t).toString("base64").replace(/=/g,""),
  hex:t=>Buffer.from(t).toString("hex"),
  bin:t=>[...t].map(c=>c.charCodeAt(0).toString(2)).join(" "),
  oct:t=>[...t].map(c=>c.charCodeAt(0).toString(8)).join(" "),
  ascii:t=>[...t].map(c=>c.charCodeAt(0)).join(","),
  rev:t=>t.split("").reverse().join(""),
  rot13:t=>t.replace(/[a-z]/gi,c=>String.fromCharCode(c.charCodeAt(0)+(c.toLowerCase()<"n"?13:-13))),
  rot47:t=>t.replace(/./g,c=>{let a=c.charCodeAt(0);return a>=33&&a<=126?String.fromCharCode(33+((a+14)%94)):c}),
  caesar:t=>[...t].map(c=>String.fromCharCode(c.charCodeAt(0)+5)).join(""),
  xor:t=>Buffer.from([...t].map(c=>c.charCodeAt(0)^77)).toString("base64"),
  url:t=>encodeURIComponent(t),
  html:t=>t.replace(/./g,c=>`&#${c.charCodeAt(0)};`),
  unicode:t=>t.replace(/./g,c=>"\\u"+c.charCodeAt(0).toString(16)),
  escape:t=>escape(t),
  json:t=>JSON.stringify(t),
  md5:t=>crypto.createHash("md5").update(t).digest("hex"),
  sha1:t=>crypto.createHash("sha1").update(t).digest("hex"),
  sha256:t=>crypto.createHash("sha256").update(t).digest("hex"),
  sha512:t=>crypto.createHash("sha512").update(t).digest("hex"),
  gzip:t=>zlib.gzipSync(t).toString("base64"),
  deflate:t=>zlib.deflateSync(t).toString("base64"),
  doubleb64:t=>Buffer.from(Buffer.from(t).toString("base64")).toString("base64"),
  mirror:t=>{const m=t.length/2|0;return t.slice(0,m)+t.slice(m).split("").reverse().join("")},
  multi:t=>Buffer.from(Buffer.from(t).toString("base64").split("").reverse().join("")).toString("hex")
};

/* ================= DECODE (26) ================= */
const DEC = {
  b64:t=>Buffer.from(t,"base64").toString(),
  hex:t=>Buffer.from(t,"hex").toString(),
  bin:t=>t.split(" ").map(b=>String.fromCharCode(parseInt(b,2))).join(""),
  oct:t=>t.split(" ").map(o=>String.fromCharCode(parseInt(o,8))).join(""),
  ascii:t=>t.split(",").map(n=>String.fromCharCode(n)).join(""),
  rev:t=>t.split("").reverse().join(""),
  rot13:ENC.rot13,
  rot47:ENC.rot47,
  caesar:t=>[...t].map(c=>String.fromCharCode(c.charCodeAt(0)-5)).join(""),
  xor:t=>[...Buffer.from(t,"base64")].map(c=>String.fromCharCode(c^77)).join(""),
  url:t=>decodeURIComponent(t),
  html:t=>t.replace(/&#(\d+);/g,(m,g)=>String.fromCharCode(g)),
  unicode:t=>t.replace(/\\u([\d\w]{4})/gi,(m,g)=>String.fromCharCode(parseInt(g,16))),
  unescape:t=>unescape(t),
  json:t=>JSON.parse(t),
  gzip:t=>zlib.gunzipSync(Buffer.from(t,"base64")).toString(),
  deflate:t=>zlib.inflateSync(Buffer.from(t,"base64")).toString(),
  doubleb64:t=>Buffer.from(Buffer.from(t,"base64").toString(),"base64").toString(),
  mirror:t=>{const m=t.length/2|0;return t.slice(0,m)+t.slice(m).split("").reverse().join("")},
  multi:t=>Buffer.from(Buffer.from(t,"hex").toString().split("").reverse().join(""),"base64").toString(),
  trim:t=>t.trim(),
  lower:t=>t.toLowerCase(),
  upper:t=>t.toUpperCase()
};

/* ================= OBF ================= */
const OBF = {
  js:c=>`eval(atob("${Buffer.from(c).toString("base64")}"))`,
  html:c=>c.replace(/./g,x=>`&#${x.charCodeAt(0)};`),
  py:c=>`import base64;exec(base64.b64decode("${Buffer.from(c).toString("base64")}"))`,
  php:c=>`<?php eval(base64_decode("${Buffer.from(c).toString("base64")}")); ?>`
};
