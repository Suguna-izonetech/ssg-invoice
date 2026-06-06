import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X } from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import { invoiceService } from '../../services/invoiceService'
import type { Invoice } from '../../types'
import { BANKS } from '../../types'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

const schema = z.object({
  bank_name: z.string().min(1, 'Bank is required'),
  invoice_date: z.string().min(1, 'Date is required'),
  loan_requested_amount: z.coerce.number().positive('Must be positive'),
  loan_sanctioned_amount: z.coerce.number().min(0).optional().nullable(),
})
type FormData = z.infer<typeof schema>

interface Props {
  invoice?: Invoice
  onClose: () => void
  onSuccess: () => void
}

export default function InvoiceFormModal({ invoice, onClose, onSuccess }: Props) {
  const isEdit = !!invoice

  const { register, handleSubmit, formState: { errors }, reset } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: invoice ? {
      bank_name: invoice.bank_name,
      invoice_date: format(new Date(invoice.invoice_date), 'yyyy-MM-dd'),
      loan_requested_amount: Number(invoice.loan_requested_amount),
      loan_sanctioned_amount: invoice.loan_sanctioned_amount ? Number(invoice.loan_sanctioned_amount) : undefined,
    } : undefined,
  })

  const mut = useMutation({
    mutationFn: (data: FormData) => {
      const payload = {
        bank_name: data.bank_name,
        invoice_date: new Date(data.invoice_date).toISOString(),
        loan_requested_amount: data.loan_requested_amount,
        loan_sanctioned_amount: data.loan_sanctioned_amount || null,
      }
      return isEdit ? invoiceService.update(invoice!.id, payload) : invoiceService.create(payload)
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Invoice updated' : 'Invoice created')
      onSuccess()
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || 'Operation failed')
    },
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <h2 className="text-lg font-semibold text-white">{isEdit ? 'Edit Invoice' : 'Create Invoice'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit(d => mut.mutate(d))} className="p-6 space-y-4">
          {isEdit && (
            <div>
              <label className="label">Invoice Number</label>
              <input type="text" value={invoice!.invoice_number} disabled className="input bg-slate-800/50 text-slate-500 cursor-not-allowed" />
              <p className="text-slate-600 text-xs mt-1">Auto-generated, cannot be changed</p>
            </div>
          )}

          <div>
            <label className="label">Bank Name <span className="text-red-400">*</span></label>
            <select {...register('bank_name')} className="input">
              <option value="">Select bank...</option>
              {BANKS.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
            {errors.bank_name && <p className="text-red-400 text-xs mt-1">{errors.bank_name.message}</p>}
          </div>

          <div>
            <label className="label">Invoice Date <span className="text-red-400">*</span></label>
            <input type="date" {...register('invoice_date')} className="input" />
            {errors.invoice_date && <p className="text-red-400 text-xs mt-1">{errors.invoice_date.message}</p>}
          </div>

          <div>
            <label className="label">Loan Requested Amount (₹) <span className="text-red-400">*</span></label>
            <input type="number" step="0.01" min="0.01" {...register('loan_requested_amount')} className="input" placeholder="e.g. 500000" />
            {errors.loan_requested_amount && <p className="text-red-400 text-xs mt-1">{errors.loan_requested_amount.message}</p>}
          </div>

          <div>
            <label className="label">Loan Sanctioned Amount (₹)</label>
            <input type="number" step="0.01" min="0" {...register('loan_sanctioned_amount')} className="input" placeholder="Leave empty if not yet sanctioned" />
            {errors.loan_sanctioned_amount && <p className="text-red-400 text-xs mt-1">{errors.loan_sanctioned_amount.message}</p>}
          </div>

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={mut.isPending} className="btn-primary flex items-center gap-2">
              {mut.isPending && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {isEdit ? 'Update Invoice' : 'Create Invoice'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
