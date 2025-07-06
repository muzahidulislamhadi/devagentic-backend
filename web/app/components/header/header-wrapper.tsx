'use client'
import { useEventEmitterContextContext } from '@/context/event-emitter'
import classNames from '@/utils/classnames'
import { usePathname } from 'next/navigation'
import React, { useState } from 'react'
import s from './index.module.css'

type HeaderWrapperProps = {
  children: React.ReactNode
}

const HeaderWrapper = ({
  children,
}: HeaderWrapperProps) => {
  const pathname = usePathname()
  const isBordered = ['/apps', '/datasets', '/datasets/create', '/tools'].includes(pathname)
  // Check if the current path is a workflow canvas & fullscreen
  const inWorkflowCanvas = pathname.endsWith('/workflow')
  // Safe localStorage access - check if it exists (client-side only)
  const workflowCanvasMaximize = typeof window !== 'undefined' && localStorage?.getItem('workflow-canvas-maximize') === 'true'
  const [hideHeader, setHideHeader] = useState(workflowCanvasMaximize)
  const { eventEmitter } = useEventEmitterContextContext()

  eventEmitter?.useSubscription((v: any) => {
    if (v?.type === 'workflow-canvas-maximize')
      setHideHeader(v.payload)
  })

  return (
    <div className={classNames(
      'sticky left-0 right-0 top-0 z-[15] flex min-h-[56px] shrink-0 grow-0 basis-auto flex-col',
      s.header,
      isBordered ? 'border-b border-divider-regular' : '',
      hideHeader && inWorkflowCanvas && 'hidden',
    )}
    >
      {children}
    </div>
  )
}
export default HeaderWrapper
