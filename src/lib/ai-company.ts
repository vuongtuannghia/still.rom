type AgentRole = "research" | "marketing" | "engineering";

type AgentResult = {
  role: AgentRole;
  provider: "gemini" | "openrouter" | "unavailable";
  model?: string;
  ok: boolean;
  text: string;
  error?: string;
};

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || "openrouter/free";

function trimOutput(value: string, max = 8000) {
  return value.trim().slice(0, max);
}

async function askGemini(prompt: string): Promise<AgentResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { role: "research", provider: "unavailable", ok: false, text: "", error: "GEMINI_API_KEY chưa được cấu hình." };
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{
              text:
                "Bạn là Research AI của STILL. ROOM. Hãy nghiên cứu, kiểm chứng giả định, chỉ ra dữ kiện còn thiếu và đề xuất hành động cụ thể. Không bịa số liệu.",
            }],
          },
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 1800 },
        }),
        cache: "no-store",
      },
    );

    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(payload?.error?.message || `Gemini HTTP ${response.status}`);

    const text =
      payload?.candidates?.[0]?.content?.parts
        ?.map((part: { text?: string }) => part.text || "")
        .join("") || "";

    if (!text) throw new Error("Gemini trả về rỗng.");
    return { role: "research", provider: "gemini", model: GEMINI_MODEL, ok: true, text: trimOutput(text) };
  } catch (error) {
    return {
      role: "research",
      provider: "gemini",
      model: GEMINI_MODEL,
      ok: false,
      text: "",
      error: error instanceof Error ? error.message : "Gemini request failed",
    };
  }
}

async function askOpenRouter(role: AgentRole, prompt: string): Promise<AgentResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return { role, provider: "unavailable", ok: false, text: "", error: "OPENROUTER_API_KEY chưa được cấu hình." };
  }

  const systemByRole: Record<AgentRole, string> = {
    research: "Bạn là AI nghiên cứu.",
    marketing:
      "Bạn là Marketing AI của STILL. ROOM. Tập trung SEO, content, phân phối hữu cơ và tăng người dùng. Không spam, không giả tương tác, không mua traffic.",
    engineering:
      "Bạn là Engineering AI của STILL. ROOM. Tập trung kiến trúc, code, reliability, security và cách triển khai an toàn.",
  };

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": process.env.SITE_URL || "https://still-room-original.onrender.com",
        "X-Title": "still. room AI Company",
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: [
          { role: "system", content: systemByRole[role] },
          { role: "user", content: prompt },
        ],
        temperature: 0.2,
        max_tokens: 1800,
      }),
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(payload?.error?.message || `OpenRouter HTTP ${response.status}`);

    const text = payload?.choices?.[0]?.message?.content || "";
    if (!text) throw new Error("OpenRouter trả về rỗng.");

    return {
      role,
      provider: "openrouter",
      model: OPENROUTER_MODEL,
      ok: true,
      text: trimOutput(text),
    };
  } catch (error) {
    return {
      role,
      provider: "openrouter",
      model: OPENROUTER_MODEL,
      ok: false,
      text: "",
      error: error instanceof Error ? error.message : "OpenRouter request failed",
    };
  }
}

export async function runAiCompany(task: string) {
  const cleanTask = trimOutput(task, 5000);
  if (!cleanTask) throw new Error("Nhiệm vụ không được để trống.");

  const [research, marketing, engineering] = await Promise.all([
    askGemini(cleanTask),
    askOpenRouter("marketing", cleanTask),
    askOpenRouter("engineering", cleanTask),
  ]);

  const results = [research, marketing, engineering];

  const successful = results.filter((item) => item.ok);
  const bossDecision = successful.length
    ? [
        "BOSS — quyết định điều phối",
        "",
        `Mục tiêu: ${cleanTask}`,
        "",
        successful.map((item) =>
          `[${item.role.toUpperCase()} · ${item.provider}]\n${item.text}`
        ).join("\n\n"),
        "",
        "Ưu tiên hành động:",
        "1. Chọn việc có tác động trực tiếp nhất tới mục tiêu.",
        "2. Kiểm tra rủi ro/chi phí trước khi triển khai.",
        "3. Thực hiện một thay đổi nhỏ, đo kết quả, rồi mới mở rộng.",
      ].join("\n")
    : "BOSS: Chưa có AI thành viên nào được kết nối. Hãy cấu hình GEMINI_API_KEY hoặc OPENROUTER_API_KEY trong Render Environment Variables.";

  return {
    task: cleanTask,
    boss: bossDecision,
    agents: results.map((item) => ({
      role: item.role,
      provider: item.provider,
      model: item.model ?? null,
      ok: item.ok,
      text: item.text,
      error: item.error ?? null,
    })),
    freeMode: OPENROUTER_MODEL === "openrouter/free",
  };
}

export function getAiCompanyStatus() {
  return {
    boss: { enabled: true, mode: "orchestrator" },
    agents: {
      research: {
        provider: "Gemini",
        configured: Boolean(process.env.GEMINI_API_KEY),
        model: GEMINI_MODEL,
        pricingMode: "free-tier-if-account-allows",
      },
      marketing: {
        provider: "OpenRouter",
        configured: Boolean(process.env.OPENROUTER_API_KEY),
        model: OPENROUTER_MODEL,
        pricingMode: OPENROUTER_MODEL === "openrouter/free" ? "free-model-router" : "check-model-pricing",
      },
      engineering: {
        provider: "OpenRouter",
        configured: Boolean(process.env.OPENROUTER_API_KEY),
        model: OPENROUTER_MODEL,
        pricingMode: OPENROUTER_MODEL === "openrouter/free" ? "free-model-router" : "check-model-pricing",
      },
    },
  };
}
