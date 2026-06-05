import { describe, it, expect } from 'vitest'
import PSStroke from '../lib/PSStroke'

const sample = [
  { type: 'PSPoint', x: 0, y: 0, pressure: 0.5 },
  { type: 'PSPoint', x: 10, y: 10, pressure: 0.8 }
]

describe('PSStroke serialization', () => {
  it('serializes with the stable PSStroke shape', () => {
    const stroke = new PSStroke(sample, { stroke: '#f00', strokeWidth: 4, startTime: 1, endTime: 2 })
    const o = stroke.toObject()
    expect(o.type).toBe('PSStroke')
    expect(o.strokePoints).toHaveLength(2)
    expect(o.strokePoints[0]).toMatchObject({ type: 'PSPoint', x: 0, y: 0, pressure: 0.5 })
    expect(o.startTime).toBe(1)
    expect(o.endTime).toBe(2)
  })

  it('round-trips through fromObject (Promise-based in v6)', async () => {
    const stroke = new PSStroke(sample, { stroke: '#f00', strokeWidth: 4, startTime: 1, endTime: 2 })
    const revived = await PSStroke.fromObject(stroke.toObject())
    expect(revived.type).toBe('PSStroke')
    expect(revived.strokePoints).toHaveLength(2)
    expect(revived.strokePoints[1].pressure).toBe(0.8)
    expect(revived.startTime).toBe(1)
  })

  it('exposes a static type for v6 revival', () => {
    expect(PSStroke.type).toBe('PSStroke')
  })
})
