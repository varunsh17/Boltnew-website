"use strict";
var __awaiter =
  (this && this.__awaiter) ||
  function (thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P
        ? value
        : new P(function (resolve) {
            resolve(value);
          });
    }
    return new (P || (P = Promise))(function (resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done
          ? resolve(result.value)
          : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv").config();
const express_1 = __importDefault(require("express"));
const react_1 = require("./default/react");
const node_1 = require("./default/node");
const prompts_1 = require("./prompts");
const cors_1 = __importDefault(require("cors"));
const { GoogleGenerativeAI } = require("@google/generative-ai");
const apiKey = "AIzaSyDCPGQwI9PANf9ypccdhclapzAQLq0kQj8";
const genAI = new GoogleGenerativeAI(apiKey);
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use((0, cors_1.default)());
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
app.post("/template", (req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
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
      let answer = yield chatSession.sendMessage(prompt);
      // Extract the response type
      let typeofproject = yield answer.response.text();
      console.log("Response type received:", typeofproject);
      const normalizedType = typeofproject.trim().toLowerCase();
      // Check the type and respond accordingly
      if (normalizedType === "react") {
        res.json({
          prompts: [
            prompts_1.BASE_PROMPT,
            `Here is an artifact that contains all files of the project visible to you.\nConsider the contents of ALL files in the project.\n\n${react_1.basePrompt}\n\nHere is a list of files that exist on the file system but are not being shown to you:\n\n  - .gitignore\n  - package-lock.json\n`,
          ],
          uiPrompts: [react_1.basePrompt],
        });
        return;
      } else if (normalizedType === "node") {
        res.json({
          prompts: [
            `Here is an artifact that contains all files of the project visible to you.\nConsider the contents of ALL files in the project.\n\n${react_1.basePrompt}\n\nHere is a list of files that exist on the file system but are not being shown to you:\n\n  - .gitignore\n  - package-lock.json\n`,
          ],
          uiPrompts: [node_1.basePrompt],
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
  })
);
app.post("/chat", (req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const modeltemp = genAI.getGenerativeModel({
      model: "gemini-2.0-flash-exp",
      systemInstruction: (0, prompts_1.getSystemPrompt)(),
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
                text: reply1.content,
              },
            ],
          },
          {
            role: "user",
            parts: [
              {
                text: reply2.content,
              },
            ],
          },
        ],
      });
      // Send message to the chat session
      const answer = yield chatSession.sendMessage(reply3.content);
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
  })
);
app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
