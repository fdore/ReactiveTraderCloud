/* eslint-disable no-restricted-globals */

import { WindowConfig } from '../types'

type BrowserWindowProps = WindowConfig

export const openBrowserWindow = function(
  this: { prevWindow: Window },
  config: BrowserWindowProps,
  onClose?: () => void,
) {
  const { name, width, height, center, url } = config
  const windowReferencePosition =
    this.prevWindow && !this.prevWindow.closed
      ? { left: this.prevWindow.screenX, top: this.prevWindow.screenY }
      : null

  const { left, top } = calculatePosition(center, width, height, windowReferencePosition)

  const win = window.open(
    url,
    name,
    toWindowFeatures({
      width,
      height,
      left,
      top,
    }),
  )

  if (onClose && win) {
    win.addEventListener('beforeunload', onClose)
  }

  this.prevWindow = win

  return Promise.resolve(win)
}.bind({ prevWindow: null })

function calculatePosition(
  center: string = 'parent',
  width: number,
  height: number,
  reference?: { top: number; left: number },
) {
  let left = 0
  let top = 0
  const LEFT_POSITION_OFFSET = 50
  const TOP_POSITION_OFFSET = 50

  if (center === 'parent') {
    left = window.top.outerWidth / 2 + window.top.screenX - width / 2
    top = window.top.outerHeight / 2 + window.top.screenY - height / 2
  } else if (center === 'screen') {
    const screenLeft = window.screenLeft
    const screenTop = window.screenTop
    const windowWidth = window.innerWidth
      ? window.innerWidth
      : document.documentElement.clientWidth
      ? document.documentElement.clientWidth
      : screen.width
    const windowHeight = window.innerHeight
      ? window.innerHeight
      : document.documentElement.clientHeight
      ? document.documentElement.clientHeight
      : screen.height
    left = windowWidth / 2 - width / 2 + screenLeft
    top = windowHeight / 2 - height / 2 + screenTop
  }

  return reference
    ? { left: reference.left + LEFT_POSITION_OFFSET, top: reference.top + TOP_POSITION_OFFSET }
    : { left, top }
}

interface WindowFeatures {
  width?: number
  height?: number
  left?: number
  top?: number
}

function toWindowFeatures(windowFeatures: WindowFeatures) {
  return Object.keys(windowFeatures)
    .reduce<string[]>((features, name) => {
      const value = windowFeatures[name]
      if (typeof value === 'boolean') {
        features.push(`${name}=${value ? 'yes' : 'no'}`)
      } else {
        features.push(`${name}=${value}`)
      }
      return features
    }, [])
    .join(',')
}