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
} catch (error) {
console.error(error);
}
}

return "";
}

const ASTURA_KNOWLEDGE = loadKnowledgeBase();

exports.handler = async (event) => {
if (event.httpMethod !== "POST") {
return {
statusCode: 405,
body: "Method Not Allowed"
};
}

try {
const body = JSON.parse(event.body || "{}");

```
let userMessage = "";

if (body.message) {
  userMessage = body.message;
} else if (body.messages && body.messages.length) {
  const lastUser = [...body.messages]
    .reverse()
    .find(msg => msg.role === "user");

  userMessage = lastUser?.content || "";
}

const prompt = `
```

You are Ask Astura, a women's health assistant for Astura Pads.

KNOWLEDGE BASE:
${ASTURA_KNOWLEDGE}

RULES:

* Answer questions about periods, menstrual health, puberty, hygiene, pregnancy, and women's wellness.
* Respond in English, Somali, or Amharic depending on the user's language.
* Never diagnose diseases.
* Never prescribe medications.
* If symptoms are severe, unusual, or dangerous, advise the user to contact a doctor, nurse, pharmacist, or midwife.
* If uncertain, say you are uncertain.

USER QUESTION:
${userMessage}
`;

```
const response = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: prompt
            }
          ]
        }
      ]
    })
  }
);

const data = await response.json();

const reply =
  data?.candidates?.[0]?.content?.parts?.[0]?.text ||
  "Sorry, Ask Astura is temporarily unavailable.";

return {
  statusCode: 200,
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    reply
  })
};
```

} catch (error) {
console.error(error);

```
return {
  statusCode: 500,
  body: JSON.stringify({
    error: "Ask Astura is temporarily unavailable."
  })
};
```

}
};
