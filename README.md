# Digital Game Tracker

Digital Game Tracker es una aplicacion de escritorio local para conservar los
juegos jugados por anio. La rama `migration` contiene la nueva aplicacion
Electron + React + TypeScript y ya no usa Python para ejecutarse. El codigo
anterior se conserva aislado en `legacy/`.

Como easter egg, pulsa `F2` para alternar entre `Digital Game Tracker` y
`Dakos Game Tracker`. La misma tecla lo devuelve al nombre principal.

## Ejecutar en desarrollo

Requiere Node.js 22 o superior.

```text
npm install
npm run dev
```

## Comprobar el proyecto

```text
npm run typecheck
npm test
npm run build
```

## Crear portable Windows x64

El resultado se crea como carpeta auto-contenida en `out/`:

```text
npm run package:portable
```

El ejecutable queda en:

```text
out/DigitalGameTracker-win32-x64/DigitalGameTracker.exe
```

En PowerShell puedes abrirlo con:

```text
./out/DigitalGameTracker-win32-x64/DigitalGameTracker.exe
```

`out/` esta excluida de Git porque contiene artefactos generados; por eso el
`.exe` no aparece como archivo del proyecto hasta ejecutar el empaquetado.

Para generar tambien un ZIP:

```text
npm run make:zip
```

El portable incluye Chromium y no necesita Python, Node.js ni un navegador
instalado en el equipo final. La carpeta de datos de la aplicacion se guarda en
la ruta de usuario de Electron; los TXT originales se conservan en su ubicacion
original.

## Importacion soportada

La importacion no modifica el fichero seleccionado. Antes de confirmar muestra:

- formato detectado;
- anio y fuente de esa asociacion;
- filas validas;
- filas rechazadas;
- advertencias;
- filas de metadatos o desconocidas conservadas;
- posibles duplicados.

La exportacion esta disponible desde el boton `Export`. El usuario elige entre
los tres formatos historicos. Las puntuaciones se convierten a rangos de
recomendacion y las recomendaciones a sus puntos medios numericos, siempre con
avisos. Un registro sin valoracion usa `5` o `Recomendado`; el formato legacy
omite los campos de rating porque no los admite.

Formatos reconocidos actualmente:

- Historico 2021 con `///` y fecha `DD/MM/YYYY`.
- Tablas separadas por `;` con puntuacion de 0 a 10, usadas por 2022-2024.
- Tablas separadas por `;` con recomendacion, usadas por 2025-2026.

Los casos representativos de prueba estan en `test/fixtures/`. La logica
vive en `src/domain/importer.ts` y no depende de Electron ni de React.

## Arquitectura

```text
src/renderer  React, filtros, editor y previsualizacion
src/preload   API tipada y limitada expuesta al renderer
src/main      Electron, dialogos, filesystem e IPC
src/domain    parser determinista y repositorio versionado
test          pruebas de parser y persistencia
```

La interfaz no accede directamente al sistema de ficheros. El renderer solo
recibe las funciones necesarias a traves de `contextBridge` e IPC.

La persistencia interna inicial es `library.v1.json` en la carpeta de datos de
usuario de Electron. Conserva juegos, auditorias de importacion y filas
preservadas. Es una primera version estable y reemplazable por SQLite sin
cambiar el contrato del parser.

En Windows la ruta actual es:

```text
%APPDATA%\DakosGameTracker\library.v1.json
```

## Estado de la migracion

Consulta `docs/migration-status.md` para el detalle de la migracion y
`docs/technology-evaluation.md` para la comparacion de tecnologias.
