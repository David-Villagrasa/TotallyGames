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

- Version actual: `1.0.1`.
- Regla de versionado: cada implementacion posterior debe incrementar en `1`
  el tercer numero de la version (`1.0.0` -> `1.0.1`); esta regla se aplica
  antes de empaquetar o entregar cualquier cambio funcional.
- Aplicacion activa en la rama `migration`: Electron + React + TypeScript.
- Renderer: `src/renderer`, con navegacion, busqueda, filtros, edicion y
  previsualizacion animada.
- Proceso principal: `src/main/index.ts`, responsable de dialogos, filesystem,
  persistencia e IPC.
- Preload: `src/preload/index.ts`, que expone solo una API tipada mediante
  `contextBridge`.
- Dominio: `src/domain`, independiente de Electron y de React.
- Responsive: el renderer debe funcionar sin desbordamiento horizontal desde
  320 px; las tablas se convierten en tarjetas en pantallas estrechas y los
  controles interactivos deben conservar un objetivo tactil de al menos 44 px.
- Formatos historicos soportados: 2021 con `///`, 2022-2024 con puntuacion y
  2025-2026 con recomendacion, y Neo desde XLSX/CSV.
- Persistencia activa: JSON versionado en la carpeta de datos de Electron.
- Persistencia actual: schema 5 con estados Neo y migraciones protegidas desde
  schemas 1, 2, 3 y 4, copia `.bak` y bloqueo ante JSON corrupto.
- Ajustes actuales: schema 4 con selector `Legacy`/`Neo`; los ajustes antiguos
  migran a `Legacy` sin perder idioma, columna de plataforma ni API key.
- Renderer: ordenacion estable, modos de valoracion, modal de borrado, ajustes,
  reset seguro, logs visibles, portadas con cache local e idiomas `es`, `en` y
  `ja`.
- Proveedores de portadas: TheGamesDB opcional mediante API key local, HLTB en
  una sesion Chromium aislada y seleccion manual de archivo.
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
7. Las portadas son metadatos internos opcionales y no se escriben en los TXT.
   Las imagenes remotas se descargan al cache solo despues de que el usuario
   elige una candidata.

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

## Contrato responsive y Android

- No usar anchos minimos fijos para tablas, formularios, modales o paneles que
  obliguen a desplazar horizontalmente la ventana.
- Los `select`, botones, interruptores y acciones equivalentes deben poder
  leerse y pulsarse con tacto; en movil deben ocupar el ancho disponible cuando
  la fila horizontal no tenga espacio.
- La biblioteca debe reordenar cada juego como una tarjeta con nombre, fecha,
  plataforma, valoracion, estados y notas. Los datos no deben depender de una
  cabecera de tabla visible.
- Los paneles de ajustes y los modales deben respetar la altura dinamica del
  viewport, el area segura del dispositivo y el teclado virtual.
- La navegacion movil debe ser persistente y accesible sin depender de `hover`;
  la implementacion actual usa una barra inferior en anchos pequenos.
- Antes de crear una implementacion Android, validar el renderer en 320, 375,
  414 y 768 px, con orientacion vertical, tacto y movimiento reducido. El
  dominio, la persistencia y los contratos IPC no deben duplicarse para
  resolver problemas visuales.

## Secuencia recomendada

1. Mantener los ejemplos de cada TXT y ampliar las pruebas cuando aparezcan
   formatos nuevos.
2. Comparar cada importacion real con su informe de formato, anio, filas e
   incidencias antes de confirmarla.
3. Migrar la persistencia JSON a SQLite solo si el volumen o las consultas lo
   justifican, sin cambiar el contrato del parser.
4. Mantener la busqueda online de portadas como servicio opcional con fallback
   manual y cache local.
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
