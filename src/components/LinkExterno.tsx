import type { ReactNode } from 'react'
import { ExternalLink } from 'lucide-react'
import { cx } from './ui'

/** Link que abre em outra aba (sites oficiais: Junta, ITI, CVM…). */
export function LinkExterno({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cx('inline-flex items-center gap-1 text-[12.5px] font-medium text-primary-ink hover:underline [&_svg]:size-3.5', className)}
    >
      {children}
      <ExternalLink />
    </a>
  )
}
