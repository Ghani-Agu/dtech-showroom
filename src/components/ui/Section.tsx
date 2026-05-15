'use client'

import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { fadeRise } from '@/lib/animations'
import { cn } from '@/lib/utils'

interface SectionProps {
  children: ReactNode
  className?: string
  disableMotion?: boolean
  id?: string
}

export function Section({ children, className, disableMotion, id }: SectionProps) {
  if (disableMotion) {
    return (
      <section id={id} className={cn('bg-surface-base py-16 md:py-24', className)}>
        {children}
      </section>
    )
  }

  return (
    <motion.section
      id={id}
      className={cn('bg-surface-base py-16 md:py-24', className)}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-15%' }}
      variants={fadeRise}
    >
      {children}
    </motion.section>
  )
}
