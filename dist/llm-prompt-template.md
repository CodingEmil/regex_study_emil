# LLM Prompt Template – Regex Kurs Generator

Verwende diesen Prompt mit ChatGPT, Claude, Gemini oder einem anderen LLM, um eigene Regex-Kurse zu erstellen, die du direkt in die Lernplattform laden kannst.

---

## Prompt (zum Kopieren)

```
Erstelle einen Regex-Kurs im folgenden JSON-Format. Der Kurs soll Lernenden helfen, reguläre Ausdrücke zu verstehen.

JSON-Format:
{
  "course": {
    "title": "Kursname",
    "description": "Kurzbeschreibung",
    "author": "Autor (optional)"
  },
  "tasks": [
    {
      "id": "task-1",
      "title": "Aufgabentitel",
      "description": "Aufgabenbeschreibung mit **Markdown** support. Erkläre, was die Aufgabe erfordert.",
      "testCases": [
        { "text": "Testtext der matchen soll", "shouldMatch": true },
        { "text": "Testtext der NICHT matchen soll", "shouldMatch": false }
      ],
      "hints": [
        "Erster Hinweis (allgemein)",
        "Zweiter Hinweis (konkreter)",
        "Dritter Hinweis (sehr konkret, fast die Lösung)"
      ],
      "solution": "regulaerer_ausdruck_hier",
      "explanation": "Erklärung warum diese Lösung funktioniert",
      "flags": "gi"
    }
  ]
}

Wichtige Regeln:
- Jede Aufgabe braucht mindestens 4 Testfälle (mindestens 2x shouldMatch:true, mindestens 2x shouldMatch:false)
- hints Array: 2-4 Hinweise, vom allgemeinen zum konkreten
- solution: nur der Regex-Ausdruck ohne Schrägstriche (z.B. "\\d+" nicht "/\\d+/")
- flags: optional, z.B. "gi" für global+case-insensitive, "" für keine Flags
- description: darf Markdown verwenden (**fett**, `code`, Listen, etc.)
- ids müssen eindeutig sein (task-1, task-2, ...)
- Stelle sicher, dass die solution tatsächlich alle shouldMatch:true Tests besteht und shouldMatch:false Tests nicht matcht

Erstelle einen Kurs mit [ANZAHL] Aufgaben zum Thema [THEMA].
Schwierigkeitsniveau: [ANFÄNGER/FORTGESCHRITTEN/EXPERTE]
Sprache der Beschreibungen: [DEUTSCH/ENGLISCH]

Antworte NUR mit dem JSON, ohne zusätzlichen Text darum herum.
```

---

## Anpassungsoptionen

Ersetze die Platzhalter in eckigen Klammern:

| Platzhalter | Beispiele |
|-------------|-----------|
| `[ANZAHL]` | 5, 7, 10 |
| `[THEMA]` | JavaScript-Regex, Log-Parsing, Datumsformate, URL-Validierung, HTML-Parsing |
| `[SCHWIERIGKEITSNIVEAU]` | ANFÄNGER, FORTGESCHRITTEN, EXPERTE |
| `[SPRACHE]` | DEUTSCH, ENGLISCH |

---

## Beispiel-Prompts

**Für Anfänger (Deutsch):**
> "Erstelle einen Kurs mit 5 Aufgaben zum Thema Regex-Grundlagen. Schwierigkeitsniveau: ANFÄNGER. Sprache: DEUTSCH."

**Für Log-Analyse (Englisch):**
> "Erstelle einen Kurs mit 7 Aufgaben zum Thema Parsing server log files with regex. Schwierigkeitsniveau: FORTGESCHRITTEN. Sprache: ENGLISCH."

**Für spezifische Domänen:**
> "Erstelle einen Kurs mit 5 Aufgaben zum Thema Validierung von Telefonnummern, Postleitzahlen und IBAN. Schwierigkeitsniveau: FORTGESCHRITTEN. Sprache: DEUTSCH."

---

## Kurs laden

Nachdem das LLM den JSON-Kurs generiert hat:

1. Kopiere das JSON
2. Speichere es als `.json` Datei (z.B. `mein-kurs.json`)
3. Öffne die Regex Lernplattform
4. Klicke auf "JSON-Datei hochladen" und wähle deine Datei

Oder: Hoste die JSON-Datei irgendwo (GitHub Gist, Webserver) und lade sie per URL.
