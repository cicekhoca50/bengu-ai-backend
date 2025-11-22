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
// =====================
// 1) AI SOHBET ENDPOINT (Çiçek Hoca & Gamze Hoca)
// =====================
app.post("/api/chat", async (req, res) => {
  try {
    const { messages, teacher } = req.body || {};

    // teacher: "cicek" ya da "gamze"
    let systemPrompt;

    if (teacher === "gamze") {
      systemPrompt =
        "Sen rehber öğretmen Gamze Hoca'sın. " +
        "Öğrencilerin sınav kaygısı, motivasyon, çalışma planı, zaman yönetimi, kariyer seçimi gibi konularda sorularını cevaplıyorsun. " +
        "Yumuşak, destekleyici, anlayışlı bir dil kullan. " +
        "Gerektiğinde örnek günlük/haftalık çalışma planları ver, mola öner ve öğrencinin duygusunu da önemse. " +
        "Akademik konu anlatımından çok, rehberlik ve yönlendirmeye odaklan.";
    } else {
      // Varsayılan: Çiçek Hoca (akademik)
      systemPrompt =
        "Sen akademik ders anlatan Çiçek Hoca'sın. " +
        "Öğrencilerin özellikle matematik, fizik, elektrik-elektronik ve üniversite dersleriyle ilgili sorularını cevaplıyorsun. " +
        "Konu anlatırken adım adım, örneklerle ve sade bir dille açıkla. " +
        "Formülleri açık yaz, gerekirse tablo ve maddeler kullan. " +
        "Soruyu anlamadan asla cevaplama; gerekiyorsa önce neyi bilip bilmediğini kısa sorularla netleştir. " +
        "Kısaca: samimi ama akademik ve sistemli bir anlatım kullan.";
    }

    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
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

// =============================
// 2) KONU ÖZETİ & QUIZ ENDPOINT
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



