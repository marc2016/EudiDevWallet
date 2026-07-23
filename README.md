![EudiDevWallet](public/logo.png)

# EudiDevWallet

EudiDevWallet ist eine leichtgewichtige, lokale Web-Anwendung (React), die als minimalistische Simulation einer europäischen digitalen Identitäts-Wallet (EUDI Wallet) dient. Sie wurde entwickelt, um den Integrationsprozess von **OpenID4VP**-Abfragen in Hauptanwendungen zu testen — ohne komplexe Krypto-Infrastrukturen oder externe Netzwerk-Tunnel.

> **Nur für lokale Entwicklung.** Keine produktionsreife oder zertifizierte EUDI-Wallet.

## Voraussetzungen

- Node.js (LTS) und npm
- Eine Hauptanwendung (Verifier) im Dev-Modus mit CORS für `http://localhost:5173`
- Optional: Docker

## Installation & Start

### Lokal (npm)

```bash
git clone <repository-url>
cd EudiDevWallet
npm install
npm run dev
```

Die App läuft unter **http://localhost:5173**.

```bash
npm run build    # Produktions-Build
npm run preview  # Build lokal testen
```

### Docker (Dev, Hot-Reload)

```bash
docker compose --profile dev up --build
```

### Docker (Prod, nginx)

```bash
docker compose --profile prod up --build
```

## Bedienung

1. **OpenID4VP-URL** oben links in der Card „Anfrage“ einfügen (oder den Paste-Button `📋` nutzen, um die URL direkt aus der Zwischenablage einzufügen)
2. **Analysieren** klicken
3. In der Toolbar **Zertifikatsmodus** und **Antwortformat** wählen
4. Mock-Identität wählen oder Claims direkt in der konsolidierten Datentabelle bearbeiten und anpassen
5. **Freigeben** klicken
6. Rechts im **Aktivitäts-Protokoll** jeden Schritt nachvollziehen (einschließlich dekodierter JWE- und SD-JWT-Details)

## Hauptfeatures & Simulationen

- **Einfaches Einfügen**: Paste-Button direkt neben den URL-Eingabefeldern für schnelle Workflows.
- **Konsolidierte Claim-Tabelle**: Übersichtliche Tabelle zum direkten Auswählen, Deaktivieren und Editieren von Identitäts-Attributen (inklusive Alias-Unterstützung).
- **Einmal-Credentials (Unlinkability)**: Simulation von verbrauchbaren PID-Credentials im Batch (5 Stück). Nach jedem Freigabe-Vorgang wird ein Credential verbraucht. Sinkt der Zähler auf 1 oder weniger, wird automatisch ein DPoP-Proof-basierter Refresh getriggert.
- **Erweitertes Protokoll & JWE/SD-JWT-Dekodierung**: Das Aktivitäts-Protokoll entschlüsselt und visualisiert übertragene Token-Inhalte (wie SD-JWTs und JWEs) für eine einfachere Fehlersuche.
- **Protokoll-Autoclear**: Optionale Checkbox „Protokoll bei neuer Anfrage löschen“ sorgt für eine übersichtliche History bei mehreren aufeinanderfolgenden Tests.
- **Responsives & optimiertes Layout**: Verbessertes Flexbox-Layout mit mitscrollendem Logo in der `SimpleView` für optimale mobile Handhabung.

## Unterstützte Eingaben

- `openid4vp://`, `haip://` und HTTPS-URLs mit Query-Parametern
- Roher Query-String
- `request_uri` — JWT Request Object wird per GET abgerufen
- `presentation_definition` (inline oder per `presentation_definition_uri`)
- `dcql_query`

## Antwortformate

| Modus | Beschreibung |
|-------|--------------|
| **Auto** | Leitet aus `response_mode` der Anfrage ab |
| **direct_post** | `application/x-www-form-urlencoded` mit `vp_token`, `presentation_submission`, `state` |
| **direct_post.jwt** | Form-POST mit `response=<JWT>` (inneres JWT mit `vp_token`) |
| **Raw JSON** | Reines JSON im POST-Body (Dev-Bypass in der Hauptanwendung) |

### Mock-`vp_token`

Mock-Tokens beginnen mit dem Präfix `mock-edw.` und enthalten ein JSON-Payload mit `_mock: true`. Im Dev-Modus kann die Hauptanwendung die Signaturprüfung überspringen.

## Zertifikatsmodi

| Modus | Verhalten |
|-------|-----------|
| **Aus** | Keine Zertifikatsprüfung (Default) |
| **Anzeigen** | WRPAC/WRPRC-Metadaten anzeigen |
| **Weiche Prüfung** | JWT-Signatur gegen `x5c`, blockiert bei Fehler |
| **Strikte Prüfung** | Phase 2 — noch nicht implementiert |

- **WRPAC** (Wallet-Relying Party Access Certificate): Authentifiziert den Verifier
- **WRPRC** (Registration Certificate): Deklariert erlaubte Use Cases

## Integration: Hauptanwendung (Verifier)

### CORS (Express-Beispiel)

```javascript
import cors from 'cors';

app.use(cors({
  origin: 'http://localhost:5173',
  methods: ['POST', 'GET'],
}));
```

### Dev-Bypass

```javascript
function isMockVpToken(vpToken) {
  return typeof vpToken === 'string' && vpToken.startsWith('mock-edw.');
}

app.post('/callback', (req, res) => {
  if (process.env.NODE_ENV === 'development' && isMockVpToken(req.body.vp_token)) {
    // Claims aus Mock-Payload lesen
    return handleMockClaims(req, res);
  }
  if (process.env.NODE_ENV === 'development' && req.is('application/json')) {
    return handleRawJson(req, res);
  }
  // Produktions-Validierung …
});
```

Der `response_uri`-Endpoint muss **POST** akzeptieren.

## Mock-Verifier (optional)

Für Tests ohne eigene Hauptanwendung:

```bash
npm run mock-verifier
```

Öffne http://localhost:3001 und kopiere die generierte URL in EudiDevWallet.

## Test-Fixtures

- `src/fixtures/inline-request.url` — URL mit eingebetteter `presentation_definition`
- `src/fixtures/request-uri-flow.json` — Beispiel-JWT-Payload für request_uri-Flow

## Fehlerbehebung

| Problem | Lösung |
|---------|--------|
| CORS-Fehler | Origin `http://localhost:5173` in der Hauptanwendung freigeben |
| Freigaben disabled | `response_uri` fehlt oder Zertifikatsprüfung fehlgeschlagen |
| `request_uri` schlägt fehl | Session abgelaufen, CORS beim GET, Netzwerk prüfen |

## Projektstruktur

```
src/
├── components/     # UI (Cards, Timeline, …)
├── lib/            # OpenID4VP-Parsing, Response-Build, Zertifikate
├── log/            # Aktivitäts-Protokoll
├── settings/       # localStorage-Einstellungen
├── data/           # Mock-Identitäten
├── fixtures/       # Test-URLs
└── types/          # TypeScript-Typen
```

## Lizenz

MIT — nur für Entwicklung und Tests verwenden. Keine echten Personaldaten einsetzen.llowing your project to keep going. You can also make an explicit request for maintainers.
>>>>>>> opensource/main
