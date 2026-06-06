import { clsx } from 'clsx'

export default function LoadingSpinner({ size = 'md', className }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const sizes = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-10 h-10' }
  return (
    <div className={clsx('border-2 border-slate-700 border-t-blue-500 rounded-full animate-spin', sizes[size], className)} />
  )
}
