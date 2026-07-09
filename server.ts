import express from "express";
import path from "path";
import fs from "fs";
import { GoogleGenAI, Type } from "@google/genai";

let aiClient: GoogleGenAI | null = null;

function getAIClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY environment variable is required but not set");
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Health check API point
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Customer AI Insights API point
  app.post("/api/customer-insights", async (req, res) => {
    try {
      const { customerName, customerPhone, bookings } = req.body;

      if (!customerName) {
        return res.status(400).json({ error: "Customer name is required" });
      }

      // Format the bookings list into a readable text history for the AI
      const historyText = bookings && bookings.length > 0 
        ? bookings.map((b: any, index: number) => {
            return `ครั้งที่ ${index + 1}: วันที่ ${b.date} เวลา ${b.startTime}-${b.endTime} น. | ช่าง: ${b.hairdresserName || 'ไม่ระบุช่าง'} | รายละเอียดเพิ่มเติม/บันทึก: ${b.remarks || 'ไม่มี'}`;
          }).join("\n")
        : "ยังไม่มีประวัติการจองและบันทึกข้อมูลเพิ่มเติมในระบบ";

      const prompt = `คุณคือผู้เชี่ยวชาญด้านการออกแบบทรงผมและการดูแลลูกค้าสำหรับร้านตัดผมชายและหญิงยุคใหม่ (Modern Barber/Salon AI Assistant)
หน้าที่ของคุณคือวิเคราะห์ประวัติการจองและการเข้าใช้บริการของลูกค้าคนนี้ เพื่อให้ข้อมูลและคำแนะนำสำหรับช่างตัดผมอย่างมืออาชีพ

ข้อมูลลูกค้า:
- ชื่อลูกค้า: ${customerName}
- เบอร์โทรศัพท์: ${customerPhone || '-'}

ประวัติการจองและบันทึกความต้องการ:
${historyText}

กรุณาวิเคราะห์ประวัติการเข้าใช้บริการนี้แล้วตอบกลับเป็น JSON Object ในรูปแบบดังต่อไปนี้เท่านั้น (กรุณาใช้ภาษาไทย):
{
  "preferredStyles": "สรุปสไตล์ทรงผมหลักที่ชอบ บริการ หรือความต้องการพิเศษที่บันทึกไว้ในอดีตอย่างเป็นระเบียบ",
  "barberAdvice": "คำแนะนำเฉพาะสำหรับช่างทำผมในการให้บริการลูกค้าคนนี้ในครั้งถัดไปอย่างเหมาะสม (เช่น สิ่งที่ควรระวัง จุดที่ต้องเน้น)",
  "recommendedStyles": "ทรงผม ผลิตภัณฑ์ดูแลเส้นผม หรือบริการอื่นๆ ที่น่าเสนอขาย (Upsell) ในการมาครั้งถัดไป เพื่อเพิ่มยอดขายและสร้างความพึงพอใจ",
  "idealFrequency": "วิเคราะห์และกำหนดระยะเวลาที่เหมาะสมในการกลับมาใช้บริการอีกครั้ง (เช่น ทุก 3-4 สัปดาห์ เพื่อรักษาทรง) พร้อมระบุเหตุผลสั้นๆ"
}

ข้อกำหนดที่สำคัญมาก:
1. ห้ามมีตัวอักษรใดๆ นอกเหนือจาก JSON Object นี้
2. ห้ามใช้ Markdown code block ครอบ เช่น ห้ามใช้ \`\`\`json ... \`\`\`
3. ต้องตอบกลับเป็น JSON ที่ถูกต้อง สามารถทำการ JSON.parse() ได้ทันที`;

      const ai = getAIClient();
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              preferredStyles: {
                type: Type.STRING,
                description: "สรุปสไตล์ทรงผมหลักที่ชอบ บริการ หรือความต้องการพิเศษที่บันทึกไว้ในอดีตอย่างเป็นระเบียบ",
              },
              barberAdvice: {
                type: Type.STRING,
                description: "คำแนะนำเฉพาะสำหรับช่างทำผมในการให้บริการลูกค้าคนนี้ในครั้งถัดไปอย่างเหมาะสม (เช่น สิ่งที่ควรระวัง จุดที่ต้องเน้น)",
              },
              recommendedStyles: {
                type: Type.STRING,
                description: "ทรงผม ผลิตภัณฑ์ดูแลเส้นผม หรือบริการอื่นๆ ที่น่าเสนอขาย (Upsell) ในการมาครั้งถัดไป เพื่อเพิ่มยอดขายและสร้างความพึงพอใจ",
              },
              idealFrequency: {
                type: Type.STRING,
                description: "วิเคราะห์และกำหนดระยะเวลาที่เหมาะสมในการกลับมาใช้บริการอีกครั้ง (เช่น ทุก 3-4 สัปดาห์ เพื่อรักษาทรง) พร้อมระบุเหตุผลสั้นๆ",
              },
            },
            required: ["preferredStyles", "barberAdvice", "recommendedStyles", "idealFrequency"],
          },
        },
      });

      const responseText = response.text || "";
      const parsedData = JSON.parse(responseText.trim());
      res.json(parsedData);
    } catch (error: any) {
      console.error("Gemini AI API Error:", error);
      res.status(500).json({ 
        error: "เกิดข้อผิดพลาดในการเรียกใช้งาน AI วิเคราะห์ข้อมูล",
        details: error.message || String(error)
      });
    }
  });

  // Customer AI Chat API point
  app.post("/api/customer-chat", async (req, res) => {
    try {
      const { customerName, historyText, message, chatHistory } = req.body;

      if (!customerName || !message) {
        return res.status(400).json({ error: "Customer name and message are required" });
      }

      const prompt = `คุณคือ AI ผู้ช่วยช่างตัดผมส่วนตัวในร้านตัดผมระดับพรีเมียม (Modern Barber/Salon Assistant)
ลูกค้าคนนี้ชื่อ: ${customerName}
ประวัติความต้องการของลูกค้า:
${historyText || "ยังไม่มีประวัติ"}

นี่คือประวัติการพูดคุยกับคุณก่อนหน้านี้ (ถ้ามี):
${chatHistory && chatHistory.length > 0 ? chatHistory.map((c: any) => `${c.role === 'user' ? 'ช่างถาม' : 'AI ตอบ'}: ${c.text}`).join("\n") : "ไม่มี"}

ช่างตัดผมถามคุณว่า: "${message}"

กรุณาให้คำตอบสั้นๆ กระชับ ได้ใจความ เป็นกันเองแต่เป็นมืออาชีพ มีประโยชน์กับการให้บริการตัดผมหรือสไตล์ลิ่งของลูกค้ารายนี้`;

      const ai = getAIClient();
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
      });

      res.json({ reply: response.text });
    } catch (error: any) {
      console.error("Gemini Chat API Error:", error);
      res.status(500).json({ 
        error: "เกิดข้อผิดพลาดในการเชื่อมต่อกับผู้ช่วย AI",
        details: error.message || String(error)
      });
    }
  });

  // Determine if running in production mode
  const distPath = path.join(process.cwd(), "dist");
  // Check if running from dist or in production NODE_ENV, and ensures index.html exists in dist
  const isProduction =
    (process.env.NODE_ENV === "production" ||
      process.argv[1]?.includes("dist") ||
      !fs.existsSync(path.join(process.cwd(), "index.html"))) &&
    fs.existsSync(path.join(distPath, "index.html"));

  if (!isProduction) {
    console.log("Starting in DEVELOPMENT mode using Vite middleware...");
    // Lazy-load Vite dynamically to prevent module resolution errors in production
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        port: PORT,
        host: "0.0.0.0"
      },
      appType: "spa",
    });
    app.use(vite.middlewares);

    // Fallback for SPA routing in development, serving transformed index.html
    app.use("*", async (req, res, next) => {
      const url = req.originalUrl;
      try {
        const templatePath = path.resolve(process.cwd(), "index.html");
        if (fs.existsSync(templatePath)) {
          let template = fs.readFileSync(templatePath, "utf-8");
          template = await vite.transformIndexHtml(url, template);
          res.status(200).set({ "Content-Type": "text/html" }).end(template);
        } else {
          next();
        }
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    console.log("Starting in PRODUCTION mode serving static files...");
    // Elegant fallback and static serving for Production builds
    // All routes redirect to index.html to avoid 404 Page Not Found on browser load or page refresh
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });

  server.on("error", (err: any) => {
    if (err.code === "EADDRINUSE") {
      console.error(`🚨 FAIL: Port ${PORT} is already in use. A stale process is likely running. Please restart.`);
    } else {
      console.error("🚨 SERVER HTTP LISTEN ERROR:", err);
    }
  });
}

startServer();
