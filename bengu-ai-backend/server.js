import express from "express";
import cors from "cors";

const app = express();

// CORS — tüm origin'lere izin ver (test için güvenli, cookie kullanmıyoruz)
app.use(cors({
  origin: true,                           // gelen Origin'i otomatik kabul et
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.options("*", cors());                 // preflight (OPTIONS) yanıtı

app.use(express.json());

// Basit kontrol endpoint'i
app.get("/", (_req, res) => {
  res.send("Bengü AI backend çalışıyor ✅");
});


// =====================
// 1) AI SOHBET ENDPOINT
// =====================
app.post("/api/chat", async (req, res) => {
  try {
    const { messages } = req.body || {};

    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "Sen eğitim danışmanı Çiçek Hoca'sın. Öğrencilerin sorularını sade ve öğretici bir dille cevapla."
          },
          ...(messages || [])
        ],
        temperature: 0.3
      })
    });

    if (!r.ok) {
      const txt = await r.text();
      return res.status(500).json({ error: `OpenAI chat ${r.status}: ${txt.slice(0, 200)}` });
    }

    const data = await r.json();
    const reply = data?.choices?.[0]?.message?.content || "Cevap üretilemedi.";
    res.json({ reply: { content: reply } });
  } catch (e) {
    res.status(500).json({ error: e.message || "Sunucu hatası (chat)" });
  }
});


// =========================
// 2) GÖRSEL ÜRETİCİ ENDPOINT
//    /api/visual
// =========================
app.post("/api/visual", async (req, res) => {
  try {
    const { prompt, size = "1024x1024" } = req.body || {};
    if (!prompt) {
      return res.status(400).json({ error: "prompt gerekli" });
    }

    const r = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt,
        n: 1,
        size
      })
    });

    if (!r.ok) {
      const txt = await r.text();
      return res
        .status(500)
        .json({ error: `OpenAI image ${r.status}: ${txt.slice(0, 200)}` });
    }

    const data = await r.json();
    const url = data?.data?.[0]?.url;
    if (!url) {
      return res.status(500).json({ error: "Görsel URL alınamadı." });
    }

    res.json({ url });
  } catch (e) {
    res
      .status(500)
      .json({ error: e.message || "Sunucu hatası (visual)" });
  }
});


// =============================
// 3) KONU ÖZETİ & QUIZ ENDPOINT
//    /api/summary
// =============================
app.post("/api/summary", async (req, res) => {
  try {
    const { text } = req.body || {};
    if (!text) {
      return res.status(400).json({ error: "text gerekli" });
    }

    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.3,
        messages: [
          {
            role: "system",
            content:
              "Uzun metinleri özetleyen bir eğitim asistanısın. " +
              "Çıktıyı şu formatta ver: \n\n" +
              "ÖZET:\n- madde madde kısa özet\n\n" +
              "ÖNEMLİ NOKTALAR:\n- en kritik 3-5 madde\n\n" +
              "QUIZ:\n1) ...\n2) ...\n3) ..."
          },
          { role: "user", content: text }
        ]
      })
    });

    if (!r.ok) {
      const txt = await r.text();
      return res
        .status(500)
        .json({ error: `OpenAI summary ${r.status}: ${txt.slice(0, 200)}` });
    }

    const data = await r.json();
    const summary = data?.choices?.[0]?.message?.content || "Özet oluşturulamadı.";
    res.json({ summary });
  } catch (e) {
    res
      .status(500)
      .json({ error: e.message || "Sunucu hatası (summary)" });
  }
});


// Sunucuyu başlat
app.listen(process.env.PORT || 3000, () =>
  console.log("✅ Bengü AI backend çalışıyor")
);
