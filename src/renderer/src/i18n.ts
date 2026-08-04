export const SUPPORTED_LOCALES = ["es", "en", "ja"] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "es";

export interface LocaleDefinition {
  readonly code: Locale;
  readonly name: string;
}

export const LOCALE_DEFINITIONS = {
  es: { code: "es", name: "Espanol" },
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
    subtitle: "Rastreador de juegos",
    localFirst: "Local primero",
    originalsStayYours: "Los TXT originales siguen siendo tuyos.",
    migrationVersion: "MIGRACION / 0.1",
  },
  navigation: {
    main: "Navegacion principal",
    overview: "Resumen",
    library: "Biblioteca",
    importHistory: "Historial de importaciones",
  },
  buttons: {
    export: "Exportar",
    import: "Importar",
    addGame: "Anadir juego",
    startImport: "Iniciar una importacion",
    viewLibrary: "Ver biblioteca",
    seeAll: "Ver todo",
    chooseTxtFiles: "Elegir archivos TXT",
    scanFolder: "Escanear carpeta",
    cancelPreview: "Cancelar vista previa",
    reset: "Restablecer",
    edit: "Editar",
    delete: "Eliminar",
    cancel: "Cancelar",
    confirmImport: "Confirmar importacion",
    saveEntry: "Guardar entrada",
    chooseLocation: "Elegir ubicacion",
  },
  headings: {
    overviewEyebrow: "TU REGISTRO DE JUEGOS",
    overviewLead: "Conserva las buenas",
    overviewAccent: "historias",
    overviewTail: "cerca.",
    latest: "ULTIMO",
    chapter: "CAPITULO",
    gamesLogged: "Juegos registrados",
    acrossYears: "En todos tus anos",
    averageScore: "Puntuacion media",
    outOfTen: "Sobre 10; recomendaciones usan su punto medio",
    lovedLiked: "Favoritos / queridos",
    sevenPlusOrRecommended: "Segun rangos de recomendacion",
    importSessions: "Sesiones de importacion",
    originalsUntouched: "Originales intactos",
    arcEyebrow: "EL RECORRIDO",
    yearsInPlay: "Tus anos en juego",
    recentlyPlayedEyebrow: "JUGADOS RECIENTEMENTE",
    lastEntries: "Ultimas entradas",
    importCalloutStamp: "01 / CONSERVAR",
    importCalloutTitle: "Tus listas antiguas tienen un lugar aqui.",
    libraryEyebrow: "LA BIBLIOTECA",
    libraryLead: "Cada juego",
    libraryAccent: "cuenta.",
    importStudioEyebrow: "ESTUDIO DE IMPORTACION",
    importLead: "Trae el",
    importAccent: "archivo.",
    safeStepTitle: "Un paso seguro cada vez.",
    reviewEyebrow: "REVISA ANTES DE GUARDAR",
    reviewLead: "Lee la",
    reviewAccent: "evidencia.",
    firstRows: "PRIMERAS FILAS",
    whatWillEnterLibrary: "Lo que entrara en la biblioteca",
  },
  copy: {
    overviewIntro:
      "Un lugar tranquilo para los juegos que se quedaron contigo. Local, consultable y listo para el siguiente capitulo.",
    everyYearFootnote: "Cada ano es una pagina, no un reinicio.",
    importCallout:
      "Trae cada TXT historico a una vista previa revisable. Nada se sobrescribe. Las filas desconocidas siguen visibles.",
    safeStep:
      "Elige archivos o una carpeta. DGT identificara el formato, asociara el ano y mostrara cada fila antes de guardar nada.",
  },
  grid: {
    libraryGameYear: "JUEGO / ANO",
    date: "FECHA",
    verdict: "VEREDICTO",
    notes: "NOTAS",
    game: "JUEGO",
    scoreVerdict: "PUNTUACION / VEREDICTO",
  },
  forms: {
    searchPlaceholder: "Busca tus juegos...",
    searchShortcut: "CTRL K",
    filterBy: "FILTRAR POR",
    allYears: "Todos los anos",
    allVerdicts: "Todos los veredictos",
    gameName: "Nombre del juego",
    date: "Fecha",
    score: "Puntuacion",
    verdict: "Veredicto",
    notes: "Notas",
    noVerdict: "Sin veredicto",
    exampleGame: "p. ej. Outer Wilds",
    scorePlaceholder: "--",
    notesPlaceholder: "Que se quedo contigo?",
    allowRepeatedEntries: "Permitir entradas repetidas",
    validation: {
      nameRequired: "Ponle un nombre al juego.",
      scoreRange: "La puntuacion debe estar entre 0 y 10.",
    },
  },
  modal: {
    editor: {
      editEyebrow: "EDITAR ENTRADA",
      newEyebrow: "NUEVA ENTRADA",
      editTitle: "Ajusta la entrada.",
      newTitle: "Anade un capitulo nuevo.",
      copy: "Conserva los detalles utiles. Siempre puedes cambiarlos despues.",
    },
    export: {
      eyebrow: "ESTUDIO DE EXPORTACION",
      title: "Elige el formato.",
      copy:
        "Exporta {count} entradas. Los campos que no existen en el formato elegido se conservan en los comentarios en lugar de descartarse.",
    },
  },
  empty: {
    chart: "Aun no hay juegos registrados. Tu primer ano aparecera aqui.",
    recentTitle: "Tu primera entrada esta esperando.",
    recentCopy: "Importa un TXT antiguo o anade un juego manualmente.",
    libraryTitle: "Ningun juego coincide con esta vista.",
    libraryCopy:
      "Prueba a borrar los filtros o importa otro archivo historico.",
    noTxtFilesTitle: "No se encontraron archivos TXT",
    noTxtFilesCopy: "Esa carpeta no contenia archivos .txt de nivel superior.",
  },
  labels: {
    noDate: "Sin fecha",
    noScore: "Sin nota",
    noYear: "Sin ano",
    libraryCount: "{shown} mostrando de {total} entradas totales",
    files: "Archivos",
    rowsReady: "Filas listas",
    warnings: "Avisos",
    preserved: "Conservadas",
    previewRows: "{count} filas",
    morePreviewRows: "+ {count} filas mas en esta vista previa",
    validRows: "{count} filas validas",
    rejectedRows: "{count} rechazadas",
    preservedRows: "{count} conservadas",
    year: "ano",
    line: "Linea {line}",
    file: "Archivo",
  },
  status: {
    openingLibrary: "Abriendo tu biblioteca...",
    saving: "Guardando...",
    exporting: "Exportando...",
  },
  import: {
    principles: {
      detect: "Detectar",
      detectCopy: "El formato y el ano se explican desde el nombre y el contenido.",
      review: "Revisar",
      reviewCopy:
        "Las filas rechazadas y desconocidas siguen visibles antes de confirmar.",
      preserve: "Conservar",
      preserveCopy:
        "Los archivos TXT originales nunca se reescriben durante una importacion.",
    },
    duplicateSingular: "{count} fila repetida encontrada en este lote.",
    duplicatePlural: "{count} filas repetidas encontradas en este lote.",
    repeatedDefault:
      "Las filas repetidas siguen visibles y se omiten de forma predeterminada.",
    fileYear: "{year} ano / {source}",
    yearSources: {
      filename: "nombre del archivo",
      content: "contenido",
      review: "revision",
    },
    status: {
      reviewNeeded: "Requiere revision",
      hasNotes: "Tiene avisos",
      ready: "Listo",
    },
  },
  importIssues: {
    "invalid-date": 'Fecha no valida "{value}" en la linea {line}.',
    "missing-year":
      'La fecha "{value}" de la linea {line} no se puede interpretar sin el ano del archivo.',
    "year-conflict":
      "La linea {line} indica el ano {value}, pero el nombre del archivo indica {year}.",
    "unparsed-legacy-row":
      'No se pudo interpretar la fila historica de la linea {line}: "{value}".',
    "missing-name":
      'Falta el nombre del juego en la linea {line}. Fila original: "{value}".',
    "missing-required-field":
      'Falta un campo obligatorio en la linea {line} (nombre del juego o fecha). Fila original: "{value}".',
    "invalid-score": 'Puntuacion no valida "{value}" en la linea {line}.',
    "unknown-recommendation":
      'Recomendacion desconocida "{value}" en la linea {line}; se conserva sin corregir.',
    "mixed-rating-fields":
      'La linea {line} contiene una puntuacion y una recomendacion; ambas se conservan para revision. Fila original: "{value}".',
    "ambiguous-year":
      "No se puede asociar un unico ano al contenido del archivo.",
    "unknown-format":
      'No se reconoce el formato del archivo en la linea {line}: "{value}".',
    "read-error": "No se pudo leer el archivo: {message}",
    "encoding-replacement":
      "El archivo contiene caracteres que no se pudieron decodificar como UTF-8.",
    "mixed-rating-batch":
      "El lote mezcla modelos de valoracion; cada fila conserva el modo de su archivo de origen.",
    "summary-row":
      'La fila de resumen de la linea {line} se conserva y no se importa como juego: "{value}".',
  },
  formats: {
    legacy2021: "Historico 2021",
    semicolonScore: "Tabla con puntuacion",
    semicolonRecommendation: "Tabla con recomendacion",
    unknown: "Formato no reconocido",
    legacy2021Description:
      "Nombre /// DD/MM/YYYY, con campos extra en las notas.",
    semicolonScoreDescription:
      "Juego;fechas;nota sobre 10;comentarios adicionales.",
    semicolonRecommendationDescription:
      "Juego;fechas;Recomendado/No Recomendado + extra;comentarios.",
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
    confirmImport: "No se pudo confirmar la importacion.",
    saveGame: "No se pudo guardar el juego.",
    deleteGame: "No se pudo eliminar el juego.",
    exportLibrary: "No se pudo exportar la biblioteca.",
    unexpected: "Ocurrio un error inesperado.",
  },
  toasts: {
    updated: "Juego actualizado.",
    added: "Juego anadido a tu biblioteca.",
    deleted: "Juego eliminado de la biblioteca. El TXT original no se ha tocado.",
    imported: "{count} juegos importados.",
    importedWithDuplicates:
      "{count} juegos importados; {duplicates} duplicados omitidos.",
    exported: "{count} juegos exportados.",
    exportedWithWarnings:
      "{count} juegos exportados con {warnings} avisos.",
  },
  settings: {
    title: "Ajustes",
    language: "Idioma",
    languageDescription: "Elige el idioma de la interfaz.",
    system: "Idioma del sistema",
    spanish: "Espanol",
    english: "Ingles",
    japanese: "Japones",
    fallback: "Se usara el espanol si no se detecta un idioma compatible.",
  },
  tooltips: {
    search: "Buscar tus juegos (Ctrl+K)",
    export: "Exportar biblioteca",
    import: "Importar archivos TXT",
    addGame: "Anadir un juego",
    resetFilters: "Restablecer filtros",
    close: "Cerrar",
    editGame: "Editar {name}",
    deleteGame: "Eliminar {name}",
  },
  accessibility: {
    floppyDisk: "Disquete",
    mainNavigation: "Navegacion principal",
    close: "Cerrar",
    dismissError: "Cerrar error",
    editGame: "Editar {name}",
    deleteGame: "Eliminar {name}",
    search: "Buscar juegos",
  },
  dialogs: {
    deleteGame: 'Eliminar "{name}" de la biblioteca?',
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
      migrationVersion: "MIGRATION / 0.1",
    },
    navigation: {
      main: "Main navigation",
      overview: "Overview",
      library: "Library",
      importHistory: "Import history",
    },
    buttons: {
      export: "Export",
      import: "Import",
      addGame: "Add game",
      startImport: "Start an import",
      viewLibrary: "View library",
      seeAll: "See all",
      chooseTxtFiles: "Choose TXT files",
      scanFolder: "Scan a folder",
      cancelPreview: "Cancel preview",
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
      whatWillEnterLibrary: "What will enter the library",
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
    grid: {
      libraryGameYear: "GAME / YEAR",
      date: "DATE",
      verdict: "VERDICT",
      notes: "NOTES",
      game: "GAME",
      scoreVerdict: "SCORE / VERDICT",
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
      notes: "Notes",
      noVerdict: "No verdict",
      exampleGame: "e.g. Outer Wilds",
      scorePlaceholder: "--",
      notesPlaceholder: "What stayed with you?",
      allowRepeatedEntries: "Allow repeated entries",
      validation: {
        nameRequired: "Give the game a name.",
        scoreRange: "The score must be between 0 and 10.",
      },
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
    },
    labels: {
      noDate: "No date",
      noScore: "No score",
      noYear: "No year",
      libraryCount: "{shown} showing of {total} total entries",
      files: "Files",
      rowsReady: "Rows ready",
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
      unexpected: "Something unexpected happened.",
    },
    toasts: {
      updated: "Game updated.",
      added: "Game added to your library.",
      deleted: "Game removed from the library. The original TXT was not touched.",
      imported: "{count} games imported.",
      importedWithDuplicates: "{count} games imported; {duplicates} duplicates skipped.",
      exported: "{count} games exported.",
      exportedWithWarnings: "{count} games exported with {warnings} warnings.",
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
      subtitle: "ゲームトラッカー",
      localFirst: "ローカル優先",
      originalsStayYours: "TXTのオリジナルはあなたのものです。",
      migrationVersion: "MIGRATION / 0.1",
    },
    navigation: {
      main: "メインナビゲーション",
      overview: "概要",
      library: "ライブラリ",
      importHistory: "インポート履歴",
    },
    buttons: {
      export: "エクスポート",
      import: "インポート",
      addGame: "ゲームを追加",
      startImport: "インポートを開始",
      viewLibrary: "ライブラリを見る",
      seeAll: "すべて見る",
      chooseTxtFiles: "TXTファイルを選択",
      scanFolder: "フォルダーをスキャン",
      cancelPreview: "プレビューをキャンセル",
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
      whatWillEnterLibrary: "ライブラリに追加される内容",
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
    grid: {
      libraryGameYear: "ゲーム / 年",
      date: "日付",
      verdict: "評価",
      notes: "メモ",
      game: "ゲーム",
      scoreVerdict: "スコア / 評価",
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
      notes: "メモ",
      noVerdict: "評価なし",
      exampleGame: "例: Outer Wilds",
      scorePlaceholder: "--",
      notesPlaceholder: "心に残ったことは？",
      allowRepeatedEntries: "重複エントリーを許可",
      validation: {
        nameRequired: "ゲーム名を入力してください。",
        scoreRange: "スコアは0から10の間で入力してください。",
      },
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
    },
    labels: {
      noDate: "日付なし",
      noScore: "スコアなし",
      noYear: "年なし",
      libraryCount: "{shown}件を表示 / 全{total}件",
      files: "ファイル",
      rowsReady: "準備完了の行",
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
      unexpected: "予期しないエラーが発生しました。",
    },
    toasts: {
      updated: "ゲームを更新しました。",
      added: "ゲームをライブラリに追加しました。",
      deleted: "ゲームをライブラリから削除しました。元のTXTは変更していません。",
      imported: "{count}件のゲームをインポートしました。",
      importedWithDuplicates:
        "{count}件のゲームをインポートしました。{duplicates}件の重複を省略しました。",
      exported: "{count}件のゲームをエクスポートしました。",
      exportedWithWarnings: "{count}件のゲームを警告{warnings}件付きでエクスポートしました。",
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
