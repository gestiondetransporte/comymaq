import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";

function supabaseForUser(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "inventario_resumen",
  title: "Resumen de inventario",
  description: "Devuelve el conteo de equipos agrupado por estado.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "No autenticado" }], isError: true };
    }
    const { data, error } = await supabaseForUser(ctx).from("equipos").select("estado");
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const counts: Record<string, number> = {};
    for (const row of data ?? []) {
      const k = (row as any).estado ?? "desconocido";
      counts[k] = (counts[k] ?? 0) + 1;
    }
    const total = data?.length ?? 0;
    return {
      content: [{ type: "text", text: JSON.stringify({ total, por_estado: counts }, null, 2) }],
      structuredContent: { total, por_estado: counts },
    };
  },
});
