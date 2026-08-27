---
name: organizar-entregas
description: Revisa el estado de las entregas de los talleres y prioriza según fecha. Use when the user asks about deadlines, entregas pendientes, or qué hacer primero.
---

Cuando se active esta skill:

1. Lee `INPUT/entregas_talleres.md`.
2. Ordena las entregas con estado distinto de "Entregado" por fecha, de más próxima a más lejana.
3. Señala cuál es la más urgente y por qué.
4. Guarda el resumen en `OUTPUT/resumen_entregas_[fecha].md`, siguiendo la convención de
   nombres y versionado de `CLAUDE.md`.
5. Si una entrega no tiene fecha registrada, dilo explícitamente — no asumas una.
