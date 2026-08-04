# Instrucciones para agentes

## Objetivo del proyecto

Digital Game Tracker es una aplicacion de escritorio para conservar y consultar
los videojuegos jugados por el usuario, organizados por anio, con puntuacion y
notas. `Dakos Game Tracker` se conserva como nombre alternativo del easter egg
activable con `F2`.

La prioridad principal no es cambiar de tecnologia por moda: es proteger los
datos existentes y conseguir una importacion fiable de los ficheros TXT que ya
usa el usuario. Consulta `docs/ai/project-context.md` antes de tomar decisiones
de arquitectura o de persistencia.

## Reglas de trabajo

- Inspecciona primero la estructura, dependencias, flujos y cambios locales.
- No reviertas ni sobrescribas cambios del usuario que no hayas creado.
- Manten separadas la interfaz, el dominio de juegos, la importacion y la
  persistencia. Reutiliza las abstracciones existentes antes de crear otras.
- Trata los ficheros originales como fuente de datos del usuario. No los
  reescribas ni los borres durante una importacion sin confirmacion explicita.
- La deteccion de formatos debe ser determinista y explicar el formato
  detectado, el anio asociado, las filas importadas y las incidencias.
- No uses un modelo de IA para adivinar, corregir o reescribir datos del usuario
  en el flujo de importacion. Los casos ambiguos deben quedar visibles para que
  el usuario los revise.
- Conserva informacion desconocida, comentarios y filas no interpretadas hasta
  que exista una decision de producto sobre ellas.
- Usa Context7 para consultar documentacion actualizada de librerias, frameworks
  y herramientas de empaquetado antes de depender de una API concreta.
- Antes de anadir dependencias o migrar de lenguaje, documenta el motivo, el
  coste de migracion y el impacto en la distribucion como EXE o instalador.
- Cada cambio funcional debe incluir una comprobacion reproducible. Prioriza
  pruebas de parser y persistencia antes que pruebas visuales manuales.

## Criterios para la aplicacion futura

- La importacion debe poder repetirse sin duplicar juegos de forma silenciosa.
- Un fallo parcial no debe perder las filas que si se puedan leer.
- El usuario debe poder revisar un resumen antes de confirmar cambios.
- La persistencia interna debe tener un formato estable e independiente del TXT
  historico. Los TXT originales deben conservarse.
- La aplicacion debe poder distribuirse en Windows como EXE o instalador sin
  requerir un entorno de desarrollo.

## Informacion pendiente

Los formatos historicos conocidos tienen ejemplos representativos en
`test/fixtures/`. No implementes detectores nuevos basandote solo en
suposiciones: solicita o crea primero casos de prueba anonimizados a partir de
ficheros reales.
