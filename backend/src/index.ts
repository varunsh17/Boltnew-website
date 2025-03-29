require("dotenv").config();
import express from "express";
import { basePrompt as reactPrompt } from "./default/react";
import { basePrompt as nodePrompt } from "./default/node";
import { BASE_PROMPT, getSystemPrompt } from "./prompts";
import cors from "cors";

const { GoogleGenerativeAI } = require("@google/generative-ai");
const apiKey = "AIzaSyDCPGQwI9PANf9ypccdhclapzAQLq0kQj8";
const genAI = new GoogleGenerativeAI(apiKey);
const app = express();
app.use(express.json());
app.use(cors());

const model = genAI.getGenerativeModel({
  model: "gemini-2.0-flash-exp",
});
const generationConfig = {
  temperature: 0.25,
  topP: 0.95,
  topK: 40,
  maxOutputTokens: 10000,
  responseMimeType: "text/plain",
};

app.post("/template", async (req, res) => {
  const prompt = req.body.prompt;

  if (!prompt || typeof prompt !== "string") {
    res
      .status(400)
      .json({ message: "Invalid 'prompt' provided in request body" });
    return;
  }

  // Start chat session
  const chatSession = model.startChat({
    generationConfig,
    history: [
      {
        role: "user",
        parts: [
          {
            text: "Analyze the following project description and strictly return either 'react' (for frontend projects) or 'node' (for backend/API projects). Your response must be exactly one word with no additional formatting, punctuation, or explanation. Consider these guidelines: - Return 'react' for anything UI-related, web apps, or client-side projects - Return 'node' for server-side, APIs, databases, or infrastructure projects",
          },
        ],
      },
    ],
  });

  try {
    // Send message to the chat session
    console.log("Sending prompt to chat session:", prompt);
    let answer = await chatSession.sendMessage(prompt);

    // Extract the response type
    let typeofproject = await answer.response.text();
    console.log("Response type received:", typeofproject);
    const normalizedType = typeofproject.trim().toLowerCase();

    // Check the type and respond accordingly
    if (normalizedType === "react") {
      res.json({
        prompts: [
          BASE_PROMPT,
          `Here is an artifact that contains all files of the project visible to you.\nConsider the contents of ALL files in the project.\n\n${reactPrompt}\n\nHere is a list of files that exist on the file system but are not being shown to you:\n\n  - .gitignore\n  - package-lock.json\n`,
        ],
        uiPrompts: [reactPrompt],
      });
      return;
    } else if (normalizedType === "node") {
      res.json({
        prompts: [
          `Here is an artifact that contains all files of the project visible to you.\nConsider the contents of ALL files in the project.\n\n${reactPrompt}\n\nHere is a list of files that exist on the file system but are not being shown to you:\n\n  - .gitignore\n  - package-lock.json\n`,
        ],
        uiPrompts: [nodePrompt],
      });
      return;
    }

    // Handle invalid responses
    console.warn("Invalid response type received:", normalizedType);
    res.status(403).json({ message: `${normalizedType} Invalid response` });
  } catch (error) {
    console.error("Error during chat session:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.post("/chat", async (req, res) => {
  const modeltemp = genAI.getGenerativeModel({
    model: "gemini-2.0-flash-exp",
    systemInstruction: getSystemPrompt(),
  });

  try {
    // Start chat session
    const allmessages = req.body.messages;
    const reply1 = allmessages[0];
    const reply2 = allmessages[1];
    const reply3 = allmessages[2];
    const chatSession = modeltemp.startChat({
      generationConfig,
      history: [
        {
          role: "user",
          parts: [
            {
              text: reply1.parts[0].text,
            },
          ],
        },
        {
          role: "user",
          parts: [
            {
              text: reply2.parts[0].text,
            },
          ],
        },
      ],
    });
    // Send message to the chat session
    const answer = await chatSession.sendMessage(reply3.parts[0].text);

    // Log the raw response
    console.log("Raw response received:", answer);

    // Ensure the response is a valid JSON string
    if (typeof answer.response === "string") {
      try {
        const jsonResponse = JSON.parse(answer.response);
        res.json({ response: jsonResponse });
      } catch (jsonError) {
        console.error("Error parsing JSON response:", jsonError);
        res
          .status(500)
          .json({ message: "Invalid JSON response from chat session" });
      }
    } else {
      res.json({ response: answer.response });
    }
  } catch (error) {
    console.error("Error during chat session:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
