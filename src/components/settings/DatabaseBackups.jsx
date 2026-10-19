import { useState } from 'react';
import PropTypes from 'prop-types';
import BackupSchedule from './BackupSchedule';

export default function DatabaseBackups({ apiBaseUrl, getToken }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [lastBackup, setLastBackup] = useState(null);

  async function backup() {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const token = getToken();
      if (!token) throw new Error('Please sign in again before creating a backup.');
      const response = await fetch(`${apiBaseUrl}/api/settings/database-backups`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const details = await response.json().catch(() => null);
        const configurationErrors = {
          'MySQL backup utility is unavailable': 'The backend cannot run mysqldump. Rebuild and recreate the backend container using the updated Dockerfile, then try again.',
          'Backup datasource configuration is unsupported': 'The backend database connection is not supported by the backup service. Check its MySQL connection configuration.',
        };
        if (response.status === 503 && configurationErrors[details?.message]) {
          throw new Error(configurationErrors[details.message]);
        }
        const messages = { 401: 'Please sign in again.', 403: 'Only administrators can back up the database.', 409: 'A backup is already running. Please try again later.', 503: 'Database backups are not configured on the server yet.', 504: 'The backup timed out. Please contact your administrator.' };
        throw new Error(messages[response.status] || 'The database backup failed. Please try again or contact your administrator.');
      }
      const blob = await response.blob();
      if (!blob.size) throw new Error('The server returned an empty backup.');
      const filename = `eac-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.sql`;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      setLastBackup(new Date());
    } catch (failure) {
      setError(failure.message || 'Unable to connect to the backup service.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="bg-white rounded-xl border border-slate-200 p-6 space-y-5" aria-labelledby="database-backups-title">
      <div>
        <h2 id="database-backups-title" className="text-xl font-semibold text-slate-900">Database Backups</h2>
        <p className="mt-2 text-sm text-slate-600">Create a SQL backup of the application database and download it to your computer. Uploaded documents and attachments are not included.</p>
      </div>
      <div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-700">
        <p><strong>Save location:</strong> Your browser’s download folder, or the location you choose when prompted.</p>
        <p className="mt-2">Keep the backup in a secure location; it contains application data.</p>
      </div>
      <button type="button" onClick={backup} disabled={busy} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
        {busy ? 'Creating backup…' : 'Back Up Database'}
      </button>
      <div role="status" aria-live="polite" className="text-sm text-slate-600">
        {busy ? 'Preparing your backup. Keep this page open until the download starts.' : lastBackup ? `Backup created; download started at ${lastBackup.toLocaleString()}. Check your downloads to confirm it was saved.` : 'No backup created in this page session.'}
      </div>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <BackupSchedule apiBaseUrl={apiBaseUrl} getToken={getToken} />
    </section>
  );
}

DatabaseBackups.propTypes = { apiBaseUrl: PropTypes.string.isRequired, getToken: PropTypes.func.isRequired };
