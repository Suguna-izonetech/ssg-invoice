export interface User {
  id: string
  username: string
  email: string
  is_active: boolean
}

export interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
}

export interface Invoice {
  id: string
  invoice_number: string
  serial_number: number
  financial_year: string
  bank_name: string
  invoice_date: string
  loan_requested_amount: string
  loan_sanctioned_amount: string | null
  created_at: string
  updated_at: string
  uploaded_file?: UploadedFile | null
}

export interface UploadedFile {
  id: string
  invoice_id: string
  filename: string
  content_type: string
  file_size: number
  uploaded_at: string
  updated_at: string
}

export interface InvoiceListResponse {
  items: Invoice[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

export interface InvoiceFilters {
  page?: number
  page_size?: number
  bank_name?: string
  date_from?: string
  date_to?: string
  loan_requested_min?: number
  loan_requested_max?: number
  loan_sanctioned_min?: number
  loan_sanctioned_max?: number
  search?: string
  sort_by?: string
  sort_order?: 'asc' | 'desc'
}

export interface DashboardStats {
  total_invoices: number
  today_invoices: number
  weekly_invoices: number
  monthly_invoices: number
  total_invoice_amount: string
  total_loan_requested: string
  total_loan_sanctioned: string
}

export interface MonthlyTrend {
  month: string
  count: number
  total_amount: string
}

export interface WeeklyTrend {
  week: string
  count: number
  total_amount: string
}

export interface BankDistribution {
  bank_name: string
  count: number
  total_amount: string
}

export interface LoanComparison {
  month: string
  loan_requested: string
  loan_sanctioned: string
}

export interface Session {
  id: string
  device_fingerprint: string
  device_info: string | null
  ip_address: string | null
  login_at: string
  last_activity_at: string
  is_active: boolean
}

export interface ProfileResponse {
  id: string
  username: string
  email: string
  has_profile_photo: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface UpcomingInvoiceNumber {
  next_invoice_number: string
  financial_year: string
  next_serial: number
}

export const BANKS = [
  'Federal Bank',
  'IndusInd Bank',
  'DCB Bank',
  'Chola Mandalam',
  'SMFG Financial Services',
  'ICICI Bank',
  'Axis Bank',
  'IDFC First Bank',
  'HDFC Bank',
  'Yes Bank',
  'State Bank of India',
  'Kotak Mahindra',
  'HDB Financial Services',
  'Sundaram Finance',
  'Punjab National Bank',
  'Poonawalla Fincorp',
  'REPCO Home Finance',
  'Parimal Finance',
  'Aditya Birla Finance',
  'Equitas',
  'TRU Homes',
  'HomeFirst',
  'Piramal Finance',
  'PNG Housing Finance',
  'Bajaj Finance',
  'L&T Finance',
  'Tata Capital',
  'Godrej Finance',
  'Jana Small Finance Bank',
  'Jayam Finance',
] as const
export type BankName = typeof BANKS[number]
