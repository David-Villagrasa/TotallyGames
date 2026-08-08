export const SUPPORTED_LOCALES = ["es", "en", "ja"] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "es";

export interface LocaleDefinition {
  readonly code: Locale;
  readonly name: string;
}

export const LOCALE_DEFINITIONS = {
  es: { code: "es", name: "Español" },
  en: { code: "en", name: "English" },
  ja: { code: "ja", name: "日本語" },
} as const satisfies Readonly<Record<Locale, LocaleDefinition>>;

const spanishCatalog = {
  brand: {
    mark: "DGT",
    digital: "Digital",
    dakos: "Dakos",
    product: "Digital Game Tracker",
    dakosProduct: "Dakos Game Tracker",
    subtitle: "Registro de juegos",
    localFirst: "Local primero",
    originalsStayYours: "Los TXT originales siguen siendo tuyos.",
    migrationVersion: "MIGRACIÓN / 1.0.1",
  },
    navigation: {
      main: "Navegación principal",
      overview: "Resumen",
      library: "Biblioteca",
      importHistory: "Historial de importaciones",
      guide: "Guía",
  },
  buttons: {
    export: "Exportar",
    import: "Importar",
    addGame: "Añadir juego",
    startImport: "Iniciar una importación",
    viewLibrary: "Ver biblioteca",
    seeAll: "Ver todo",
    chooseTxtFiles: "Elegir archivos TXT",
    chooseNeoFiles: "Elegir archivos Neo",
    chooseImportFiles: "Elegir archivos compatibles",
    scanFolder: "Escanear carpeta",
    cancelPreview: "Cancelar vista previa",
    selectAllReviewRows: "Seleccionar todas",
    clearReviewRows: "Quitar selección",
    reset: "Restablecer",
    edit: "Editar",
    delete: "Eliminar",
    cancel: "Cancelar",
    confirmImport: "Confirmar importación",
    saveEntry: "Guardar entrada",
    chooseLocation: "Elegir ubicación",
  },
  headings: {
    overviewEyebrow: "TU REGISTRO DE JUEGOS",
    overviewLead: "Conserva las buenas",
    overviewAccent: "historias",
    overviewTail: "cerca.",
    latest: "ÚLTIMO",
    chapter: "CAPÍTULO",
    gamesLogged: "Juegos registrados",
    acrossYears: "En todos tus años",
    averageScore: "Puntuación media",
    outOfTen: "Sobre 10; recomendaciones usan su punto medio",
    lovedLiked: "Favoritos / queridos",
    sevenPlusOrRecommended: "Según rangos de recomendación",
    importSessions: "Sesiones de importación",
    originalsUntouched: "Originales intactos",
    arcEyebrow: "EL RECORRIDO",
    yearsInPlay: "Tus años en juego",
    recentlyPlayedEyebrow: "JUGADOS RECIENTEMENTE",
    lastEntries: "Últimas entradas",
    importCalloutStamp: "01 / CONSERVAR",
    importCalloutTitle: "Tus listas antiguas tienen un lugar aquí.",
    libraryEyebrow: "LA BIBLIOTECA",
    libraryLead: "Cada juego",
    libraryAccent: "cuenta.",
    importStudioEyebrow: "ESTUDIO DE IMPORTACIÓN",
    importLead: "Trae el",
    importAccent: "archivo.",
    safeStepTitle: "Un paso seguro cada vez.",
    reviewEyebrow: "REVISA ANTES DE GUARDAR",
    reviewLead: "Lee la",
    reviewAccent: "evidencia.",
    firstRows: "PRIMERAS FILAS",
    whatWillEnterLibrary: "Lo que puede entrar en la biblioteca",
    reviewRowsEyebrow: "DECISIÓN MANUAL",
    reviewRowsTitle: "Elige qué filas importar",
  },
  copy: {
    overviewIntro:
      "Un lugar tranquilo para los juegos que se quedaron contigo. Local, consultable y listo para el siguiente capítulo.",
    everyYearFootnote: "Cada año es una página, no un reinicio.",
    importCallout:
      "Trae cada TXT histórico a una vista previa revisable. Nada se sobrescribe. Las filas desconocidas siguen visibles.",
    safeStep:
      "Elige archivos o una carpeta. DGT identificará el formato, asociará el año y mostrará cada fila antes de guardar nada.",
  },
  guide: {
    nav: "Guía",
    eyebrow: "MANUAL DE CAMPO",
    titleLead: "Qué no te frene",
    titleAccent: "una duda.",
    intro:
      "Digital Game Tracker trabaja primero en local: tus TXT originales no se reescriben, la biblioteca interna vive en un JSON y las conexiones en línea son opcionales.",
    searchLabel: "Buscar en la guía",
    searchPlaceholder: "Prueba: portada, aviso, caché...",
    searchNoResults: "No hay un capítulo que coincida con esa búsqueda.",
    copyPath: "Copiar ruta",
    pathCopied: "Copiado",
    indexTitle: "Mapa rápido",
    indexStart: "Primeros pasos",
    indexCovers: "Portadas",
    indexImport: "Importar TXT",
    indexLibrary: "Biblioteca",
    indexStorage: "Dónde se guarda",
    indexTrouble: "Si algo falla",
    quickEyebrow: "PARA EMPEZAR",
    quickTitle: "Tres movimientos y ya estás dentro.",
    quickCopy:
      "No hace falta conocer todos los formatos. Empieza por la tarea que quieres resolver y la app te enseña lo demás en el camino.",
    quickAddTitle: "Añadir",
    quickAddCopy:
      "Crea un registro manual con nombre, fecha, valoración, notas, plataforma y portada opcional.",
    quickImportTitle: "Traer históricos",
    quickImportCopy:
      "Previsualiza uno o varios TXT antes de confirmar. Nada se escribe sobre los originales.",
    quickCoverTitle: "Elegir portada",
    quickCoverCopy:
      "Busca una candidata, revisa su fuente y elige solo cuando la imagen sea la correcta.",
    startEyebrow: "01 / PRIMEROS PASOS",
    startTitle: "Elige tu punto de entrada.",
    startCopy:
      "Resumen es tu tablero; Biblioteca es tu archivo consultable; Historial de importaciones es el lugar seguro para traer listas antiguas.",
    startSteps:
      `Mira Resumen para orientarte y usa Biblioteca cuando quieras buscar, filtrar o editar.
 Para históricos, entra en Historial de importaciones y elige archivos TXT o una carpeta.
 Para un juego suelto, pulsa Añadir juego; no necesitas tener un TXT.`,
    startTipTitle: "La regla tranquila",
    startTipCopy:
      "Cerrar la app no borra nada. Los TXT de origen siguen intactos y los datos internos se escriben por separado.",
    coversEyebrow: "02 / PORTADAS",
    coversTitle: "La portada se elige, no se adivina.",
    coversCopy:
      "TheGamesDB es el proveedor principal cuando tiene una clave API configurada. HLTB queda como respaldo y siempre puedes elegir un archivo local.",
    coversSteps:
      `Escribe el nombre y pulsa Buscar portada. Si esa consulta ya existe, se reutiliza la caché y no se repite la petición.
Revisa el título y la fuente de cada candidata. TheGamesDB suele ofrecer más plataformas; HLTB es el respaldo.
Pulsa + en la portada elegida. Solo entonces se descarga y guarda la imagen en la caché local de portadas.`,
    coversTroubleTitle: "Si las candidatas no muestran imagen",
    coversTroubleCopy:
      "La app intenta cargar las previsualizaciones desde el proceso principal. Si aun así una fuente falla, sigue este orden:",
    coversTroubleSteps:
      `Comprueba que usas la versión actual y que la app puede conectarse a internet.
Revisa la clave API de TheGamesDB en Ajustes; después puedes usar Borrar caché para renovar una búsqueda antigua.
 Si una candidata concreta falla, usa Elegir archivo de imagen y continúa sin depender de servicios en línea.
La caché de búsquedas no es la caché de portadas elegidas: Borrar caché no elimina imágenes que ya están en tu biblioteca.`,
    importEyebrow: "03 / IMPORTAR TXT",
    importTitle: "Lee el informe antes de confirmar.",
    importCopy:
      "La importación está pensada como una mesa de revisión. El formato, el año, las filas válidas y las incidencias deben tener sentido antes del último botón.",
    importSteps:
      `Selecciona archivos TXT o una carpeta. La fuente original no se modifica.
Comprueba el formato y el año detectados. El año se explica desde el nombre, el contenido o queda marcado para revisión si hay conflicto.
Abre las filas y revisa rechazadas, desconocidas y conservadas; la app no las borra silenciosamente.
 Activa Buscar y asignar portadas automáticamente si quieres precalentar la caché y usar la primera candidata en cada juego.
 Las filas con fecha, puntuación o formato dudoso aparecen marcadas y no se importan por defecto; selecciona solo las que quieras conservar en la biblioteca con aviso.
 Confirma solo cuando el resumen representa lo que quieres guardar. Las repeticiones se omiten por defecto.`,
    importWarningTitle: "Qué significa un aviso",
    importWarningCopy:
      "Un aviso no significa necesariamente que la importación haya fallado. Significa que hay algo que debes leer antes de decidir.",
    importWarningSteps:
      `Una fila conservada permanece visible con su texto original para que puedas revisarla.
 Una recomendación o plataforma desconocida no se corrige automáticamente: se conserva sin adivinar.
 Una entrada que llega a la biblioteca con aviso muestra una señal coral; al editarla con valores válidos y guardar, el aviso desaparece.
 Si quieres importar repetidos, activa Permitir entradas repetidas y confirma conscientemente.`,
    importErrorTitle: "Qué hacer con un error",
    importErrorCopy:
      "Un error de lectura o formato detiene ese archivo, pero no convierte el TXT en una versión vacía ni toca los demás archivos.",
    importErrorSteps:
      `Prueba primero con un solo archivo para aislar el problema.
Comprueba que el nombre contiene el año cuando el contenido no lo indica y que el archivo está en UTF-8.
Si sigue fallando, conserva el TXT, revisa el log y comparte el mensaje exacto; no lo reescribas para ocultar el problema.`,
    libraryEyebrow: "04 / BIBLIOTECA",
    libraryTitle: "Tu archivo, a tu ritmo.",
    libraryCopy:
      "La biblioteca interna es la copia de trabajo normalizada. Puedes consultarla sin volver a abrir los TXT originales.",
    librarySteps:
      `Busca desde la barra superior; Ctrl+K lleva el foco al buscador de juegos.
Usa los filtros de año y recomendación. La columna de plataforma se activa desde Ajustes.
Pulsa una fila para editarla. Eliminar quita solo la entrada interna y no toca el TXT de origen.
 Pulsa los encabezados para ordenar; un tercer clic quita la ordenación y recupera el orden original.`,
    storageEyebrow: "05 / DÓNDE SE GUARDA",
    storageTitle: "Local primero también significa saber dónde mirar.",
    storageCopy:
      "En Windows, pega %APPDATA% en la barra del Explorador. Estas son las rutas internas de Digital Game Tracker:",
    storagePaths:
      `Juegos y biblioteca|%APPDATA%\\DakosGameTracker\\library.v1.json
 Ajustes y clave API|%APPDATA%\\DakosGameTracker\\settings.v1.json
Portadas elegidas|%APPDATA%\\DakosGameTracker\\covers\\
Caché de búsquedas|%APPDATA%\\DakosGameTracker\\cover-search-cache.v1.json
Registros de diagnóstico|%APPDATA%\\DakosGameTracker\\logs\\app.log
Copia de seguridad|%APPDATA%\\DakosGameTracker\\library.v1.json.bak`,
     storageHintTitle: "Qué no debes borrar a ciegas",
    storageHintCopy:
       "No borres library.v1.json, covers ni la copia .bak mientras estés intentando recuperar datos. Para limpiar solo resultados en línea usa Borrar caché desde Ajustes.",
    troubleEyebrow: "06 / SI ALGO FALLA",
     troubleTitle: "Primero conserva, después diagnostica.",
    troubleCopy:
      "La app deja rastros suficientes para investigar sin tocar tus fuentes. Sigue el síntoma, no borres archivos para probar suerte.",
    troubleCoverTitle: "No aparecen portadas",
    troubleCoverCopy:
      "Revisa internet y la clave API, limpia la caché de búsquedas y prueba una imagen manual. Si la portada elegida sí aparece, el problema era del proveedor o de la previsualización.",
     troubleImportTitle: "La importación tiene avisos",
    troubleImportCopy:
      "Lee las filas conservadas y el motivo exacto. Confirma solo lo que entiendas; los datos ambiguos quedan visibles para una decisión posterior.",
     troubleDataTitle: "La biblioteca parece vacía o no abre",
    troubleDataCopy:
      "No borres el JSON. Guarda una copia, abre el log de diagnóstico y comprueba si existe library.v1.json.bak antes de pedir ayuda.",
    finalEyebrow: "UNA ÚLTIMA IDEA",
    finalTitle: "Conserva la fuente. Revisa la evidencia. Decide tú.",
    finalCopy:
      "Ese es el orden de trabajo de DGT: primero protege tus TXT, después entiende el informe y solo al final confirma los cambios.",
  },
  grid: {
    libraryGameYear: "JUEGO / AÑO",
    date: "FECHA",
    platform: "PLATAFORMA",
    verdict: "VEREDICTO",
    notes: "NOTAS",
    game: "JUEGO",
    scoreVerdict: "PUNTUACIÓN / VEREDICTO",
    status: "ESTADO",
  },
  forms: {
    searchPlaceholder: "Busca tus juegos...",
    searchShortcut: "CTRL K",
    filterBy: "FILTRAR POR",
    allYears: "Todos los años",
    allVerdicts: "Todos los veredictos",
    gameName: "Nombre del juego",
    date: "Fecha",
    score: "Puntuación",
    verdict: "Veredicto",
    platform: "Plataforma",
    noPlatform: "Sin plataforma",
    notes: "Notas",
    noVerdict: "Sin veredicto",
    exampleGame: "p. ej. Outer Wilds",
    scorePlaceholder: "--",
    notesPlaceholder: "¿Qué se quedó contigo?",
    allowRepeatedEntries: "Permitir entradas repetidas",
    autoCoverImport: "Buscar y asignar portadas automáticamente",
    autoCoverImportDescription:
      "Busca cada nombre nuevo una vez, guarda la primera candidata y deja la consulta en caché. Los fallos no bloquean la importación.",
     validation: {
       nameRequired: "Ponle un nombre al juego.",
       scoreRange: "La puntuación debe estar entre 0 y 10.",
     },
   },
  filters: {
    field: "FILTRAR CAMPO",
    allFields: "Todos los campos",
    name: "Nombre",
    year: "Año",
    date: "Fecha",
    platform: "Plataforma",
    rating: "Veredicto",
    completed: "Completado",
    platinum: "Platinado",
    favorite: "Favorito",
    notes: "Notas",
    value: "Valor del filtro",
    anyValue: "Cualquier valor",
    chooseField: "Elige un campo para filtrar",
    active: "Activado",
    inactive: "Desactivado",
    sortBy: "ORDENAR POR",
    noSorting: "Sin ordenar",
    direction: "Dirección",
    ascending: "Ascendente",
    descending: "Descendente",
  },
  modal: {
    editor: {
      editEyebrow: "EDITAR ENTRADA",
      newEyebrow: "NUEVA ENTRADA",
      editTitle: "Ajusta la entrada.",
      newTitle: "Añade un capítulo nuevo.",
      copy: "Conserva los detalles útiles. Siempre puedes cambiarlos después.",
    },
    export: {
      eyebrow: "ESTUDIO DE EXPORTACIÓN",
      title: "Elige el formato.",
      copy:
        "Exporta {count} entradas. Los campos que no existen en el formato elegido se conservan en los comentarios en lugar de descartarse.",
    },
  },
  empty: {
    chart: "Aún no hay juegos registrados. Tu primer año aparecerá aquí.",
    recentTitle: "Tu primera entrada está esperando.",
    recentCopy: "Importa un TXT antiguo o añade un juego manualmente.",
    libraryTitle: "Ningún juego coincide con esta vista.",
    libraryCopy:
      "Prueba a borrar los filtros o importa otro archivo histórico.",
    noTxtFilesTitle: "No se encontraron archivos TXT",
    noTxtFilesCopy: "Esa carpeta no contenía archivos .txt de nivel superior.",
    noNeoFilesTitle: "No se encontraron archivos Neo",
    noNeoFilesCopy: "Esa carpeta no contenía archivos .xlsx o .csv de nivel superior.",
    noImportFilesTitle: "No se encontraron archivos compatibles",
    noImportFilesCopy:
      "La carpeta no contiene archivos TXT, XLSX o CSV compatibles para importar.",
  },
  labels: {
    noDate: "Sin fecha",
    noScore: "Sin nota",
    noYear: "Sin año",
    libraryCount: "{shown} mostrando de {total} entradas totales",
     files: "Archivos",
     rowsReady: "Filas listas",
     rowsToImport: "Filas a importar",
      reviewRows: "Filas a revisar",
      selectedReviewRows: "{selected} de {total} filas de revisión seleccionadas",
    warnings: "Avisos",
    preserved: "Conservadas",
    previewRows: "{count} filas",
    morePreviewRows: "+ {count} filas más en esta vista previa",
    validRows: "{count} filas válidas",
    rejectedRows: "{count} rechazadas",
    preservedRows: "{count} conservadas",
    year: "año",
    line: "Línea {line}",
    file: "Archivo",
  },
    status: {
      openingLibrary: "Abriendo tu biblioteca...",
      saving: "Guardando...",
      exporting: "Exportando...",
      searchingCovers: "Buscando y guardando portadas...",
      completed: "Completado",
      platinum: "Platinado",
      favorite: "Favorito",
      statusToggle: "Cambiar estado: {status}",
  },
  import: {
    principles: {
      detect: "Detectar",
      detectCopy: "El formato y el año se explican desde el nombre y el contenido.",
      review: "Revisar",
      reviewCopy:
        "Las filas rechazadas y desconocidas siguen visibles antes de confirmar.",
      preserve: "Conservar",
      preserveCopy:
        "Los archivos TXT originales nunca se reescriben durante una importación.",
    },
    duplicateSingular: "{count} fila repetida encontrada en este lote.",
    duplicatePlural: "{count} filas repetidas encontradas en este lote.",
    repeatedDefault:
      "Las filas repetidas siguen visibles y se omiten de forma predeterminada.",
    reviewRowsCopy:
      "Estas filas tienen avisos o datos incompletos. Selecciona solo las que quieras conservar; después podrás corregirlas en la biblioteca.",
    fileYear: "{year} año / {source}",
    yearSources: {
      filename: "nombre del archivo",
      content: "contenido",
      review: "revisión",
    },
    status: {
      reviewNeeded: "Requiere revisión",
      hasNotes: "Tiene avisos",
      ready: "Listo",
    },
  },
  importIssues: {
    "invalid-date": 'Fecha no válida "{value}" en la línea {line}.',
    "missing-date": "Falta la fecha del juego en la línea {line}.",
    "missing-year":
      'La fecha "{value}" de la línea {line} no se puede interpretar sin el año del archivo.',
    "year-conflict":
      "La línea {line} indica el año {value}, pero el nombre del archivo indica {year}.",
    "unparsed-legacy-row":
      'No se pudo interpretar la fila histórica de la línea {line}: "{value}".',
    "missing-name":
      'Falta el nombre del juego en la línea {line}. Fila original: "{value}".',
    "missing-required-field":
      'Falta un campo obligatorio en la línea {line} (nombre del juego o fecha). Fila original: "{value}".',
    "invalid-score": 'Puntuación no válida "{value}" en la línea {line}.',
    "unknown-recommendation":
      'Recomendación desconocida "{value}" en la línea {line}; se conserva sin corregir.',
    "unknown-platform":
      'Plataforma desconocida "{value}" en la línea {line}; se conserva sin corregir.',
    "mixed-rating-fields":
      'La línea {line} contiene una puntuación y una recomendación; ambas se conservan para revisión. Fila original: "{value}".',
    "ambiguous-year":
      "No se puede asociar un único año al contenido del archivo.",
    "unknown-format":
      'No se reconoce el formato del archivo en la línea {line}: "{value}".',
    "read-error": "No se pudo leer el archivo: {message}",
    "encoding-replacement":
      "El archivo contiene caracteres que no se pudieron decodificar como UTF-8.",
    "mixed-rating-batch":
      "El lote mezcla modelos de valoración; cada fila conserva el modo de su archivo de origen.",
    "summary-row":
      'La fila de resumen de la línea {line} se conserva y no se importa como juego: "{value}".',
    "unknown-status":
      'Estado desconocido "{value}" en la línea {line}; se conserva para revisión.',
  },
  formats: {
    legacy2021: "Histórico 2021",
    semicolonScore: "Tabla con puntuación",
    semicolonRecommendation: "Tabla con recomendación",
    unknown: "Formato no reconocido",
    legacy2021Description:
      "Nombre /// DD/MM/YYYY, con campos extra en las notas.",
    semicolonScoreDescription:
      "Juego;fechas;nota sobre 10;comentarios adicionales.",
    semicolonRecommendationDescription:
      "Juego;fechas;Recomendado/No Recomendado + extra;comentarios.",
    semicolonRecommendationPlatform: "Tabla con recomendación y plataforma",
    semicolonRecommendationPlatformDescription:
      "Juego;fechas;recomendación;comentarios;plataforma.",
    neoXlsx: "Tabla Neo de Excel",
    neoXlsxDescription:
      "Juego;Nota;Fecha;Completado;Comentarios, con colores para estados.",
    neoCsv: "Tabla Neo CSV",
    neoCsvDescription:
      "Juego,Nota,Fecha,Completado,Comentarios,Platinado,Favorito.",
  },
  covers: {
    title: "Portada",
    search: "Buscar portada",
    searching: "Buscando candidatas de portada...",
    choose: "Elegir esta portada",
    manual: "Elegir archivo de imagen",
    remove: "Quitar portada",
    noCover: "Sin portada",
    noResults: "No se encontraron portadas para este nombre.",
    unavailable:
      "No se pudo consultar HowLongToBeat. Puedes elegir una imagen local.",
    sourceHltb: "Fuente: HowLongToBeat",
    sourceTheGamesDb: "Fuente: TheGamesDB",
    automatic: "Las opciones aparecen al escribir el nombre del juego.",
  },
  recommendations: {
    veryRecommended: "Muy Recomendado",
    recommended: "Recomendado",
    lowRecommended: "Poco Recomendado",
    notRecommended: "No Recomendado",
  },
  errors: {
    loadLibrary: "No se pudo abrir la biblioteca.",
    prepareFiles: "No se pudieron preparar los ficheros.",
    confirmImport: "No se pudo confirmar la importación.",
    saveGame: "No se pudo guardar el juego.",
    deleteGame: "No se pudo eliminar el juego.",
    exportLibrary: "No se pudo exportar la biblioteca.",
    coverSearch: "No se pudieron buscar portadas.",
    unexpected: "Ocurrió un error inesperado.",
  },
  toasts: {
    updated: "Juego actualizado.",
    added: "Juego añadido a tu biblioteca.",
    deleted: "Juego eliminado de la biblioteca. El TXT original no se ha tocado.",
    imported: "{count} juegos importados.",
    importedWithDuplicates:
      "{count} juegos importados; {duplicates} duplicados omitidos.",
    importedWithCovers:
      "{count} juegos importados; {searched} búsquedas preparadas; {covers} portadas asignadas; {missing} sin portada y {errors} con error.",
    importedWithDuplicatesAndCovers:
      "{count} juegos importados; {duplicates} duplicados omitidos; {searched} búsquedas preparadas; {covers} portadas asignadas; {missing} sin portada y {errors} con error.",
    exported: "{count} juegos exportados.",
    exportedWithWarnings:
      "{count} juegos exportados con {warnings} avisos.",
    reviewSkipped: "{count} filas con avisos se han omitido por defecto.",
  },
  settings: {
    title: "Ajustes",
    language: "Idioma",
    languageDescription: "Elige el idioma de la interfaz.",
    system: "Idioma del sistema",
    spanish: "Español",
    english: "Inglés",
    japanese: "Japonés",
    fallback: "Se usará el español si no se detecta un idioma compatible.",
    platformColumn: "Mostrar columna de plataforma",
    platformColumnDescription:
      "Muestra la plataforma guardada en la biblioteca y las vistas previas.",
    tableMode: "Tipo de tabla",
    tableModeDescription:
      "Legacy conserva los históricos TXT; Neo activa tablas y estados de Excel.",
    legacyMode: "Legacy",
    neoMode: "Neo",
    theGamesDbApiKey: "Clave API de TheGamesDB",
    theGamesDbApiKeyDescription:
      "Opcional. Se usa para buscar portadas multiplataforma; si falta, se prueba HLTB.",
    theGamesDbApiKeyPlaceholder: "Pega aquí tu clave API gratuita",
    coverCache: "Caché de búsquedas de portadas",
    coverCacheDescription:
      "Las candidatas se guardan localmente para no repetir peticiones. Las portadas elegidas no se borran desde aquí.",
    clearCoverCache: "Borrar caché",
    coverCacheCleared: "Caché de búsquedas borrada.",
  },
  tooltips: {
    search: "Buscar tus juegos (Ctrl+K)",
    export: "Exportar biblioteca",
    import: "Importar archivos TXT",
    addGame: "Añadir un juego",
    resetFilters: "Restablecer filtros",
    close: "Cerrar",
    editGame: "Editar {name}",
    deleteGame: "Eliminar {name}",
  },
  accessibility: {
    floppyDisk: "Disquete",
    mainNavigation: "Navegación principal",
    close: "Cerrar",
    dismissError: "Cerrar error",
    editGame: "Editar {name}",
    deleteGame: "Eliminar {name}",
    search: "Buscar juegos",
    platform: "Plataforma: {platform}",
    cover: "Portada de {name}",
    selectReviewRow: "Seleccionar fila de revisión: {name}",
    statusToggle: "Cambiar {status} de {name}",
  },
  dialogs: {
    deleteGame: '¿Eliminar "{name}" de la biblioteca?',
  },
} as const;

type Widen<T> = T extends string
  ? string
  : T extends object
    ? { readonly [K in keyof T]: Widen<T[K]> }
    : T;

export type LocaleCatalog = Widen<typeof spanishCatalog>;

export const CATALOG = {
  es: spanishCatalog,
  en: {
    brand: {
      mark: "DGT",
      digital: "Digital",
      dakos: "Dakos",
      product: "Digital Game Tracker",
      dakosProduct: "Dakos Game Tracker",
      subtitle: "Game tracker",
      localFirst: "Local first",
      originalsStayYours: "TXT originals stay yours.",
       migrationVersion: "MIGRATION / 1.0.1",
    },
    navigation: {
      main: "Main navigation",
      overview: "Overview",
      library: "Library",
      importHistory: "Import history",
      guide: "Guide",
    },
    buttons: {
      export: "Export",
      import: "Import",
      addGame: "Add game",
      startImport: "Start an import",
      viewLibrary: "View library",
       seeAll: "See all",
       chooseTxtFiles: "Choose TXT files",
       chooseNeoFiles: "Choose Neo files",
       chooseImportFiles: "Choose compatible files",
       scanFolder: "Scan a folder",
       cancelPreview: "Cancel preview",
       selectAllReviewRows: "Select all",
       clearReviewRows: "Clear selection",
      reset: "Reset",
      edit: "Edit",
      delete: "Delete",
      cancel: "Cancel",
      confirmImport: "Confirm import",
      saveEntry: "Save entry",
      chooseLocation: "Choose location",
    },
    headings: {
      overviewEyebrow: "YOUR PLAY LOG",
      overviewLead: "Keep the good",
      overviewAccent: "stories",
      overviewTail: "close.",
      latest: "LATEST",
      chapter: "CHAPTER",
      gamesLogged: "Games logged",
      acrossYears: "Across your years",
      averageScore: "Average score",
      outOfTen: "Out of 10; recommendations use their midpoint",
      lovedLiked: "Loved / liked",
      sevenPlusOrRecommended: "Recommendation bands",
      importSessions: "Import sessions",
      originalsUntouched: "Originals untouched",
      arcEyebrow: "THE ARC",
      yearsInPlay: "Your years in play",
      recentlyPlayedEyebrow: "RECENTLY PLAYED",
      lastEntries: "Last entries",
      importCalloutStamp: "01 / PRESERVE",
      importCalloutTitle: "Your old lists have a place here.",
      libraryEyebrow: "THE LIBRARY",
      libraryLead: "Every game",
      libraryAccent: "counts.",
      importStudioEyebrow: "IMPORT STUDIO",
      importLead: "Bring the",
      importAccent: "archive.",
      safeStepTitle: "One safe step at a time.",
      reviewEyebrow: "REVIEW BEFORE SAVING",
      reviewLead: "Read the",
      reviewAccent: "evidence.",
       firstRows: "FIRST ROWS",
       whatWillEnterLibrary: "What may enter the library",
       reviewRowsEyebrow: "MANUAL DECISION",
       reviewRowsTitle: "Choose which rows to import",
    },
    copy: {
      overviewIntro:
        "A quiet place for the games that stayed with you. Local, searchable, and ready for the next chapter.",
      everyYearFootnote: "Every year is a page, not a reset.",
      importCallout:
        "Bring every historical TXT into a reviewable preview. Nothing is written over. Unknown rows stay visible.",
      safeStep:
        "Pick files or a folder. DGT will identify the format, associate the year, and show you every row before anything is saved.",
    },
    guide: {
      nav: "Guide",
      eyebrow: "FIELD MANUAL",
      titleLead: "Do not let",
      titleAccent: "a question stop you.",
      intro:
        "Digital Game Tracker is local first: original TXT files are never rewritten, the internal library lives in JSON, and online connections are optional.",
      searchLabel: "Search the guide",
      searchPlaceholder: "Try: covers, warning, cache...",
      searchNoResults: "No chapter matches that search.",
      copyPath: "Copy path",
      pathCopied: "Copied",
      indexTitle: "Quick map",
      indexStart: "Getting started",
      indexCovers: "Covers",
      indexImport: "Import TXT",
      indexLibrary: "Library",
      indexStorage: "Where data lives",
      indexTrouble: "When something fails",
      quickEyebrow: "START HERE",
      quickTitle: "Three moves and you are in.",
      quickCopy:
        "You do not need to know every format. Start with the task you want to solve and the app will explain the rest along the way.",
      quickAddTitle: "Add",
      quickAddCopy:
        "Create a manual record with name, date, rating, notes, platform, and an optional cover.",
      quickImportTitle: "Bring history in",
      quickImportCopy:
        "Preview one or more TXT files before confirming. Nothing is written over the originals.",
      quickCoverTitle: "Choose a cover",
      quickCoverCopy:
        "Search for a candidate, check its source, and choose only when the image is right.",
      startEyebrow: "01 / GETTING STARTED",
      startTitle: "Choose your way in.",
      startCopy:
        "Overview is your dashboard; Library is your searchable archive; Import history is the safe place for old lists.",
      startSteps:
        `Use Overview to orient yourself and Library when you want to search, filter, or edit.
For historical lists, open Import history and choose TXT files or a folder.
For one game, press Add game; you do not need a TXT file.`,
      startTipTitle: "The quiet rule",
      startTipCopy:
        "Closing the app does not delete anything. Source TXT files stay untouched and internal data is written separately.",
      coversEyebrow: "02 / COVERS",
      coversTitle: "Covers are chosen, not guessed.",
      coversCopy:
        "TheGamesDB is primary when its API key is configured. HLTB is the fallback, and a local image is always available.",
      coversSteps:
        `Type the name and press Search cover. If that query is already cached, the request is not repeated.
Check the title and source for each candidate. TheGamesDB usually offers more platforms; HLTB is the fallback.
Press + on the chosen cover. Only then is the image downloaded and saved to the local cover store.`,
      coversTroubleTitle: "If candidates show no image",
      coversTroubleCopy:
        "The app loads previews through the main process. If a source still fails, follow this order:",
      coversTroubleSteps:
        `Check that you are using the current build and that the app can reach the internet.
Check the TheGamesDB API key in Settings; then use Clear cache to refresh an old search.
If one candidate fails, use Choose image file and continue without an online provider.
Search cache is not the selected-cover store: Clear cache does not remove covers already in your library.`,
      importEyebrow: "03 / IMPORT TXT",
      importTitle: "Read the report before confirming.",
      importCopy:
        "Import is a review desk. Detected format, year, valid rows, and issues should make sense before the final button.",
      importSteps:
        `Select TXT files or a folder. The source is not modified.
Check the detected format and year. The year comes from the filename, content, or is flagged for review when conflicting.
Open the rows and review rejected, unknown, and preserved data; the app does not silently discard it.
 Enable Search and assign covers automatically to warm the cache and use the first candidate for each game.
 Rows with a doubtful date, score, or format are flagged and skipped by default; select only the ones you want in the library with a warning.
Confirm only when the summary represents what you want to save. Repeated entries are skipped by default.`,
      importWarningTitle: "What a warning means",
      importWarningCopy:
        "A warning does not necessarily mean import failed. It means something needs your decision before saving.",
      importWarningSteps:
        `A preserved row stays visible with its original text for review.
 Unknown recommendations or platforms are not corrected automatically; they remain visible without guessing.
 An entry imported with a warning shows a coral marker; edit it with valid values and save to clear the warning.
If you want repeated entries, enable Allow repeated entries and confirm deliberately.`,
      importErrorTitle: "What to do with an error",
      importErrorCopy:
        "A read or format error stops that file, but does not turn the TXT into an empty version or touch other files.",
      importErrorSteps:
        `Try one file first to isolate the problem.
Check that the filename contains the year when the content does not, and that the file is UTF-8.
If it still fails, keep the TXT, check the log, and share the exact message; do not rewrite it to hide the issue.`,
      libraryEyebrow: "04 / LIBRARY",
      libraryTitle: "Your archive, at your pace.",
      libraryCopy:
        "The internal library is the normalized working copy. You can browse it without reopening the original TXT files.",
      librarySteps:
        `Search from the top bar; Ctrl+K focuses the game search.
Use year and recommendation filters. The platform column is enabled from Settings.
Click a row to edit it. Delete removes only the internal entry and does not touch the source TXT.
Click headers to sort; a third click clears sorting and restores the original order.`,
      storageEyebrow: "05 / WHERE DATA LIVES",
      storageTitle: "Local first also means knowing where to look.",
      storageCopy:
        "On Windows, paste %APPDATA% into File Explorer. These are Digital Game Tracker's internal paths:",
      storagePaths:
        `Games and library|%APPDATA%\\DakosGameTracker\\library.v1.json
Settings and API key|%APPDATA%\\DakosGameTracker\\settings.v1.json
Selected covers|%APPDATA%\\DakosGameTracker\\covers\\
Search cache|%APPDATA%\\DakosGameTracker\\cover-search-cache.v1.json
Diagnostic logs|%APPDATA%\\DakosGameTracker\\logs\\app.log
Backup|%APPDATA%\\DakosGameTracker\\library.v1.json.bak`,
      storageHintTitle: "Do not delete blindly",
      storageHintCopy:
        "Do not delete library.v1.json, covers, or the .bak file while recovering data. To clean only online results, use Clear cache in Settings.",
      troubleEyebrow: "06 / WHEN SOMETHING FAILS",
      troubleTitle: "Preserve first, diagnose second.",
      troubleCopy:
        "The app leaves enough evidence to investigate without touching your sources. Follow the symptom; do not delete files to try your luck.",
      troubleCoverTitle: "Covers do not appear",
      troubleCoverCopy:
        "Check the internet and API key, clear the search cache, and try a manual image. If the selected cover appears, the issue was the provider or preview.",
      troubleImportTitle: "Import shows warnings",
      troubleImportCopy:
        "Read preserved rows and the exact reason. Confirm only what you understand; ambiguous data stays visible for a later decision.",
      troubleDataTitle: "The library is empty or will not open",
      troubleDataCopy:
        "Do not delete the JSON. Keep a copy, open the diagnostic log, and check whether library.v1.json.bak exists before asking for help.",
      finalEyebrow: "ONE LAST IDEA",
      finalTitle: "Keep the source. Read the evidence. Decide yourself.",
      finalCopy:
        "That is DGT's working order: protect your TXT files first, understand the report second, and confirm changes last.",
    },
    grid: {
      libraryGameYear: "GAME / YEAR",
      date: "DATE",
      platform: "PLATFORM",
      verdict: "VERDICT",
      notes: "NOTES",
      game: "GAME",
       scoreVerdict: "SCORE / VERDICT",
       status: "STATUS",
    },
    forms: {
      searchPlaceholder: "Search your games...",
      searchShortcut: "CTRL K",
      filterBy: "FILTER BY",
      allYears: "All years",
      allVerdicts: "All verdicts",
      gameName: "Game name",
      date: "Date",
      score: "Score",
      verdict: "Verdict",
      platform: "Platform",
      noPlatform: "No platform",
      notes: "Notes",
      noVerdict: "No verdict",
      exampleGame: "e.g. Outer Wilds",
      scorePlaceholder: "--",
      notesPlaceholder: "What stayed with you?",
      allowRepeatedEntries: "Allow repeated entries",
       autoCoverImport: "Search and assign covers automatically",
       autoCoverImportDescription:
         "Searches each new name once, keeps the first candidate, and caches the query. Failures do not block the import.",
       validation: {
         nameRequired: "Give the game a name.",
         scoreRange: "The score must be between 0 and 10.",
       },
     },
    filters: {
      field: "FILTER FIELD",
      allFields: "All fields",
      name: "Name",
      year: "Year",
      date: "Date",
      platform: "Platform",
      rating: "Verdict",
      completed: "Completed",
      platinum: "Platinum",
      favorite: "Favorite",
      notes: "Notes",
      value: "Filter value",
      anyValue: "Any value",
      chooseField: "Choose a field to filter",
      active: "Active",
      inactive: "Inactive",
      sortBy: "SORT BY",
      noSorting: "No sorting",
      direction: "Direction",
      ascending: "Ascending",
      descending: "Descending",
    },
    modal: {
      editor: {
        editEyebrow: "EDIT ENTRY",
        newEyebrow: "NEW ENTRY",
        editTitle: "Tune the entry.",
        newTitle: "Add a new chapter.",
        copy: "Keep the useful detail. You can always change it later.",
      },
      export: {
        eyebrow: "EXPORT STUDIO",
        title: "Choose the shape.",
        copy:
          "Export {count} entries. Fields that do not exist in the selected format are kept inside the comments instead of being dropped.",
      },
    },
    empty: {
      chart: "No games logged yet. Your first year will appear here.",
      recentTitle: "Your first entry is waiting.",
      recentCopy: "Import an old TXT or add a game manually.",
      libraryTitle: "No games match this view.",
      libraryCopy: "Try clearing the filters or import another historical file.",
       noTxtFilesTitle: "No TXT files found",
       noTxtFilesCopy: "That folder did not contain top-level .txt files.",
       noNeoFilesTitle: "No Neo files found",
       noNeoFilesCopy: "That folder did not contain top-level .xlsx or .csv files.",
       noImportFilesTitle: "No compatible files found",
       noImportFilesCopy:
         "The folder contains no compatible TXT, XLSX, or CSV files to import.",
    },
    labels: {
      noDate: "No date",
      noScore: "No score",
      noYear: "No year",
      libraryCount: "{shown} showing of {total} total entries",
       files: "Files",
       rowsReady: "Rows ready",
       rowsToImport: "Rows to import",
       reviewRows: "Rows to review",
       selectedReviewRows: "{selected} of {total} review rows selected",
      warnings: "Warnings",
      preserved: "Preserved",
      previewRows: "{count} rows",
      morePreviewRows: "+ {count} more rows in this preview",
      validRows: "{count} valid rows",
      rejectedRows: "{count} rejected",
      preservedRows: "{count} preserved",
      year: "year",
      line: "Line {line}",
      file: "File",
    },
    status: {
      openingLibrary: "Opening your library...",
      saving: "Saving...",
      exporting: "Exporting...",
      searchingCovers: "Searching and saving covers...",
      completed: "Completed",
      platinum: "Platinum",
      favorite: "Favorite",
      statusToggle: "Toggle status: {status}",
    },
    import: {
      principles: {
        detect: "Detect",
        detectCopy: "Format and year are explained from filename and content.",
        review: "Review",
        reviewCopy:
          "Rejected and unknown rows remain visible before confirmation.",
        preserve: "Preserve",
        preserveCopy: "Original TXT files are never rewritten by an import.",
      },
      duplicateSingular: "{count} repeated row found in this batch.",
      duplicatePlural: "{count} repeated rows found in this batch.",
       repeatedDefault: "Repeated rows are kept visible and skipped by default.",
       reviewRowsCopy:
         "These rows contain warnings or incomplete data. Select only the ones you want to keep; you can correct them later in the library.",
      fileYear: "{year} year / {source}",
      yearSources: {
        filename: "filename",
        content: "content",
        review: "review",
      },
      status: {
        reviewNeeded: "Review needed",
        hasNotes: "Has notes",
        ready: "Ready",
      },
    },
    importIssues: {
      "invalid-date": 'Invalid date "{value}" on line {line}.',
      "missing-date": "The game date is missing on line {line}.",
      "missing-year":
        'The date "{value}" on line {line} cannot be interpreted without a file year.',
      "year-conflict":
        "Line {line} indicates year {value}, but the filename indicates {year}.",
      "unparsed-legacy-row":
        'Could not parse the legacy row on line {line}: "{value}".',
      "missing-name":
        'The game name is missing on line {line}. Original row: "{value}".',
      "missing-required-field":
        'A required field is missing on line {line} (game name or date). Original row: "{value}".',
      "invalid-score": 'Invalid score "{value}" on line {line}.',
      "unknown-recommendation":
        'Unknown recommendation "{value}" on line {line}; it is preserved without correction.',
      "unknown-platform":
        'Unknown platform "{value}" on line {line}; it is preserved without correction.',
      "mixed-rating-fields":
        'Line {line} contains both a score and a recommendation; both are preserved for review. Original row: "{value}".',
      "ambiguous-year": "The file contents do not identify a single year.",
      "unknown-format":
        'The file format is unrecognized on line {line}: "{value}".',
      "read-error": "Could not read the file: {message}",
      "encoding-replacement":
        "The file contains characters that could not be decoded as UTF-8.",
      "mixed-rating-batch":
        "This batch mixes rating models; each row keeps the mode from its source file.",
      "summary-row":
        'The summary row on line {line} is preserved and not imported as a game: "{value}".',
      "unknown-status":
        'Unknown status "{value}" on line {line}; it is preserved for review.',
    },
    formats: {
      legacy2021: "Historic 2021",
      semicolonScore: "Score table",
      semicolonRecommendation: "Recommendation table",
      unknown: "Unrecognized format",
      legacy2021Description:
        "Name /// DD/MM/YYYY, with extra fields in the notes.",
      semicolonScoreDescription: "Game;dates;score out of 10;additional comments.",
      semicolonRecommendationDescription:
        "Game;dates;Recommended/Not Recommended + extra;comments.",
      semicolonRecommendationPlatform: "Recommendation and platform table",
      semicolonRecommendationPlatformDescription:
        "Game;dates;recommendation;comments;platform.",
      neoXlsx: "Neo Excel table",
      neoXlsxDescription:
        "Game;Score;Date;Completed;Comments, with colors for statuses.",
      neoCsv: "Neo CSV table",
      neoCsvDescription:
        "Game,Score,Date,Completed,Comments,Platinum,Favorite.",
    },
    covers: {
      title: "Cover",
      search: "Search cover",
      searching: "Searching cover candidates...",
      choose: "Use this cover",
      manual: "Choose image file",
      remove: "Remove cover",
      noCover: "No cover",
      noResults: "No covers were found for this name.",
      unavailable:
        "HowLongToBeat could not be queried. You can choose a local image.",
      sourceHltb: "Source: HowLongToBeat",
      sourceTheGamesDb: "Source: TheGamesDB",
      automatic: "Options appear as you type the game name.",
    },
    recommendations: {
      veryRecommended: "Highly recommended",
      recommended: "Recommended",
      lowRecommended: "Not very recommended",
      notRecommended: "Not recommended",
    },
    errors: {
      loadLibrary: "The library could not be opened.",
      prepareFiles: "The files could not be prepared.",
      confirmImport: "The import could not be confirmed.",
      saveGame: "The game could not be saved.",
      deleteGame: "The game could not be deleted.",
      exportLibrary: "The library could not be exported.",
      coverSearch: "Covers could not be searched.",
      unexpected: "Something unexpected happened.",
    },
    toasts: {
      updated: "Game updated.",
      added: "Game added to your library.",
      deleted: "Game removed from the library. The original TXT was not touched.",
      imported: "{count} games imported.",
      importedWithDuplicates: "{count} games imported; {duplicates} duplicates skipped.",
      importedWithCovers:
        "{count} games imported; {searched} searches prepared; {covers} covers assigned; {missing} without a cover and {errors} with an error.",
      importedWithDuplicatesAndCovers:
        "{count} games imported; {duplicates} duplicates skipped; {searched} searches prepared; {covers} covers assigned; {missing} without a cover and {errors} with an error.",
      exported: "{count} games exported.",
       exportedWithWarnings: "{count} games exported with {warnings} warnings.",
       reviewSkipped: "{count} flagged rows were skipped by default.",
    },
    settings: {
      title: "Settings",
      language: "Language",
      languageDescription: "Choose the interface language.",
      system: "System language",
      spanish: "Spanish",
      english: "English",
      japanese: "Japanese",
      fallback: "Spanish is used when no supported language is detected.",
      platformColumn: "Show platform column",
      platformColumnDescription:
        "Show the saved platform in the library and previews.",
      tableMode: "Table type",
      tableModeDescription:
        "Legacy keeps historical TXT flows; Neo enables Excel tables and statuses.",
      legacyMode: "Legacy",
      neoMode: "Neo",
      theGamesDbApiKey: "TheGamesDB API key",
      theGamesDbApiKeyDescription:
        "Optional. Used for multiplatform cover searches; HLTB is used when empty.",
      theGamesDbApiKeyPlaceholder: "Paste your free API key here",
      coverCache: "Cover search cache",
      coverCacheDescription:
        "Candidates are stored locally to avoid repeating requests. Selected covers are not removed here.",
      clearCoverCache: "Clear cache",
      coverCacheCleared: "Cover search cache cleared.",
    },
    tooltips: {
      search: "Search your games (Ctrl+K)",
      export: "Export your library",
      import: "Import TXT files",
      addGame: "Add a game",
      resetFilters: "Reset filters",
      close: "Close",
      editGame: "Edit {name}",
      deleteGame: "Delete {name}",
    },
    accessibility: {
      floppyDisk: "Floppy disk",
      mainNavigation: "Main navigation",
      close: "Close",
      dismissError: "Dismiss error",
      editGame: "Edit {name}",
      deleteGame: "Delete {name}",
      search: "Search games",
      platform: "Platform: {platform}",
      cover: "Cover for {name}",
      selectReviewRow: "Select review row: {name}",
      statusToggle: "Toggle {status} for {name}",
    },
    dialogs: {
      deleteGame: 'Delete "{name}" from the library?',
    },
  },
  ja: {
    brand: {
      mark: "DGT",
      digital: "Digital",
      dakos: "Dakos",
      product: "Digital Game Tracker",
      dakosProduct: "Dakos Game Tracker",
      subtitle: "Game tracker",
      localFirst: "ローカル優先",
      originalsStayYours: "TXTのオリジナルはあなたのものです。",
       migrationVersion: "MIGRATION / 1.0.1",
    },
    navigation: {
      main: "メインナビゲーション",
      overview: "概要",
      library: "ライブラリ",
      importHistory: "インポート履歴",
      guide: "ガイド",
    },
    buttons: {
      export: "エクスポート",
      import: "インポート",
      addGame: "ゲームを追加",
      startImport: "インポートを開始",
      viewLibrary: "ライブラリを見る",
      seeAll: "すべて見る",
      chooseTxtFiles: "TXTファイルを選択",
      chooseNeoFiles: "Neoファイルを選択",
      chooseImportFiles: "対応ファイルを選択",
       scanFolder: "フォルダーをスキャン",
       cancelPreview: "プレビューをキャンセル",
       selectAllReviewRows: "すべて選択",
       clearReviewRows: "選択を解除",
      reset: "リセット",
      edit: "編集",
      delete: "削除",
      cancel: "キャンセル",
      confirmImport: "インポートを確定",
      saveEntry: "エントリーを保存",
      chooseLocation: "保存先を選択",
    },
    headings: {
      overviewEyebrow: "プレイログ",
      overviewLead: "大切な",
      overviewAccent: "思い出を",
      overviewTail: "そばに。",
      latest: "最新",
      chapter: "チャプター",
      gamesLogged: "記録したゲーム",
      acrossYears: "これまでの年月",
      averageScore: "平均スコア",
      outOfTen: "10点満点（推薦は中間値）",
      lovedLiked: "お気に入り / 好き",
      sevenPlusOrRecommended: "推薦の区分に基づく",
      importSessions: "インポート回数",
      originalsUntouched: "オリジナルは未変更",
      arcEyebrow: "軌跡",
      yearsInPlay: "プレイした年月",
      recentlyPlayedEyebrow: "最近プレイしたゲーム",
      lastEntries: "最近のエントリー",
      importCalloutStamp: "01 / 保存",
      importCalloutTitle: "昔のリストにもここで居場所を。",
      libraryEyebrow: "ライブラリ",
      libraryLead: "すべてのゲームに",
      libraryAccent: "意味がある。",
      importStudioEyebrow: "インポートスタジオ",
      importLead: "アーカイブを",
      importAccent: "持ち込む。",
      safeStepTitle: "安全に一歩ずつ。",
      reviewEyebrow: "保存前に確認",
      reviewLead: "記録を",
      reviewAccent: "読み解く。",
       firstRows: "最初の行",
       whatWillEnterLibrary: "ライブラリに追加できる内容",
       reviewRowsEyebrow: "手動で確認",
       reviewRowsTitle: "インポートする行を選択",
    },
    copy: {
      overviewIntro:
        "心に残ったゲームのための静かな場所。ローカルで検索でき、次の章に備えられます。",
      everyYearFootnote: "毎年が新しいリセットではなく、一枚のページです。",
      importCallout:
        "過去のTXTを確認できるプレビューに取り込みます。上書きはしません。不明な行も表示されます。",
      safeStep:
        "ファイルまたはフォルダーを選んでください。DGTが形式と年を判定し、保存前にすべての行を表示します。",
    },
    guide: {
      nav: "ガイド",
      eyebrow: "フィールドマニュアル",
      titleLead: "疑問で",
      titleAccent: "止まらないために。",
      intro:
        "Digital Game Trackerはローカル優先です。元のTXTは書き換えず、内部ライブラリはJSONに保存し、オンライン接続は任意です。",
      searchLabel: "ガイドを検索",
      searchPlaceholder: "例: カバー、警告、キャッシュ...",
      searchNoResults: "検索に一致する章はありません。",
      copyPath: "パスをコピー",
      pathCopied: "完了",
      indexTitle: "クイックマップ",
      indexStart: "始め方",
      indexCovers: "カバー",
      indexImport: "TXTをインポート",
      indexLibrary: "ライブラリ",
      indexStorage: "保存場所",
      indexTrouble: "問題が起きたら",
      quickEyebrow: "ここから開始",
      quickTitle: "3つの操作で始められます。",
      quickCopy:
        "すべての形式を知る必要はありません。目的の操作から始めれば、必要なことを途中で確認できます。",
      quickAddTitle: "追加",
      quickAddCopy: "名前、日付、評価、メモ、プラットフォーム、任意のカバーを登録します。",
      quickImportTitle: "履歴を取り込む",
      quickImportCopy: "確定前にTXTを確認できます。元のファイルは上書きしません。",
      quickCoverTitle: "カバーを選ぶ",
      quickCoverCopy: "候補と提供元を確認し、正しい画像を選びます。",
      startEyebrow: "01 / 始め方",
      startTitle: "入口を選ぶ。",
      startCopy:
        "概要はダッシュボード、ライブラリは検索できる記録、インポート履歴は過去のリストを安全に取り込む場所です。",
      startSteps:
        `概要で全体を確認し、検索・絞り込み・編集にはライブラリを使います。
過去のリストはインポート履歴からTXTファイルまたはフォルダーを選びます。
1件だけ追加する場合はゲームを追加を押します。TXTは必要ありません。`,
      startTipTitle: "基本のルール",
      startTipCopy: "アプリを閉じてもデータは消えません。元のTXTと内部データは別々に保存されます。",
      coversEyebrow: "02 / カバー",
      coversTitle: "カバーは推測せず選びます。",
      coversCopy:
        "APIキーがある場合はTheGamesDBを優先します。HLTBが予備として使われ、ローカル画像も選べます。",
      coversSteps:
        `名前を入力してカバーを検索を押します。同じ検索がキャッシュにあれば再度リクエストしません。
候補のタイトルと提供元を確認します。TheGamesDBは複数プラットフォームに対応し、HLTBが予備です。
選んだ候補の+を押します。その時点で画像がダウンロードされ、ローカルに保存されます。`,
      coversTroubleTitle: "候補の画像が表示されない場合",
      coversTroubleCopy: "アプリはメインプロセス経由でプレビューを読み込みます。それでも失敗する場合:",
      coversTroubleSteps:
        `最新のビルドを使い、アプリがインターネットに接続できるか確認します。
設定でTheGamesDBのAPIキーを確認し、古い検索はキャッシュを削除して更新します。
特定の候補だけ失敗する場合は画像ファイルを選択を使います。
検索キャッシュを削除しても、ライブラリですでに選んだカバーは削除されません。`,
      importEyebrow: "03 / TXTをインポート",
      importTitle: "確定前にレポートを読む。",
      importCopy:
        "インポートは確認のための作業台です。形式、年、有効な行、問題点を確定前に確認します。",
      importSteps:
        `TXTファイルまたはフォルダーを選びます。元のファイルは変更しません。
検出された形式と年を確認します。年が競合する場合は確認が必要になります。
却下、不明、保持された行を確認します。アプリは情報を黙って破棄しません。
 カバーを自動検索して割り当てるを有効にすると、キャッシュを準備して各ゲームの最初の候補を使います。
 日付、スコア、形式に問題がある行は確認用に表示され、初期状態ではインポートされません。ライブラリに警告付きで残す行だけを選択します。
内容を理解してから確定します。重複した行は初期状態では省略されます。`,
      importWarningTitle: "警告の意味",
      importWarningCopy: "警告は必ずしも失敗ではありません。保存前に判断が必要という意味です。",
      importWarningSteps:
        `保持された行は元の文字列とともに表示され、後から確認できます。
 不明な評価やプラットフォームは自動修正せず、そのまま保持します。
 警告付きでライブラリに入れたエントリーには印が付きます。有効な値に修正して保存すると警告が消えます。
重複を入れたい場合は重複エントリーを許可を有効にしてから確定します。`,
      importErrorTitle: "エラーが出た場合",
      importErrorCopy:
        "読み込みや形式のエラーはそのファイルを止めますが、TXTを空にしたり他のファイルを変更したりしません。",
      importErrorSteps:
        `まず1つのファイルだけで問題を切り分けます。
内容に年がない場合はファイル名に年を入れ、UTF-8で保存されているか確認します。
失敗が続く場合はTXTを保管し、ログと正確なメッセージを確認します。`,
      libraryEyebrow: "04 / ライブラリ",
      libraryTitle: "自分のペースで記録を見る。",
      libraryCopy: "内部ライブラリは正規化された作業コピーです。元のTXTを開き直す必要はありません。",
      librarySteps:
        `上部の検索バーを使います。Ctrl+Kでゲーム検索に移動できます。
年と評価で絞り込みます。プラットフォーム列は設定で有効にできます。
行をクリックすると編集できます。削除は内部の行だけで、元のTXTには影響しません。
見出しをクリックして並べ替えます。3回目のクリックで元の順序に戻ります。`,
      storageEyebrow: "05 / 保存場所",
      storageTitle: "ローカル優先なら、場所も分かります。",
      storageCopy: "Windowsのエクスプローラーで%APPDATA%を開くと、以下の場所を確認できます。",
      storagePaths:
        `ゲームとライブラリ|%APPDATA%\\DakosGameTracker\\library.v1.json
設定とAPIキー|%APPDATA%\\DakosGameTracker\\settings.v1.json
選択したカバー|%APPDATA%\\DakosGameTracker\\covers\\
検索キャッシュ|%APPDATA%\\DakosGameTracker\\cover-search-cache.v1.json
診断ログ|%APPDATA%\\DakosGameTracker\\logs\\app.log
バックアップ|%APPDATA%\\DakosGameTracker\\library.v1.json.bak`,
      storageHintTitle: "むやみに削除しない",
      storageHintCopy: "復旧中はJSON、covers、.bakを削除しないでください。オンライン検索だけを消すには設定のキャッシュを削除を使います。",
      troubleEyebrow: "06 / 問題が起きたら",
      troubleTitle: "まず保存し、その後に調べる。",
      troubleCopy: "元データを変更せずに調べられるよう、アプリは診断の手がかりを残します。",
      troubleCoverTitle: "カバーが表示されない",
      troubleCoverCopy: "接続とAPIキーを確認し、検索キャッシュを削除してから画像ファイルを試します。",
      troubleImportTitle: "インポートに警告がある",
      troubleImportCopy: "保持された行と理由を読み、理解した内容だけを確定します。不明なデータは残ります。",
      troubleDataTitle: "ライブラリが空、または開けない",
      troubleDataCopy: "JSONを削除しないでください。ログとlibrary.v1.json.bakを確認してから相談してください。",
      finalEyebrow: "最後に",
      finalTitle: "元を守る。内容を読む。自分で決める。",
      finalCopy: "DGTの順番は、TXTを守り、レポートを理解し、最後に変更を確定することです。",
    },
    grid: {
      libraryGameYear: "ゲーム / 年",
      date: "日付",
      platform: "プラットフォーム",
      verdict: "評価",
      notes: "メモ",
      game: "ゲーム",
      scoreVerdict: "スコア / 評価",
      status: "状態",
    },
    forms: {
      searchPlaceholder: "ゲームを検索...",
      searchShortcut: "CTRL K",
      filterBy: "絞り込み",
      allYears: "すべての年",
      allVerdicts: "すべての評価",
      gameName: "ゲーム名",
      date: "日付",
      score: "スコア",
      verdict: "評価",
      platform: "プラットフォーム",
      noPlatform: "プラットフォームなし",
      notes: "メモ",
      noVerdict: "評価なし",
      exampleGame: "例: Outer Wilds",
      scorePlaceholder: "--",
      notesPlaceholder: "心に残ったことは？",
      allowRepeatedEntries: "重複エントリーを許可",
       autoCoverImport: "カバーを自動検索して割り当てる",
       autoCoverImportDescription:
         "新しい名前ごとに一度検索し、最初の候補を保存して検索をキャッシュします。失敗してもインポートは止まりません。",
       validation: {
         nameRequired: "ゲーム名を入力してください。",
         scoreRange: "スコアは0から10の間で入力してください。",
       },
     },
    filters: {
      field: "絞り込む項目",
      allFields: "すべての項目",
      name: "名前",
      year: "年",
      date: "日付",
      platform: "プラットフォーム",
      rating: "評価",
      completed: "クリア済み",
      platinum: "プラチナ",
      favorite: "お気に入り",
      notes: "メモ",
      value: "絞り込み値",
      anyValue: "すべての値",
      chooseField: "絞り込む項目を選択",
      active: "有効",
      inactive: "無効",
      sortBy: "並べ替え項目",
      noSorting: "並べ替えなし",
      direction: "方向",
      ascending: "昇順",
      descending: "降順",
    },
    modal: {
      editor: {
        editEyebrow: "エントリーを編集",
        newEyebrow: "新しいエントリー",
        editTitle: "エントリーを整える。",
        newTitle: "新しい章を追加。",
        copy: "必要な情報を残しましょう。後からいつでも変更できます。",
      },
      export: {
        eyebrow: "エクスポートスタジオ",
        title: "形式を選択。",
        copy:
          "{count}件をエクスポートします。選択した形式にない項目は削除せず、コメントに残します。",
      },
    },
    empty: {
      chart: "まだ記録されたゲームはありません。最初の年がここに表示されます。",
      recentTitle: "最初のエントリーを待っています。",
      recentCopy: "過去のTXTをインポートするか、ゲームを手動で追加してください。",
      libraryTitle: "この条件に一致するゲームはありません。",
      libraryCopy: "フィルターを解除するか、別の過去ファイルをインポートしてください。",
       noTxtFilesTitle: "TXTファイルが見つかりません",
       noTxtFilesCopy: "そのフォルダーの直下に.txtファイルはありませんでした。",
       noNeoFilesTitle: "Neoファイルが見つかりません",
       noNeoFilesCopy: "そのフォルダーの直下に.xlsxまたは.csvファイルはありませんでした。",
       noImportFilesTitle: "対応ファイルが見つかりません",
       noImportFilesCopy:
         "インポートできるTXT、XLSX、CSVファイルがフォルダーにありません。",
    },
    labels: {
      noDate: "日付なし",
      noScore: "スコアなし",
      noYear: "年なし",
      libraryCount: "{shown}件を表示 / 全{total}件",
       files: "ファイル",
       rowsReady: "準備完了の行",
       rowsToImport: "インポートする行",
       reviewRows: "確認が必要な行",
       selectedReviewRows: "{total}行中{selected}行を選択",
      warnings: "警告",
      preserved: "保存済み",
      previewRows: "{count}行",
      morePreviewRows: "+ プレビューにさらに{count}行",
      validRows: "{count}件の有効な行",
      rejectedRows: "{count}件の却下",
      preservedRows: "{count}件を保存",
      year: "年",
      line: "{line}行目",
      file: "ファイル",
    },
    status: {
      openingLibrary: "ライブラリを開いています...",
      saving: "保存中...",
      exporting: "エクスポート中...",
      searchingCovers: "カバーを検索して保存中...",
      completed: "完了",
      platinum: "プラチナ",
      favorite: "お気に入り",
      statusToggle: "状態を切り替え: {status}",
    },
    import: {
      principles: {
        detect: "判定",
        detectCopy: "ファイル名と内容から形式と年を説明します。",
        review: "確認",
        reviewCopy: "却下された行や不明な行も確定前に表示します。",
        preserve: "保存",
        preserveCopy: "インポートで元のTXTファイルを書き換えることはありません。",
      },
      duplicateSingular: "このバッチに重複した行が{count}件あります。",
      duplicatePlural: "このバッチに重複した行が{count}件あります。",
       repeatedDefault: "重複した行は表示したまま、初期状態では読み込みません。",
       reviewRowsCopy:
         "これらの行には警告または不足したデータがあります。残したい行だけを選択し、後でライブラリで修正できます。",
      fileYear: "{year}年 / {source}",
      yearSources: {
        filename: "ファイル名",
        content: "内容",
        review: "確認",
      },
      status: {
        reviewNeeded: "要確認",
        hasNotes: "注意あり",
        ready: "準備完了",
      },
    },
    importIssues: {
      "invalid-date": "行{line}の日付「{value}」は無効です。",
      "missing-date": "行{line}にゲームの日付がありません。",
      "missing-year":
        "行{line}の日付「{value}」は、ファイルの年がないため解釈できません。",
      "year-conflict":
        "行{line}は{value}年を示していますが、ファイル名は{year}年を示しています。",
      "unparsed-legacy-row":
        "行{line}の旧形式の行を解釈できませんでした: 「{value}」。",
      "missing-name":
        "行{line}にゲーム名がありません。元の行: 「{value}」。",
      "missing-required-field":
        "行{line}に必須項目（ゲーム名または日付）がありません。元の行: 「{value}」。",
      "invalid-score": "行{line}のスコア「{value}」は無効です。",
      "unknown-recommendation":
        "行{line}の評価「{value}」を認識できません。修正せず保存します。",
      "unknown-platform":
        "行{line}のプラットフォーム「{value}」を認識できません。修正せず保存します。",
      "mixed-rating-fields":
        "行{line}にスコアと評価の両方があります。両方を確認用に保存します。元の行: 「{value}」。",
      "ambiguous-year": "ファイルの内容に単一の年を割り当てられません。",
      "unknown-format":
        "行{line}の「{value}」からファイル形式を認識できません。",
      "read-error": "ファイルを読み込めませんでした: {message}",
      "encoding-replacement":
        "ファイルにUTF-8としてデコードできない文字が含まれています。",
      "mixed-rating-batch":
        "このバッチには複数の評価方式が混在しています。各行は元のファイルの方式を保持します。",
      "summary-row":
        "行{line}の要約行はゲームとしてインポートせず保存します: 「{value}」。",
      "unknown-status":
        "行{line}の状態「{value}」を認識できません。確認用に保存します。",
    },
    formats: {
      legacy2021: "2021年の履歴形式",
      semicolonScore: "スコア表",
      semicolonRecommendation: "評価表",
      unknown: "認識できない形式",
      legacy2021Description: "名前 /// DD/MM/YYYY、追加項目はメモに保存します。",
      semicolonScoreDescription: "ゲーム;日付;10点満点のスコア;追加コメント。",
      semicolonRecommendationDescription:
        "ゲーム;日付;おすすめ/おすすめしない + 追加;コメント。",
      semicolonRecommendationPlatform: "評価とプラットフォームの表",
      semicolonRecommendationPlatformDescription:
        "ゲーム;日付;評価;コメント;プラットフォーム。",
      neoXlsx: "Neo Excelテーブル",
      neoXlsxDescription:
        "ゲーム;スコア;日付;完了;コメント。状態は色で保存します。",
      neoCsv: "Neo CSVテーブル",
      neoCsvDescription:
        "ゲーム,スコア,日付,完了,コメント,プラチナ,お気に入り。",
    },
    covers: {
      title: "カバー",
      search: "カバーを検索",
      searching: "カバー候補を検索中...",
      choose: "このカバーを使用",
      manual: "画像ファイルを選択",
      remove: "カバーを削除",
      noCover: "カバーなし",
      noResults: "この名前のカバーは見つかりませんでした。",
      unavailable:
        "HowLongToBeatを検索できませんでした。ローカル画像を選択できます。",
      sourceHltb: "提供元: HowLongToBeat",
      sourceTheGamesDb: "提供元: TheGamesDB",
      automatic: "ゲーム名を入力すると候補が表示されます。",
    },
    recommendations: {
      veryRecommended: "とてもおすすめ",
      recommended: "おすすめ",
      lowRecommended: "あまりおすすめしない",
      notRecommended: "おすすめしない",
    },
    errors: {
      loadLibrary: "ライブラリを開けませんでした。",
      prepareFiles: "ファイルを準備できませんでした。",
      confirmImport: "インポートを確定できませんでした。",
      saveGame: "ゲームを保存できませんでした。",
      deleteGame: "ゲームを削除できませんでした。",
      exportLibrary: "ライブラリをエクスポートできませんでした。",
      coverSearch: "カバーを検索できませんでした。",
      unexpected: "予期しないエラーが発生しました。",
    },
    toasts: {
      updated: "ゲームを更新しました。",
      added: "ゲームをライブラリに追加しました。",
      deleted: "ゲームをライブラリから削除しました。元のTXTは変更していません。",
      imported: "{count}件のゲームをインポートしました。",
      importedWithDuplicates:
        "{count}件のゲームをインポートしました。{duplicates}件の重複を省略しました。",
      importedWithCovers:
        "{count}件をインポートし、検索{searched}件を準備しました。カバーを{covers}件割り当て、カバーなし{missing}件、エラー{errors}件です。",
      importedWithDuplicatesAndCovers:
        "{count}件をインポートし、重複{duplicates}件を省略しました。検索{searched}件を準備し、カバーを{covers}件割り当て、カバーなし{missing}件、エラー{errors}件です。",
      exported: "{count}件のゲームをエクスポートしました。",
      exportedWithWarnings: "{count}件のゲームを警告{warnings}件付きでエクスポートしました。",
      reviewSkipped: "確認が必要な{count}行を初期状態では省略しました。",
    },
    settings: {
      title: "設定",
      language: "言語",
      languageDescription: "インターフェースの言語を選択します。",
      system: "システムの言語",
      spanish: "スペイン語",
      english: "英語",
      japanese: "日本語",
      fallback: "対応する言語が見つからない場合はスペイン語を使用します。",
      platformColumn: "プラットフォーム列を表示",
      platformColumnDescription:
        "ライブラリとプレビューに保存されたプラットフォームを表示します。",
      tableMode: "テーブルの種類",
      tableModeDescription:
        "Legacyは過去のTXTを維持し、NeoはExcelテーブルと状態を有効にします。",
      legacyMode: "Legacy",
      neoMode: "Neo",
      theGamesDbApiKey: "TheGamesDB APIキー",
      theGamesDbApiKeyDescription:
        "任意。マルチプラットフォームのカバー検索に使用し、空欄ならHLTBを試します。",
      theGamesDbApiKeyPlaceholder: "無料のAPIキーをここに貼り付け",
      coverCache: "カバー検索キャッシュ",
      coverCacheDescription:
        "候補をローカルに保存して再検索のリクエストを減らします。選択済みのカバーはここでは削除しません。",
      clearCoverCache: "キャッシュを削除",
      coverCacheCleared: "カバー検索キャッシュを削除しました。",
    },
    tooltips: {
      search: "ゲームを検索 (Ctrl+K)",
      export: "ライブラリをエクスポート",
      import: "TXTファイルをインポート",
      addGame: "ゲームを追加",
      resetFilters: "絞り込みをリセット",
      close: "閉じる",
      editGame: "{name}を編集",
      deleteGame: "{name}を削除",
    },
    accessibility: {
      floppyDisk: "フロッピーディスク",
      mainNavigation: "メインナビゲーション",
      close: "閉じる",
      dismissError: "エラーを閉じる",
      editGame: "{name}を編集",
      deleteGame: "{name}を削除",
      search: "ゲームを検索",
       platform: "プラットフォーム: {platform}",
       cover: "{name}のカバー",
       selectReviewRow: "確認用の行を選択: {name}",
       statusToggle: "{name}の{status}を切り替え",
    },
    dialogs: {
      deleteGame: "「{name}」をライブラリから削除しますか？",
    },
  },
} as const satisfies Record<Locale, LocaleCatalog>;

type LeafKeys<T> = {
  [K in keyof T & string]: T[K] extends string
    ? K
    : T[K] extends object
      ? `${K}.${LeafKeys<T[K]>}`
      : never;
}[keyof T & string];

export type TranslationKey = LeafKeys<LocaleCatalog>;
export type InterpolationValue = string | number;
export type InterpolationValues = Readonly<
  Record<string, InterpolationValue>
>;
export type Translator = (
  key: TranslationKey,
  values?: InterpolationValues,
) => string;

export function isLocale(value: string): value is Locale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

export function resolveLocale(value?: string | null): Locale {
  const language = value?.trim().toLowerCase().split(/[-_]/)[0] ?? "";
  return isLocale(language) ? language : DEFAULT_LOCALE;
}

function getTemplate(catalog: LocaleCatalog, key: TranslationKey): string {
  let value: unknown = catalog;

  for (const segment of key.split(".")) {
    if (typeof value !== "object" || value === null) {
      throw new Error(`Invalid translation key: ${key}`);
    }
    value = (value as Record<string, unknown>)[segment];
  }

  if (typeof value !== "string") {
    throw new Error(`Invalid translation key: ${key}`);
  }
  return value;
}

function interpolate(
  template: string,
  values: InterpolationValues = {},
): string {
  return template.replace(/\{([A-Za-z0-9_]+)\}/g, (token, name: string) =>
    Object.prototype.hasOwnProperty.call(values, name)
      ? String(values[name])
      : token,
  );
}

export function createTranslator(locale?: string | null): Translator {
  const catalog = CATALOG[resolveLocale(locale)];
  return (key, values) => interpolate(getTemplate(catalog, key), values);
}

export const t = createTranslator();
