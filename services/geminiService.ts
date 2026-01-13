import { GoogleGenAI } from "@google/genai";

// Initialize the client strictly according to guidelines
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateStoryCaption = async (base64Image: string, context: string): Promise<string> => {
  try {
    const model = 'gemini-3-flash-preview'; // Optimized for multimodal
    
    // Clean base64 string if it contains data URI prefix
    const cleanBase64 = base64Image.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');

    const response = await ai.models.generateContent({
      model: model,
      contents: {
        parts: [
          {
            inlineData: {
              data: cleanBase64,
              mimeType: 'image/jpeg', 
            },
          },
          {
            text: `You are a social media expert. Analyze this image for an Instagram Story. 
            The user wants to add this link: "${context}".
            Write a short, engaging caption (max 10 words) that encourages clicking the link.
            Do not include hashtags.`,
          },
        ],
      },
    });

    return response.text || "Check out this link!";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Click the link below!";
  }
};