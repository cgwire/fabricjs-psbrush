import { Point, classRegistry } from 'fabric'

export default class PSPoint extends Point {
  static type = 'PSPoint'
  constructor(x, y, pressure) {
    super(x, y)
    this.type = 'PSPoint'
    this.pressure = pressure
  }
  midPointFrom(p) {
    const mid = super.midPointFrom(p)
    return new PSPoint(mid.x, mid.y, (this.pressure + p.pressure) / 2)
  }
  clone() {
    return new PSPoint(this.x, this.y, this.pressure)
  }
  static fromObject(object) {
    return Promise.resolve(new PSPoint(object.x, object.y, object.pressure))
  }
}

classRegistry.setClass(PSPoint, 'PSPoint')
