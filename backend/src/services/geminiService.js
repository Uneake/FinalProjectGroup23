import "dotenv/config";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// ฟังก์ชันเรียก Google Gemini API
const generateContent = async (prompt) => {
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`, { // CHANGED TO gemini-2.0-flash
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }]
      })
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(`Google Gemini API error: ${res.status} - ${JSON.stringify(errorData)}`);
    }

    const data = await res.json();

    if (data.candidates && data.candidates.length > 0 && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts.length > 0) {
       // console.log(data.candidates[0].content.parts[0].text);
        return data.candidates[0].content.parts[0].text;
    } else {
        throw new Error("Unexpected response structure from Google Gemini API");
    }
  } catch (error) {
    //console.error("Error calling Google Gemini API:", error);
    throw error;
  }
};


// รวมเป็น object gemini และ export named
export const gemini = {
  generateContent
};