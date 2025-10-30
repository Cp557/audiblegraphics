"use client"

import React from 'react'

type LottieButtonProps = {
  src: string
  width?: number
  height?: number
  className?: string
  loop?: boolean
  audioSrc?: string
}

export default function LottieButton({ src, width = 160, height = 160, className = '', loop = false, audioSrc }: LottieButtonProps) {
  const containerRef = React.useRef<HTMLDivElement | null>(null)
  const animationRef = React.useRef<any>(null)
  const audioRef = React.useRef<HTMLAudioElement | null>(null)
  const stopTimerRef = React.useRef<number | null>(null)
  const lastFrameRef = React.useRef<number>(0)
  const isPlayingRef = React.useRef<boolean>(false)
  const originalLoopRef = React.useRef<any>(null)

  React.useEffect(() => {
    let isMounted = true
    let lottieModule: any

    async function load() {
      const mod = await import('lottie-web')
      if (!isMounted || !containerRef.current) return
      lottieModule = mod.default || mod
      animationRef.current = lottieModule.loadAnimation({
        container: containerRef.current,
        renderer: 'svg',
        loop,
        autoplay: false,
        path: src,
      })

      animationRef.current.addEventListener('DOMLoaded', () => {
        // Show the last stored frame as the resting state
        animationRef.current.goToAndStop(lastFrameRef.current || 0, true)
      })
    }

    load()

    return () => {
      isMounted = false
      try {
        animationRef.current?.destroy?.()
      } catch {}
      animationRef.current = null
    }
  }, [src, loop])

  React.useEffect(() => {
    if (!audioSrc) return
    const audio = new Audio(audioSrc)
    audio.preload = 'auto'
    audioRef.current = audio
    return () => {
      try {
        audio.pause()
      } catch {}
      audioRef.current = null
    }
  }, [audioSrc])

  const handleClick = () => {
    if (!animationRef.current) return
    
    // Toggle: if currently playing, stop everything and save frame
    if (isPlayingRef.current) {
      try {
        const currentFrame: number = animationRef.current.currentFrame ?? lastFrameRef.current
        if (Number.isFinite(currentFrame)) {
          lastFrameRef.current = currentFrame
        }
      } catch {}
      animationRef.current?.pause?.()
      if (typeof originalLoopRef.current !== 'undefined' && animationRef.current) {
        animationRef.current.loop = originalLoopRef.current ?? loop
      }
      if (audioRef.current) {
        try {
          audioRef.current.pause()
          audioRef.current.currentTime = 0
        } catch {}
      }
      if (stopTimerRef.current) {
        window.clearTimeout(stopTimerRef.current)
        stopTimerRef.current = null
      }
      isPlayingRef.current = false
      return
    }

    // Starting playback from the last stored frame
    animationRef.current.goToAndStop(lastFrameRef.current || 0, true)
    originalLoopRef.current = animationRef.current.loop
    animationRef.current.loop = true
    animationRef.current.play()
    isPlayingRef.current = true

    if (audioRef.current) {
      try {
        audioRef.current.currentTime = 0
        void audioRef.current.play()
      } catch {}
    }

    // Clear any existing timer and pause at the current frame after 16 seconds
    if (stopTimerRef.current) {
      window.clearTimeout(stopTimerRef.current)
    }
    stopTimerRef.current = window.setTimeout(() => {
      try {
        const frameNow: number = (animationRef.current?.currentFrame ?? lastFrameRef.current)
        if (Number.isFinite(frameNow)) {
          lastFrameRef.current = frameNow
        }
        animationRef.current?.pause?.()
        if (animationRef.current) animationRef.current.loop = (originalLoopRef.current ?? loop)
        if (audioRef.current) {
          try {
            audioRef.current.pause()
            audioRef.current.currentTime = 0
          } catch {}
        }
      } catch {}
      isPlayingRef.current = false
      stopTimerRef.current = null
    }, 16000)
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Play animation"
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          handleClick()
        }
      }}
      className={className}
      style={{ width, height, outline: 'none' }}
    >
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
    </div>
  )
}


