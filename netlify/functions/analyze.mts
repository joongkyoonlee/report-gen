import type { Config } from "@netlify/functions";

export default async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const apiKey = Netlify.env.get("GEMINI_API_KEY");
  if (!apiKey) {
    return Response.json(
      { error: "GEMINI_API_KEY is not configured" },
      { status: 500 }
    );
  }

  try {
    const { text } = await req.json();
    if (!text) {
      return Response.json({ error: "text is required" }, { status: 400 });
    }

    const prompt = `다음은 의성군 보도자료 작성을 위한 원본 텍스트입니다. 이 내용을 분석하여 보도자료 항목별로 정리해 주세요.

        원본 텍스트:
        ${text}

        반드시 다음 JSON 구조로 응답하세요:
        {
          "projectName": "사업명 (핵심 주제)",
          "target": "대상 (누구를 위한 것인지)",
          "background": "추진 배경 (왜 하는지)",
          "content": "주요 내용 (무엇을 하는지, 일시/장소 포함)",
          "effect": "기대 효과 (어떤 결과가 예상되는지)",
          "quote": "인용문 (관련자나 군수의 예상 발언, 없으면 적절히 생성)"
        }`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
              type: "OBJECT",
              properties: {
                projectName: { type: "STRING" },
                target: { type: "STRING" },
                background: { type: "STRING" },
                content: { type: "STRING" },
                effect: { type: "STRING" },
                quote: { type: "STRING" },
              },
              required: [
                "projectName",
                "target",
                "background",
                "content",
                "effect",
                "quote",
              ],
            },
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error:", errorText);
      return Response.json(
        { error: "AI 분석에 실패했습니다." },
        { status: 502 }
      );
    }

    const data = await response.json();
    const resultText =
      data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    const result = JSON.parse(resultText);

    return Response.json(result);
  } catch (error) {
    console.error("Function error:", error);
    return Response.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
};

export const config: Config = {
  path: "/api/analyze",
  method: "POST",
};
