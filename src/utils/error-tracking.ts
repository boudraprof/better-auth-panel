import type { ErrorContext, TrackedError } from "#/types"
import { MAX_QUEUE_SIZE } from "./constants"

const errorQueue: TrackedError[] = []

function getUserId(): string | undefined {
  try {
    const sessionData = localStorage.getItem('session')
    if (sessionData) {
      const session = JSON.parse(sessionData)
      return session?.user?.id
    }
  } catch {
    // Ignore
  }
  return undefined
}

function formatError(error: Error, context: ErrorContext): TrackedError {
  return {
    message: error.message,
    stack: error.stack,
    context: {
      ...context,
      userId: context.userId || getUserId(),
    },
    timestamp: Date.now(),
    url: window.location.href,
  }
}

async function sendToService(errors: TrackedError[]): Promise<void> {
  if (import.meta.env.DEV) {
    console.group('[ErrorTracking] Errors captured:')
    errors.forEach((err) => {
      console.error(`${err.context.component || 'Unknown'}: ${err.message}`, {
        stack: err.stack,
        context: err.context,
      })
    })
    console.groupEnd()
  }
}

export function trackError(error: Error | unknown, context: ErrorContext = {}): void {
  const errorObj = error instanceof Error ? error : new Error(String(error))
  const tracked = formatError(errorObj, context)

  errorQueue.push(tracked)


  if (errorQueue.length >= MAX_QUEUE_SIZE) {
    void flushQueue()
  }
}

export function trackAndLogError(
  error: Error | unknown,
  context: ErrorContext = {}
): void {
  trackError(error, context)

  if (import.meta.env.DEV) {
    console.error('[Error]', error, context)
  }
}

export function createErrorBoundaryHandler(componentName: string) {
  return (error: Error, errorInfo: React.ErrorInfo) => {
    trackError(error, {
      component: componentName,
      metadata: {
        componentStack: errorInfo.componentStack,
      },
    })
  }
}

async function flushQueue(): Promise<void> {
  if (errorQueue.length === 0) return
  const errorsToSend = [...errorQueue]
  errorQueue.length = 0
  try {
    await sendToService(errorsToSend)
  } catch {
    // Don't let tracking errors break the app
  }
}

export function getQueuedErrors(): TrackedError[] {
  return [...errorQueue]
}

export function clearErrorQueue(): void {
  errorQueue.length = 0
}
