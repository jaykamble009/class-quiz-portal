import { GoogleGenAI } from "@google/genai";

const key = "AIzaSyCUUssa8HYrJKd4JZhf9coJirzJrSyt0Cc";
const ai = new GoogleGenAI({ apiKey: key });

async function test() {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-flash-latest",
      contents: "Hello",
    });
    console.log("SUCCESS:", response.text);
  } catch (e) {
    console.log("ERROR_STATUS:", e.status);
    console.log("ERROR_MESSAGE:", e.message);
  }
}

test();
