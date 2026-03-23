import { GoogleGenAI } from "@google/genai";

const key = "AIzaSyCUUssa8HYrJKd4JZhf9coJirzJrSyt0Cc";
const ai = new GoogleGenAI({ apiKey: key, apiVersion: "v1" });

async function test() {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: "Hello, testing API connection.",
    });
    console.log("SUCCESS:", response.text);
  } catch (e) {
    console.log("ERROR_STATUS:", e.status);
    console.log("ERROR_MESSAGE:", e.message);
    console.log("ERROR_FULL:", JSON.stringify(e, null, 2));
  }
}

test();
