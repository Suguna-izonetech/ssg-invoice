import api from './api'
import type { Invoice, InvoiceListResponse, InvoiceFilters } from '../types'

export const invoiceService = {
  async list(filters: InvoiceFilters = {}): Promise<InvoiceListResponse> {
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.set(key, String(value))
      }
    })
    const { data } = await api.get<InvoiceListResponse>(`/invoices?${params}`)
    return data
  },

  async get(id: string): Promise<Invoice> {
    const { data } = await api.get<Invoice>(`/invoices/${id}`)
    return data
  },

  async create(payload: {
    bank_name: string
    invoice_date: string
    loan_requested_amount: number
    loan_sanctioned_amount?: number | null
  }): Promise<Invoice> {
    const { data } = await api.post<Invoice>('/invoices', payload)
    return data
  },

  async update(id: string, payload: Partial<{
    bank_name: string
    invoice_date: string
    loan_requested_amount: number
    loan_sanctioned_amount: number | null
  }>): Promise<Invoice> {
    const { data } = await api.put<Invoice>(`/invoices/${id}`, payload)
    return data
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/invoices/${id}`)
  },

  async uploadFile(invoiceId: string, file: File): Promise<void> {
    const formData = new FormData()
    formData.append('file', file)
    await api.post(`/invoices/${invoiceId}/file`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  async viewFile(invoiceId: string): Promise<void> {
    const { data } = await api.get(
      `/invoices/${invoiceId}/file/view`,
      {
        responseType: 'blob',
      }
    )

    const url = URL.createObjectURL(data)
    window.open(url, '_blank')
  },

  getFileDownloadUrl(invoiceId: string): string {
    return `/api/invoices/${invoiceId}/file/download`
  },

  async downloadFile(invoiceId: string, filename: string): Promise<void> {
    const { data } = await api.get(`/invoices/${invoiceId}/file/download`, {
      responseType: 'blob',
    })
    const url = URL.createObjectURL(data)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  },

  async exportCsv(filters: Partial<InvoiceFilters> = {}): Promise<void> {
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.set(key, String(value))
      }
    })
    const { data } = await api.get(`/invoices/export/csv?${params}`, { responseType: 'blob' })
    const url = URL.createObjectURL(data)
    const a = document.createElement('a')
    a.href = url
    a.download = 'invoices.csv'
    a.click()
    URL.revokeObjectURL(url)
  },

  async exportExcel(filters: Partial<InvoiceFilters> = {}): Promise<void> {
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.set(key, String(value))
      }
    })
    const { data } = await api.get(`/invoices/export/excel?${params}`, { responseType: 'blob' })
    const url = URL.createObjectURL(data)
    const a = document.createElement('a')
    a.href = url
    a.download = 'invoices.xlsx'
    a.click()
    URL.revokeObjectURL(url)
  },
}
