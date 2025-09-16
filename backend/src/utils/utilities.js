export const parseLLMJSON = (llmOutput) => {
  try {
    const cleaned = llmOutput.replace(/```json|```/g, "").trim();
    const data = JSON.parse(cleaned);

    // เติม options ให้แน่ใจว่ามี
    if (data.quizzes && Array.isArray(data.quizzes)) {
      data.quizzes = data.quizzes.map(q => ({
        ...q,
        options: q.options || []  // <- ถ้าไม่มี options ให้เป็น array ว่าง
      }));
    }

    return data;
  } catch (err) {
    console.error("Failed to parse LLM JSON:", err, llmOutput);
    return null;
  }
};

export const cutUntilJson = (str)=> {
  const marker = "```json"; // กำหนดเครื่องหมายที่ต้องการค้นหา
  const startIndex = str.indexOf(marker); // ค้นหาตำแหน่งเริ่มต้นของ '''json [2]

  if (startIndex !== -1) {
    // ถ้าพบ '''json ให้คืนค่าส่วนของสตริงตั้งแต่ตำแหน่งนั้นไปจนจบ [1, 7]
    return str.substring(startIndex);
  } else {
    // ถ้าไม่พบ '''json คุณสามารถเลือกที่จะคืนค่าสตริงเดิม หรือสตริงว่าง
    // ในกรณีนี้ เราจะคืนค่าสตริงว่างหากไม่พบ
    return '';
    // หากต้องการคืนค่าสตริงเดิมเมื่อไม่พบ:
    // return str;
  }
}

export const cutAfterLastTripleQuote = (str) => {
  const marker = "```";
  // ค้นหาดัชนีเริ่มต้นของการปรากฏครั้งสุดท้ายของ marker [2]
  const lastIndex = str.lastIndexOf(marker);

  if (lastIndex !== -1) {
    // ถ้าพบ ''' ให้คืนค่าส่วนของสตริงตั้งแต่ต้นจนถึง
    // ตำแหน่งสุดท้ายของ ''' บวกด้วยความยาวของ marker [1, 3]
    return str.substring(0, lastIndex + marker.length);
  } else {
    // ถ้าไม่พบ ''' คุณสามารถเลือกที่จะคืนค่าสตริงเดิม หรือสตริงว่าง
    // ในกรณีนี้ เราจะคืนค่าสตริงเดิมหากไม่พบ
    return str;
    // หากต้องการคืนค่าสตริงว่างเมื่อไม่พบ:
    // return '';
  }
}