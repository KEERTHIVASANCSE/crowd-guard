import React, { useState } from 'react';
import { X, AlertTriangle, ShieldAlert } from 'lucide-react';
import { api } from '../services/api';

interface DismissModalProps {
  incidentId: string | number | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const DismissModal: React.FC<DismissModalProps> = ({
  incidentId,
  onClose,
  onSuccess
}) => {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!incidentId) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('A dismissal reason is mandatory for SOC compliance and retraining audit.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      await api.dismissIncident(incidentId, reason.trim());
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to dismiss incident. Ensure you have admin privileges.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-md w-full p-6 shadow-2xl relative text-slate-100">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3 mb-4">
          <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold">Dismiss Incident #{incidentId}</h3>
            <p className="text-xs text-slate-400">Mark as False Positive / Training Feedback</p>
          </div>
        </div>

        <div className="bg-amber-950/30 border border-amber-800/40 rounded-lg p-3 mb-4 text-xs text-amber-200 flex items-start space-x-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>
            Dismissed incidents will be archived and excluded from the live threat queue. The rationale is logged in the SOC audit trail for active model retraining.
          </span>
        </div>

        {error && (
          <div className="bg-rose-950/40 border border-rose-800/50 rounded-lg p-3 mb-4 text-xs text-rose-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Mandatory Dismissal Rationale *
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Red backpack mistaken for high-heat signature; sunset reflection on wet tarmac..."
              rows={3}
              required
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500 transition"
            />
          </div>

          <div className="flex items-center justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-400 hover:text-white transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-sm font-semibold rounded-lg bg-amber-600 hover:bg-amber-500 text-white transition disabled:opacity-50"
            >
              {submitting ? 'Dismissing...' : 'Confirm Dismissal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
