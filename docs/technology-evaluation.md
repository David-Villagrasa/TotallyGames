# Evaluacion de tecnologias para la rama migration

## Decision

La recomendacion para la nueva aplicacion es **Electron + React + TypeScript**,
con Electron Forge para generar los artefactos de Windows.

Esta decision parte de los requisitos confirmados:

- Windows 10 y 11 x64 como objetivo principal.
- Aplicacion local con funcionamiento offline y servicios online opcionales.
- Interfaz visual cuidada con animaciones abundantes.
- Eliminacion de Python en la aplicacion final.
- Distribucion prioritaria como carpeta o ZIP portable, sin instalacion.
- Posibilidad de anadir un instalador mas adelante.
- Conservacion de los TXT originales y migracion segura de los datos.

La decision no significa que Electron produzca un unico fichero `.exe`. El
portable previsto es un ZIP o carpeta auto-contenida que incluye el ejecutable y
sus recursos. Si en el futuro se exige un unico fichero, se debe reabrir esta
decision.

## Resumen ejecutivo

Electron es la mejor opcion para este producto porque combina:

1. La mayor libertad visual para React, CSS, Web Animations y futuras librerias
   de animacion.
2. Un runtime de Chromium incluido, que evita depender de un navegador instalado
   en el equipo del usuario.
3. Un modelo sencillo para una aplicacion offline: la interfaz se ejecuta en el
   renderer y el acceso a TXT, SQLite y servicios online pasa por el proceso
   principal de Electron.
4. Un camino claro desde una carpeta portable hasta instaladores Squirrel, MSI,
   MSIX u otros makers de Electron Forge.
5. Una migracion mas directa que Tauri, porque todo el nuevo codigo de interfaz
   y logica local puede escribirse en TypeScript sin introducir Rust.

El coste es mayor consumo de memoria y artefactos mas grandes que Tauri o WPF.
Para esta aplicacion personal, ese coste es menos importante que la calidad
visual, la previsibilidad del portable offline y la velocidad de desarrollo.

## Comparacion

| Criterio | Electron + React/TS | Tauri + React/TS | C#/.NET WPF |
| --- | --- | --- | --- |
| Animaciones y libertad visual | Muy alta | Muy alta | Alta, con mas trabajo especifico de XAML |
| Portable offline | Muy alta: Chromium va incluido | Alta, con dependencia de WebView2 | Muy alta con publicacion self-contained |
| Instalador futuro | Muy alta: Forge, Squirrel, WiX/MSIX | Alta: bundles Windows y WebView2 configurable | Muy alta: self-contained, MSIX, WiX u otras opciones |
| Tamano del artefacto | Bajo rendimiento en este criterio | Mejor que Electron | Generalmente mejor que Electron |
| Consumo de memoria | Peor de las tres | Mejor que Electron | Mejor de las tres |
| Integracion nativa con Windows | Alta mediante Node/IPC | Alta mediante Rust/plugins | Muy alta |
| Coste de migracion desde Python | Medio | Alto por introducir Rust | Alto por cambiar a C# y XAML |
| Reutilizacion de conocimientos web | Muy alta | Muy alta | Baja |
| Portabilidad futura a macOS/Linux | Alta | Alta | Baja |
| Riesgo principal | Peso y seguridad del renderer | WebView2 y complejidad Rust | Tiempo de diseno visual y dependencia Windows |

## Electron + React + TypeScript

### Ventajas

- React permite construir una interfaz con componentes y estados claros.
- CSS, SVG, Canvas y Web Animations ofrecen un ecosistema amplio para
  transiciones, entrada/salida de paneles, microinteracciones y motion design.
- TypeScript permite mantener tipados el modelo canonico de juegos, los
  diagnosticos de importacion y el canal entre interfaz y sistema de ficheros.
- Electron incluye Chromium y Node.js en la aplicacion distribuida. El usuario
  no necesita instalar Python, Node.js ni un navegador concreto.
- La aplicacion puede funcionar sin red si el renderer solo usa recursos
  locales. La sincronizacion o informacion online puede ser una capacidad
  opcional.
- Electron Forge tiene un ciclo de empaquetado claro y makers para distintos
  formatos de Windows.

### Costes y riesgos

- La carpeta portable sera considerablemente mayor que una aplicacion nativa.
- El consumo de memoria sera mayor que en WPF y probablemente mayor que en
  Tauri.
- No se debe habilitar `nodeIntegration` en el renderer. El acceso a ficheros y
  base de datos debe pasar por un `preload` con `contextIsolation` e IPC
  tipado.
- Electron requiere mantener actualizados Chromium, Electron y las
  dependencias npm para reducir riesgos de seguridad.
- El empaquetado portable es una carpeta o ZIP, no una promesa de un unico EXE.

### Distribucion

Para la primera version distribuible propongo:

1. `win32-x64` como target de compilacion.
2. Artefacto portable ZIP con el ejecutable y todos sus recursos.
3. Sin instalacion de Node.js ni Python en el equipo final.
4. Versionado de Node, Electron, npm y todas las dependencias mediante un lockfile.
5. Build reproducible en Windows y, cuando el producto este estable, en CI.

Para una version con instalador se puede anadir un maker sin cambiar la
arquitectura de la aplicacion:

- Squirrel para un instalador sencillo orientado a escritorio y actualizaciones.
- WiX/MSI si se necesita un paquete MSI convencional.
- MSIX si se prioriza el modelo moderno de paquetes de Windows.

El firmado de codigo no es necesario para desarrollar, pero si es recomendable
para distribuir el portable o el instalador sin avisos de SmartScreen tan
agresivos.

## Tauri + React + TypeScript

### Ventajas

- Mantiene las ventajas visuales de React y del ecosistema web.
- El binario y el consumo suelen ser menores que en Electron porque usa el
  WebView del sistema en lugar de empaquetar Chromium completo.
- La interfaz puede seguir siendo offline y la parte nativa puede controlar el
  acceso a ficheros, SQLite y permisos.
- Tauri documenta bundles Windows y permite configurar el modo de instalacion
  de WebView2, incluido un `offlineInstaller`.

### Costes y riesgos

- El backend nativo de Tauri se escribe en Rust. La migracion ya no seria solo
  Python a TypeScript: tambien introduciriamos Rust, Cargo, toolchains y un
  puente de comandos.
- En Windows Tauri usa WebView2. Windows 11 suele incluirlo, pero en Windows 10
  no se debe asumir que el runtime esta disponible en todas las maquinas.
- Un instalador offline de WebView2 aumenta el tamano del instalador y complica
  el artefacto portable.
- Un ZIP portable puede funcionar en una maquina con WebView2 y fallar o tener
  que instalar el runtime en otra. Esto reduce la previsibilidad del portable.
- Los permisos y capacidades de Tauri deben configurarse con cuidado para que
  el frontend solo pueda acceder a lo que necesita.

### Cuando elegiria Tauri

Elegiria Tauri si el tamano del artefacto, el consumo de memoria y el arranque
fueran mas importantes que la simplicidad del portable offline, y si aceptamos
mantener Rust como parte permanente del proyecto.

Es la segunda opcion recomendada, no la primera para las restricciones actuales.

## C#/.NET WPF

### Ventajas

- Es la opcion con mejor integracion con Windows y con controles nativos.
- WPF permite interfaces complejas, data binding, recursos visuales y
  animaciones XAML mediante storyboards y transformaciones.
- Una publicacion self-contained puede incluir el runtime de .NET, evitando que
  el usuario tenga que instalarlo.
- Es una base fuerte para un ejecutable Windows offline y para un instalador
  tradicional.
- El acceso local a ficheros y SQLite no necesita un puente entre renderer y
  proceso principal.

### Costes y riesgos

- La libertad y velocidad de iteracion visual no es tan inmediata como en React
  para el tipo de animaciones solicitado.
- Habria que migrar Python a C# y los formularios Qt a XAML, sin reutilizacion
  directa del codigo actual.
- WPF es Windows-only. Eso es aceptable para el objetivo actual, pero limita
  futuras plataformas.
- Un single-file self-contained puede ser valido, pero las dependencias nativas
  y la estrategia de actualizacion deben probarse en instalaciones limpias.
- Para una apariencia moderna habria que elegir y mantener una libreria de
  controles y temas, o crear buena parte del sistema visual.

### Cuando elegiria WPF

Elegiria WPF si el criterio dominante fuera una aplicacion Windows nativa con
instalador tradicional, consumo reducido, integracion profunda con el sistema y
una posible exigencia de unico ejecutable. No es la mejor eleccion si el
principal diferenciador debe ser una experiencia web animada y experimental.

## Evaluacion del instalador

### Objetivo portable

Como se ha confirmado que una carpeta o ZIP es aceptable, Electron evita el
principal problema de Tauri: el portable contiene su motor de renderizado y no
depende de WebView2 instalado previamente.

La distribucion portable propuesta sera:

```text
DigitalGameTracker-portable-win-x64.zip
  DigitalGameTracker.exe
  resources/
  locales/
  assets/
```

No se debe guardar la base de datos de usuario dentro de una carpeta de
instalacion de solo lectura. La aplicacion debe elegir una ruta de datos de
usuario de Windows y continuar conservando los TXT originales en sus carpetas.

### Instalador futuro

El instalador no debe formar parte de la primera migracion. Primero se debe
conseguir un portable estable y probarlo en una maquina limpia. Despues:

1. Se anade un maker de Electron Forge.
2. Se decide Squirrel, MSI o MSIX segun la audiencia.
3. Se configura identidad, icono, version y firmado de codigo.
4. Se prueban instalacion, actualizacion, desinstalacion y conservacion de la
   base local.

Separar el portable del instalador reduce el riesgo de mezclar errores de
empaquetado con errores de importacion de datos.

## Arquitectura propuesta para la migracion

La migracion no debe ser una traduccion directa de cada ventana Python.

```text
React + TypeScript renderer
        |
        | preload + IPC tipado
        v
Electron main process
        |
        +-- importadores deterministas TXT
        +-- repositorio local versionado
        +-- acceso seguro a rutas de usuario
        +-- servicios online opcionales
```

Reglas de la nueva arquitectura:

- El renderer no accede directamente al sistema de ficheros.
- Los importadores no dependen de React ni de Electron.
- Cada formato TXT tiene detector, parser, diagnosticos y pruebas propias.
- El anio y el formato se explican con evidencia, no con una inferencia de IA.
- Los TXT originales nunca se sobrescriben durante una importacion.
- La importacion produce una previsualizacion antes de confirmar.
- La persistencia interna es versionada y puede reconstruirse sin destruir los
  originales.
- Los servicios online se mantienen fuera del flujo offline principal.

## Plan de migracion por etapas

1. Crear el esqueleto Electron + React + TypeScript sin borrar Python.
2. Crear el modelo canonico y los casos de prueba de importacion en TypeScript.
3. Anadir los ejemplos anonimizados de cada formato historico.
4. Implementar deteccion, previsualizacion, diagnosticos y deteccion de
   duplicados.
5. Implementar persistencia local y una importacion reversible.
6. Construir la interfaz principal con animaciones sobre datos reales.
7. Generar y probar el ZIP portable en Windows 10 y 11 x64 limpios.
8. Comparar resultados con la aplicacion Python antes de retirar Python.
9. Anadir instalador y firmado solo despues de estabilizar el portable.

No se debe eliminar Python antes de tener pruebas que demuestren que los TXT
existentes se leen y se conservan correctamente.

## Riesgos aceptados

- El artefacto portable sera mayor que el de Tauri o WPF.
- El usuario necesitara descargar un ZIP de mayor tamano.
- Habra que mantener dependencias del ecosistema Node/Electron.
- El acceso a datos requerira una frontera IPC bien disenada.

Estos riesgos son preferibles a depender de WebView2 para el portable y a pagar
el coste adicional de Rust o de XAML cuando la prioridad principal es una
interfaz animada y expresiva.

## Referencias consultadas con Context7

### Tauri

Context7 library ID: `/websites/v2_tauri_app`

- Instalador Windows y configuracion de WebView2 offline:
  <https://v2.tauri.app/distribute/windows-installer>
- Versiones y dependencia de WebView2:
  <https://v2.tauri.app/reference/webview-versions>
- Configuracion offline para distribucion:
  <https://v2.tauri.app/distribute/microsoft-store>

### Electron Forge

Context7 library ID: `/websites/electronforge_io`

- Ciclo de empaquetado y artefactos por plataforma:
  <https://www.electronforge.io/core-concepts/build-lifecycle>
- Maker Squirrel para Windows:
  <https://www.electronforge.io/config/makers/squirrel.windows.md>
- Maker MSIX:
  <https://www.electronforge.io/config/makers/msix.md>
- Maker WiX/MSI:
  <https://www.electronforge.io/config/makers/wix-msi.md>

### WPF

Context7 library ID: `/dotnet/wpf`

- Documentacion de referencia del proyecto WPF:
  <https://github.com/dotnet/wpf/blob/main/Documentation/getting-started.md>
- Plantilla SDK-style para una aplicacion WPF:
  <https://github.com/dotnet/wpf/blob/main/packaging/Microsoft.Dotnet.Wpf.ProjectTemplates/content/WpfApplication-CSharp/net6.0/Company.WpfApplication1.csproj>
- Publicacion self-contained y runtime especifico:
  <https://learn.microsoft.com/en-us/dotnet/core/deploying/>
