import { X, AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  type?: 'danger' | 'warning' | 'info';
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = 'Confirmer',
  cancelText = 'Annuler',
  onConfirm,
  onCancel,
  type = 'danger'
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  const getTypeStyles = () => {
    switch (type) {
      case 'danger':
        return {
          icon: 'text-red-400',
          iconBg: 'bg-red-500/10 border border-red-500/20',
          confirmButton: 'bg-red-600 hover:bg-red-500'
        };
      case 'warning':
        return {
          icon: 'text-yellow-400',
          iconBg: 'bg-yellow-500/10 border border-yellow-500/20',
          confirmButton: 'bg-yellow-600 hover:bg-yellow-500'
        };
      case 'info':
        return {
          icon: 'text-blue-400',
          iconBg: 'bg-blue-500/10 border border-blue-500/20',
          confirmButton: 'bg-blue-600 hover:bg-blue-500'
        };
      default:
        return {
          icon: 'text-red-400',
          iconBg: 'bg-red-500/10 border border-red-500/20',
          confirmButton: 'bg-red-600 hover:bg-red-500'
        };
    }
  };

  const styles = getTypeStyles();

  return (
    <div className="fixed inset-0 z-[9999] overflow-y-auto">
      <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
          onClick={onCancel}
        />

        {/* Modal */}
        <div className="relative transform overflow-hidden rounded-2xl bg-[#0d1530] border border-white/10 px-4 pb-4 pt-5 text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
          <div className="absolute right-0 top-0 hidden pr-4 pt-4 sm:block">
            <button
              type="button"
              className="rounded-lg text-white/40 hover:text-white transition-colors"
              onClick={onCancel}
            >
              <span className="sr-only">Fermer</span>
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          <div className="sm:flex sm:items-start">
            <div className={`mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl ${styles.iconBg} sm:mx-0 sm:h-10 sm:w-10`}>
              <AlertTriangle className={`h-6 w-6 ${styles.icon}`} aria-hidden="true" />
            </div>

            <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
              <h3 className="text-base font-syne font-bold leading-6 text-white">
                {title}
              </h3>
              <div className="mt-2">
                <p className="text-sm text-white/50">
                  {message}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse gap-3">
            <button
              type="button"
              className={`inline-flex w-full justify-center rounded-xl px-4 py-2.5 text-sm font-bold text-white shadow-sm sm:w-auto ${styles.confirmButton} transition-colors`}
              onClick={onConfirm}
            >
              {confirmText}
            </button>
            <button
              type="button"
              className="mt-3 inline-flex w-full justify-center rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm font-bold text-white/70 hover:text-white hover:bg-white/10 sm:mt-0 sm:w-auto transition-colors"
              onClick={onCancel}
            >
              {cancelText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
