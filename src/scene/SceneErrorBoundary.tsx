import { Component, type ReactNode } from 'react'

interface SceneErrorBoundaryProps {
  children: ReactNode
  onError?: () => void
}

interface SceneErrorBoundaryState {
  failed: boolean
}

/**
 * Keeps a WebGL failure (no GPU, blocked context, driver bug) from unmounting
 * the rest of the page: R3F re-throws canvas errors to its parent. Without the
 * scene, the DOM content and CSS backdrop still carry the opening on their own.
 */
export class SceneErrorBoundary extends Component<SceneErrorBoundaryProps, SceneErrorBoundaryState> {
  state: SceneErrorBoundaryState = { failed: false }

  static getDerivedStateFromError(): SceneErrorBoundaryState {
    return { failed: true }
  }

  componentDidCatch(error: unknown) {
    console.error('3D scene failed to start:', error)
    this.props.onError?.()
  }

  render() {
    return this.state.failed ? null : this.props.children
  }
}
