import { describe, it, expect } from 'vitest'
import PSPoint from '../lib/PSPoint'

describe('PSPoint', () => {
  it('keeps x/y/pressure and a PSPoint type', () => {
    const p = new PSPoint(3, 4, 0.7)
    expect(p).toMatchObject({ x: 3, y: 4, pressure: 0.7, type: 'PSPoint' })
  })
  it('midPointFrom averages pressure', () => {
    const mid = new PSPoint(0, 0, 0.2).midPointFrom(new PSPoint(10, 0, 0.6))
    expect(mid).toMatchObject({ x: 5, y: 0, pressure: 0.4 })
  })
  it('fromObject returns a Promise resolving a PSPoint (v6)', async () => {
    const p = await PSPoint.fromObject({ x: 1, y: 2, pressure: 0.5 })
    expect(p).toMatchObject({ x: 1, y: 2, pressure: 0.5, type: 'PSPoint' })
  })
})
