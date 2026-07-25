# Feature-Ideen & Erweiterungs-Roadmap für EudiDevWallet

Diese Übersicht enthält Erweiterungsvorschläge für **EudiDevWallet** (`PocketEudiWallet`), um die Simulation und das Testen von OpenID4VP- und EUDI-Wallet-Interaktionen für Entwickler (Relying Parties & Verifier-Dienste) noch umfassender und praxistauglicher zu gestalten. Die Ideen basieren auf dem offiziellen **German EUDI Wallet Developer Guide** (eIDAS 2.0 / BMI).

---

## ✅ 🛡️ 1. Erweiterung der Zertifikats- & Trust-Validierung (`strict`-Modus) [Umgesetzt]

* **Ziel:** Abdeckung der im Developer Guide beschriebenen Vertrauens- und Zertifikatskette für Relying Parties (WRPAC / WRPRC).
* **Funktionen:**
  * **WRPAC vs. `client_id` Match:** Automatische Überprüfung, ob der `client_id` der Anfrage exakt mit den SAN-Einträgen (Subject Alternative Name) des mitgeschickten WRPAC-Zertifikats übereinstimmt.
  * **WRPRC Use-Case / Scope-Prüfung:** Abgleich der von der Relying Party angeforderten Attribute mit den im Registrierungszertifikat (WRPRC) freigegebenen Attribut-Scopes. Warnung oder Blockade, wenn eine RP mehr Daten anfordert als ihr Zertifikat erlaubt.
  * **Konfigurierbarer Trust Anchor:** Option in den Einstellungen, eigene Root-CAs oder Mock-Trust-Anchors zu hinterlegen.

---

## ✅ 💳 2. Vordefinierte EAA-Credential Presets (Branchen-Szenarien) [Umgesetzt]

* **Ziel:** Bereitstellung typischer EAA-Nachweise (Electronic Attestation of Attributes) neben der klassischen PID (Personalausweis).
* **Vorgeschlagene Credentials:**
  * **Altersnachweis (Over 18 / Over 21):** Spezieller Nachweis für Anwendungsfälle mit reduzierter Offenlegung (Selective Disclosure), bei denen nur die Volljährigkeit bestätigt wird (ohne Name oder exaktes Geburtsdatum).
  * **Digitaler Mitarbeiterausweis (Employee ID):** Unternehmensspezifische EAA mit Position, Firmenname und Mitarbeiter-ID.
  * **Bildungsnachweis (Educational Credential):** Hochschulabschluss oder Qualifikationsnachweis (z. B. Bachelor/Master).
  * **Handelsregisterauszug / Org-ID:** Nachweis über Vertretungsberechtigung einer Organisation/Firma.

---

## ✅ 👁️ 3. Interaktiver Selective Disclosure Freigabe-Dialog [Umgesetzt]

* **Ziel:** Transparente Steuerung und Simulation der feingranularen Datenfreigabe.
* **Funktionen:**
  * **Optische Vorschau:** Vor der Übermittlung von Daten erscheint eine Vorschau-Modalität, die klar unterscheidet zwischen:
    * **Pflichtattributen** (`essential: true`)
    * **Optionalen Attributen**
  * **Interaktives Abwählen:** Entwickler können einzelne optionale Attribute per Checkbox abwählen, um zu testen, wie die Verifier-Hauptanwendung auf unvollständige Attribut-Antworten reagiert.

---

## 📷 4. Kamera QR-Code Scanner Integration

* **Ziel:** Direktes Einscannen von Test-Anfragen aus der echten Welt oder vom Bildschirm.
* **Funktionen:**
  * Integration eines WebRTC / HTML5-basierten QR-Code Scanners direkt neben den Eingabefeldern für URLs.
  * Entwickler können OpenID4VP-QR-Codes (z. B. auf Verifier-Websites oder Testkarten) direkt per Webcam/Smartphone-Kamera scannen, ohne die URL manuell per Copy-Paste einzufügen.

---

## ✅ 📥 5. OpenID4VCI Simulation (Credential Issuance Flow) [Umgesetzt]

* **Ziel:** Simulation des Empfangs neuer Credentials von einem Issuer.
* **Funktionen:**
  * Neuer Tab/Bereich **„Credential hinzufügen“**.
  * Eingabe einer Issuer-URL oder Scan eines Issuance-QR-Codes.
  * Durchführung eines vereinfachten Auth-Code / PIN-Flows.
  * Speicherung des neu ausgestellten Credentials in der Wallet.

---

## 💾 6. Export / Import von Identitäten & Wallet-Einstellungen

* **Ziel:** Leichtes Teilen und Sichern von Test-Setups im Entwickler-Team.
* **Funktionen:**
  * Button zum Exportieren aller angelegten Mock-Profile, Attribute und Einstellungen als JSON-Datei.
  * Import-Funktion zum Wiederherstellen oder Laden von vordefinierten Edge-Case-Identitäten (z. B. abgelaufene Ausweise, unvollständige Namen, Sonderzeichen).

---

## ⚙️ 7. Web-UI für den lokalen Mock-Verifier (`npm run mock-verifier`)

* **Ziel:** Komfortable Generierung verschiedener Verifier-Anfragen zum lokalen Testen.
* **Funktionen:**
  * Kleines Web-Interface unter `http://localhost:3001` mit Vorlagen-Generatoren für:
    * Signierte Request Objects mit WRPAC.
    * Anfragen mit `dcql_query` für mdoc vs. SD-JWT.
    * Anfragen mit abgelaufenem/ungültigem Zertifikat (Fehlerbehandlungstests).

---

## 📌 Priorisierungsempfehlung

| Priorität | Feature | Nutzen für Entwickler |
|-----------|---------|-----------------------|
| **Hoch** | 🛡️ Strikte Zertifikats- & Trust-Validierung | Testen von echten WRPAC/WRPRC Zertifikatsanforderungen |
| **Hoch** | 👁️ Interaktive Selective Disclosure UI | Testen von optionalen vs. essenziellen Attributabfragen |
| **Mittel** | 💳 Weitere EAA-Credential Presets | Abdecken spezifischer Branchen-Anwendungsfälle |
| **Mittel** | 📷 Webcam QR-Code Scanner | Schnellerer Test-Workflow |
| **Mittel** | 💾 Export/Import von Identitäten | Teilen von Testzuständen im Team |
| **Zukunft** | 📥 OpenID4VCI Simulation | Erweitern der Wallet in Richtung Issuance-Flows |
