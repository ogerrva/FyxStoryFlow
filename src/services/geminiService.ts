
export const generateStoryCaption = async (base64Image: string, context: string, token: string): Promise<string> => {
  try {
    const response = await fetch('/api/generate-caption', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ image: base64Image, context })
    });
    const data = await response.json();
    return data.caption || "Check out this link!";
  } catch (error) {
    console.error("Caption Error:", error);
    return "Click the link below!";
  }
};
