import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface SectionHeadingProps {
  eyebrow: string
  title: ReactNode
  description?: ReactNode
  icon?: ReactNode
  aside?: ReactNode
  className?: string
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  icon,
  aside,
  className,
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        "mb-10 flex flex-col gap-5 md:mb-12 md:flex-row md:items-end md:justify-between",
        className,
      )}
    >
      <div className="max-w-3xl">
        <p className="mono-label mb-4 inline-flex items-center gap-2 text-accent">
          {icon}
          {eyebrow}
        </p>
        <h2 className="font-montserrat text-balance text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
          {title}
        </h2>
        {description && (
          <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
            {description}
          </p>
        )}
      </div>
      {aside && <div className="shrink-0">{aside}</div>}
    </div>
  )
}
