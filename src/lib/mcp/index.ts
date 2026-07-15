import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listEquipos from "./tools/list-equipos";
import getEquipo from "./tools/get-equipo";
import listContratos from "./tools/list-contratos";
import listClientes from "./tools/list-clientes";
import inventarioResumen from "./tools/inventario-resumen";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "comymaq-mcp",
  title: "COMYMAQ MCP",
  version: "0.1.0",
  instructions:
    "Herramientas para consultar el sistema COMYMAQ de renta de equipo: inventario de equipos, contratos, clientes y resumen de inventario. Todas las operaciones se ejecutan como el usuario autenticado y respetan sus permisos.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listEquipos, getEquipo, listContratos, listClientes, inventarioResumen],
});
