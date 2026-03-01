function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

export function getLatestSavedTaskOrder(
  events: Array<{
    eventType: string
    payload: Record<string, unknown>
  }>
) {
  const taskOrderEvent = events.find((event) => event.eventType === 'TASK_ORDER_SET')
  const orderedTaskIds = taskOrderEvent?.payload.orderedTaskIds
  return isStringArray(orderedTaskIds) ? orderedTaskIds : []
}

export function applyDeterministicTaskOrder(args: {
  tasks: Array<{ id: string; state: string }>
  tasksTopologicalOrder: string[]
  savedOrderedTaskIds: string[]
  excludeNotRequired?: boolean
}) {
  const taskById = new Map(args.tasks.map((task) => [task.id, task]))
  const visibleTaskIds = args.tasksTopologicalOrder.filter((taskId) => {
    const task = taskById.get(taskId)
    if (!task) {
      return false
    }
    if (args.excludeNotRequired && task.state === 'NOT_REQUIRED') {
      return false
    }
    return true
  })

  const visibleSet = new Set(visibleTaskIds)
  const filteredSavedOrder = Array.from(new Set(args.savedOrderedTaskIds)).filter((taskId) =>
    visibleSet.has(taskId)
  )
  const filteredSavedSet = new Set(filteredSavedOrder)
  const remainingTopoOrder = visibleTaskIds.filter((taskId) => !filteredSavedSet.has(taskId))
  const finalOrder = [...filteredSavedOrder, ...remainingTopoOrder]

  return {
    filteredSavedOrder,
    remainingTopoOrder,
    finalOrder,
  }
}
