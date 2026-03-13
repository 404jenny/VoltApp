import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ZONES = [
  { id: "deep-focus", name: "Deep Focus", desc: "Hard, important work. No interruptions." },
  { id: "builder", name: "Builder Mode", desc: "Making real progress, shipping things." },
  { id: "strategy", name: "Strategy", desc: "Planning, decision-making, goal-setting." },
  { id: "learning", name: "Learning", desc: "Reading, studying, absorbing new skills." },
  { id: "communication", name: "Communication", desc: "Email, Slack, calls, meetings." },
  { id: "admin", name: "Admin", desc: "Scheduling, invoices, logistics, inbox." },
  { id: "gentle", name: "Gentle Mode", desc: "Light tasks, easy wins, low energy." },
  { id: "movement", name: "Movement", desc: "Gym, walks, runs, physical activity." },
  { id: "nourish", name: "Nourish", desc: "Eating with intention, meals." },
  { id: "present", name: "Present", desc: "Quality time with people, phone down." },
  { id: "creative-play", name: "Creative Play", desc: "Art, hobbies, games, fun." },
  { id: "wind-down", name: "Wind Down", desc: "Evening routine, end of day, sleep prep." },
  { id: "stillness", name: "Stillness", desc: "Meditation, journaling, quiet reflection." },
  { id: "rest", name: "Rest & Recharge", desc: "Napping, recovery, solo recharge time." },
  { id: "transition", name: "Transition", desc: "Gap between modes, context switching." },
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const tasks = body.tasks;

    if (!tasks || !Array.isArray(tasks)) {
      return new Response(JSON.stringify({ error: "No tasks provided", received: body }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const zoneList = ZONES.map((z) => `${z.id}: ${z.name} — ${z.desc}`).join("\n");

    const prompt = `You are a productivity assistant. Assign each task to the best zone.

ZONES:
${zoneList}

TASKS:
${tasks.map((t: string, i: number) => `${i + 1}. ${t}`).join("\n")}

Rules:
- Use ONLY zone ids from the list above
- Return ONLY a JSON array, no markdown, no explanation
- Every task must have an assignment

Format: [{"task":"task text","zoneId":"zone-id"}]`;

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY") ?? "";

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-20240307",
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return new Response(JSON.stringify({ error: "Anthropic error", details: data }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const text = data.content?.[0]?.text ?? "";

    if (!text) {
      return new Response(JSON.stringify({ error: "Empty response", data }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const match = text.match(/\[[\s\S]*\]/);
    if (!match) {
      return new Response(JSON.stringify({ error: "No JSON found", raw: text }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const assignments = JSON.parse(match[0]);

    return new Response(JSON.stringify({ assignments }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});