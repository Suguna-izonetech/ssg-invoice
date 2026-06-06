import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus, Search, Filter, Download, FileSpreadsheet,
  Pencil, Trash2, Upload, Eye, ChevronLeft, ChevronRight,
  ChevronUp, ChevronDown, FileText, X, Check
} from 'lucide-react'
import { invoiceService } from '../../services/invoiceService'
import type { Invoice, InvoiceFilters } from '../../types'
import { BANKS } from '../../types'
import { format, parseISO } from 'date-fns'
import toast from 'react-hot-toast'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import InvoiceFormModal from '../../components/forms/InvoiceFormModal'
import FileUploadModal from '../../components/forms/FileUploadModal'
import ConfirmDialog from '../../components/ui/ConfirmDialog'

const fmt = (v: string | number | null | undefined) =>
  v != null ? '₹' + Number(v).toLocaleString('en-IN', { maximumFractionDigits: 2 }) : '—'

function SortIcon({ field, current, order }: { field: string; current: string; order: string }) {
  if (current !== field) return <ChevronUp size={14} className="opacity-20" />
  return order === 'asc' ? <ChevronUp size={14} className="text-blue-400" /> : <ChevronDown size={14} className="text-blue-400" />
}

export default function InvoicesPage() {
  const qc = useQueryClient()
  const [filters, setFilters] = useState<InvoiceFilters>({ page: 1, page_size: 10, sort_by: 'created_at', sort_order: 'desc' })
  const [showFilters, setShowFilters] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [editInvoice, setEditInvoice] = useState<Invoice | null>(null)
  const [uploadInvoice, setUploadInvoice] = useState<Invoice | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['invoices', filters],
    queryFn: () => invoiceService.list(filters),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => invoiceService.delete(id),
    onSuccess: () => {
      toast.success('Invoice deleted')
      qc.invalidateQueries({ queryKey: ['invoices'] })
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
      setDeleteId(null)
    },
    onError: () => toast.error('Failed to delete invoice'),
  })

  const setSort = (field: string) => {
    setFilters(f => ({
      ...f,
      sort_by: field,
      sort_order: f.sort_by === field && f.sort_order === 'asc' ? 'desc' : 'asc',
      page: 1,
    }))
  }

  const setFilter = (key: keyof InvoiceFilters, value: any) =>
    setFilters(f => ({ ...f, [key]: value || undefined, page: 1 }))

  const clearFilters = () =>
    setFilters({ page: 1, page_size: 10, sort_by: 'created_at', sort_order: 'desc' })

  const handleExportCsv = async () => {
    try {
      await invoiceService.exportCsv({ bank_name: filters.bank_name, date_from: filters.date_from, date_to: filters.date_to, search: filters.search })
      toast.success('CSV exported')
    } catch { toast.error('Export failed') }
  }

  const handleExportExcel = async () => {
    try {
      await invoiceService.exportExcel({ bank_name: filters.bank_name, date_from: filters.date_from, date_to: filters.date_to, search: filters.search })
      toast.success('Excel exported')
    } catch { toast.error('Export failed') }
  }

  const activeFilterCount = [filters.bank_name, filters.date_from, filters.date_to, filters.loan_requested_min, filters.loan_requested_max, filters.loan_sanctioned_min, filters.loan_sanctioned_max].filter(Boolean).length

  return (
    <div className="p-6 space-y-6 max-w-screen-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white">Invoices</h1>
          <p className="text-slate-400 text-sm mt-1">
            {data ? `${data.total} total invoices` : 'Loading...'}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={handleExportCsv} className="btn-secondary flex items-center gap-2 text-sm">
            <Download size={15} /> CSV
          </button>
          <button onClick={handleExportExcel} className="btn-secondary flex items-center gap-2 text-sm">
            <FileSpreadsheet size={15} /> Excel
          </button>
          <button onClick={() => setCreateOpen(true)} className="btn-primary flex items-center gap-2 text-sm">
            <Plus size={15} /> New Invoice
          </button>
        </div>
      </div>

      {/* Search & Filter bar */}
      <div className="card p-4 space-y-3">
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search invoice number, bank..."
              className="input pl-9 text-sm"
              value={filters.search || ''}
              onChange={e => setFilter('search', e.target.value)}
            />
          </div>
          <select
            className="input text-sm w-40"
            value={filters.bank_name || ''}
            onChange={e => setFilter('bank_name', e.target.value)}
          >
            <option value="">All Banks</option>
            {BANKS.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`btn-secondary flex items-center gap-2 text-sm relative ${showFilters ? 'ring-2 ring-blue-500' : ''}`}
          >
            <Filter size={15} /> Filters
            {activeFilterCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 text-white text-xs rounded-full flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
          {activeFilterCount > 0 && (
            <button onClick={clearFilters} className="btn-secondary flex items-center gap-2 text-sm text-red-400">
              <X size={15} /> Clear
            </button>
          )}
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-3 border-t border-slate-800">
            <div>
              <label className="label text-xs">Date From</label>
              <input type="date" className="input text-sm" value={filters.date_from || ''} onChange={e => setFilter('date_from', e.target.value)} />
            </div>
            <div>
              <label className="label text-xs">Date To</label>
              <input type="date" className="input text-sm" value={filters.date_to || ''} onChange={e => setFilter('date_to', e.target.value)} />
            </div>
            <div>
              <label className="label text-xs">Loan Requested Min (₹)</label>
              <input type="number" className="input text-sm" placeholder="0" value={filters.loan_requested_min || ''} onChange={e => setFilter('loan_requested_min', e.target.value ? Number(e.target.value) : undefined)} />
            </div>
            <div>
              <label className="label text-xs">Loan Requested Max (₹)</label>
              <input type="number" className="input text-sm" placeholder="Any" value={filters.loan_requested_max || ''} onChange={e => setFilter('loan_requested_max', e.target.value ? Number(e.target.value) : undefined)} />
            </div>
            <div>
              <label className="label text-xs">Loan Sanctioned Min (₹)</label>
              <input type="number" className="input text-sm" placeholder="0" value={filters.loan_sanctioned_min || ''} onChange={e => setFilter('loan_sanctioned_min', e.target.value ? Number(e.target.value) : undefined)} />
            </div>
            <div>
              <label className="label text-xs">Loan Sanctioned Max (₹)</label>
              <input type="number" className="input text-sm" placeholder="Any" value={filters.loan_sanctioned_max || ''} onChange={e => setFilter('loan_sanctioned_max', e.target.value ? Number(e.target.value) : undefined)} />
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="table-header text-left">#</th>
                <th className="table-header text-left cursor-pointer hover:text-slate-200" onClick={() => setSort('invoice_number')}>
                  <span className="flex items-center gap-1">Invoice No <SortIcon field="invoice_number" current={filters.sort_by!} order={filters.sort_order!} /></span>
                </th>
                <th className="table-header text-left cursor-pointer hover:text-slate-200" onClick={() => setSort('bank_name')}>
                  <span className="flex items-center gap-1">Bank <SortIcon field="bank_name" current={filters.sort_by!} order={filters.sort_order!} /></span>
                </th>
                <th className="table-header text-left cursor-pointer hover:text-slate-200" onClick={() => setSort('invoice_date')}>
                  <span className="flex items-center gap-1">Date <SortIcon field="invoice_date" current={filters.sort_by!} order={filters.sort_order!} /></span>
                </th>
                <th className="table-header text-right cursor-pointer hover:text-slate-200" onClick={() => setSort('loan_requested_amount')}>
                  <span className="flex items-center justify-end gap-1">Loan Requested <SortIcon field="loan_requested_amount" current={filters.sort_by!} order={filters.sort_order!} /></span>
                </th>
                <th className="table-header text-right cursor-pointer hover:text-slate-200" onClick={() => setSort('loan_sanctioned_amount')}>
                  <span className="flex items-center justify-end gap-1">Loan Sanctioned <SortIcon field="loan_sanctioned_amount" current={filters.sort_by!} order={filters.sort_order!} /></span>
                </th>
                <th className="table-header text-center">File</th>
                <th className="table-header text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {isLoading ? (
                <tr><td colSpan={8} className="py-16 text-center"><LoadingSpinner className="mx-auto" /></td></tr>
              ) : data?.items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center">
                    <FileText className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                    <p className="text-slate-400 font-medium">No invoices found</p>
                    <p className="text-slate-600 text-xs mt-1">Create your first invoice to get started</p>
                  </td>
                </tr>
              ) : data?.items.map((inv, idx) => (
                <tr key={inv.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="table-cell text-slate-500">{(filters.page! - 1) * filters.page_size! + idx + 1}</td>
                  <td className="table-cell font-medium text-blue-400">{inv.invoice_number}</td>
                  <td className="table-cell">
                    <span className="badge bg-slate-800 text-slate-300">{inv.bank_name}</span>
                  </td>
                  <td className="table-cell text-slate-400">{format(parseISO(inv.invoice_date), 'dd MMM yyyy')}</td>
                  <td className="table-cell text-right font-medium text-white">{fmt(inv.loan_requested_amount)}</td>
                  <td className="table-cell text-right">
                    {inv.loan_sanctioned_amount
                      ? <span className="text-emerald-400 font-medium">{fmt(inv.loan_sanctioned_amount)}</span>
                      : <span className="text-slate-600">—</span>}
                  </td>
                  <td className="table-cell text-center">
                    {inv.uploaded_file ? (
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => invoiceService.viewFile(inv.id)}
                          className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors"
                          title="View file"
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          onClick={() => invoiceService.downloadFile(inv.id, inv.uploaded_file!.filename)}
                          className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-emerald-400/10 rounded-lg transition-colors"
                          title="Download"
                        >
                          <Download size={15} />
                        </button>
                        <button
                          onClick={() => setUploadInvoice(inv)}
                          className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-amber-400/10 rounded-lg transition-colors"
                          title="Replace file"
                        >
                          <Upload size={15} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setUploadInvoice(inv)}
                        className="flex items-center gap-1 mx-auto text-xs text-slate-500 hover:text-blue-400 transition-colors"
                      >
                        <Upload size={13} /> Upload
                      </button>
                    )}
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setEditInvoice(inv)}
                        className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => setDeleteId(inv.id)}
                        className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data && data.total_pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-800">
            <p className="text-sm text-slate-500">
              Page {data.page} of {data.total_pages} · {data.total} total
            </p>
            <div className="flex items-center gap-2">
              <select
                className="input text-xs w-20 py-1.5"
                value={filters.page_size}
                onChange={e => setFilters(f => ({ ...f, page_size: Number(e.target.value), page: 1 }))}
              >
                {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n}/pg</option>)}
              </select>
              <button
                onClick={() => setFilters(f => ({ ...f, page: Math.max(1, (f.page || 1) - 1) }))}
                disabled={data.page <= 1}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: Math.min(5, data.total_pages) }, (_, i) => {
                const page = Math.max(1, Math.min(data.total_pages - 4, data.page - 2)) + i
                return (
                  <button
                    key={page}
                    onClick={() => setFilters(f => ({ ...f, page }))}
                    className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${page === data.page ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
                  >
                    {page}
                  </button>
                )
              })}
              <button
                onClick={() => setFilters(f => ({ ...f, page: Math.min(data.total_pages, (f.page || 1) + 1) }))}
                disabled={data.page >= data.total_pages}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {createOpen && (
        <InvoiceFormModal
          onClose={() => setCreateOpen(false)}
          onSuccess={() => { setCreateOpen(false); qc.invalidateQueries({ queryKey: ['invoices'] }); qc.invalidateQueries({ queryKey: ['dashboard-stats'] }) }}
        />
      )}
      {editInvoice && (
        <InvoiceFormModal
          invoice={editInvoice}
          onClose={() => setEditInvoice(null)}
          onSuccess={() => { setEditInvoice(null); qc.invalidateQueries({ queryKey: ['invoices'] }) }}
        />
      )}
      {uploadInvoice && (
        <FileUploadModal
          invoice={uploadInvoice}
          onClose={() => setUploadInvoice(null)}
          onSuccess={() => { setUploadInvoice(null); qc.invalidateQueries({ queryKey: ['invoices'] }) }}
        />
      )}
      {deleteId && (
        <ConfirmDialog
          title="Delete Invoice"
          message="This will permanently delete the invoice and its uploaded file. This action cannot be undone."
          onConfirm={() => deleteMut.mutate(deleteId)}
          onCancel={() => setDeleteId(null)}
          isLoading={deleteMut.isPending}
        />
      )}
    </div>
  )
}
