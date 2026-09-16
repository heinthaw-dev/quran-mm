// Ports: BlueprintCard composable
import type { ReactNode } from 'react'
import styles from './BlueprintCard.module.css'

interface Props {
  title: string
  titleSize?: number
  actions?: ReactNode
  children: ReactNode
}

export function BlueprintCard({ title, titleSize = 13, actions, children }: Props) {
  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <span className={styles.title} style={{ fontSize: `${titleSize / 16}rem` }}>
          {title}
        </span>
        {actions && <div className={styles.actions}>{actions}</div>}
      </div>
      <div className={styles.body}>{children}</div>
    </div>
  )
}
