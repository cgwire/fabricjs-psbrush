import { fabric } from "fabric";

class PSPoint extends fabric.Point {
  constructor(x, y, pressure) {
    super(x, y);
    this.type = "PSPoint";
    this.pressure = pressure;
  }
  midPointFrom(p) {
    const mid = super.midPointFrom(p);
    return new PSPoint(mid.x, mid.y, (this.pressure + p.pressure) / 2);
  }
  clone() {
    return new PSPoint(this.x, this.y, this.pressure);
  }
}

PSPoint["fromObject"] = function (object, callback) {
  callback && callback(new PSPoint(object.x, object.y, object.pressure));
};

fabric["PSPoint"] = PSPoint;

if (fabric.util && fabric.util.registerClass) {
  fabric.util.registerClass(PSPoint, "PSPoint");
} else if (fabric.ClassRegistry) {
  fabric.ClassRegistry.register(PSPoint, "PSPoint");
}

export default PSPoint;
