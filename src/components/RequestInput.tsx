import { useState } from 'react';
import { Card } from 'primereact/card';
import { InputTextarea } from 'primereact/inputtextarea';
import { Button } from 'primereact/button';
import { WalletSettings, type WalletSettingsProps } from './WalletSettings';
import { useTranslation } from '../i18n/LanguageContext';

interface RequestInputProps {
  onAnalyze: (url: string) => void;
  loading: boolean;
  settings?: WalletSettingsProps;
}

export function RequestInput({ onAnalyze, loading, settings }: RequestInputProps) {
  const { t } = useTranslation();
  const [value, setValue] = useState('');

  return (
    <Card className="mb-2">
      <p className="text-sm text-color-secondary mt-0 mb-2">
        {t('requestInput.instruction')}
      </p>
      <InputTextarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={4}
        autoResize
        className="w-full font-mono text-sm"
        placeholder={t('requestInput.placeholder')}
      />
      <div className="mt-2 flex gap-2">
        <Button
          label={t('requestInput.analyze')}
          icon="pi pi-search"
          onClick={() => onAnalyze(value)}
          loading={loading}
          disabled={!value.trim()}
        />
        <Button
          label={t('requestInput.paste')}
          icon="pi pi-file-import"
          onClick={async () => {
            try {
              const text = await navigator.clipboard.readText();
              setValue(text);
            } catch (err) {
              console.error('Failed to read clipboard: ', err);
            }
          }}
          severity="secondary"
        />
      </div>
      {settings && (
        <div className="wallet-settings-inline">
          <WalletSettings {...settings} />
        </div>
      )}
    </Card>
  );
}
