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

/* ================= UTIL ================= */
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
        chat_id,
        text,
        parse_mode: "HTML",
        reply_markup: kb
      });

    const safeEdit = async (chat_id, message_id, text, kb={}) => {
      try {
        await axios.post(`${API}/editMessageText`, {
          chat_id,
          message_id,
          text,
          parse_mode: "HTML",
          reply_markup: kb
        });
      } catch (e) {
        if (e.response?.data?.description?.includes("message is not modified"))
          return;
        throw e;
      }
    };

    const answerCb = id =>
      axios.post(`${API}/answerCallbackQuery`, {
        callback_query_id: id
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
`<b>🚀 NexaBot</b>
<i>Universal Encoder • Decoder • Obfuscator</i>

NexaBot is an all-in-one toolkit for developers and general users
to encode, decode, and obfuscate data easily.

<b>Main Features</b>
• 🔐 Encode — 27+ formats
• 🔓 Decode — 26+ formats
• 🛡 Obfuscate source code
• 📎 Text & file input support
• 🔗 Chain encoding / decoding
• ⭐ Public rating system

Use the menu below to explore.`,
        MAIN_MENU
      );
      return res.status(200).end();
    }

    /* ================= CALLBACK ================= */
    if (cb) {
      await answerCb(cb.id);
      const d = cb.data;

      if (d === "menu")
        await safeEdit(chatId,msgId,
`<b>🚀 NexaBot</b>
Select a feature below:`,
        MAIN_MENU
      );

      else if (d === "encode")
        await safeEdit(chatId,msgId,
`🔐 <b>ENCODE</b>

<b>Usage</b>
/enc &lt;type&gt; &lt;text&gt;
/enc &lt;type&gt;   (reply text or file)

Chain:
/enc chain:&lt;type&gt;|&lt;type&gt;|...

<b>Types</b>

<b>Basic</b>
b64, b32, hex, bin, oct, ascii

<b>Transform</b>
rev, rot13, rot47, caesar, xor

<b>Web</b>
url, html, unicode, escape, json

<b>Hash</b>
md5, sha1, sha256, sha512

<b>Compression</b>
gzip, deflate

<b>Advanced</b>
doubleb64, mirror, multi`,
        BACK
      );

      else if (d === "decode")
        await safeEdit(chatId,msgId,
`🔓 <b>DECODE</b>

<b>Usage</b>
/dec &lt;type&gt; &lt;text&gt;
/dec &lt;type&gt;   (reply text or file)

Chain:
/dec chain:&lt;type&gt;|&lt;type&gt;|...

<b>Types</b>

<b>Basic</b>
b64, hex, bin, oct, ascii

<b>Transform</b>
rev, rot13, rot47, caesar, xor

<b>Web</b>
url, html, unicode, unescape, json

<b>Compression</b>
gzip, deflate

<b>Advanced</b>
doubleb64, mirror, multi

<b>Utility</b>
trim, lower, upper`,
        BACK
      );

      else if (d === "obf")
        await safeEdit(chatId,msgId,
`🛡 <b>OBFUSCATOR</b>

<b>Usage</b>
/obf &lt;type&gt; &lt;code&gt;
/obf &lt;type&gt;   (reply text or file)

<b>Types</b>
js, html, py, php

<i>Obfuscation is one-way.</i>`,
        BACK
      );

      else if (d === "owner")
        await safeEdit(chatId,msgId,
`👤 <b>OWNER INFORMATION</b>

Name:
${OWNER.name}

Telegram:
${OWNER.telegram}

WhatsApp:
${OWNER.whatsapp}

<i>Feel free to contact for support or feedback.</i>`,
        BACK
      );

      else if (d === "rate")
        await safeEdit(chatId,msgId,
`⭐ <b>RATE NEXABOT</b>

Your rating helps improve NexaBot.
Choose from 1 to 5 stars below.`,
        RATING
      );

      else if (d.startsWith("rate_")) {
        const star = d.split("_")[1];
        await send(
          OWNER.id,
`⭐ <b>New Rating Received</b>
From User: <code>${chatId}</code>
Rating: ${"⭐".repeat(star)}`
        );
        await safeEdit(chatId,msgId,
`✅ Thank you for rating NexaBot ${"⭐".repeat(star)}!
Your feedback is appreciated.`,
        BACK
        );
      }

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
      const input = await resolveInput(r.join(" "));
      if (!input) return send(chatId,"❌ No input provided.");

      let out = input;
      if (type.startsWith("chain:")) {
        for (const c of type.replace("chain:","").split("|")) {
          if (!ENC[c]) return send(chatId,`❌ Encode type '${c}' not found.`);
          out = ENC[c](out);
        }
      } else {
        if (!ENC[type]) return send(chatId,"❌ Encode type not found.");
        out = ENC[type](input);
      }

      await send(chatId, `<b>Encoded Result</b>\n<code>${esc(out)}</code>`);
      return res.status(200).end();
    }

    /* ================= DECODE ================= */
    if (text.startsWith("/dec ")) {
      const [, type, ...r] = text.split(" ");
      const input = await resolveInput(r.join(" "));
      if (!input) return send(chatId,"❌ No input provided.");

      let out = input;
      if (type.startsWith("chain:")) {
        for (const c of type.replace("chain:","").split("|").reverse()) {
          if (!DEC[c]) return send(chatId,`❌ Decode type '${c}' not found.`);
          out = DEC[c](out);
        }
      } else {
        if (!DEC[type]) return send(chatId,"❌ Decode type not found.");
        out = DEC[type](input);
      }

      await send(chatId, `<b>Decoded Result</b>\n<code>${esc(out)}</code>`);
      return res.status(200).end();
    }

    /* ================= OBF ================= */
    if (text.startsWith("/obf ")) {
      const [, type, ...r] = text.split(" ");
      const input = await resolveInput(r.join(" "));
      if (!input || !OBF[type])
        return send(chatId,"❌ Invalid obfuscation request.");

      await send(chatId,
`<b>Obfuscated Output</b>
<code>${esc(OBF[type](input))}</code>`
      );
      return res.status(200).end();
    }

    return res.status(200).end();

  } catch (e) {
    console.error("NexaBot Error:", e);
    return res.status(200).end();
  }
}

/* ================= MENUS ================= */
const MAIN_MENU = {
  inline_keyboard: [
    [{ text:"🔐 Encode", callback_data:"encode" }],
    [{ text:"🔓 Decode", callback_data:"decode" }],
    [{ text:"🛡 Obfuscate", callback_data:"obf" }],
    [{ text:"⭐ Rate NexaBot", callback_data:"rate" }],
    [{ text:"👤 Owner Info", callback_data:"owner" }]
  ]
};
const BACK = { inline_keyboard:[[ { text:"🔙 Back to Menu", callback_data:"menu" } ]] };

const RATING = {
  inline_keyboard: [
    [{ text:"⭐", callback_data:"rate_1" }],
    [{ text:"⭐⭐", callback_data:"rate_2" }],
    [{ text:"⭐⭐⭐", callback_data:"rate_3" }],
    [{ text:"⭐⭐⭐⭐", callback_data:"rate_4" }],
    [{ text:"⭐⭐⭐⭐⭐", callback_data:"rate_5" }],
    [{ text:"🔙 Back", callback_data:"menu" }]
  ]
};

/* ================= ENCODE ================= */
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

/* ================= DECODE ================= */
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
