type RenderEdge = {
  key: string
  path: string
  isHighlighted: boolean
  isWave: boolean
}

type EdgeLayerProps = {
  edges: RenderEdge[]
}

export function EdgeLayer({ edges }: EdgeLayerProps) {
  return (
    <>
      <defs>
        <marker
          id="workflow-edge-arrow"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#94a3b8" />
        </marker>
      </defs>
      {edges.map((edge) => {
        const stroke = edge.isHighlighted ? '#0f766e' : edge.isWave ? '#0ea5e9' : '#d4d4d8'
        const strokeWidth = edge.isHighlighted ? 2.8 : edge.isWave ? 2.4 : 1.6

        return (
          <path
            key={edge.key}
            d={edge.path}
            fill="none"
            stroke={stroke}
            strokeWidth={strokeWidth}
            markerEnd="url(#workflow-edge-arrow)"
            strokeDasharray={edge.isWave ? '9 8' : undefined}
            className={edge.isWave ? 'graph-wave-edge' : undefined}
            opacity={edge.isHighlighted || edge.isWave ? 1 : 0.85}
          />
        )
      })}
    </>
  )
}
