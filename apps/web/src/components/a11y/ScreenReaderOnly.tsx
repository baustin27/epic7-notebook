'use client'

interface ScreenReaderOnlyProps {
  children: React.ReactNode
  as?: React.ElementType
}

const ScreenReaderOnly = ({ children, as: Component = 'span' }: ScreenReaderOnlyProps) => {
  return <Component className="sr-only">{children}</Component>
}

export { ScreenReaderOnly }