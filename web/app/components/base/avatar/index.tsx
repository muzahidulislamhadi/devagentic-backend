'use client'
import cn from '@/utils/classnames'
import { useState } from 'react'

export type AvatarProps = {
  name: string
  avatar: string | null
  size?: number
  className?: string
  textClassName?: string
}
const Avatar = ({
  name,
  avatar,
  size = 30,
  className,
  textClassName,
}: AvatarProps) => {
  const avatarClassName = 'shrink-0 flex items-center rounded-full bg-primary-600'
  const style = { width: `${size}px`, height: `${size}px`, fontSize: `${size}px`, lineHeight: `${size}px` }
  const [imgError, setImgError] = useState(false)

  const handleError = () => {
    setImgError(true)
  }

  if (avatar && !imgError) {
    return (
      <img
        className={cn(avatarClassName, className)}
        style={style}
        alt={name || 'User'}
        src={avatar}
        onError={handleError}
      />
    )
  }

  // Safe name access - provide fallback if name is undefined or empty
  const displayName = name || 'U'
  const firstLetter = displayName[0] || 'U'

  return (
    <div
      className={cn(avatarClassName, className)}
      style={style}
    >
      <div
        className={cn(textClassName, 'scale-[0.4] text-center text-white')}
        style={style}
      >
        {firstLetter.toLocaleUpperCase()}
      </div>
    </div>
  )
}

export default Avatar
