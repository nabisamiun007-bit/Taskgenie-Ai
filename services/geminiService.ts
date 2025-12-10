import { GoogleGenAI, Type } from "@google/genai";
import { AIResponse, Priority } from "../types";

export const enhanceTaskWithAI = async (taskTitle: string): Promise<AIResponse> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("API Key is missing in process.env.API_KEY");
    throw new Error("API Key is missing. Please set process.env.API_KEY.");
  }

  // Initialize client inside the function to ensure env var is ready
  const ai = new GoogleGenAI({ apiKey });
  const model = "gemini-2.5-flash";
  
  const prompt = `
    I am creating a task manager task with the title: "${taskTitle}".
    Please analyze this task title and provide:
    1. A better, more professional description (max 2 sentences).
    2. A suggested priority level (Low, Medium, High, or Urgent).
    3. A list of up to 5 breakdown sub-steps.
    4. A list of up to 3 short relevant tags.
  `;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        systemInstruction: "You are an intelligent productivity assistant helping to organize tasks.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            description: { type: Type.STRING },
            // Hardcode enum values to match Priority enum strings exactly
            priority: { type: Type.STRING, enum: ['Low', 'Medium', 'High', 'Urgent'] },
            subtasks: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING } 
            },
            tags: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["description", "priority", "subtasks", "tags"]
        }
      }
    });

    const text = response.text;
    if (!text) {
        throw new Error("No response text from AI");
    }

    const json = JSON.parse(text) as AIResponse;
    return json;

  } catch (error) {
    console.error("Error calling Gemini:", error);
    // Return safe fallback instead of throwing to prevent app crash
    return {
      description: "Could not generate description. Please try again.",
      priority: Priority.MEDIUM,
      subtasks: ["Review task details"],
      tags: ["Task"]
    };
  }
};