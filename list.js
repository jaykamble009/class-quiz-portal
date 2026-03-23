import { GoogleGenAI } from "@google/genai";

const key = "AIzaSyCUUssa8HYrJKd4JZhf9coJirzJrSyt0Cc";
const ai = new GoogleGenAI({ apiKey: key });

async function list() {
  try {
    const response = await ai.models.list();
    const names = response.pageInternal.map(m => m.name);
    console.log("NAMES:", JSON.stringify(names, null, 2));
  } catch (e) {
    console.log("ERROR:", e.message);
  }
}

list();
