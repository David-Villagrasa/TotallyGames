# Backlog previo a la siguiente implementacion

Este documento recoge los cambios solicitados antes de escribir la siguiente
iteracion de codigo. Mientras existan puntos pendientes aqui, no se debe
implementar una solucion parcial ni elegir detalles de producto por suposicion.

## Regla de trabajo

- Revisar este documento antes de tocar renderer, dominio, persistencia o
  empaquetado.
- No borrar ni modificar los TXT originales durante ninguna de estas tareas.
- Cada punto debe terminar con una prueba reproducible.
- Los cambios destructivos deben tener confirmacion tematica y explicita.

## Estado

Los puntos 1 a 8 estan implementados en la rama `migration`. El punto 9,
Android, queda deliberadamente fuera de esta iteracion. Las casillas mantienen
el detalle verificable de cada requisito.

## Pendientes

### 1. Icono de la aplicacion

- [x] Sustituir el icono actual, incluido el del gato, por el fichero entregado
  en `C:\Users\david\Downloads\disco-flexible.png`.
- [x] Copiar el recurso dentro del proyecto, sin dejar ninguna dependencia de
  esa ruta absoluta del equipo del usuario.
- [x] Usar la misma identidad visual de disquetera en la ventana, barra de
  tareas, portable y posible instalador.
- [x] Generar el formato Windows que necesite Electron Forge a partir del
  recurso elegido y comprobar que aparece en una instalacion limpia.

### 2. Sidebar fijo y desplazamiento

- [x] El sidebar izquierdo debe ocupar la altura completa de la ventana.
- [x] El sidebar no debe desplazarse cuando el contenido central crezca.
- [x] Solo el area central y derecha debe tener scroll vertical.
- [x] El contenido inferior del sidebar, incluido `Local first` y el engranaje,
  debe seguir visible o quedar accesible sin ser cortado.
- [x] Mantener el comportamiento usable en escritorio y en los breakpoints
  pequenos, sin crear un segundo scroll accidental.
- [x] Verificar foco de teclado, rueda del raton y cambio de tamano de ventana.

### 3. Ordenacion de todos los grids

- [x] Todos los grids o tablas con cabecera deben permitir ordenar al pulsar el
  titulo de una columna.
- [x] El primer click debe ordenar ascendente y el siguiente descendente.
- [x] Mostrar una senal visual y accesible de columna y direccion activa.
- [x] Ordenar fechas como fechas, puntuaciones como numeros y nombres/notas como
  texto normalizado, sin perder el texto original.
- [x] Usar una ordenacion estable para que los empates conserven su orden de
  entrada.
- [x] Aplicar el comportamiento a biblioteca, previsualizacion de importacion,
  filas preservadas y cualquier nuevo grid que se anada.
- [x] Probar ordenacion con valores vacios, acentos, duplicados y fechas
  invalidas preservadas.

### 4. Modos de puntuacion y recomendacion

La aplicacion no debe mezclar dos modelos de valoracion distintos.

#### Modos canonicos

- [x] `legacy-2021`: nombre, fecha y notas; no mostrar campos de puntuacion ni
  recomendacion porque el formato no los tiene.
- [x] `semicolon-score`: permitir una nota numerica entera de `0` a `10`; no
  permitir un campo de recomendacion.
- [x] `semicolon-recommendation`: permitir exclusivamente una recomendacion;
  no permitir una nota numerica.
- [x] Guardar en cada registro el modo de valoracion detectado en su fichero de
  origen y conservarlo al editar, exportar o volver a abrir la aplicacion.
- [x] Para un juego creado manualmente, pedir primero el modo de valoracion o
  hacer que el usuario elija la lista/formato de destino.

#### Rangos de recomendacion

La equivalencia informativa solicitada es:

| Recomendacion | Rango equivalente | Valor numerico editable |
| --- | ---: | --- |
| `No recomendado` | 0 a 2 | No |
| `Poco recomendado` | 3 a 4 | No |
| `Recomendado` | 5 a 7 | No |
| `Muy Recomendado` | 8 a 10 | No |

Para el contador `Average score`, cuando un juego use el formato no numerico,
se debe utilizar el punto medio definido por el usuario:

| Recomendacion | Valor usado en `Average score` |
| --- | ---: |
| `No recomendado` | 1 |
| `Poco recomendado` | 3 |
| `Recomendado` | 6 |
| `Muy Recomendado` | 9 |

- [x] Aplicar estos valores solo al calculo estadistico del promedio.
- [x] No guardar la equivalencia como una puntuacion numerica ni cambiar el
  modo original del registro.
- [x] Documentar en la interfaz que el promedio combina puntuaciones numericas
  reales con valores representativos de recomendaciones.
- [x] Probar el promedio con bibliotecas solo numericas, solo no numericas y
  combinadas.

- [x] Usar estos rangos solo como equivalencia para filtros, estadisticas o
  explicacion visual, nunca para convertir automaticamente una recomendacion en
  una nota concreta.
- [x] Al editar una entrada de recomendacion, ocultar o deshabilitar totalmente
  el input numerico.
- [x] Al editar una entrada numerica, ocultar o deshabilitar totalmente el
  selector de recomendacion.
- [x] Validar tambien en el proceso principal, no solo en React, para impedir
  estados incompatibles por IPC o por datos antiguos.
- [x] Mostrar un aviso claro si una importacion mezcla filas con modelos
  incompatibles.
- [x] Anadir pruebas de importacion, edicion, persistencia y exportacion para
  ambos modelos.

### 5. Confirmacion tematica al eliminar

- [x] Sustituir el dialogo nativo de Windows por un modal propio de la
  aplicacion.
- [x] Mantener el tema visual oscuro, tipografia y acentos de DGT.
- [x] Usar un tratamiento rojo/coral para la accion destructiva sin convertirlo
  en una alerta nativa fea.
- [x] Mostrar nombre del juego, consecuencia y botones `Cancelar` y `Eliminar`.
- [x] Dar el foco inicial a `Cancelar` y permitir Escape para cancelar.
- [x] No eliminar el TXT original; solo el registro interno confirmado.
- [x] Probar teclado, lector de pantalla y cierre accidental del modal.

### 6. Registro de errores y avisos visibles

#### Log en disco

- [x] Crear un logger compartido entre proceso principal, preload y renderer.
- [x] Escribir los errores en texto plano legible como `.txt`.
- [x] Ruta propuesta en Windows: `%APPDATA%\\DakosGameTracker\\logs\\app.log`.
- [x] Definir un tamano maximo y rotacion antes de implementar. Propuesta
  inicial: 5 MB para `app.log` y un unico `app.log.1` de respaldo.
- [x] No escribir en el log notas completas, credenciales ni datos innecesarios
  del usuario.
- [x] Incluir fecha, nivel, proceso, operacion, mensaje y stack cuando exista.
- [x] Capturar errores de filesystem, importacion, persistencia, IPC, renderer,
  `uncaughtException` y `unhandledRejection`.
- [x] Evitar que un fallo del logger provoque otro fallo de la aplicacion.

#### Toast de error

- [x] Todo error visible para el usuario debe aparecer como toast abajo a la
  derecha.
- [x] Usar el mismo lenguaje visual de la aplicacion, con variante roja/coral.
- [x] Incluir mensaje comprensible, boton para copiar el detalle y boton para
  cerrar.
- [x] El boton de copiar debe copiar el texto util del error, sin credenciales.
- [x] Mantener los avisos no bloqueantes; usar modal solo cuando sea necesario
  para confirmar una accion o proteger datos.
- [x] Anadir un `ErrorBoundary` para fallos del renderer y un fallback visible.
- [x] Probar que los errores del proceso principal tambien generan un aviso en
  renderer cuando sea seguro continuar.

### 7. Menu de ajustes

- [x] Anadir un boton de engranaje a la derecha de `Local first`.
- [x] Abrir un menu o panel de ajustes integrado en el tema de la aplicacion.
- [x] No usar un menu nativo de Windows para los ajustes.

#### Reset de datos

- [x] Incluir una accion `Resetear toda la informacion`.
- [x] Explicar claramente que borra la biblioteca interna, auditorias de
  importacion, preferencias y configuracion local.
- [x] Mantener siempre intactos los TXT originales y cualquier fichero externo
  elegido por el usuario.
- [x] Decidir si el reset borra tambien los logs o los conserva para diagnostico.
  Decision: conservar `app.log` y `app.log.1`, incluyendo la linea del reset.
- [x] Exigir una segunda confirmacion tematica antes de ejecutar el reset.
- [x] Escribir en el log el resultado del reset.
- [x] Tras resetear, mostrar una biblioteca vacia sin requerir reiniciar la app.

### 8. Selector de idioma

- [x] Anadir al menu de ajustes un selector con exactamente estas opciones:
  - English.
  - Espanol (Espana / castellano).
  - 日本語 (Japanese).
- [x] Traducir toda la interfaz: navegacion, botones, cabeceras de grids,
  formularios, modales, errores, toasts, ajustes, tooltips, estados vacios y
  etiquetas de accesibilidad.
- [x] No traducir automaticamente nombres de juegos, notas ni el contenido de
  los TXT del usuario.
- [x] Cambiar el idioma sin reiniciar, o documentar claramente cualquier parte
  que requiera reinicio.
- [x] Persistir la preferencia de idioma en la configuracion interna.
- [x] Usar formato de fecha y numeros adecuado a cada locale sin cambiar el
  valor canonico guardado.
- [x] Comprobar que el japones no rompe grids, botones, modales ni el sidebar.
- [x] Elegir el idioma inicial. Propuesta: detectar el idioma del sistema y usar
  Espanol como fallback del producto.
- [x] Elegir una fuente con cobertura japonesa suficiente y probarla en Windows
  10 y 11.

### 9. Futura aplicacion Android

- [ ] Mantener el parser, el modelo canonico y las reglas de importacion
  independientes de Electron para poder reutilizarlos en Android.
- [ ] Separar el acceso a filesystem, dialogos y persistencia detras de una
  interfaz de plataforma.
- [ ] Evaluar Capacitor como contenedor Android para reutilizar el renderer
  React, sin convertir Electron en una dependencia movil.
- [ ] Sustituir las rutas Windows por selector de documentos y almacenamiento
  local de Android.
- [ ] Permitir importar y exportar TXT mediante el selector y el sistema de
  compartir de Android.
- [ ] Revisar todos los grids, modales, sidebar y toasts para interaccion tactil
  y pantallas pequenas.
- [ ] Mantener el funcionamiento offline y definir una futura sincronizacion
  online opcional sin hacerla requisito.
- [ ] Preparar proyecto Android, identificador de paquete, firma y artefactos
  APK/AAB solo cuando la version de escritorio este estable.
- [ ] Probar almacenamiento, permisos, rotacion de pantalla y restauracion de
  estado en un dispositivo Android real.

## Orden de implementacion previsto

1. Copiar y validar el nuevo icono. **Completado.**
2. Corregir layout fijo del sidebar. **Completado.**
3. Fijar el modelo de valoracion y migrar validaciones/persistencia. **Completado.**
4. Implementar ordenacion de grids. **Completado.**
5. Implementar logger, ErrorBoundary y toasts de error. **Completado.**
6. Crear modal tematico de eliminacion. **Completado.**
7. Crear ajustes, reset seguro y persistencia de preferencias. **Completado.**
8. Anadir internacionalizacion y pruebas de los tres idiomas. **Completado.**
9. Android queda fuera de esta iteracion por decision de alcance.
10. Regenerar portable, probar en Windows limpio y revisar accesibilidad.

## Decisiones confirmadas

- `app.log` usa un maximo de 5 MB y una unica copia `app.log.1`.
- El reset conserva los logs y los TXT originales.
- El idioma inicial detecta el sistema y usa Espanol como fallback.
- Una entrada manual pide el modo de valoracion antes de guardar.
- Los lotes mixtos se permiten con aviso y cada fila conserva su modo.
- Las conversiones de exportacion usan los rangos y puntos medios definidos;
  sin rating se usa `5` o `Recomendado`.
