import express from "express";
import cors from "cors";

const app = express();
app.use(express.json());
app.use(cors({
  origin: [
    "https://seninsiten.wordpress.com" // <-- WordPress alan adın (gerekirse yenilerini ekle)
    // "https://seninsiten.com"
  ]
}));

// Basit sağlık kontrolü
app.get("/", (_req, res) => {
  res.send("Bengü AI backend çalışıyor ✅");
});

// Chat endpoint
app.post("/api/chat", async (req, res) => {
  try {
    const { messages } = req.body || {};

    // Node 18+ için built-in fetch (node-fetch kullanmıyoruz)
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "Sen eğitim danışmanı Çiçek Hoca'sın. Öğrencilerin sorularını sade ve öğretici bir dille cevapla." },
          ...(messages || [])
        ],
        temperature: 0.3
      })
    });

    const data = await r.json();
    const reply = data?.choices?.[0]?.message?.content || "Cevap üretilemedi.";
    res.json({ reply: { content: reply }});
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(process.env.PORT || 3000, () =>
  console.log("✅ Bengü AI backend çalışıyor")
);
