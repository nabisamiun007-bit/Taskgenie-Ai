import { GoogleGenAI, Type } from "@google/genai";
import { AIResponse } from "../types";

// Declare process to satisfy TypeScript compiler during build
declare var process: {
  env: {
    API_KEY: string;
    [key: string]: string | undefined;
  }
};

export const enhanceTaskWithAI = async (taskTitle: string): Promise<AIResponse> => {
  // Validate API Key existence before attempting to use SDK
  const apiKey = process.env.API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    throw new Error("API Key is missing. Please set VITE_API_KEY in your environment variables.");
  }

  // Use process.env.API_KEY as per guidelines
  const ai = new GoogleGenAI({ apiKey: apiKey });
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
                { category: 'HARM_CATEGORY_HARASSMENT' as any, threshold: 'BLOCK_NONE' as any },
                { category: 'HARM_CATEGORY_HATE_SPEECH' as any, threshold: 'BLOCK_NONE' as any },
                { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT' as any, threshold: 'BLOCK_NONE' as any },
                { category: 'HARM_CATEGORY_DANGEROUS_CONTENT' as any, threshold: 'BLOCK_NONE' as any },
            ],
            // Casting schema to any to prevent strict TypeScript recursion errors during build
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
            } as any
        }
        });

        let text = response.text;
        if (!text) {
            throw new Error("No response received from AI service.");
        }

        // Clean up potential markdown formatting (```json ... ```)
        text = text.trim();
        if (text.startsWith('```')) {
            text = text.replace(/^```(?:json)?/, '').replace(/```$/, '').trim();
        }

        const json = JSON.parse(text) as AIResponse;
        return json;

    } catch (error: any) {
        console.error(`Attempt ${attempts + 1} failed:`, error);
        attempts++;
        
        // If it's a permission/key error, don't retry, fail immediately
        if (error.status === 403 || error.message?.includes("API Key") || error.message?.includes("permission")) {
             throw new Error("Invalid API Key. Please check your configuration.");
        }

        // If we ran out of attempts, throw the error
        if (attempts >= maxAttempts) {
             // Throw specific error messages for better UI feedback
            if (error.message?.includes("API Key")) throw new Error("API Key is missing or invalid.");
            if (error.status === 403 || error.message?.includes("permission") || error.message?.includes("400")) {
                throw new Error("Invalid API Key configuration. Please check your environment variables.");
            }
            throw new Error("Failed to generate content. The AI service might be busy, please try again.");
        }
        
        // Wait a bit before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
    }
  }
  
  throw new Error("Unexpected error in AI service.");
};