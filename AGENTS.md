# Architecture rules

- Keep quotation PDF rendering in the shared `src/lib/cotizacionPdf.ts` builder used by both new quotations and history downloads so the same stationery is applied consistently.
- Measure quotation text and images before drawing and fit the entire content to a letter page; never delete overflow pages or truncate entered values, because doing so silently loses quotation information.