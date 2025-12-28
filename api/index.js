import axios from "axios";
import crypto from "crypto";

/* ========= CONFIG OWNER ========= */
const OWNER = {
  id: "ISI_ID_OWNER",
  name: "Vinzz Offc",
  telegram: "@username",
  whatsapp: "wa.me/628xxxx"
};

/* ========= HANDLER ========= */
export default async function handler(req, res) {
  const token = req.url.split("/").pop();
  if (!token || !req.body) return res.status(403).end();

  const API = `https://api.telegram.org/bot${token}`;

  const send = (id, text, kb = {}) =>
    axios.post(`${API}/sendMessage`, {
      chat_id: id,
      text,
      parse_mode: "HTML",
      reply_markup: kb
    });

  const edit = (id, msgId, text, kb = {}) =>
    axios.post(`${API}/editMessageText`, {
      chat_id: id,
      message_id: msgId,
      text,
      parse_mode: "HTML",
      reply_markup: kb
    });

  const msg = req.body.message;
  const cb = req.body.callback_query;
  const chatId = msg?.chat.id || cb?.message.chat.id;
  const msgId = cb?.message.message_id;
  const text = msg?.text || "";

  /* ========= START ========= */
  if (text === "/start") {
    return send(chatId,
`<b>⚙️ Universal Encoder Toolkit</b>

Simple • Powerful • Programmer Friendly

Choose wisely 👇`,
MAIN_MENU
);
  }

  /* ========= CALLBACK ========= */
  if (cb) {
    const d = cb.data;

    if (d === "menu")
      return edit(chatId, msgId,
`<b>⚙️ Universal Encoder Toolkit</b>

Everything you need, nothing useless.`,
MAIN_MENU
);

    if (d === "owner")
      return edit(chatId, msgId,
`<b>👤 OWNER INFO</b>

• Name: ${OWNER.name}
• Telegram: ${OWNER.telegram}
• WhatsApp: ${OWNER.whatsapp}`,
BACK
);

    if (d === "rate")
      return edit(chatId, msgId,
`⭐ <b>Rate this bot</b>

Your feedback matters.`,
RATING
);

    if (d.startsWith("rate_")) {
      const star = d.split("_")[1];
      await send(OWNER.id,
`⭐ <b>New Rating</b>
User: <code>${chatId}</code>
Rating: ${"⭐".repeat(star)}`
);
      return edit(chatId, msgId,
`✅ Thanks for rating ${"⭐".repeat(star)}`,
BACK
);
    }

    if (d === "encode")
      return edit(chatId, msgId,
`🔐 <b>ENCODE MODE</b>

Command:
<code>/enc &lt;type&gt; &lt;text&gt;</code>

Chain:
<code>/enc chain:b64|hex|rev hello</code>`,
BACK
);

    if (d === "decode")
      return edit(chatId, msgId,
`🔓 <b>DECODE MODE</b>

Command:
<code>/dec &lt;type&gt; &lt;text&gt;</code>

Chain:
<code>/dec chain:b64|hex|rev</code>`,
BACK
);

    if (d === "obf")
      return edit(chatId, msgId,
`🛡 <b>OBFUSCATOR</b>

Command:
<code>/obf js &lt;code&gt;</code>`,
BACK
);
  }

  /* ========= ENCODE ========= */
  if (text.startsWith("/enc ")) {
    const [_, type, ...rest] = text.split(" ");
    let input = rest.join(" ");

    if (type.startsWith("chain:")) {
      const chain = type.replace("chain:", "").split("|");
      let out = input;
      for (const c of chain) out = ENC[c]?.(out) || out;
      return send(chatId, `<b>Result:</b>\n<code>${out}</code>`);
    }

    if (!ENC[type]) return send(chatId, "❌ Encode type not found");
    return send(chatId, `<b>Result:</b>\n<code>${ENC[type](input)}</code>`);
  }

  /* ========= DECODE ========= */
  if (text.startsWith("/dec ")) {
    const [_, type, ...rest] = text.split(" ");
    let input = rest.join(" ");

    if (type.startsWith("chain:")) {
      const chain = type.replace("chain:", "").split("|").reverse();
      let out = input;
      for (const c of chain) out = DEC[c]?.(out) || out;
      return send(chatId, `<b>Result:</b>\n<code>${out}</code>`);
    }

    if (!DEC[type]) return send(chatId, "❌ Decode type not found");
    return send(chatId, `<b>Result:</b>\n<code>${DEC[type](input)}</code>`);
  }

  /* ========= OBF ========= */
  if (text.startsWith("/obf ")) {
    const [_, type, ...rest] = text.split(" ");
    const input = rest.join(" ");
    if (!OBF[type]) return send(chatId, "❌ Obfuscate type not found");
    return send(chatId, `<b>Result:</b>\n<code>${OBF[type](input)}</code>`);
  }

  res.status(200).end();
}

/* ========= MENUS ========= */
const MAIN_MENU = {
  inline_keyboard: [
    [{ text:"🔐 Encode", callback_data:"encode" }],
    [{ text:"🔓 Decode", callback_data:"decode" }],
    [{ text:"🛡 Obfuscate", callback_data:"obf" }],
    [{ text:"👤 Owner", callback_data:"owner" }],
    [{ text:"⭐ Rating", callback_data:"rate" }]
  ]
};

const BACK = {
  inline_keyboard: [[{ text:"🔙 Back", callback_data:"menu" }]]
};

const RATING = {
  inline_keyboard: [
    [1,2,3,4,5].map(n=>({
      text:"⭐".repeat(n),
      callback_data:`rate_${n}`
    })),
    [{ text:"🔙 Back", callback_data:"menu" }]
  ]
};

/* ========= ENCODE (25) ========= */
const ENC = {
  b64:t=>Buffer.from(t).toString("base64"),
  hex:t=>Buffer.from(t).toString("hex"),
  bin:t=>[...t].map(c=>c.charCodeAt(0).toString(2)).join(" "),
  oct:t=>[...t].map(c=>c.charCodeAt(0).toString(8)).join(" "),
  rot13:t=>t.replace(/[a-z]/gi,c=>String.fromCharCode(c.charCodeAt(0)+(c.toLowerCase()<"n"?13:-13))),
  rot47:t=>t.replace(/./g,c=>{let a=c.charCodeAt(0);return a>=33&&a<=126?String.fromCharCode(33+((a+14)%94)):c}),
  url:t=>encodeURIComponent(t),
  html:t=>t.replace(/./g,c=>`&#${c.charCodeAt(0)};`),
  unicode:t=>t.replace(/./g,c=>"\\u"+c.charCodeAt(0).toString(16)),
  rev:t=>t.split("").reverse().join(""),
  xor:t=>Buffer.from([...t].map(c=>c.charCodeAt(0)^77)).toString("base64"),
  caesar:t=>[...t].map(c=>String.fromCharCode(c.charCodeAt(0)+5)).join(""),
  ascii:t=>[...t].map(c=>c.charCodeAt(0)).join(","),
  multi:t=>Buffer.from(Buffer.from(t).toString("base64").split("").reverse().join("")).toString("hex"),
  aes:t=>crypto.createCipher("aes-256-ctr","pass").update(t,"utf8","hex"),
  md5:t=>crypto.createHash("md5").update(t).digest("hex"),
  sha1:t=>crypto.createHash("sha1").update(t).digest("hex"),
  sha256:t=>crypto.createHash("sha256").update(t).digest("hex")
};

/* ========= DECODE (20) ========= */
const DEC = {
  b64:t=>Buffer.from(t,"base64").toString(),
  hex:t=>Buffer.from(t,"hex").toString(),
  bin:t=>t.split(" ").map(b=>String.fromCharCode(parseInt(b,2))).join(""),
  oct:t=>t.split(" ").map(o=>String.fromCharCode(parseInt(o,8))).join(""),
  rot13:ENC.rot13,
  rot47:ENC.rot47,
  url:t=>decodeURIComponent(t),
  rev:t=>t.split("").reverse().join(""),
  xor:t=>[...Buffer.from(t,"base64")].map(c=>String.fromCharCode(c^77)).join(""),
  caesar:t=>[...t].map(c=>String.fromCharCode(c.charCodeAt(0)-5)).join(""),
  ascii:t=>t.split(",").map(n=>String.fromCharCode(n)).join(""),
  multi:t=>Buffer.from(Buffer.from(t,"hex").toString().split("").reverse().join(""),"base64").toString(),
  aes:t=>crypto.createDecipher("aes-256-ctr","pass").update(t,"hex","utf8"),
  unicode:t=>t.replace(/\\u([\d\w]{4})/gi,(m,g)=>String.fromCharCode(parseInt(g,16))),
  html:t=>t.replace(/&#(\d+);/g,(m,g)=>String.fromCharCode(g))
};

/* ========= OBF ========= */
const OBF = {
  js:c=>`eval(atob("${Buffer.from(c).toString("base64")}"))`,
  html:c=>c.replace(/./g,x=>`&#${x.charCodeAt(0)};`),
  py:c=>`import base64;exec(base64.b64decode("${Buffer.from(c).toString("base64")}"))`,
  php:c=>`<?php eval(base64_decode("${Buffer.from(c).toString("base64")}")); ?>`
};
