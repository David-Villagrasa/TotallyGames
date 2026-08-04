# Documentacion funcional de la version Python (legacy)

> La aplicacion activa de la rama `migration` esta documentada en
> `docs/migration-status.md` y se ejecuta con Electron + React + TypeScript.
> Este documento conserva el comportamiento de `legacy/` para comparar la
> migracion y no describe el punto de entrada actual.

Este documento describe el comportamiento del codigo presente en el
repositorio. Distingue las funciones operativas de los controles que solo
tienen una interfaz preparada. No describe funcionalidades futuras como si ya
existieran.

## Alcance y estado

La aplicacion es un programa de escritorio local para consultar y editar listas
de videojuegos guardadas en ficheros TXT. La ventana principal permite trabajar
por anio y cada anio se abre en una tabla editable.

El estado funcional actual es el siguiente:

| Area | Estado actual |
| --- | --- |
| Arranque de la aplicacion | Operativo |
| Carga de configuracion local | Operativo con manejo de errores limitado |
| Seleccion de carpeta | Implementada en codigo, pero no aparece en el menu actual |
| Busqueda de ficheros por anio | Operativa para un unico patron de nombre |
| Consulta de una lista anual | Operativa |
| Alta de un anio nuevo | Operativa cuando ya existe una carpeta seleccionada |
| Alta, edicion y borrado de filas | Operativos con validacion limitada |
| Guardado en TXT | Operativo, pero sobrescribe el fichero original |
| Deteccion de varios formatos TXT | No implementada |
| Previsualizacion y confirmacion de importacion | No implementada |
| Deteccion de duplicados | No implementada |
| Login y registro | Solo interfaz visual |
| Base de datos online | No implementada |
| EXE o instalador reproducible | No configurado |

## Arranque

El punto de entrada es `start.py`.

1. Si `config.json` no existe, se crea con `selected_folder` vacio.
2. Se crea una instancia de `QApplication`.
3. Se crea y muestra `MainWindow`.
4. Se inicia el bucle de eventos de Qt mediante `app.exec_()`.

La ventana principal se define en `main.py` y usa el formulario generado
`main_window.py`. Al inicializarse:

- carga la carpeta guardada en la configuracion;
- busca los ficheros que coinciden con el patron soportado;
- oculta la accion `Logout`;
- conecta los botones y acciones disponibles;
- muestra un aviso si no hay ninguna carpeta seleccionada.

La aplicacion no tiene una pantalla inicial de configuracion ni una base de
datos interna.

## Ventana principal

La ventana principal tiene:

- el titulo `DGT`;
- un contador de ficheros encontrados;
- un selector de anios;
- el boton `Open`;
- el menu `Options`;
- el menu `Online Db`.

### Seleccion de carpeta

`MainWindow.set_folder()` usa `QFileDialog.getExistingDirectory()` para pedir
una carpeta. Si el usuario elige una ruta:

1. se guarda en `selected_folder`;
2. se vuelve a escanear la carpeta;
3. se escribe en `config.json`.

El codigo conecta `actionSet_Folder` con este metodo, pero el formulario actual
no anade esa accion al menu `Options`. Por tanto, la funcionalidad existe en
codigo, pero no tiene una ruta visible desde la interfaz actual.

### Recarga de ficheros

`MainWindow.reload_files()` vuelve a escanear la carpeta seleccionada. Esta
accion esta asociada al atajo `F5`, pero `actionLoad_Files` tampoco aparece en
el menu actual.

### Deteccion de ficheros

El escaneo se realiza solo en el nivel superior de la carpeta seleccionada. Se
aceptan ficheros que cumplan exactamente estas condiciones:

- extension `.txt` en minusculas;
- nombre con cuatro digitos, seguido de `pg.txt`;
- ejemplo valido: `2024pg.txt`;
- ejemplos no soportados: `2024PG.txt`, `2024.txt`, `juegos_2024.txt` o
  ficheros dentro de subcarpetas.

El anio se obtiene de los cuatro primeros caracteres del nombre del fichero.
No se inspecciona el contenido para detectar el anio ni el formato.

El contador muestra el numero de ficheros validos encontrados. El selector de
anios se limpia y se rellena con los anios ordenados de menor a mayor.

### Apertura de un anio

Al pulsar `Open`, la aplicacion toma el texto seleccionado en `cbYears`, busca
su ruta en `self.files` y abre un `TableWindow` con esa ruta.

El dialogo de tabla se ejecuta de forma modal mediante `QDialog.exec_()`: la
ventana principal queda bloqueada hasta que el dialogo se cierra. Esta es la
semantica documentada por PyQt5 para `QDialog.exec_()`.

### Creacion de un anio

`Options > New Year` solicita cuatro digitos mediante `QInputDialog.getText()`.
Si el valor es valido y no existe otro fichero para ese anio:

1. se crea un fichero vacio con nombre `YYYYpg.txt`;
2. se actualiza la lista de ficheros;
3. se muestra un mensaje de confirmacion.

Se rechazan los valores que no tengan exactamente cuatro digitos o cuyo anio ya
este presente. Si no hay carpeta seleccionada, se muestra un aviso y no se crea
ningun fichero.

### Salida

La accion `Exit` llama a `save_config()` y cierra la ventana. El guardado de
configuracion solo conserva la ruta de la carpeta; no guarda cambios pendientes
de la tabla.

## Dialogo de lista anual

El dialogo se define en `table.py` y `table_window.py`. Su tabla tiene cuatro
columnas fijas:

1. `Game`
2. `Date`
3. `Score out of 10`
4. `Additional Comments`

La tabla usa estas acciones:

| Accion | Comportamiento |
| --- | --- |
| `Add New` | Anade una fila vacia al final |
| `Save` / `Ctrl+S` | Sobrescribe el fichero con el contenido visible |
| `Delete Row` | Pide confirmacion y elimina las filas seleccionadas |
| `Refresh` / `F5` | Vuelve a leer el fichero y descarta cambios no guardados |

La seleccion de filas controla si `Delete Row` esta habilitado. La tabla ajusta
el ancho de sus columnas para ocupar el espacio disponible y ajusta la altura
de las filas a su contenido.

### Lectura del fichero

Al abrir o refrescar:

- se abre el fichero con codificacion UTF-8;
- se usa `csv.reader` con separador `;`;
- cada linea leida se convierte directamente en una fila;
- no se salta ninguna cabecera automaticamente;
- las filas con menos de cuatro valores quedan con celdas vacias;
- el formato se interpreta por posicion de columna, no por el nombre de la
  cabecera.

Como consecuencia, si el fichero contiene una cabecera, la cabecera se muestra
como la primera fila de datos.

### Alta y edicion de filas

`Add New` crea cuatro celdas vacias. Las celdas existentes se pueden editar
directamente en la tabla. La senal `itemChanged` de `QTableWidget` llama a
`validate_item()` cada vez que cambia el contenido de una celda.

Las reglas actuales son:

- ninguna columna puede contener el caracter `;`;
- `Date` puede estar vacio o debe cumplir `DD/MM/YY` y ser una fecha valida;
- `Score out of 10` puede estar vacio o debe ser un entero entre `0` y `10`;
- `Game` y `Additional Comments` no tienen otra validacion de contenido;
- no se admiten puntuaciones decimales ni fechas con anio de cuatro digitos.

Cuando una celda no valida su contenido, se muestra un aviso y se restaura el
valor almacenado por la tabla. En el estado actual, el valor inicial cargado se
reinicia durante la construccion del dialogo, por lo que una edicion invalida de
una celda existente puede volver a dejarla vacia en lugar de devolver el valor
original.

### Borrado de filas

El borrado solo se inicia despues de una confirmacion con `Yes`. La aplicacion
permite seleccionar varias filas, aunque la implementacion elimina los indices
en orden ascendente y los indices pueden desplazarse al quitar mas de una fila.
Este caso debe cubrirse con pruebas antes de considerarlo fiable.

### Guardado

`Save` reescribe el fichero completo usando:

- codificacion UTF-8;
- separador `;`;
- cuatro columnas;
- ninguna fila completamente vacia.

No hay dialogo de confirmacion antes de sobrescribir. Las columnas adicionales,
los datos que no caben en las cuatro columnas y el formato original de las
lineas no se conservan al guardar. Los ficheros TXT originales son, por tanto,
la persistencia activa y pueden modificarse directamente desde la aplicacion.

## Configuracion local

`config.json` contiene actualmente una propiedad principal:

```json
{
    "selected_folder": ""
}
```

La carpeta se carga al iniciar y se guarda al elegirla o al salir. El fichero
esta excluido del control de versiones mediante `.gitignore`.

No se almacenan en configuracion:

- juegos normalizados;
- puntuaciones separadas;
- notas;
- historial de importaciones;
- duplicados detectados;
- preferencias de interfaz;
- credenciales.

## Login y registro

Las ventanas `Login` y `Register` son formularios visuales.

### Login

Incluye campos de usuario y contrasena, un boton `Login` y un boton `Back`. La
contrasena se muestra con `QLineEdit.Password`. Solo `Back` esta conectado: al
pulsarlo se cierra la ventana de login y se vuelve a mostrar la ventana
principal.

El boton `Login` no valida credenciales, no consulta ningun servicio y no crea
ninguna sesion.

### Registro

Incluye campos de usuario, email, contrasena y confirmacion de contrasena, un
boton `Register` y un boton `Back`. Los dos campos de contrasena usan
`QLineEdit.Password`.

Solo `Back` tiene comportamiento. `Register` no guarda usuarios, no valida el
email y no llama a ningun backend.

## Base de datos online

El menu `Online Db` contiene `Login`, `Sign Up`, `Logout` y `Save to DB`.

- `Login` abre el formulario visual de login.
- `Sign Up` abre el formulario visual de registro.
- `Logout` se oculta al iniciar.
- `Save to DB` no tiene una conexion funcional.
- no existe cliente HTTP, modelo de usuario, servicio remoto ni repositorio
  online.

El texto `Welcome:` tambien es solo una etiqueta visual; no se actualiza con un
usuario autenticado.

## Mapa de archivos

| Archivo | Responsabilidad actual |
| --- | --- |
| `start.py` | Crea la configuracion inicial y arranca Qt |
| `main.py` | Controla la ventana principal, carpetas, anios y navegacion |
| `table.py` | Lee, valida, edita, borra y guarda filas |
| `design/main.ui` | Definicion visual de la ventana principal |
| `design/table.ui` | Definicion visual de la tabla |
| `design/login.ui` | Definicion visual del login |
| `design/register.ui` | Definicion visual del registro |
| `main_window.py` | Formulario principal generado por `pyuic5` |
| `table_window.py` | Formulario de tabla generado por `pyuic5` |
| `login_window.py` | Formulario de login generado por `pyuic5` |
| `register_window.py` | Formulario de registro generado por `pyuic5` |
| `resources.qrc` | Declara el icono incluido en Qt |
| `resources_rc.py` | Recursos Qt generados |
| `requirements.txt` | Dependencias Python y herramientas Qt |
| `config.json` | Ruta local de la carpeta seleccionada |

Los ficheros `*_window.py` son generados. Los cambios visuales deben hacerse en
los `.ui` y regenerar los modulos para evitar perder cambios manuales.

## Ejecucion actual

Con las dependencias instaladas, el punto de entrada es:

```text
python start.py
```

Las dependencias declaradas incluyen PyQt5 5.15.9 y herramientas Qt. No hay un
script de build, una especificacion de PyInstaller/Nuitka ni un instalador
versionado en el repositorio.

## Limitaciones relevantes para la siguiente evolucion

La funcionalidad actual no cumple todavia el objetivo de importar historicos de
forma segura. En concreto:

1. Solo reconoce un patron de nombre y un separador.
2. No existe deteccion determinista de formatos alternativos.
3. El anio solo se obtiene del nombre del fichero.
4. No se genera un informe de importacion con filas validas, rechazadas y
   advertencias.
5. No hay previsualizacion ni confirmacion antes de guardar.
6. Guardar sobrescribe el TXT y puede perder columnas o informacion original.
7. No hay idempotencia ni deteccion de duplicados.
8. No hay capa de dominio ni persistencia interna versionada.
9. Hay manejo de errores insuficiente para rutas inexistentes, permisos,
   codificaciones invalidas y JSON corrupto.
10. No hay pruebas automatizadas de parser, persistencia o interfaz.

Estas limitaciones deben tratarse antes de ampliar el soporte de formatos o
redisenar la interfaz. La direccion prevista esta desarrollada en
`docs/ai/project-context.md`.

## Referencias PyQt5 consultadas con Context7

La documentacion de la funcionalidad de la aplicacion se basa en el codigo del
repositorio. Context7 se uso para contrastar la semantica de las APIs PyQt5 que
soportan las interacciones descritas:

- `QDialog.exec_()` y el comportamiento modal:
  <https://www.riverbankcomputing.com/static/Docs/PyQt5/api/qtwidgets/qdialog.html>
- senales `itemChanged` e `itemSelectionChanged` de `QTableWidget`:
  <https://www.riverbankcomputing.com/static/Docs/PyQt5/api/qtwidgets/qtablewidget.html>
- comportamiento y senales de `QComboBox`:
  <https://www.riverbankcomputing.com/static/Docs/PyQt5/api/qtwidgets/qcombobox.html>
- indice oficial de referencia PyQt5:
  <https://www.riverbankcomputing.com/static/Docs/PyQt5/index.html>
