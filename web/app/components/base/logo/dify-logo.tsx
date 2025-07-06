'use client'
import useTheme from '@/hooks/use-theme'
import classNames from '@/utils/classnames'
import { basePath } from '@/utils/var'
import type { FC } from 'react'
export type LogoStyle = 'default' | 'monochromeWhite'

export const logoPathMap: Record<LogoStyle, string> = {
  default: '/logo/logo-site.png',
  monochromeWhite: '/logo/logo-site.png',
}

export type LogoSize = 'large' | 'medium' | 'small'

export const logoSizeMap: Record<LogoSize, string> = {
  large: 'w-24 h-10',
  medium: 'w-18 h-8',
  small: 'w-12 h-5',
}

type DifyLogoProps = {
  style?: LogoStyle
  size?: LogoSize
  className?: string
}

const DifyLogo: FC<DifyLogoProps> = ({
  style = 'default',
  size = 'medium',
  className,
}) => {
  const { theme } = useTheme()
  const themedStyle = (theme === 'dark' && style === 'default') ? 'monochromeWhite' : style

  return (
    <img
      src={`${basePath}${logoPathMap[themedStyle]}`}
      className={classNames('block object-contain', logoSizeMap[size], className)}
      alt='DevAgentic logo'
    />
  )
}

export default DifyLogo
