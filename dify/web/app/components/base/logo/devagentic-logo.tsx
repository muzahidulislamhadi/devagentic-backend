'use client'
import useTheme from '@/hooks/use-theme'
import classNames from '@/utils/classnames'
import { basePath } from '@/utils/var'
import type { FC } from 'react'
export type LogoStyle = 'default' | 'monochromeWhite'

export const logoPathMap: Record<LogoStyle, string> = {
  default: '/logo/logo.png',
  monochromeWhite: '/logo/logo.png',
}

export type LogoSize = 'large' | 'medium' | 'small'

export const logoSizeMap: Record<LogoSize, string> = {
  large: 'w-16 h-7',
  medium: 'w-12 h-[22px]',
  small: 'w-9 h-4',
}

type DevAgenticLogoProps = {
  style?: LogoStyle
  size?: LogoSize
  className?: string
}

const DevAgenticLogo: FC<DevAgenticLogoProps> = ({
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

export default DevAgenticLogo
