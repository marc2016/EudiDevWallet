export const de = {
  // Toolbar
  'toolbar.simple': 'Einfach',
  'toolbar.debug': 'Debug',
  'toolbar.light': 'Hell',
  'toolbar.dark': 'Dunkel',
  'toolbar.langDe': 'DE',
  'toolbar.langEn': 'EN',

  // App Header
  'app.title': 'EUDI Dev Wallet',
  'app.subtitle': 'Entwicklertool für EUDI-Wallet-Interaktionen (PID, MDOC, SD-JWT)',

  // Views & Tabs
  'tab.request': 'Anfrage',
  'tab.wallet': 'Mein Wallet',
  'tab.cards': 'Karten',
  'tab.response': 'Antwort',
  'tab.protocol': 'Protokoll',
  'tab.settings': 'Einstellungen',

  // Settings
  'settings.certificateMode': 'Zertifikatsmodus',
  'settings.cert.off': 'Aus',
  'settings.cert.display': 'Anzeigen',
  'settings.cert.soft': 'Weiche Prüfung',
  'settings.cert.strict': 'Strikte Prüfung',

  'settings.trustAnchor': 'Trust Anchor',
  'settings.trust.eudi_ca': 'EUDI CA (Offiziell)',
  'settings.trust.custom': 'Benutzerdefiniert (Custom CAs)',
  'settings.trust.mock': 'Mock / Dev (Alle zulassen)',
  'settings.customTrustAnchorsLabel': 'Benutzerdefinierte Trust Anchors / CAs (kommagetrennt)',
  'settings.customTrustAnchorsPlaceholder': 'z. B. Relying Party Registrar, My Test Root CA',

  'settings.transport': 'Transport',
  'settings.transport.auto': 'Auto',
  'settings.transport.direct_post': 'direct_post',
  'settings.transport.direct_post_jwt': 'direct_post.jwt',
  'settings.transport.raw_json': 'Raw JSON',

  'settings.credentialFormat': 'Credential-Format',
  'settings.format.auto': 'Auto',
  'settings.format.dc_sd_jwt': 'SD-JWT (dc+sd-jwt)',
  'settings.format.mso_mdoc': 'mdoc (mso_mdoc)',

  'settings.simulateOneTimeUse': 'Einmalnutzung simulieren (One-Time-Use)',

  // Wallet Cards Tab
  'wallet.title': 'Meine digitalen Nachweise',
  'wallet.issuedCredentials': 'Ausgestellte Credentials',
  'wallet.builtinPresets': 'Eingebaute Presets',
  'wallet.addCard': 'Neue Karte hinzufügen',
  'wallet.deleteConfirmTitle': 'Credential löschen',
  'wallet.deleteConfirmMsg': 'Credential „{title}“ wirklich löschen?',
  'wallet.deleteAllConfirmTitle': 'Alle löschen',
  'wallet.deleteAllConfirmMsg': 'Alle {count} ausgestellten Credentials wirklich löschen?',
  'wallet.delete': 'Löschen',
  'wallet.deleteAll': 'Alle löschen',
  'wallet.cancel': 'Abbrechen',
  'wallet.cardDetails': 'Kartendetails',
  'wallet.format': 'Format',
  'wallet.issuer': 'Aussteller',
  'wallet.attributes': 'Attribute',
  'wallet.noIssuedCards': 'Noch keine Credentials via OpenID4VCI ausgestellt.',
  'wallet.noIssuedCardsHint': 'Scanne einen Credential-Offer-Link im Tab Anfrage, um Credentials zu empfangen.',
  'wallet.receiveSuccess': 'Erfolgreich von {issuer} empfangen!',
  'wallet.showDetails': 'Details anzeigen',

  // Simple View & Actions
  'action.scanQR': 'QR-Code scannen',
  'action.pasteLink': 'Link einfügen',
  'action.requestCard': 'Karte anfragen (VCI)',
  'action.process': 'Verarbeiten',
  'action.reset': 'Zurücksetzen',
  'simple.urlPlaceholder': 'openid4vp://… oder openid-credential-offer://…',
  'simple.analyze': 'Analysieren',
  'simple.pasteFromClipboard': 'Aus Zwischenablage einfügen',
  'simple.processing': 'Verarbeitung…',
  'simple.completed': 'Abgeschlossen',
  'simple.issuanceHeader': '📥 Credential Ausstellung (OpenID4VCI)',

  // Request Input (Debug View)
  'requestInput.instruction': 'OpenID4VP-Anfrage oder OpenID4VCI Credential Offer URI / Query-String einfügen',
  'requestInput.placeholder': 'openid4vp://?client_id=… oder openid-credential-offer://…',
  'requestInput.analyze': 'Analysieren',
  'requestInput.paste': 'Einfügen',

  // Action Bar
  'action.disclosurePreview': 'Freigabe-Vorschau',
  'action.share': 'Freigeben',

  // Modals & Wizards
  'wizard.issuanceTitle': 'Nachweis anfordern (VCI)',
  'wizard.disclosureTitle': 'Nachweis-Freigabe (VP)',
  'wizard.close': 'Schließen',
  'wizard.approve': 'Freigeben & Senden',
  'wizard.reject': 'Ablehnen',
  'wizard.requestedAttributes': 'Angeforderte Attribute',

  // Selective Disclosure Modal
  'disclosure.title': 'Selective Disclosure & Freigabe-Vorschau',
  'disclosure.verifier': 'Empfänger (Verifier)',
  'disclosure.filterAttributes': 'Attribute filtern:',
  'disclosure.deselectOptional': 'Alle optionalen abwählen',
  'disclosure.selectAll': 'Alle auswählen',
  'disclosure.fullDisclosure': 'Vollständige Offenlegung ({count} Attribute)',
  'disclosure.retained': '🛡️ Selective Disclosure: {count} {unit} zurückgehalten',
  'disclosure.unitAttribute': 'Attribut',
  'disclosure.unitAttributes': 'Attribute',
  'disclosure.cancel': 'Abbrechen',
  'disclosure.approve': 'Daten jetzt freigeben',
  'disclosure.deselected': 'Abgewählt',
  'disclosure.suppressed': 'Unterdrückt',
  'disclosure.transmitted': 'Wird übertragen',
  'disclosure.summary': 'Offenlegungs-Zusammenfassung',
  'disclosure.totalRequested': 'Angefragte Attribute gesamt:',
  'disclosure.totalDisclosed': 'Freigegebene Attribute:',
  'disclosure.totalOmitted': 'Unterdrückte Attribute (Selective Disclosure):',

  // Activity Log
  'log.title': 'Aktivitäts-Protokoll',
  'log.clear': 'Protokoll leeren',
  'log.export': 'Exportieren',
  'log.empty': 'Noch keine Einträge.',
  'log.detailTitle': 'Protokolldetails',
  'log.clearOnRequest': 'Protokoll bei neuer Anfrage löschen',

  // Request & Response
  'request.title': 'Anfrage',
  'request.placeholder': 'openid-vc:// oder https:// eingeben...',
  'request.submit': 'Anfrage verarbeiten',
  'response.title': 'Antwort',
  'response.empty': 'Noch keine Antwort vorhanden.',
  'response.copy': 'Kopieren',
};

export type TranslationKey = keyof typeof de;
