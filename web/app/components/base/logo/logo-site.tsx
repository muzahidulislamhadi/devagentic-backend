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
      src={`${basePath}/logo/logo-site.png`}
      className={classNames('block w-[36px] h-[39px]', className)}
      alt='DevAgentic logo'
    />
  )
}

export default LogoSite
