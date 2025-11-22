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
// =========================
// 2) GÖRSEL ÜRETİCİ ENDPOINT
//    /api/visual  (Eğitim Posteri Modu)
// =========================
app.post("/api/visual", async (req, res) => {
  try {
    const { prompt, size = "1024x1024" } = req.body || {};
    if (!prompt) {
      return res.status(400).json({ error: "prompt gerekli" });
    }

    // Kullanıcının konusunu al
    const topic = prompt.trim();

    // Eğitim posteri için ayrıntılı talimat
    const visualPrompt = `
Create a clean, high-resolution **educational poster (infographic)** about the topic:
"${topic}".

The style must match these requirements:

- Format: EDUCATIONAL POSTER for high-school / university students.
- Layout:
  - Big main title on the top (in Turkish).
  - Optional short subtitle under the title.
  - 3 to 6 colored boxes or sections with short Turkish labels.
  - Each box explains one key idea about the topic.
- Design:
  - Use pastel colors, like soft orange, teal, light blue and green.
  - Use rounded rectangles for the boxes.
  - Add simple line icons and simple circuit / physics diagrams when relevant.
  - Add clear and readable math formulas where needed.
  - Use lots of whitespace. Do NOT make it crowded.
  - The overall look must be clear, modern and minimal.
- Content:
  - Focus on formulas, key concepts and simple diagrams about "${topic}".
  - Use **short Turkish text** for titles and labels (1–4 words).
  - Prefer symbols and formulas instead of long sentences.
- Examples of style:
  - Ohm's law table, circuit element diagrams, magnetism diagrams, etc.
  - Classroom wall poster style.

This image will be printed as a classroom poster, so it must be very clean and readable.
`;

    const r = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt: visualPrompt,
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

