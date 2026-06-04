import { describe, it, expect } from 'vitest'
import PSBrush from '../lib/PSBrush'

describe('PSBrush.convertPointsToSVGPath', () => {
  it('builds an M/Q/L path string from pressure points', () => {
    const brush = new PSBrush({})            // canvas arg unused by this method
    brush.width = 10
    const pts = [
      { x: 0, y: 0, pressure: 0.5, eq() { return false }, midPointFrom(p) { return { x: (this.x+p.x)/2, y: (this.y+p.y)/2 } } },
      { x: 10, y: 0, pressure: 0.5, eq() { return false }, midPointFrom(p) { return { x: (this.x+p.x)/2, y: (this.y+p.y)/2 } } },
      { x: 20, y: 0, pressure: 0.5, eq() { return false }, midPointFrom(p) { return { x: (this.x+p.x)/2, y: (this.y+p.y)/2 } } }
    ]
    const out = brush.convertPointsToSVGPath(pts).join('')
    expect(out).toContain('M ')
    expect(out).toContain('Q ')
    expect(out).toContain('L ')
  })
})
