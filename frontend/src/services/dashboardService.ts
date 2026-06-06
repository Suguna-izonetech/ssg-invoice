import api from './api'
import type { DashboardStats, MonthlyTrend, WeeklyTrend, BankDistribution, LoanComparison, Invoice } from '../types'

export const dashboardService = {
  async getStats(): Promise<DashboardStats> {
    const { data } = await api.get<DashboardStats>('/dashboard/stats')
    return data
  },
  async getMonthlyTrends(): Promise<MonthlyTrend[]> {
    const { data } = await api.get<MonthlyTrend[]>('/dashboard/monthly-trends')
    return data
  },
  async getWeeklyTrends(): Promise<WeeklyTrend[]> {
    const { data } = await api.get<WeeklyTrend[]>('/dashboard/weekly-trends')
    return data
  },
  async getBankDistribution(): Promise<BankDistribution[]> {
    const { data } = await api.get<BankDistribution[]>('/dashboard/bank-distribution')
    return data
  },
  async getLoanComparison(): Promise<LoanComparison[]> {
    const { data } = await api.get<LoanComparison[]>('/dashboard/loan-comparison')
    return data
  },
  async getRecentInvoices(): Promise<Invoice[]> {
    const { data } = await api.get<Invoice[]>('/dashboard/recent-invoices')
    return data
  },
  async getUpcomingInvoices(): Promise<Invoice[]> {
    const { data } = await api.get<Invoice[]>('/dashboard/upcoming-invoices')
    return data
  },
}
