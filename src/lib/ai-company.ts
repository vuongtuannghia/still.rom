type AgentRole = "boss" | "research" | "marketing" | "engineering";

type AgentResult = {
  role: AgentRole;
  provider: "gemini" | "openrouter" | "unavailable";
  model?: string;
  ok: boolean;
  text: string;
  error?: string;
};

export type ChatMessage = {
  id: string;
  speaker: AgentRole;
  name: string;
  provider?: string;
  text: string;
  status?: "sent" | "error";
};

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || "openrouter/free";
const OPENROUTER_BOSS_MODEL = process.env.OPENROUTER_BOSS_MODEL || OPENROUTER_MODEL;

function trimOutput(value: string, max = 8000) {
  return value.trim().slice(0, max);
}

function makeMessage(id: string, speaker: AgentRole, name: string, text: string, provider?: string, status: ChatMessage["status"] = "sent"): ChatMessage {
  return { id, speaker, name, provider, text: trimOutput(text, 7000), status };
}

function availableOpenRouter() {
  return Boolean(process.env.OPENROUTER_API_KEY);
}

async function callOpenRouter(role: AgentRole, prompt: string, model = OPENROUTER_MODEL): Promise<AgentResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return { role, provider: "unavailable", ok: false, text: "", error: "OPENROUTER_API_KEY chưa được cấu hình trong Render." };
  }

  const systemByRole: Record<AgentRole, string> = {
    boss:
      "Bạn là BOSS AI của STILL. ROOM. Bạn là người nhận nhiệm vụ trực tiếp từ người dùng, chia nhiệm vụ cho Research, Engineering và Marketing, nhận báo cáo của họ, phản biện và chốt quyết định. Bạn phải hành động như trưởng nhóm thực sự trong một group chat: giao việc rõ ràng, đọc báo cáo của thành viên trước, chỉ ra mâu thuẫn và kết luận thành các hành động cụ thể. Không bịa dữ kiện.",
    research:
      "Bạn là RESEARCH AI của STILL. ROOM. Bạn báo cáo trực tiếp cho BOSS. Nghiên cứu, kiểm chứng giả định, nêu dữ kiện cần kiểm tra và đề xuất hành động cụ thể. Không bịa số liệu.",
    marketing:
      "Bạn là MARKETING AI của STILL. ROOM. Bạn báo cáo trực tiếp cho BOSS. Tập trung SEO, content, phân phối hữu cơ và tăng người dùng thật. Không spam, không giả tương tác, không mua traffic.",
    engineering:
      "Bạn là ENGINEERING AI của STILL. ROOM. Bạn báo cáo trực tiếp cho BOSS. Tập trung code, kiến trúc, reliability, security, performance và triển khai an toàn.",
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
        model,
        messages: [
          { role: "system", content: systemByRole[role] },
          { role: "user", content: prompt },
        ],
        temperature: 0.2,
        max_tokens: role === "boss" ? 2200 : 1800,
      }),
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(payload?.error?.message || `OpenRouter HTTP ${response.status}`);

    const text = payload?.choices?.[0]?.message?.content || "";
    if (!text) throw new Error("OpenRouter trả về rỗng.");

    return { role, provider: "openrouter", model, ok: true, text: trimOutput(text) };
  } catch (error) {
    return {
      role,
      provider: "openrouter",
      model,
      ok: false,
      text: "",
      error: error instanceof Error ? error.message : "OpenRouter request failed",
    };
  }
}

async function callGeminiResearch(prompt: string): Promise<AgentResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return callOpenRouter("research", prompt);

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
                "Bạn là RESEARCH AI của STILL. ROOM. Bạn báo cáo trực tiếp cho BOSS. Hãy nghiên cứu, kiểm chứng giả định, nêu dữ kiện cần kiểm tra và đề xuất hành động. Không bịa số liệu.",
            }],
          },
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 1800 },
        }),
      },
    );

    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(payload?.error?.message || `Gemini HTTP ${response.status}`);
    const text = payload?.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text || "").join("") || "";
    if (!text) throw new Error("Gemini trả về rỗng.");

    return { role: "research", provider: "gemini", model: GEMINI_MODEL, ok: true, text: trimOutput(text) };
  } catch (error) {
    return callOpenRouter("research", `${prompt}\nGemini gặp lỗi; hãy làm Research dự phòng qua OpenRouter.`);
  }
}

export async function runAiCompany(task: string) {
  const cleanTask = trimOutput(task, 5000);
  if (!cleanTask) throw new Error("Nhiệm vụ không được để trống.");
  if (!availableOpenRouter() && !process.env.GEMINI_API_KEY) {
    throw new Error("Chưa kết nối AI. Hãy thêm OPENROUTER_API_KEY vào Render.");
  }

  const chat: ChatMessage[] = [
    makeMessage("boss-brief", "boss", "BOSS", `Tôi nhận nhiệm vụ: ${cleanTask}. Tôi sẽ chia việc cho cả đội.`),
  ];

  const bossPlan = await callOpenRouter("boss", `Nhiệm vụ người dùng giao: ${cleanTask}

Hãy:
1) Xác định mục tiêu cuối.
2) Tạo brief cụ thể cho RESEARCH, ENGINEERING và MARKETING.
3) Đưa brief dưới dạng chỉ dẫn để từng thành viên có thể thực hiện ngay.`);
  if (bossPlan.ok) {
    chat.push(makeMessage("boss-plan", "boss", "BOSS", bossPlan.text, bossPlan.provider));
  }

  const researchPrompt = `Nhiệm vụ chính: ${cleanTask}

BOSS giao brief:
${bossPlan.ok ? bossPlan.text : "Hãy tự xác định phần nghiên cứu cần thiết."}

Gửi báo cáo cho BOSS.`;
  const research = await callGeminiResearch(researchPrompt);
  chat.push(
    research.ok
      ? makeMessage("research", "research", "RESEARCH", research.text, research.provider)
      : makeMessage("research", "research", "RESEARCH", research.error || "Không kết nối được.", research.provider, "error")
  );

  const engineering = await callOpenRouter(
    "engineering",
    `Nhiệm vụ chính: ${cleanTask}

Kế hoạch của BOSS:
${bossPlan.ok ? bossPlan.text : "(BOSS plan unavailable)"}

Báo cáo của RESEARCH:
${research.ok ? research.text : "(Research offline)"}

BOSS giao bạn phản biện các rủi ro kỹ thuật và đưa phương án triển khai.`
  );
  chat.push(
    engineering.ok
      ? makeMessage("engineering", "engineering", "ENGINEERING", engineering.text, engineering.provider)
      : makeMessage("engineering", "engineering", "ENGINEERING", engineering.error || "Không kết nối được.", engineering.provider, "error")
  );

  const marketing = await callOpenRouter(
    "marketing",
    `Nhiệm vụ chính: ${cleanTask}

Báo cáo RESEARCH:
${research.ok ? research.text : "(Research offline)"}

Báo cáo ENGINEERING:
${engineering.ok ? engineering.text : "(Engineering offline)"}

BOSS giao MARKETING xây kế hoạch tăng trưởng dựa trên các báo cáo trên.`
  );
  chat.push(
    marketing.ok
      ? makeMessage("marketing", "marketing", "MARKETING", marketing.text, marketing.provider)
      : makeMessage("marketing", "marketing", "MARKETING", marketing.error || "Không kết nối được.", marketing.provider, "error")
  );

  const bossFinal = await callOpenRouter(
    "boss",
    `Bạn là BOSS. Nhiệm vụ: ${cleanTask}

RESEARCH:
${research.ok ? research.text : "(offline)"}

ENGINEERING:
${engineering.ok ? engineering.text : "(offline)"}

MARKETING:
${marketing.ok ? marketing.text : "(offline)"}

Hãy phản biện ba báo cáo, loại bỏ ý kiến yếu, chốt một phương án duy nhất và giao 3-7 hành động cụ thể theo thứ tự ưu tiên. Trả lời như tin nhắn cuối cùng của BOSS trong group.`,
    OPENROUTER_BOSS_MODEL
  );

  const finalText = bossFinal.ok
    ? bossFinal.text
    : "Tôi đã nhận các báo cáo nhưng BOSS không thể tạo bản chốt cuối. Hãy kiểm tra OPENROUTER_API_KEY.";

  chat.push(
    bossFinal.ok
      ? makeMessage("boss-final", "boss", "BOSS", finalText, bossFinal.provider)
      : makeMessage("boss-final", "boss", "BOSS", finalText, bossFinal.provider, "error")
  );

  const agents = [research, engineering, marketing];
  return {
    task: cleanTask,
    boss: finalText,
    chat,
    agents: agents.map((item) => ({
      role: item.role,
      provider: item.provider,
      model: item.model ?? null,
      ok: item.ok,
      text: item.text,
      error: item.error ?? null,
    })),
    bossModel: bossFinal.model ?? null,
    freeMode: OPENROUTER_MODEL === "openrouter/free" && OPENROUTER_BOSS_MODEL === "openrouter/free",
  };
}

export function getAiCompanyStatus() {
  const openRouterReady = Boolean(process.env.OPENROUTER_API_KEY);
  const geminiReady = Boolean(process.env.GEMINI_API_KEY);

  return {
    boss: {
      enabled: true,
      provider: "OpenRouter",
      model: OPENROUTER_BOSS_MODEL,
      configured: openRouterReady,
      pricingMode: OPENROUTER_BOSS_MODEL === "openrouter/free" ? "free-model-router" : "check-model-pricing",
    },
    agents: {
      research: {
        provider: geminiReady ? "Gemini" : "OpenRouter",
        configured: openRouterReady || geminiReady,
        model: geminiReady ? GEMINI_MODEL : OPENROUTER_MODEL,
        pricingMode: geminiReady ? "gemini-free-tier-if-available" : "openrouter-free-router",
      },
      marketing: {
        provider: "OpenRouter",
        configured: openRouterReady,
        model: OPENROUTER_MODEL,
        pricingMode: OPENROUTER_MODEL === "openrouter/free" ? "free-model-router" : "check-model-pricing",
      },
      engineering: {
        provider: "OpenRouter",
        configured: openRouterReady,
        model: OPENROUTER_MODEL,
        pricingMode: OPENROUTER_MODEL === "openrouter/free" ? "free-model-router" : "check-model-pricing",
      },
    },
    setup: {
      minimumRequiredKey: "OPENROUTER_API_KEY",
      optionalKey: "GEMINI_API_KEY",
    },
  };
}
