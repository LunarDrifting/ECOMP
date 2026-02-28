import { TaskState } from '@prisma/client'

export const ILLEGAL_STATE_TRANSITION_ERROR = 'Illegal state transition'

type TransitionContext = 'instantiation' | 'resolver' | 'completion'

type TransitionCheckInput = {
  fromState: TaskState
  toState: TaskState
  context?: TransitionContext
}

export function canTransition({
  fromState,
  toState,
  context,
}: TransitionCheckInput): boolean {
  if (fromState === 'DONE' && toState === 'DONE') {
    return true
  }

  if (fromState === 'NOT_STARTED' && toState === 'DONE') {
    return true
  }

  if (fromState === 'BLOCKED' && toState === 'NOT_STARTED') {
    return true
  }

  if (fromState === 'NOT_STARTED' && toState === 'BLOCKED') {
    return context === 'instantiation'
  }

  return false
}

export function assertTransitionAllowed(input: TransitionCheckInput): void {
  if (!canTransition(input)) {
    throw new Error(ILLEGAL_STATE_TRANSITION_ERROR)
  }
}
