import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function supabaseForUser(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "list_equipos",
  title: "Listar equipos",
  description:
    "Lista equipos del inventario. Filtros opcionales por estado (disponible, contratado, taller, inactivo, baja, etc.), modelo o marca. Devuelve como máximo 50 resultados.",
  inputSchema: {
    estado: z.string().optional().describe("Estado del equipo, ej. 'disponible'"),
    modelo: z.string().optional().describe("Filtro por modelo (búsqueda parcial)"),
    marca: z.string().optional().describe("Filtro por marca (búsqueda parcial)"),
    limit: z.number().int().min(1).max(50).optional().describe("Límite de resultados (default 20)"),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ estado, modelo, marca, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "No autenticado" }], isError: true };
    }
    let q = supabaseForUser(ctx)
      .from("equipos")
      .select("id, folio, modelo, marca, estado, ubicacion_actual, precio_lista")
      .limit(limit ?? 20);
    if (estado) q = q.eq("estado", estado);
    if (modelo) q = q.ilike("modelo", `%${modelo}%`);
    if (marca) q = q.ilike("marca", `%${marca}%`);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { equipos: data },
    };
  },
});
