# Contexto de trabajo asistido por IA

## Producto

El producto debe permitir listar, anadir, editar y consultar videojuegos
jugados, agrupados por anio. Cada registro puede tener como minimo nombre,
fecha, puntuacion y notas.

El problema de mayor riesgo es la evolucion historica de los TXT. En distintos
anios pueden existir formatos diferentes, y la aplicacion debe identificar el
formato e importar el anio correcto sin destruir la fuente original.

## Estado tecnico observado

- Lenguaje actual: Python.
- Interfaz actual: PyQt5.
- Entrada principal: `start.py`, que crea la aplicacion Qt y abre
  `MainWindow`.
- Ventana principal: `main.py` y el formulario generado `main_window.py`.
- Edicion de datos: `table.py` y `table_window.py`.
- Formato que el codigo actual entiende: ficheros cuyo nombre coincide con
  `YYYYpg.txt`, leidos como CSV separado por punto y coma.
- Columnas que el codigo actual espera: `Game`, `Date`, `Score out of 10` y
  `Additional Comments`.
- Configuracion local: `config.json`, que guarda la carpeta seleccionada.
- Dependencias declaradas: PyQt5 y herramientas Qt en `requirements.txt`.
- No hay todavia una capa de dominio, un repositorio de persistencia, pruebas
  automatizadas ni un flujo de empaquetado versionado.
- Las pantallas de login y registro son actualmente una base visual; no deben
  interpretarse como autenticacion funcional.
- La documentacion funcional detallada del estado actual esta en
  `docs/functionality.md`.

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

La tecnologia actual no impide generar un EXE: Python puede empaquetarse con
PyInstaller o Nuitka. Aun asi, se debe comparar esa opcion con PySide6 y con
C#/.NET para Windows antes de una migracion grande. La comparacion debe cubrir
calidad visual, accesibilidad, mantenimiento, instalador, tamano, tiempo de
migracion y preservacion de datos. No se debe migrar solo porque la interfaz
actual sea poco atractiva.

## Secuencia recomendada

1. Recopilar un ejemplo anonimo de cada TXT historico, incluyendo su nombre,
   codificacion, cabeceras, separadores y filas especiales.
2. Especificar los formatos y crear casos de prueba de deteccion, parseo,
   errores, duplicados y asociacion de anio.
3. Introducir el modelo canonico y la importacion sin acoplarla a Qt.
4. Elegir la persistencia interna y ejecutar una migracion reversible.
5. Redisenar la experiencia de escritorio alrededor de importar, revisar,
   explorar y editar.
6. Preparar build reproducible, EXE y, si aporta valor, instalador.

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
