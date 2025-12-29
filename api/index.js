import axios from "axios";
import crypto from "crypto";
import zlib from "zlib";
import FormData from "form-data";

/* ================= OWNER ================= */
const OWNER = {
  id: "7777604508",
  name: "Vinzz Offc",
  telegram: "@vinzz_officials",
  whatsapp: "https://wa.me/6285185667890"
};

/* ================= TELEGRAM LIMIT ================= */
const TG_LIMIT = 3900;

/* ================= BASE32 RFC4648 ================= */
const BASE32 = {
  alphabet: "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567",
  encode(input) {
    let bits = "";
    for (const b of Buffer.from(input))
      bits += b.toString(2).padStart(8, "0");

    let out = "";
    for (let i = 0; i < bits.length; i += 5) {
      out += this.alphabet[
        parseInt(bits.slice(i, i + 5).padEnd(5, "0"), 2)
      ];
    }
    while (out.length % 8 !== 0) out += "=";
    return out;
  },
  decode(input) {
    input = input.replace(/=+$/, "").toUpperCase();
    let bits = "";
    for (const c of input) {
      const v = this.alphabet.indexOf(c);
      if (v >= 0) bits += v.toString(2).padStart(5, "0");
    }
    const out = [];
    for (let i = 0; i + 8 <= bits.length; i += 8)
      out.push(parseInt(bits.slice(i, i + 8), 2));
    return Buffer.from(out).toString();
  }
};

/* ================= UTILS ================= */
const esc = t =>
  t.replace(/&/g,"&amp;")
   .replace(/</g,"&lt;")
   .replace(/>/g,"&gt;");

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

/* ================= SMART OUTPUT ================= */
async function sendSmart(API, chatId, title, content, filename) {
  content = String(content);

  if (content.length <= TG_LIMIT) {
    return axios.post(`${API}/sendMessage`, {
      chat_id: chatId,
      text: `<b>${title}</b>\n<code>${esc(content)}</code>`,
      parse_mode: "HTML"
    });
  }

  const form = new FormData();
  form.append("chat_id", chatId);
  form.append("document", Buffer.from(content), {
    filename: filename || "result.txt"
  });
  form.append(
    "caption",
    `<b>${title}</b>\n(Output sent as file)`,
  );
  form.append("parse_mode", "HTML");

  return axios.post(`${API}/sendDocument`, form, {
    headers: form.getHeaders()
  });
}

/* ================= MENUS ================= */
const MAIN_MENU = {
  inline_keyboard: [
    [{ text:"🔐 Encode", callback_data:"encode" }],
    [{ text:"🔓 Decode", callback_data:"decode" }],
    [{ text:"🛡 Obfuscate", callback_data:"obf" }],
    [{ text:"⭐ Rate NexaBot", callback_data:"rate" }],
    [{ text:"👤 Owner", callback_data:"owner" }]
  ]
};
const BACK = {
  inline_keyboard: [[{ text:"⬅ Back to Menu", callback_data:"menu" }]]
};
const RATING = {
  inline_keyboard: [
    [{ text:"⭐", callback_data:"rate_1" }],
    [{ text:"⭐⭐", callback_data:"rate_2" }],
    [{ text:"⭐⭐⭐", callback_data:"rate_3" }],
    [{ text:"⭐⭐⭐⭐", callback_data:"rate_4" }],
    [{ text:"⭐⭐⭐⭐⭐", callback_data:"rate_5" }],
    [{ text:"⬅ Back", callback_data:"menu" }]
  ]
};

/* ================= HANDLER ================= */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(200).json({ ok:true });
    return;
  }

  try {
    const token = req.url.split("/").pop().split("?")[0];
    if (!token || !req.body) return res.status(200).end();

    const API = `https://api.telegram.org/bot${token}`;
    const upd = req.body;

    const msg = upd.message;
    const cb  = upd.callback_query;
    if (!msg && !cb) return res.status(200).end();

    const chatId = msg?.chat?.id || cb?.message?.chat?.id;
    const msgId  = cb?.message?.message_id;
    const text   = msg?.text || "";

    const send = (id, text, kb={}) =>
      axios.post(`${API}/sendMessage`, {
        chat_id:id,
        text,
        parse_mode:"HTML",
        reply_markup:kb
      });

    const edit = async (id, mid, text, kb={}) => {
      try {
        await axios.post(`${API}/editMessageText`, {
          chat_id:id,
          message_id:mid,
          text,
          parse_mode:"HTML",
          reply_markup:kb
        });
      } catch (e) {
        if (e.response?.data?.description?.includes("message is not modified"))
          return;
        throw e;
      }
    };

    const answerCb = id =>
      axios.post(`${API}/answerCallbackQuery`, { callback_query_id:id });

    /* ================= START ================= */
    if (text === "/start") {
      await send(chatId,
`<b>🚀 NexaBot</b>
<i>Professional Encoder • Decoder • Obfuscator</i>

🔐 27+ Encode Types
🔓 26+ Decode Types
🔗 Safe Chain Encoding
🛡 Code Obfuscation
📎 Text & File Support

<b>Select a feature below.</b>`,
        MAIN_MENU
      );
      return res.status(200).end();
    }

    /* ================= CALLBACK ================= */
    if (cb) {
      await answerCb(cb.id);
      const d = cb.data;

      if (d === "menu")
        await edit(chatId, msgId,
`<b>🚀 NexaBot</b>
Select a feature below.`,
          MAIN_MENU
        );

      else if (d === "encode")
        await edit(chatId, msgId,
`🔐 <b>ENCODE</b>

Usage:
<code>/enc &lt;type&gt; &lt;text&gt;</code>
<code>/enc &lt;type&gt;</code> (reply text/file)

Chain:
<code>/enc chain:type1|type2|type3</code>

Types:
b64 b32 hex bin oct ascii
rev rot13 rot47 caesar xor mirror
url html unicode escape json
md5 sha1 sha256 sha512
gzip deflate
doubleb64 multi`,
          BACK
        );

      else if (d === "decode")
        await edit(chatId, msgId,
`🔓 <b>DECODE</b>

Usage:
<code>/dec &lt;type&gt; &lt;text&gt;</code>
<code>/dec &lt;type&gt;</code> (reply text/file)

Chain:
<code>/dec chain:type3|type2|type1</code>

Types:
b64 b32 hex bin oct ascii
rev rot13 rot47 caesar xor mirror
url html unicode unescape json
gzip deflate
doubleb64 multi
trim lower upper`,
          BACK
        );

      else if (d === "obf")
        await edit(chatId, msgId,
`🛡 <b>OBFUSCATOR</b>

Usage:
<code>/obf &lt;type&gt; &lt;code&gt;</code>
<code>/obf &lt;type&gt;</code> (reply)

Types:
js html py php`,
          BACK
        );

      else if (d === "owner")
        await edit(chatId, msgId,
`👤 <b>OWNER</b>

<b>${OWNER.name}</b>
Telegram: ${OWNER.telegram}
WhatsApp: ${OWNER.whatsapp}`,
          BACK
        );

      else if (d === "rate")
        await edit(chatId, msgId,
`⭐ <b>Rate NexaBot</b>
Your feedback helps improve this project.`,
          RATING
        );

      else if (d.startsWith("rate_")) {
        const star = d.split("_")[1];
        await send(OWNER.id,
`⭐ New Rating
User: ${chatId}
Rating: ${"⭐".repeat(star)}`
        );
        await edit(chatId, msgId,
`✅ Thanks for rating NexaBot ${"⭐".repeat(star)}!`,
          BACK
        );
      }
      return res.status(200).end();
    }

    /* ================= INPUT ================= */
    async function resolveInput(rest) {
      if (rest && rest.trim()) return rest;
      if (!msg?.reply_to_message) return null;
      const r = msg.reply_to_message;
      if (r.text) return r.text;
      if (r.document) return await getFileText(token, r.document.file_id);
      return null;
    }

    function parseChain(str) {
      if (!str.startsWith("chain:")) return null;
      if (/[^a-z0-9_|:]/i.test(str)) return null;
      return str.replace("chain:","").split("|").filter(Boolean);
    }

    function runChain(map, chain, input) {
      let out = input;
      for (const step of chain) {
        if (!map[step]) return { error:step };
        out = map[step](out);
        if (!out || typeof out !== "string") return { error:step };
      }
      return { out };
    }

    /* ================= ENCODE ================= */
    if (text.startsWith("/enc ")) {
      const [, type, ...r] = text.split(" ");
      const input = await resolveInput(r.join(" "));
      if (!input) return send(chatId,"❌ No input provided.");

      if (type.startsWith("chain:")) {
        const chain = parseChain(type);
        if (!chain) return send(chatId,"❌ Invalid chain format.");
        const r2 = runChain(ENC, chain, input);
        if (r2.error) return send(chatId,`❌ Encode failed at <b>${r2.error}</b>.`);
        return sendSmart(API, chatId, "Encoded Result", r2.out, "encoded_chain.txt");
      }

      if (!ENC[type]) return send(chatId,"❌ Encode type not found.");
      return sendSmart(API, chatId, "Encoded Result", ENC[type](input), `encoded_${type}.txt`);
    }

    /* ================= DECODE ================= */
    if (text.startsWith("/dec ")) {
      const [, type, ...r] = text.split(" ");
      const input = await resolveInput(r.join(" "));
      if (!input) return send(chatId,"❌ No input provided.");

      if (type.startsWith("chain:")) {
        const chain = parseChain(type);
        if (!chain) return send(chatId,"❌ Invalid chain format.");
        const r2 = runChain(DEC, [...chain].reverse(), input);
        if (r2.error) return send(chatId,`❌ Decode failed at <b>${r2.error}</b>.`);
        return sendSmart(API, chatId, "Decoded Result", r2.out, "decoded_chain.txt");
      }

      if (!DEC[type]) return send(chatId,"❌ Decode type not found.");
      return sendSmart(API, chatId, "Decoded Result", DEC[type](input), `decoded_${type}.txt`);
    }

    /* ================= OBF ================= */
    if (text.startsWith("/obf ")) {
      const [, type, ...r] = text.split(" ");
      const input = await resolveInput(r.join(" "));
      if (!input || !OBF[type]) return send(chatId,"❌ Invalid obfuscation request.");
      return sendSmart(API, chatId, "Obfuscated Output", OBF[type](input), `obf_${type}.txt`);
    }

    return res.status(200).end();

  } catch (e) {
    console.error("NexaBot Fatal:", e);
    return res.status(200).end();
  }
}

/* ================= ENCODE ================= */
const ENC = {
  b64:t=>Buffer.from(t).toString("base64"),
  b32:t=>BASE32.encode(t),
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
  mirror:t=>{const m=t.length>>1;return t.slice(0,m)+t.slice(m).split("").reverse().join("")},
  multi:t=>Buffer.from(Buffer.from(t).toString("base64").split("").reverse().join("")).toString("hex")
};

/* ================= DECODE ================= */
const DEC = {
  b64:t=>Buffer.from(t,"base64").toString(),
  b32:t=>BASE32.decode(t),
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
  mirror:t=>{const m=t.length>>1;return t.slice(0,m)+t.slice(m).split("").reverse().join("")},
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
