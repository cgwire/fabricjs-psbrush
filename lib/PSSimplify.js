import Simplify from "./Simplify";
import PSPoint from "./PSPoint";

class PSSimplify extends Simplify {
  constructor() {
    super();
    this.pressureCoeff = 100;
  }

  getSquareDistance(p1, p2) {
    var dx = p1.x - p2.x;
    var dy = p1.y - p2.y;
    var dz = p1.pressure - p2.pressure;

    return dx * dx + dy * dy + dz * dz * this.pressureCoeff;
  }

  getSquareSegmentDistance(p, p1, p2) {
    var x = p1.x;
    var y = p1.y;
    var z = p1.pressure;
    var dx = p2.x - x;
    var dy = p2.y - y;
    var dz = p2.pressure - z;

    if (dx !== 0 || dy !== 0 || dz !== 0) {
      var t =
        ((p.x - x) * dx +
          (p.y - y) * dy +
          (p.pressure - z) * dz * this.pressureCoeff) /
        (dx * dx + dy * dy + dz * dz * this.pressureCoeff);

      if (t > 1) {
        x = p2.x;
        y = p2.y;
        z = p2.pressure;
      } else if (t > 0) {
        x += dx * t;
        y += dy * t;
        z += dz * t;
      }
    }

    dx = p.x - x;
    dy = p.y - y;
    dz = p.pressure - z;

    return dx * dx + dy * dy + dz * dz * this.pressureCoeff;
  }
}

export default PSSimplify;
