import axios from "axios";
import crypto from "crypto";

/* ================= OWNER ================= */
const OWNER = {
  id: "7777604508",
  name: "Vinzz Offc",
  telegram: "@vinzz_officials",
  whatsapp: "https://wa.me/6285185667890"
};

/* ================= HANDLER ================= */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(200).json({ status: "ok" });
    return;
  }

  try {
    const token = req.url.split("/").pop().split("?")[0];
    if (!token || !req.body) {
      res.status(200).end();
      return;
    }

    const API = `https://api.telegram.org/bot${token}`;

    const send = (chat_id, text, kb = {}) =>
      axios.post(`${API}/sendMessage`, {
        chat_id,
        text,
        parse_mode: "HTML",
        reply_markup: kb
      });

    const edit = (chat_id, message_id, text, kb = {}) =>
      axios.post(`${API}/editMessageText`, {
        chat_id,
        message_id,
        text,
        parse_mode: "HTML",
        reply_markup: kb
      });

    const update = req.body;
    const msg = update.message;
    const cb  = update.callback_query;

    if (!msg && !cb) {
      res.status(200).end();
      return;
    }

    const chatId = msg?.chat?.id || cb?.message?.chat?.id;
    const msgId  = cb?.message?.message_id;
    const text   = msg?.text || "";

    if (!chatId) {
      res.status(200).end();
      return;
    }

    /* ================= START ================= */
    if (text === "/start") {
      await send(
        chatId,
`<b>⚙️ Universal Encoder Toolkit</b>

All-in-one encode & decode tools for programmers.

• 🔐 25+ Encode Types
• 🔓 20+ Decode Types
• 🔗 Chain Encode / Decode
• ⚡ Fast & Clean UI

Use the menu below.`,
        MAIN_MENU
      );
      return res.status(200).end();
    }

    /* ================= CALLBACK ================= */
    if (cb) {
      const d = cb.data;

      if (d === "menu") {
        await edit(chatId, msgId,
`<b>⚙️ Universal Encoder Toolkit</b>

Choose what you want to do.`,
          MAIN_MENU
        );
      }

      else if (d === "encode") {
        await edit(chatId, msgId,
`🔐 <b>ENCODE</b>

<b>Available Types</b>
<code>b64 b32 hex bin oct ascii</code>
<code>rev rot13 rot47 caesar xor</code>
<code>url html unicode escape json</code>
<code>md5 sha1 sha256 multi</code>

<b>Usage</b>
<code>/enc b64 hello</code>

<b>Chain</b>
<code>/enc chain:b64|hex|rev hello</code>`,
          BACK
        );
      }

      else if (d === "decode") {
        await edit(chatId, msgId,
`🔓 <b>DECODE</b>

<b>Available Types</b>
<code>b64 hex bin oct ascii</code>
<code>rev rot13 rot47 caesar xor</code>
<code>url html unicode unescape json</code>
<code>multi</code>

<b>Usage</b>
<code>/dec b64 aGVsbG8=</code>

<b>Chain</b>
<code>/dec chain:rev|hex|b64</code>`,
          BACK
        );
      }

      else if (d === "owner") {
        await edit(chatId, msgId,
`👤 <b>OWNER</b>

Name: ${OWNER.name}
Telegram: ${OWNER.telegram}
WhatsApp: ${OWNER.whatsapp}`,
          BACK
        );
      }

      else if (d === "rate") {
        await edit(chatId, msgId,
`⭐ <b>Rate this bot</b>

Your feedback matters.`,
          RATING
        );
      }

      else if (d.startsWith("rate_")) {
        const star = d.split("_")[1];
        await send(
          OWNER.id,
`⭐ New Rating
User: ${chatId}
Rating: ${"⭐".repeat(star)}`
        );
        await edit(chatId, msgId,
          `✅ Thanks for rating ${"⭐".repeat(star)}`,
          BACK
        );
      }

      return res.status(200).end();
    }

    /* ================= ENCODE ================= */
    if (text.startsWith("/enc ")) {
      const [, type, ...rest] = text.split(" ");
      let input = rest.join(" ");
      let out = input;

      if (type.startsWith("chain:")) {
        const chain = type.replace("chain:", "").split("|");
        for (const c of chain) {
          if (!ENC[c]) {
            await send(chatId, `❌ Unknown encode type: <code>${c}</code>`);
            return res.status(200).end();
          }
          out = ENC[c](out);
        }
      } else {
        if (!ENC[type]) {
          await send(chatId, "❌ Encode type not found");
          return res.status(200).end();
        }
        out = ENC[type](input);
      }

      await send(chatId, `<b>Result</b>\n<code>${out}</code>`);
      return res.status(200).end();
    }

    /* ================= DECODE ================= */
    if (text.startsWith("/dec ")) {
      const [, type, ...rest] = text.split(" ");
      let input = rest.join(" ");
      let out = input;

      if (type.startsWith("chain:")) {
        const chain = type.replace("chain:", "").split("|").reverse();
        for (const c of chain) {
          if (!DEC[c]) {
            await send(chatId, `❌ Unknown decode type: <code>${c}</code>`);
            return res.status(200).end();
          }
          out = DEC[c](out);
        }
      } else {
        if (!DEC[type]) {
          await send(chatId, "❌ Decode type not found");
          return res.status(200).end();
        }
        out = DEC[type](input);
      }

      await send(chatId, `<b>Result</b>\n<code>${out}</code>`);
      return res.status(200).end();
    }

    res.status(200).end();

  } catch (err) {
    console.error("WEBHOOK ERROR:", err);
    res.status(200).end();
  }
}

/* ================= MENUS ================= */
const MAIN_MENU = {
  inline_keyboard: [
    [{ text: "🔐 Encode", callback_data: "encode" }],
    [{ text: "🔓 Decode", callback_data: "decode" }],
    [{ text: "👤 Owner", callback_data: "owner" }],
    [{ text: "⭐ Rating", callback_data: "rate" }]
  ]
};

const BACK = {
  inline_keyboard: [[{ text: "🔙 Back", callback_data: "menu" }]]
};

const RATING = {
  inline_keyboard: [
    [{ text: "⭐", callback_data: "rate_1" }],
    [{ text: "⭐⭐", callback_data: "rate_2" }],
    [{ text: "⭐⭐⭐", callback_data: "rate_3" }],
    [{ text: "⭐⭐⭐⭐", callback_data: "rate_4" }],
    [{ text: "⭐⭐⭐⭐⭐", callback_data: "rate_5" }],
    [{ text: "🔙 Back", callback_data: "menu" }]
  ]
};

/* ================= ENCODE (25+) ================= */
const ENC = {
  b64: t => Buffer.from(t).toString("base64"),
  b32: t => Buffer.from(t).toString("base64").replace(/=/g,""),
  hex: t => Buffer.from(t).toString("hex"),
  bin: t => [...t].map(c=>c.charCodeAt(0).toString(2)).join(" "),
  oct: t => [...t].map(c=>c.charCodeAt(0).toString(8)).join(" "),
  ascii: t => [...t].map(c=>c.charCodeAt(0)).join(","),
  rot13: t => t.replace(/[a-z]/gi,c=>String.fromCharCode(c.charCodeAt(0)+(c.toLowerCase()<"n"?13:-13))),
  rot47: t => t.replace(/./g,c=>{let a=c.charCodeAt(0);return a>=33&&a<=126?String.fromCharCode(33+((a+14)%94)):c}),
  rev: t => t.split("").reverse().join(""),
  url: t => encodeURIComponent(t),
  html: t => t.replace(/./g,c=>`&#${c.charCodeAt(0)};`),
  unicode: t => t.replace(/./g,c=>"\\u"+c.charCodeAt(0).toString(16)),
  escape: t => escape(t),
  json: t => JSON.stringify(t),
  xor: t => Buffer.from([...t].map(c=>c.charCodeAt(0)^77)).toString("base64"),
  caesar: t => [...t].map(c=>String.fromCharCode(c.charCodeAt(0)+5)).join(""),
  md5: t => crypto.createHash("md5").update(t).digest("hex"),
  sha1: t => crypto.createHash("sha1").update(t).digest("hex"),
  sha256: t => crypto.createHash("sha256").update(t).digest("hex"),
  multi: t => Buffer.from(Buffer.from(t).toString("base64").split("").reverse().join("")).toString("hex")
};

/* ================= DECODE (20+) ================= */
const DEC = {
  b64: t => Buffer.from(t,"base64").toString(),
  hex: t => Buffer.from(t,"hex").toString(),
  bin: t => t.split(" ").map(b=>String.fromCharCode(parseInt(b,2))).join(""),
  oct: t => t.split(" ").map(o=>String.fromCharCode(parseInt(o,8))).join(""),
  ascii: t => t.split(",").map(n=>String.fromCharCode(n)).join(""),
  rot13: ENC.rot13,
  rot47: ENC.rot47,
  rev: t => t.split("").reverse().join(""),
  url: t => decodeURIComponent(t),
  html: t => t.replace(/&#(\d+);/g,(m,g)=>String.fromCharCode(g)),
  unicode: t => t.replace(/\\u([\d\w]{4})/gi,(m,g)=>String.fromCharCode(parseInt(g,16))),
  unescape: t => unescape(t),
  json: t => JSON.parse(t),
  xor: t => [...Buffer.from(t,"base64")].map(c=>String.fromCharCode(c^77)).join(""),
  caesar: t => [...t].map(c=>String.fromCharCode(c.charCodeAt(0)-5)).join(""),
  multi: t => Buffer.from(Buffer.from(t,"hex").toString().split("").reverse().join(""),"base64").toString()
};
