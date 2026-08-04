# Contexto de trabajo asistido por IA

## Producto

La aplicacion activa se presenta como `Digital Game Tracker`. `Dakos Game
Tracker` es un nombre alternativo reversible mediante `F2` y no debe usarse
como nombre principal del producto.

El producto debe permitir listar, anadir, editar y consultar videojuegos
jugados, agrupados por anio. Cada registro puede tener como minimo nombre,
fecha, puntuacion y notas.

El problema de mayor riesgo es la evolucion historica de los TXT. En distintos
anios pueden existir formatos diferentes, y la aplicacion debe identificar el
formato e importar el anio correcto sin destruir la fuente original.

## Estado tecnico observado

- Aplicacion activa en la rama `migration`: Electron + React + TypeScript.
- Renderer: `src/renderer`, con navegacion, busqueda, filtros, edicion y
  previsualizacion animada.
- Proceso principal: `src/main/index.ts`, responsable de dialogos, filesystem,
  persistencia e IPC.
- Preload: `src/preload/index.ts`, que expone solo una API tipada mediante
  `contextBridge`.
- Dominio: `src/domain`, independiente de Electron y de React.
- Formatos historicos soportados: 2021 con `///`, 2022-2024 con puntuacion y
  2025-2026 con recomendacion.
- Persistencia activa: JSON versionado en la carpeta de datos de Electron.
- Persistencia actual: schema 2 con migracion protegida desde schema 1, copia
  `.bak` y bloqueo ante JSON corrupto.
- Renderer: ordenacion estable, modos de valoracion, modal de borrado, ajustes,
  reset seguro, logs visibles e idiomas `es`, `en` y `ja`.
- Pruebas: parser, exporter, rating, almacenamiento, migracion, logger, ajustes
  e internacionalizacion bajo `test/`.
- Empaquetado: Electron Forge para carpeta portable y ZIP Windows x64.
- El codigo Python/PyQt5 original permanece en `legacy/` como referencia de
  transicion y no es usado por la aplicacion nueva.
- La documentacion funcional del comportamiento historico esta en
  `docs/functionality.md`; el estado de la migracion esta en
  `docs/migration-status.md`.

## Contrato de datos que no se debe romper

1. Cada importacion debe producir un informe con formato detectado, anio,
   numero de filas validas, filas rechazadas y advertencias.
2. La asociacion del anio debe ser trazable al nombre del fichero, a una
   cabecera o a una regla documentada. Si hay conflicto, se debe pedir revision.
3. Los valores desconocidos, columnas adicionales, notas y filas no validas no
   se deben descartar silenciosamente.
4. La importacion debe ser idempotente o detectar duplicados antes de confirmar.
5. Los TXT originales se conservan intactos. La aplicacion puede generar una
   copia interna normalizada despues de la confirmacion del usuario.
6. La escritura de la aplicacion no debe depender de que los TXT historicos
   compartan el mismo formato.

## Direccion tecnica provisional

La primera decision debe ser el modelo canonico de un juego y un registro de
importacion, no el framework visual. Una arquitectura razonable es:

- detectores independientes por formato;
- un parser que convierta cada formato a un modelo canonico;
- validacion y diagnosticos separados de la interfaz;
- persistencia local versionada, previsiblemente SQLite, manteniendo los TXT;
- una interfaz que muestre previsualizacion, conflictos y resultado.

La evaluacion tecnologica se completo antes de la migracion. La recomendacion
es Electron + React + TypeScript por la libertad visual, el runtime Chromium
incluido y la previsibilidad del portable offline. Tauri y C#/.NET WPF quedan
documentados como alternativas y condiciones de cambio en
`docs/technology-evaluation.md`.

El objetivo actual es un portable en ZIP o carpeta para Windows 10/11 x64, con
funcionamiento offline y servicios online opcionales.

## Secuencia recomendada

1. Mantener los ejemplos de cada TXT y ampliar las pruebas cuando aparezcan
   formatos nuevos.
2. Comparar cada importacion real con su informe de formato, anio, filas e
   incidencias antes de confirmarla.
3. Migrar la persistencia JSON a SQLite solo si el volumen o las consultas lo
   justifican, sin cambiar el contrato del parser.
4. Preparar servicios online opcionales sin hacerlos requisito del flujo local.
5. Probar el portable en instalaciones limpias de Windows 10 y 11 x64.
6. Anadir un instalador y firmado de codigo despues de estabilizar el portable.

## Preguntas que desbloquean la implementacion

- Que formatos concretos tiene cada anio y que ejemplos pueden compartirse
  anonimizados?
- El anio siempre esta en el nombre del fichero o tambien aparece dentro del
  contenido?
- Como debe resolverse un juego repetido: omitir, actualizar, conservar ambas
  entradas o pedir confirmacion?
- Debe funcionar totalmente offline o se quiere recuperar informacion online?
- Se necesita solo un EXE portable o tambien un instalador con accesos directos,
  desinstalacion y actualizaciones?
