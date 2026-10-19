import { useEffect, useState } from 'react';
import { CheckCircleIcon, ExclamationTriangleIcon, InformationCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { notifyDialogClosed, showAlert, showConfirm, subscribeToDialogs } from '../services/dialogService';

const inferTone = (message, requestedTone) => {
  if (requestedTone) return requestedTone;
  const value = String(message).toLowerCase();
  if (/error|failed|unable|invalid|denied/.test(value)) return 'error';
  if (/success|saved|created|updated|completed|sent/.test(value)) return 'success';
  if (/delete|remove|clear|reset|reject|deactivate|cannot be undone/.test(value)) return 'warning';
  return 'info';
};

const tones = {
  info: { Icon: InformationCircleIcon, icon: 'text-blue-600', panel: 'bg-blue-50 dark:bg-blue-950/40', button: 'bg-blue-600 hover:bg-blue-700' },
  success: { Icon: CheckCircleIcon, icon: 'text-emerald-600', panel: 'bg-emerald-50 dark:bg-emerald-950/40', button: 'bg-emerald-600 hover:bg-emerald-700' },
  warning: { Icon: ExclamationTriangleIcon, icon: 'text-amber-600', panel: 'bg-amber-50 dark:bg-amber-950/40', button: 'bg-amber-600 hover:bg-amber-700' },
  error: { Icon: XCircleIcon, icon: 'text-red-600', panel: 'bg-red-50 dark:bg-red-950/40', button: 'bg-red-600 hover:bg-red-700' },
};

export default function AppDialogProvider({ children }) {
  const [dialog, setDialog] = useState(null);

  useEffect(() => subscribeToDialogs(setDialog), []);

  useEffect(() => {
    const nativeAlert = window.alert;
    const previousAppConfirm = window.appConfirm;
    window.alert = (message) => { showAlert(message); };
    window.appConfirm = showConfirm;
    return () => {
      window.alert = nativeAlert;
      if (previousAppConfirm) window.appConfirm = previousAppConfirm;
      else delete window.appConfirm;
    };
  }, []);

  useEffect(() => {
    if (!dialog) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') close(false);
      if (event.key === 'Enter') close(true);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [dialog]);

  const close = (result) => {
    if (!dialog) return;
    dialog.resolve(result);
    setDialog(null);
    setTimeout(notifyDialogClosed, 0);
  };

  const tone = inferTone(dialog?.message, dialog?.tone);
  const style = tones[tone];
  const Icon = style.Icon;
  const defaultTitle = dialog?.kind === 'confirm'
    ? (tone === 'warning' ? 'Please confirm' : 'Confirm action')
    : ({ error: 'Something went wrong', success: 'Completed', warning: 'Attention', info: 'Notice' }[tone]);

  return (
    <>
      {children}
      {dialog && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && dialog.kind === 'alert' && close(true)}>
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900" role="dialog" aria-modal="true" aria-labelledby="app-dialog-title">
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${style.panel}`}>
                  <Icon className={`h-7 w-7 ${style.icon}`} />
                </div>
                <div className="min-w-0 pt-1">
                  <h2 id="app-dialog-title" className="text-lg font-semibold text-slate-900 dark:text-white">{dialog.title || defaultTitle}</h2>
                  <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600 dark:text-slate-300">{dialog.message}</p>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4 dark:border-slate-700 dark:bg-slate-800/60">
              {dialog.kind === 'confirm' && (
                <button type="button" onClick={() => close(false)} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">
                  {dialog.cancelLabel || 'Cancel'}
                </button>
              )}
              <button type="button" autoFocus onClick={() => close(true)} className={`rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm ${style.button}`}>
                {dialog.confirmLabel || (dialog.kind === 'confirm' ? 'Confirm' : 'OK')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
