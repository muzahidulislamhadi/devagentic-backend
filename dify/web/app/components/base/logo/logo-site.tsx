'use client'
import classNames from '@/utils/classnames'
import { basePath } from '@/utils/var'
import type { FC } from 'react'

type LogoSiteProps = {
  className?: string
}

const LogoSite: FC<LogoSiteProps> = ({
  className,
}) => {
  return (
    <img
      src={`${basePath}/logo/logo.png`}
      className={classNames('block w-[22.651px] h-[24.5px]', className)}
      alt='logo'
    />
  )
}

export default LogoSite
