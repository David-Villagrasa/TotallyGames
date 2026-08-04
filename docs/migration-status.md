# Estado de la migracion

## Rama y aplicacion activa

La implementacion se encuentra en la rama `migration`. El punto de entrada de
la aplicacion nueva es el campo `main` de `package.json`, que apunta al bundle
Electron generado en `dist/main/index.js`.

La identidad visible es `Digital Game Tracker`; `F2` alterna de forma reversible
al nombre alternativo `Dakos Game Tracker`.

El codigo Python original permanece en `legacy/` como referencia durante esta
transicion. No se usa para desarrollar, arrancar, probar ni empaquetar la nueva
aplicacion. Se ha separado del raiz para que el proyecto activo contenga solo
Electron y sus herramientas.

## Funcionalidad migrada

- Ventana de escritorio Electron con renderer React.
- Navegacion entre Overview, Library e Import history.
- Busqueda de juegos por nombre, notas o anio.
- Filtro por anio y recomendacion.
- Alta, edicion y borrado de juegos en la persistencia interna.
- Estadisticas de juegos, media de puntuacion, recomendaciones y anios.
- Animaciones de entrada, hover, dialogos y elementos de progreso.
- Respeto de `prefers-reduced-motion`.
- Importacion de varios ficheros TXT o de una carpeta.
- Deteccion determinista de los formatos 2021, 2022-2024 y 2025-2026.
- Asociacion del anio al nombre del fichero y diagnostico de conflictos.
- Previsualizacion antes de confirmar.
- Exportacion a cualquiera de los tres formatos historicos con avisos cuando
  un formato necesita guardar un campo extra dentro de las notas.
- Conservacion de filas no interpretadas y rechazadas.
- Deteccion de duplicados contra la biblioteca y dentro de la importacion.
- Filas rechazadas, metadatos y filas desconocidas visibles y ordenables en la
  previsualizacion.
- Modos de valoracion separados, equivalencias estadisticas y validacion tambien
  en el proceso principal.
- Migracion segura de schema 1 a schema 2 con copia `.bak` y bloqueo ante JSON
  corrupto.
- Persistencia JSON versionada en la carpeta de datos de Electron, con reset
  interno que conserva TXT y logs.
- Logger local con rotacion, toasts de error, `ErrorBoundary` y reporte IPC.
- Ajustes con idioma `es`, `en` y `ja`, deteccion del idioma del sistema y
  selector sin reinicio.
- Ordenacion estable de la biblioteca y de las tablas de previsualizacion.
- Portable Windows x64 y ZIP mediante Electron Forge.
- El binario generado queda en
  `out/DigitalGameTracker-win32-x64/DigitalGameTracker.exe`; `out/` es un directorio
  generado y excluido de Git.

## Formatos verificados con los ejemplos recibidos

| Fichero | Formato | Anio | Filas validas | Rechazadas | Advertencias | Preservadas |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| `2021 juegos jugados.txt` | Historico `///` | 2021 | 32 | 0 | 0 | 12 |
| `2022 juegos jugados.txt` | Tabla con puntuacion | 2022 | 35 | 0 | 1 | 1 |
| `2023 juegos jugados.txt` | Tabla con puntuacion | 2023 | 28 | 1 | 0 | 1 |
| `2024 juegos jugados.txt` | Tabla con puntuacion | 2024 | 30 | 0 | 0 | 0 |
| `2025 juegos jugados.txt` | Tabla con recomendacion | 2025 | 24 | 0 | 0 | 0 |
| `2026 juegos jugados.txt` | Tabla con recomendacion | 2026 | 17 | 0 | 0 | 0 |

El fichero 2023 contiene una fecha imposible, `31/11/23`, que queda rechazada
con su linea original preservada. El fichero 2022 contiene una fila `TOP5` que
se conserva como metadato y no se importa como juego. Las entradas repetidas de
2023 no se eliminan durante el parseo; se muestran para que la politica de
duplicados se aplique antes de confirmar.

La tabla anterior se basa en los ejemplos proporcionados para la migracion. El
fichero 2026 no estaba disponible fisicamente en la carpeta de descargas al
ejecutar la comprobacion, por lo que su cifra procede del contenido recibido y
tambien esta cubierta por `test/fixtures/recommendation-2026.txt`.

## Decisiones de datos

- La fecha canonica se guarda como `YYYY-MM-DD`.
- En fechas de dos digitos, el anio del nombre del fichero completa la fecha.
- El nombre del fichero es la fuente principal del anio.
- Los nombres, notas, recomendaciones y columnas adicionales no se reescriben
  con IA ni se corrigen automaticamente.
- Las filas no interpretadas quedan en la auditoria de importacion.
- La confirmacion omite duplicados por defecto y ofrece una opcion explicita
  para conservarlos.
- El repositorio interno escribe schema 2 de forma versionada en
  `library.v1.json` para mantener la ruta existente.
- La ruta Windows de datos es `%APPDATA%\DakosGameTracker\library.v1.json`.
- La configuracion se guarda separada en `settings.v1.json` y los logs en
  `%APPDATA%\DakosGameTracker\logs\app.log`, con una copia rotada.
- Los TXT originales no se abren en modo escritura desde el flujo nuevo.

## Verificacion reproducible

Las comprobaciones actuales son:

```text
npm run typecheck
npm test
npm run build
npm run package:portable
npm run make:zip
```

El portable se ha iniciado en Windows y ha permanecido activo durante la
prueba de humo. El instalador todavia no se incluye porque el requisito actual
es un portable; Electron Forge queda preparado para anadir makers de Squirrel,
MSI o MSIX cuando la aplicacion establezca una politica de actualizaciones.
