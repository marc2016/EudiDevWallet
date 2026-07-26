import type { TranslationKey } from './de';

export const en: Record<TranslationKey, string> = {
  // Toolbar
  'toolbar.simple': 'Simple',
  'toolbar.debug': 'Debug',
  'toolbar.light': 'Light',
  'toolbar.dark': 'Dark',
  'toolbar.langDe': 'DE',
  'toolbar.langEn': 'EN',

  // App Header
  'app.title': 'EUDI Dev Wallet',
  'app.subtitle': 'Developer tool for EUDI wallet interactions (PID, MDOC, SD-JWT)',

  // Views & Tabs
  'tab.request': 'Request',
  'tab.wallet': 'My Wallet',
  'tab.cards': 'Cards',
  'tab.response': 'Response',
  'tab.protocol': 'Log',
  'tab.settings': 'Settings',

  // Settings
  'settings.certificateMode': 'Certificate Mode',
  'settings.cert.off': 'Off',
  'settings.cert.display': 'Display',
  'settings.cert.soft': 'Soft validation',
  'settings.cert.strict': 'Strict validation',

  'settings.trustAnchor': 'Trust Anchor',
  'settings.trust.eudi_ca': 'EUDI CA (Official)',
  'settings.trust.custom': 'Custom (Custom CAs)',
  'settings.trust.mock': 'Mock / Dev (Allow all)',
  'settings.customTrustAnchorsLabel': 'Custom Trust Anchors / CAs (comma separated)',
  'settings.customTrustAnchorsPlaceholder': 'e.g. Relying Party Registrar, My Test Root CA',

  'settings.transport': 'Transport',
  'settings.transport.auto': 'Auto',
  'settings.transport.direct_post': 'direct_post',
  'settings.transport.direct_post_jwt': 'direct_post.jwt',
  'settings.transport.raw_json': 'Raw JSON',

  'settings.credentialFormat': 'Credential Format',
  'settings.format.auto': 'Auto',
  'settings.format.dc_sd_jwt': 'SD-JWT (dc+sd-jwt)',
  'settings.format.mso_mdoc': 'mdoc (mso_mdoc)',

  'settings.simulateOneTimeUse': 'Simulate One-Time-Use',

  // Wallet Cards Tab
  'wallet.title': 'My Digital Credentials',
  'wallet.issuedCredentials': 'Issued Credentials',
  'wallet.builtinPresets': 'Built-in Presets',
  'wallet.addCard': 'Add New Card',
  'wallet.deleteConfirmTitle': 'Delete Credential',
  'wallet.deleteConfirmMsg': 'Are you sure you want to delete credential "{title}"?',
  'wallet.deleteAllConfirmTitle': 'Delete All',
  'wallet.deleteAllConfirmMsg': 'Are you sure you want to delete all {count} issued credentials?',
  'wallet.delete': 'Delete',
  'wallet.deleteAll': 'Delete All',
  'wallet.cancel': 'Cancel',
  'wallet.cardDetails': 'Card Details',
  'wallet.format': 'Format',
  'wallet.issuer': 'Issuer',
  'wallet.attributes': 'Attributes',
  'wallet.noIssuedCards': 'No credentials issued via OpenID4VCI yet.',
  'wallet.noIssuedCardsHint': 'Scan a Credential Offer link in the Request tab to receive credentials.',
  'wallet.receiveSuccess': 'Successfully received from {issuer}!',
  'wallet.showDetails': 'Show details',

  // Simple View & Actions
  'action.scanQR': 'Scan QR Code',
  'action.pasteLink': 'Paste Link',
  'action.requestCard': 'Request Card (VCI)',
  'action.process': 'Process',
  'action.reset': 'Reset',
  'simple.urlPlaceholder': 'openid4vp://… or openid-credential-offer://…',
  'simple.analyze': 'Analyze',
  'simple.pasteFromClipboard': 'Paste from clipboard',
  'simple.processing': 'Processing…',
  'simple.completed': 'Completed',
  'simple.issuanceHeader': '📥 Credential Issuance (OpenID4VCI)',

  // Request Input (Debug View)
  'requestInput.instruction': 'Insert OpenID4VP request or OpenID4VCI Credential Offer URI / query string',
  'requestInput.placeholder': 'openid4vp://?client_id=… or openid-credential-offer://…',
  'requestInput.analyze': 'Analyze',
  'requestInput.paste': 'Paste',

  // Action Bar
  'action.disclosurePreview': 'Sharing Preview',
  'action.share': 'Share',

  // Modals & Wizards
  'wizard.issuanceTitle': 'Request Credential (VCI)',
  'wizard.disclosureTitle': 'Credential Sharing (VP)',
  'wizard.close': 'Close',
  'wizard.approve': 'Approve & Send',
  'wizard.reject': 'Reject',
  'wizard.requestedAttributes': 'Requested Attributes',

  // Selective Disclosure Modal
  'disclosure.title': 'Selective Disclosure & Sharing Preview',
  'disclosure.verifier': 'Recipient (Verifier)',
  'disclosure.filterAttributes': 'Filter attributes:',
  'disclosure.deselectOptional': 'Deselect all optional',
  'disclosure.selectAll': 'Select all',
  'disclosure.fullDisclosure': 'Full disclosure ({count} attributes)',
  'disclosure.retained': '🛡️ Selective Disclosure: {count} {unit} retained',
  'disclosure.unitAttribute': 'attribute',
  'disclosure.unitAttributes': 'attributes',
  'disclosure.cancel': 'Cancel',
  'disclosure.approve': 'Share data now',
  'disclosure.deselected': 'Deselected',
  'disclosure.suppressed': 'Suppressed',
  'disclosure.transmitted': 'Transmitted',
  'disclosure.summary': 'Disclosure Summary',
  'disclosure.totalRequested': 'Total requested attributes:',
  'disclosure.totalDisclosed': 'Disclosed attributes:',
  'disclosure.totalOmitted': 'Suppressed attributes (Selective Disclosure):',

  // Activity Log
  'log.title': 'Activity Log',
  'log.clear': 'Clear Log',
  'log.export': 'Export',
  'log.empty': 'No log entries yet.',
  'log.detailTitle': 'Log Details',
  'log.clearOnRequest': 'Clear log on new request',

  // Request & Response
  'request.title': 'Request',
  'request.placeholder': 'Enter openid-vc:// or https://...',
  'request.submit': 'Process Request',
  'response.title': 'Response',
  'response.empty': 'No response available yet.',
  'response.copy': 'Copy',
};
