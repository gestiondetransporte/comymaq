# Propuesta COMYMAQ — Sistema de Gestión de Rentas

## Entregable
Dos archivos en `/mnt/documents/`:
- `Propuesta_COMYMAQ_Rentas.docx` (editable)
- `Propuesta_COMYMAQ_Rentas.pdf` (versión final para compartir)

Ambos con la identidad visual de COMYMAQ (paleta corporativa, logo, tipografía sans consistente con el sistema actual) y aproximadamente 18–22 páginas.

## Estructura del documento

1. **Portada** — logo COMYMAQ, título, fecha (15/07/2026), versión.
2. **Resumen ejecutivo** — objetivo, alcance, filosofía "El sistema dirige, logística controla, ventas apoya, gerencia supervisa".
3. **Mapa de módulos y roles** — diagrama de arquitectura + tabla de permisos (Administradora / Vendedor / Gerencia).
4. **Módulos principales** (una sección por módulo, cada una con: objetivo, historias de usuario, campos/candados, mockup UI a página completa, notas técnicas):
   - 4.1 Cotizaciones (motivos aceptación/rechazo, último acercamiento)
   - 4.2 Histórico Universal de Contratos (activos, inactivos, baja, no firmados)
   - 4.3 Control de Contratos Activos (colores, días de vencimiento, botones contacto)
   - 4.4 CRM de Seguimiento (alertas por fechas)
   - 4.5 Panel de Supervisión Gerencial (casos vencidos / sin seguimiento)
5. **Submódulos y flujos** (mockup dedicado por cada uno):
   - 5.1 Botones de contacto (WhatsApp / Correo / CMS) + reenvío de contrato
   - 5.2 Ciclo CRM día 10 → -7 → -5 (timeline visual)
   - 5.3 Candados y validaciones progresivas (contrato firmado, O/C, respuesta cliente)
   - 5.4 Vista Vendedor vs. Vista Administradora (comparativo lado a lado)
   - 5.5 Bitácora de actividades e indicadores KPI (tasa conversión, efectividad renovaciones)
   - 5.6 Exportación a Excel del control completo
6. **Roadmap de implementación** — fases por prioridad (Crítica → Alta → Media) con estimación relativa.
7. **Próximos pasos y firma de aprobación**.

## Generación de mockups

Cada mockup es una imagen PNG de alta fidelidad (1600×1000) creada con `imagegen` en calidad `premium` (para que la tipografía y las tablas sean legibles). Prompts describen:
- Paleta COMYMAQ (azul corporativo + acentos), logo en header, sidebar oscuro tipo dashboard.
- Componentes reales: tablas con badges de estado (Activo, Vencido, Baja), botones WhatsApp/Correo verdes/azules, columna "Días para vencer" con colores semáforo, diálogos modales, timelines CRM.
- Datos ficticios realistas (folios COT-2026-XXXX, clientes ejemplo, equipos Bobcat/JCB).

Aproximadamente 14 mockups (5 principales + 6 submódulos + 3 auxiliares como portada/diagrama).

## Detalles técnicos de generación

1. Extraer paleta y logo del proyecto (leer `src/index.css` para tokens, buscar logo en `src/assets/` o `/mnt/documents/`).
2. Generar los 14 mockups en paralelo con `imagegen--generate_image` (premium) → `/tmp/mockups/*.png`.
3. Construir el DOCX con `docx-js` siguiendo el skill DOCX:
   - US Letter, márgenes 1", Arial, estilos Heading1/2 con azul COMYMAQ.
   - Tablas con `WidthType.DXA`, `ShadingType.CLEAR`, dual widths.
   - Imágenes embebidas con `ImageRun` (type: "png", altText completo).
   - TOC automático usando HeadingLevel.
4. Validar el DOCX con `validate_document.py`.
5. Convertir a PDF con `run_libreoffice.py --headless --convert-to pdf`.
6. QA obligatorio: `pdftoppm -jpeg -r 120 propuesta.pdf qa` → revisar cada página con `code--view`, corregir overflows/imágenes cortadas, regenerar hasta pase limpio.
7. Copiar ambos archivos a `/mnt/documents/` y emitir dos `<presentation-artifact>` para descarga.

## Fuera de alcance
- No se modifica código de la aplicación COMYMAQ. Este entregable es únicamente el documento de propuesta.
- Los mockups son ilustrativos; la implementación real vendrá en fases posteriores según el roadmap incluido.
