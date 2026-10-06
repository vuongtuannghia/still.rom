type AgentRole = "research" | "marketing" | "engineering";

type AgentResult = {
  role: AgentRole;
  provider: "gemini" | "openrouter" | "unavailable";
  model?: string;
  ok: boolean;
  text: string;
  error?: string;
};

type ChatMessage = {
  id: string;
  speaker: "boss" | AgentRole;
  name: string;
  provider?: string;
  text: string;
  status?: "sent" | "error";
};

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || "openrouter/free";

function trimOutput(value: string, max = 8000) {
  return value.trim().slice(0, max);
}

function message(id: string, speaker: ChatMessage["speaker"], name: string, text: string, provider?: string, status: ChatMessage["status"] = "sent"): ChatMessage {
  return { id, speaker, name, provider, text: trimOutput(text, 7000), status };
}

async function askGemini(prompt: string): Promise<AgentResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { role: "research", provider: "unavailable", ok: false, text: "", error: "GEMINI_API_KEY chưa được cấu hình trong Render." };
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
                "Bạn là RESEARCH AI của STILL. ROOM. Bạn đang ở trong một công ty AI do BOSS điều phối. Hãy nghiên cứu, kiểm chứng giả định, nêu dữ kiện còn thiếu và đề xuất hành động. Trả lời như đang nhắn trực tiếp cho BOSS, ngắn gọn nhưng có căn cứ. Không bịa số liệu.",
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
    return { role, provider: "unavailable", ok: false, text: "", error: "OPENROUTER_API_KEY chưa được cấu hình trong Render." };
  }

  const systemByRole: Record<AgentRole, string> = {
    research: "Bạn là Research AI. Trả lời BOSS.",
    marketing:
      "Bạn là MARKETING AI của STILL. ROOM. Bạn nhận brief và các báo cáo trước đó từ những thành viên khác. Tập trung SEO, content, phân phối hữu cơ và tăng người dùng thật. Không spam, không giả tương tác, không mua traffic. Trả lời như đang trao đổi trực tiếp trong group công ty.",
    engineering:
      "Bạn là ENGINEERING AI của STILL. ROOM. Bạn nhận brief và báo cáo nghiên cứu từ thành viên trước. Tập trung code, kiến trúc, reliability, security, performance và cách triển khai an toàn. Trả lời như đang trao đổi trực tiếp trong group công ty.",
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

    return { role, provider: "openrouter", model: OPENROUTER_MODEL, ok: true, text: trimOutput(text) };
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

function fallbackBoss(task: string, results: AgentResult[]) {
  const successful = results.filter((item) => item.ok);
  if (!successful.length) {
    return "Chưa thể triển khai: chưa có AI thành viên nào được kết nối. Hãy cấu hình GEMINI_API_KEY và/hoặc OPENROUTER_API_KEY trong Render.";
  }

  return [
    "Tôi đã nhận báo cáo của đội.",
    "",
    `Mục tiêu: ${task}`,
    "",
    "Quyết định điều phối:",
    "• Ưu tiên việc có tác động trực tiếp nhất tới tăng khả năng được tìm thấy và tăng người dùng thật.",
    "• Thực hiện thay đổi nhỏ, deploy, đo kết quả rồi mới mở rộng.",
    "• Không dùng spam hoặc traffic giả.",
    "",
    "Báo cáo đã nhận:",
    successful.map((item) => `— ${item.role}: ${item.text.slice(0, 500)}`).join("\n"),
  ].join("\n");
}

export async function runAiCompany(task: string) {
  const cleanTask = trimOutput(task, 5000);
  if (!cleanTask) throw new Error("Nhiệm vụ không được để trống.");

  const chat: ChatMessage[] = [
    message("boss-1", "boss", "BOSS", `Mọi người, nhiệm vụ mới: ${cleanTask}`),
  ];

  const research = await askGemini(`Nhiệm vụ: ${cleanTask}
Hãy gửi báo cáo nghiên cứu đầu tiên cho BOSS.`);
  chat.push(
    research.ok
      ? message("research-1", "research", "RESEARCH", research.text, research.provider)
      : message("research-1", "research", "RESEARCH", research.error || "Không kết nối được.", research.provider, "error")
  );

  const engineeringPrompt = [
    `Nhiệm vụ: ${cleanTask}`,
    "RESEARCH vừa báo cáo:",
    research.ok ? research.text : "(Research offline)",
    "",
    "Bây giờ BOSS giao ENGINEERING đưa ra phương án triển khai kỹ thuật.",
  ].join("\n");
  const engineering = await askOpenRouter("engineering", engineeringPrompt);
  chat.push(
    engineering.ok
      ? message("engineering-1", "engineering", "ENGINEERING", engineering.text, engineering.provider)
      : message("engineering-1", "engineering", "ENGINEERING", engineering.error || "Không kết nối được.", engineering.provider, "error")
  );

  const marketingPrompt = [
    `Nhiệm vụ: ${cleanTask}`,
    "RESEARCH báo cáo:",
    research.ok ? research.text : "(Research offline)",
    "",
    "ENGINEERING báo cáo:",
    engineering.ok ? engineering.text : "(Engineering offline)",
    "",
    "BOSS giao MARKETING xây chiến dịch/việc cần làm dựa trên các báo cáo trên.",
  ].join("\n");
  const marketing = await askOpenRouter("marketing", marketingPrompt);
  chat.push(
    marketing.ok
      ? message("marketing-1", "marketing", "MARKETING", marketing.text, marketing.provider)
      : message("marketing-1", "marketing", "MARKETING", marketing.error || "Không kết nối được.", marketing.provider, "error")
  );

  chat.push(message(
    "boss-2",
    "boss",
    "BOSS",
    fallbackBoss(cleanTask, [research, engineering, marketing])
  ));

  const results = [research, marketing, engineering];
  return {
    task: cleanTask,
    boss: fallbackBoss(cleanTask, results),
    chat,
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
        envKey: "GEMINI_API_KEY",
      },
      marketing: {
        provider: "OpenRouter",
        configured: Boolean(process.env.OPENROUTER_API_KEY),
        model: OPENROUTER_MODEL,
        pricingMode: OPENROUTER_MODEL === "openrouter/free" ? "free-model-router" : "check-model-pricing",
        envKey: "OPENROUTER_API_KEY",
      },
      engineering: {
        provider: "OpenRouter",
        configured: Boolean(process.env.OPENROUTER_API_KEY),
        model: OPENROUTER_MODEL,
        pricingMode: OPENROUTER_MODEL === "openrouter/free" ? "free-model-router" : "check-model-pricing",
        envKey: "OPENROUTER_API_KEY",
      },
    },
  };
}
