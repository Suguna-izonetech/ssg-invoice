import { useState, useRef } from 'react'
import { X, Upload, FileText, Image, CheckCircle2 } from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import { invoiceService } from '../../services/invoiceService'
import type { Invoice } from '../../types'
import toast from 'react-hot-toast'

const ALLOWED = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']
const MAX_SIZE = 20 * 1024 * 1024

interface Props {
  invoice: Invoice
  onClose: () => void
  onSuccess: () => void
}

export default function FileUploadModal({ invoice, onClose, onSuccess }: Props) {
  const [file, setFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const isReplace = !!invoice.uploaded_file

  const mut = useMutation({
    mutationFn: (f: File) => invoiceService.uploadFile(invoice.id, f),
    onSuccess: () => {
      toast.success(isReplace ? 'File replaced successfully' : 'File uploaded successfully')
      onSuccess()
    },
    onError: (err: any) => toast.error(err?.response?.data?.detail || 'Upload failed'),
  })

  const handleFile = (f: File) => {
    if (!ALLOWED.includes(f.type)) { toast.error('Only PDF, JPG, JPEG, PNG allowed'); return }
    if (f.size > MAX_SIZE) { toast.error('File must be under 20MB'); return }
    setFile(f)
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }

  const fmtSize = (bytes: number) => bytes < 1024 * 1024
    ? `${(bytes / 1024).toFixed(1)} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div>
            <h2 className="text-lg font-semibold text-white">{isReplace ? 'Replace File' : 'Upload File'}</h2>
            <p className="text-slate-500 text-xs mt-0.5">{invoice.invoice_number}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={20} /></button>
        </div>

        <div className="p-6 space-y-4">
          {isReplace && (
            <div className="bg-amber-900/20 border border-amber-700/40 rounded-lg px-4 py-2.5 text-sm text-amber-300">
              Current file: <span className="font-medium">{invoice.uploaded_file!.filename}</span> will be replaced.
            </div>
          )}

          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${dragOver ? 'border-blue-500 bg-blue-500/5' : 'border-slate-700 hover:border-slate-600 hover:bg-slate-800/50'}`}
          >
            <input ref={inputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
            {file ? (
              <div className="space-y-2">
                {file.type === 'application/pdf' ? <FileText className="w-10 h-10 text-red-400 mx-auto" /> : <Image className="w-10 h-10 text-blue-400 mx-auto" />}
                <p className="font-medium text-white text-sm">{file.name}</p>
                <p className="text-slate-400 text-xs">{fmtSize(file.size)}</p>
                <div className="flex items-center justify-center gap-1 text-emerald-400 text-xs">
                  <CheckCircle2 size={14} /> Ready to upload
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="w-10 h-10 text-slate-600 mx-auto" />
                <p className="text-slate-400 text-sm">Drag & drop or click to select</p>
                <p className="text-slate-600 text-xs">PDF, JPG, JPEG, PNG · Max 20MB</p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3">
            <button onClick={onClose} className="btn-secondary">Cancel</button>
            <button
              onClick={() => file && mut.mutate(file)}
              disabled={!file || mut.isPending}
              className="btn-primary flex items-center gap-2"
            >
              {mut.isPending && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {isReplace ? 'Replace File' : 'Upload File'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
