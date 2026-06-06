import { AlertTriangle } from 'lucide-react'

interface Props {
  title: string
  message: string
  onConfirm: () => void
  onCancel: () => void
  isLoading?: boolean
}

export default function ConfirmDialog({ title, message, onConfirm, onCancel, isLoading }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm shadow-2xl p-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 bg-red-500/15 rounded-full flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <h3 className="font-semibold text-white">{title}</h3>
            <p className="text-slate-400 text-sm mt-1">{message}</p>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 mt-6">
          <button onClick={onCancel} className="btn-secondary text-sm">Cancel</button>
          <button onClick={onConfirm} disabled={isLoading} className="btn-danger text-sm flex items-center gap-2">
            {isLoading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}
