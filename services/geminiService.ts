import { GoogleGenAI, Type } from "@google/genai";
import { AIResponse, Priority } from "../types";

export const enhanceTaskWithAI = async (taskTitle: string): Promise<AIResponse> => {
  // Check for Vite env var first (standard for Vercel/Netlify deployments)
  const viteEnv = (import.meta as any).env;
  
  // Logic: 
  // 1. Check VITE_API_KEY (Deployment Env)
  // 2. Check process.env.API_KEY (Node Env)
  // 3. Check LocalStorage (User entered manually in Settings)
  const storedKey = localStorage.getItem('user_gemini_api_key');
  const apiKey = viteEnv?.VITE_API_KEY || (typeof process !== 'undefined' ? process.env?.API_KEY : undefined) || storedKey;
  
  if (!apiKey) {
    throw new Error("API Key is missing. Please go to Account Settings -> AI Config and enter your Google Gemini API Key.");
  }

  // Initialize client inside the function
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

  // Retry logic wrapper
  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
    try {
        const response = await ai.models.generateContent({
        model: model,
        contents: prompt,
        config: {
            systemInstruction: "You are an intelligent productivity assistant helping to organize tasks.",
            responseMimeType: "application/json",
            // Relaxed safety settings to prevent over-blocking
            safetySettings: [
                { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
                { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
                { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
                { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
            ],
            responseSchema: {
            type: Type.OBJECT,
            properties: {
                description: { type: Type.STRING },
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
            throw new Error("No response received from AI service.");
        }

        const json = JSON.parse(text) as AIResponse;
        return json;

    } catch (error: any) {
        console.error(`Attempt ${attempts + 1} failed:`, error);
        attempts++;
        
        // If it's a permission/key error, don't retry, fail immediately
        if (error.status === 403 || error.message?.includes("API Key") || error.message?.includes("permission")) {
            throw error;
        }

        // If we ran out of attempts, throw the error
        if (attempts >= maxAttempts) {
             // Throw specific error messages for better UI feedback
            if (error.message?.includes("API Key")) throw error;
            if (error.status === 403 || error.message?.includes("permission") || error.message?.includes("400")) {
                throw new Error("Invalid API Key. Please check your key in Settings -> AI Config.");
            }
            throw new Error("Failed to generate content. The AI service might be busy, please try again.");
        }
        
        // Wait a bit before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
    }
  }
  
  throw new Error("Unexpected error in AI service.");
};