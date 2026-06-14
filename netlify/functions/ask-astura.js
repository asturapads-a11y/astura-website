const fs = require("fs");
const path = require("path");

function loadKnowledgeBase() {
  const possiblePaths = [
    path.join(__dirname, "../../knowledge/astura_knowledge.txt"),
    path.join(__dirname, "../../astura_knowledge.txt"),
  ];

  for (const filePath of possiblePaths) {
    try {
      if (fs.existsSync(filePath)) {
        return fs.readFileSync(filePath, "utf8");
      }
    } catch (err) {
      console.error("Knowledge file error:", err);
    }
  }

  return "";
}

const ASTURA_KNOWLEDGE = loadKnowledgeBase();

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { "Content-Type": "text/plain" },
      body: "Method Not Allowed",
    };
  }

  try {
    const body = JSON.parse(event.body || "{}");

    let userMessage = "";

    if (body.message) {
      userMessage = body.message;
    } else if (body.messages && body.messages.length) {
      const lastUser = [...body.messages]
        .reverse()
        .find((msg) => msg.role === "user");

      userMessage = lastUser?.content || "";
    }

    if (!userMessage) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reply: "Please type a question first.",
        }),
      };
    }

    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is missing in Netlify environment variables.");
    }

    const prompt = `
You are Ask Astura, a women's health assistant for Astura Pads.

KNOWLEDGE BASE:
${ASTURA_KNOWLEDGE}

RULES:
- Answer questions about periods, menstrual health, puberty, hygiene, pregnancy, and women's wellness.
- Respond in English, Somali, or Amharic depending on the user's language.
- Never diagnose diseases.
- Never prescribe medications or dosages.
- If symptoms are severe, unusual, or dangerous, advise the user to contact a doctor, nurse, pharmacist, or midwife.
- If the user mentions severe bleeding, fainting, severe abdominal pain, pregnancy with bleeding, sexual assault, suicidal thoughts, or trouble breathing, tell them to seek urgent medical help immediately.
- If uncertain, say you are uncertain.
- Keep answers short, warm, clear, and educational.

USER QUESTION:
${userMessage}
`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
        }),
      }
    );

    const data = await response.json();

    console.log("Gemini status:", response.status);
    console.log("Gemini response:", JSON.stringify(data));

    if (!response.ok) {
      throw new Error(
        `Gemini API error ${response.status}: ${JSON.stringify(data)}`
      );
    }

    const reply =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "I'm sorry, I couldn't generate a response right now.";

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reply }),
    };
  } catch (error) {
    console.error("ASK ASTURA ERROR:", error);

    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reply:
          "Sorry, Ask Astura is temporarily unavailable. If this is urgent, please contact a doctor, nurse, midwife, pharmacist, or local emergency service.",
        error: error.message,
      }),
    };
  }
};
