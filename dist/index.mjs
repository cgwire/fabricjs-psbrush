import { classRegistry, Point, FabricObject, util, BaseBrush, Color, Shadow } from 'fabric';

class PSPoint extends Point {
  static type = 'PSPoint'
  constructor(x, y, pressure) {
    super(x, y);
    this.type = 'PSPoint';
    this.pressure = pressure;
  }
  midPointFrom(p) {
    const mid = super.midPointFrom(p);
    return new PSPoint(mid.x, mid.y, (this.pressure + p.pressure) / 2)
  }
  clone() {
    return new PSPoint(this.x, this.y, this.pressure)
  }
  static fromObject(object) {
    return Promise.resolve(new PSPoint(object.x, object.y, object.pressure))
  }
}

classRegistry.setClass(PSPoint, 'PSPoint');

function isPSStroke(object) {
  return object && object["type"] === "PSStroke";
}

function isPSPoint(object) {
  return object && object["type"] === "PSPoint";
}

function getPressure(ev, fallbackValue = 0.5) {
  if (ev["touches"] && ev["touches"].length > 0) {
    return ev.touches[0].force;
  }
  if (ev["pointerType"] === "mouse" || typeof ev["pressure"] !== "number") {
    return fallbackValue;
  }
  if (ev["pointerType"] === "touch" && ev.pressure === 0) {
    return fallbackValue;
  }
  return ev.pressure;
}

class PressureManager {
  constructor(brush) {
    this.min = 0.0001;
    this.magic = 0.07999999821186066;
    this.fallback = 0.1;
    this.brush = brush;
  }

  onMouseDown(ev) {
    const pressure = getPressure(ev, this.fallback);
    return pressure === this.magic ? this.min : pressure;
  }

  onMouseMove(ev, points) {
    const pressure = getPressure(ev, this.fallback);
    const pressureShouldBeIgnored =
      this.brush.pressureIgnoranceOnStart >
      Date.now() - this.brush.currentStartTime;
    const hasPreviousPressureValues =
      Array.isArray(points) && points.length > 0;
    const lastPressure = hasPreviousPressureValues
      ? points[points.length - 1].pressure
      : this.min;

    const updatedPressure = pressureShouldBeIgnored
      ? this.min
      : pressure === this.magic
        ? lastPressure
        : Math.max(this.min, pressure);

    if (
      !pressureShouldBeIgnored &&
      hasPreviousPressureValues &&
      lastPressure === this.min &&
      updatedPressure !== this.min
    ) {
      points.forEach(
        (p) => (p.pressure = Math.max(p.pressure, updatedPressure)),
      );
      this.brush["_redrawSegments"](points);
    }
    return updatedPressure;
  }

  onMouseUp() {}
}

class Simplify {
  set tolerance(tolerance) {
    if (typeof tolerance !== "number") {
      tolerance = 1;
    }
    this._tolerance = tolerance;
    this.sqTolerance = tolerance * tolerance;
  }
  get tolerance() {
    return this._tolerance;
  }

  constructor() {
    this._tolerance = 1;
    this.sqTolerance = 1;
  }

  getSquareDistance(p1, p2) {
    let dx = p1.x - p2.x;
    let dy = p1.y - p2.y;
    return dx * dx + dy * dy;
  }

  getSquareSegmentDistance(p, p1, p2) {
    let x = p1.x;
    let y = p1.y;
    let dx = p2.x - x;
    let dy = p2.y - y;

    if (dx !== 0 || dy !== 0) {
      let t = ((p.x - x) * dx + (p.y - y) * dy) / (dx * dx + dy * dy);

      if (t > 1) {
        x = p2.x;
        y = p2.y;
      } else if (t > 0) {
        x += dx * t;
        y += dy * t;
      }
    }

    dx = p.x - x;
    dy = p.y - y;

    return dx * dx + dy * dy;
  }

  simplifyRadialDistance(points) {
    let prevPoint = points[0];
    let newPoints = [prevPoint];
    let point;

    for (let i = 1, len = points.length; i < len; i++) {
      point = points[i];

      if (this.getSquareDistance(point, prevPoint) > this.sqTolerance) {
        newPoints.push(point);
        prevPoint = point;
      }
    }

    if (prevPoint !== point) {
      newPoints.push(point);
    }

    return newPoints;
  }

  simplifyDouglasPeucker(points) {
    let len = points.length;
    let MarkerArray = typeof Uint8Array !== "undefined" ? Uint8Array : Array;
    let markers = new MarkerArray(len);
    let first = 0;
    let last = len - 1;
    let stack = [];
    let newPoints = [];
    let i;
    let maxSqDist;
    let sqDist;
    let index;

    markers[first] = markers[last] = 1;

    while (last) {
      maxSqDist = 0;

      for (i = first + 1; i < last; i++) {
        sqDist = this.getSquareSegmentDistance(
          points[i],
          points[first],
          points[last],
        );

        if (sqDist > maxSqDist) {
          index = i;
          maxSqDist = sqDist;
        }
      }

      if (maxSqDist > this.sqTolerance) {
        markers[index] = 1;
        stack.push(first, index, index, last);
      }

      last = stack.pop();
      first = stack.pop();
    }

    for (i = 0; i < len; i++) {
      if (markers[i]) {
        newPoints.push(points[i]);
      }
    }

    return newPoints;
  }

  do(points, highestQuality) {
    points = highestQuality ? points : this.simplifyRadialDistance(points);
    points = this.simplifyDouglasPeucker(points);
    return points;
  }
}

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

class PSStroke extends FabricObject {
  static type = "PSStroke";

  get type() {
    return "PSStroke";
  }

  // Suppress the FabricObject v6 setter warning — type is fixed by the getter above
  set type(_) {}

  static cacheProperties = [
    ...FabricObject.cacheProperties,
    "strokePoints",
    "startTime",
    "endTime",
    "fillRule",
  ];

  constructor(strokePoints, options = {}) {
    super(options);

    this.startTime = options.startTime;
    this.endTime = options.endTime;
    this.strokePoints = (strokePoints || []).concat();

    if (options.stroke !== undefined) {
      this.stroke = options.stroke;
    }
    if (options.strokeWidth !== undefined) {
      this.strokeWidth = options.strokeWidth;
    }

    this._setPositionDimensions(options);
  }

  _setPositionDimensions(options) {
    var calcDim = this._parseDimensions();
    this.width = calcDim.width;
    this.height = calcDim.height;

    if (
      typeof options.left == "undefined" &&
      typeof options.top == "undefined"
    ) {
      this.left = calcDim.left;
      this.top = calcDim.top;
    }
    this.strokeOffset = this.strokeOffset || {
      x: calcDim.left + this.width / 2,
      y: calcDim.top + this.height / 2,
    };
  }

  _renderStroke(ctx) {
    let i;
    let strokeWidth = this.strokeWidth / 1000;
    let p1 = this.strokePoints[0];
    let p2 = this.strokePoints[1];
    let len = this.strokePoints.length;
    let l = -this.strokeOffset.x;
    let t = -this.strokeOffset.y;

    if (len === 2 && !(p1.x === p2.x && p1.y === p2.y)) {
      ctx.strokeStyle = this.stroke;
      ctx.lineCap = this.strokeLineCap;
      ctx.lineJoin = this.strokeLineJoin;
      ctx.lineWidth = this.strokeWidth;
      ctx.beginPath();
      ctx.moveTo(p1.x + l, p1.y + t);
      ctx.lineTo(p2.x + l, p2.y + t);
      ctx.stroke();
      return;
    }

    let mid = p1;
    let multSignX = 1;
    let multSignY = 1;
    let manyPoints = len > 2;

    if (manyPoints) {
      multSignX =
        this.strokePoints[2].x < p2.x
          ? -1
          : this.strokePoints[2].x === p2.x
            ? 0
            : 1;
      multSignY =
        this.strokePoints[2].y < p2.y
          ? -1
          : this.strokePoints[2].y === p2.y
            ? 0
            : 1;
    }

    if (this.strokePoints.length === 2 && p1.x === p2.x && p1.y === p2.y) {
      p1 = new PSPoint(p1.x, p1.y, p1.pressure);
      p2 = new PSPoint(p2.x, p2.y, p2.pressure);
      p1.x -= strokeWidth;
      p2.x += strokeWidth;
      mid.x = p1.x;
    }

    ctx.strokeStyle = this.stroke;
    ctx.lineCap = this.strokeLineCap;
    ctx.lineJoin = this.strokeLineJoin;

    for (i = 1, len = this.strokePoints.length; i < len; i++) {
      ctx.beginPath();
      ctx.moveTo(
        mid.x - multSignX * strokeWidth + l,
        mid.y - multSignY * strokeWidth + t,
      );
      ctx.lineWidth = p1.pressure * this.strokeWidth;
      mid = p1.midPointFrom(p2);
      ctx.quadraticCurveTo(
        p1.x - multSignX * strokeWidth + l,
        p1.y - multSignY * strokeWidth + t,
        mid.x - multSignX * strokeWidth + l,
        mid.y - multSignY * strokeWidth + t,
      );
      p1 = this.strokePoints[i];
      p2 = this.strokePoints[i + 1];

      ctx.stroke();
    }
  }

  _render(ctx) {
    this._renderStroke(ctx);
    this._renderPaintInOrder(ctx);
  }

  toString() {
    return (
      "#<Stroke (" +
      this.complexity() +
      '): { "top": ' +
      this.top +
      ', "left": ' +
      this.left +
      " }>"
    );
  }

  toObject(propertiesToInclude) {
    return {
      ...super.toObject(propertiesToInclude),
      strokePoints: this.strokePoints.map((i) =>
        typeof i.clone === "function" ? i.clone() : { ...i },
      ),
      startTime: this.startTime,
      endTime: this.endTime,
      top: this.top,
      left: this.left,
    };
  }

  _toSVG() {
    const svgString = [
      '<g transform="translate(',
      String(-this.strokeOffset.x),
      ",",
      String(-this.strokeOffset.y),
      ')" ',
      "COMMON_PARTS",
      ">\n",
    ];
    let p1 = null;
    for (let i = 0; i < this.strokePoints.length; i++) {
      let p2 = this.strokePoints[i];
      if (p1) {
        const x1 = p1.x;
        const y1 = p1.y;
        const x2 = p2.x;
        const y2 = p2.y;
        svgString.push(
          "<line ",
          'x1="',
          String(x1),
          '" y1="',
          String(y1),
          '" x2="',
          String(x2),
          '" y2="',
          String(y2),
          '" ',
          'stroke-width="',
          String(p1.pressure * this.strokeWidth),
          '" ',
          'stroke-linecap="round" />\n',
        );
      }
      p1 = p2;
    }
    svgString.push("</g>\n");
    return svgString;
  }

  toClipPathSVG(reviver) {
    return (
      "\t" +
      this._createBaseClipPathSVGMarkup(this._toSVG(), {
        reviver: reviver,
      })
    );
  }

  toSVG(reviver) {
    return this._createBaseSVGMarkup(this._toSVG(), {
      reviver: reviver,
    });
  }

  complexity() {
    return this.strokePoints.length;
  }

  _parseDimensions() {
    function DummyCtx() {
      this.bounds = [];
      this.aX = [];
      this.aY = [];
      this.x = 0;
      this.y = 0;
    }
    DummyCtx.prototype._done = function () {
      this.bounds.forEach((point) => {
        this.aX.push(point.x);
        this.aY.push(point.y);
      });
      this.aX.push(this.x);
      this.aY.push(this.y);
    };
    DummyCtx.prototype.moveTo = function (x, y) {
      this.x = x;
      this.y = y;
      this.bounds = [];
      this._done();
    };
    DummyCtx.prototype.quadraticCurveTo = function (ctlX, ctlY, x, y) {
      this.bounds = util.getBoundsOfCurve(
        this.x,
        this.y,
        ctlX,
        ctlY,
        ctlX,
        ctlY,
        x,
        y,
      );
      this.x = x;
      this.y = y;
      this._done();
    };
    DummyCtx.prototype.calcBounds = function () {
      var minX = Math.min(...this.aX) || 0;
      var minY = Math.min(...this.aY) || 0;
      var maxX = Math.max(...this.aX) || 0;
      var maxY = Math.max(...this.aY) || 0;
      var deltaX = maxX - minX;
      var deltaY = maxY - minY;

      return {
        left: minX,
        top: minY,
        width: deltaX,
        height: deltaY,
      };
    };

    var ctx = new DummyCtx();
    var i;
    var len;
    var p1 = this.strokePoints[0];
    var p2 = this.strokePoints[1];

    if (this.strokePoints.length === 2 && !(p1.x === p2.x && p1.y === p2.y)) {
      ctx.aX.push(p1.x, p1.x, p2.x, p2.x);
      ctx.aY.push(p1.y, p1.y, p2.y, p2.y);
      ctx.lineWidth = this.strokeWidth / 3;
      return ctx.calcBounds();
    }

    var mid = p1;

    for (i = 1, len = this.strokePoints.length; i < len; i++) {
      ctx.moveTo(mid.x, mid.y);
      ctx.lineWidth = p1.pressure * this.strokeWidth;
      mid = p1.midPointFrom(p2);
      ctx.quadraticCurveTo(p1.x, p1.y, mid.x, mid.y);

      p1 = this.strokePoints[i];
      p2 = this.strokePoints[i + 1];
    }

    return ctx.calcBounds();
  }

  static async fromObject(object) {
    const strokePoints = await Promise.all(
      (object.strokePoints || [])
        .filter((p) => p != null)
        .map((p) =>
          p && p.type === "PSPoint"
            ? PSPoint.fromObject(p)
            : Promise.resolve(p),
        ),
    );

    let clipPath = object.clipPath;
    if (clipPath && typeof clipPath === "object") {
      const enlivened = await util.enlivenObjects([clipPath]);
      clipPath = enlivened && enlivened[0] ? enlivened[0] : null;
    }

    const instance = new PSStroke(strokePoints, { ...object, clipPath });
    return instance;
  }
}

classRegistry.setClass(PSStroke, "PSStroke");

class PSBrush extends BaseBrush {
  simplify = null;
  pressureManager = null;
  pressureCoeff = 100;
  simplifyTolerance = 0;
  simplifyHighestQuality = false;
  pressureIgnoranceOnStart = -1;
  opacity = 1;
  disableTouch = false;
  currentStartTime = null;
  disablePressure = false;

  constructor(canvas) {
    super(canvas);
    this.simplify = new PSSimplify();
    this.pressureManager = new PressureManager(this);
    this.canvas = canvas;
    this._points = [];
  }

  _drawSegment(ctx, p1, p2) {
    var midPoint = p1.midPointFrom(p2);
    ctx.lineWidth = p1.pressure * this.width;
    ctx.quadraticCurveTo(p1.x, p1.y, midPoint.x, midPoint.y);
    return midPoint;
  }

  onMouseDown(pointer, ev) {
    const p = ev ? ev.pointer : pointer;
    const e = ev ? ev.e : pointer["e"] || null;
    if (this.disableTouch && e && (e.touches || e.pointerType === "touch")) {
      return;
    }

    this.drawStraightLine = e && e.shiftKey === true;
    this.disablePressure = e && (e.ctrlKey === true || e.metaKey === true);
    this._prepareForDrawing(p, e);
    this._captureDrawingPath(p, e);
    this._render();
  }

  onMouseMove(pointer, ev) {
    const p = ev ? ev.pointer : pointer;
    const e = ev ? ev.e : pointer["e"] || null;
    if (this.disableTouch && e && (e.touches || e.pointerType === "touch")) {
      return;
    }

    this.drawStraightLine = e && e.shiftKey === true;
    this.disablePressure = e && (e.ctrlKey === true || e.metaKey === true);
    if (this._captureDrawingPath(p, e) && this._points.length > 1) {
      if (this._needsFullRender || this.drawStraightLine) {
        this.canvas.clearContext(this.canvas.contextTop);
        this._render();
      } else {
        const points = this._points;
        const length = points.length;
        const ctx = this.canvas.contextTop;

        this._saveAndTransform(ctx);
        if (this.oldEnd) {
          ctx.beginPath();
          ctx.moveTo(this.oldEnd.x, this.oldEnd.y);
        }
        this.oldEnd = this._drawSegment(
          ctx,
          points[length - 2],
          points[length - 1],
          true,
        );
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  onMouseUp(ev) {
    const e = ev && ev.e ? ev.e : null;
    if (this.disableTouch && e && (e.touches || e.pointerType === "touch")) {
      return;
    }

    this.oldEnd = undefined;
    this._finalizeAndAddPath();
    this.pressureManager.onMouseUp();
  }

  _prepareForDrawing(pointer, ev) {
    let pressure = this.pressureManager.onMouseDown(ev);
    if (this.disablePressure) {
      pressure = 1.0;
    }
    const p = new PSPoint(pointer.x, pointer.y, pressure);

    this._reset();
    this._addPoint(p);
    this.canvas.contextTop.moveTo(p.x, p.y);

    this.currentStartTime = Date.now();
  }

  _addPoint(point) {
    if (
      this._points.length > 1 &&
      point.eq(this._points[this._points.length - 1])
    ) {
      return false;
    }
    if (this.drawStraightLine && this._points.length > 1) {
      this._hasStraightLine = true;
      this._points.pop();
    }
    this._points.push(point);
    return true;
  }

  _reset() {
    const ctx = this.canvas.contextTop;
    this._points.length = 0;
    this._setBrushStyles(ctx);
    var color = new Color(this.color);
    this._needsFullRender = color.getAlpha() < 1;
    this._setShadow();
  }

  _captureDrawingPath(pointer, ev) {
    let pressure = this.pressureManager.onMouseMove(ev, this._points);
    if (this.disablePressure) {
      pressure = 1.0;
    }
    const pointerPoint = new PSPoint(pointer.x, pointer.y, pressure);
    return this._addPoint(pointerPoint);
  }

  _redrawSegments(points) {
    const ctx = this.canvas.contextTop;
    this._saveAndTransform(ctx);
    if (this.oldEnd) {
      ctx.closePath();
    }
    let p = this._points[0];
    ctx.moveTo(p.x, p.y);
    ctx.beginPath();
    this._points.forEach((p2) => {
      this.oldEnd = this._drawSegment(ctx, p, p2, true);
      p = p2;
    });
    ctx.stroke();
    ctx.restore();
  }

  _render() {
    var ctx = this.canvas.contextTop;
    var i;
    var len;
    var p1 = this._points[0];
    var p2 = this._points[this._points.length - 1];
    var mid = p1;

    this._saveAndTransform(ctx);

    if (this.drawStraightLine && this._points.length >= 2) {
      const compositeOperation = ctx.globalCompositeOperation;
      const alpha = ctx.globalAlpha;
      ctx.globalCompositeOperation = "destination-atop";
      ctx.globalAlpha = this.opacity;
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineWidth = this.width;
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
      ctx.restore();
      ctx.globalCompositeOperation = compositeOperation;
      ctx.globalAlpha = alpha;
      return;
    }

    if (this._points.length === 2 && p1.x === p2.x && p1.y === p2.y) {
      var width = (p1.pressure * this.width) / 1000;
      p1 = new PSPoint(p1.x, p1.y, p1.pressure);
      p2 = new PSPoint(p2.x, p2.y, p2.pressure);
      p1.x -= width;
      p2.x += width;
      mid.x = p1.x;
    }

    p1 = this._points[0];
    p2 = this._points[1];
    mid = p1;

    const compositeOperation = ctx.globalCompositeOperation;
    const alpha = ctx.globalAlpha;
    ctx.globalCompositeOperation = "destination-atop";
    ctx.globalAlpha = this.opacity;
    for (i = 1, len = this._points.length; i < len; i++) {
      ctx.beginPath();
      ctx.moveTo(mid.x, mid.y);
      mid = this._drawSegment(ctx, p1, p2);
      ctx.closePath();
      ctx.stroke();
      p1 = this._points[i];
      p2 = this._points[i + 1];
    }
    ctx.restore();
    ctx.globalCompositeOperation = compositeOperation;
    ctx.globalAlpha = alpha;
  }

  convertPointsToSVGPath(points) {
    var path = [];
    var i;
    var width = this.width / 1000;
    var len = points.length;

    var p1 = new PSPoint(points[0].x, points[0].y, points[0].pressure);
    var p2 = new PSPoint(points[1].x, points[1].y, points[1].pressure);
    var mid = p1;
    var multSignX = 1;
    var multSignY = 1;
    var manyPoints = len > 2;

    if (manyPoints) {
      multSignX = points[2].x < p2.x ? -1 : points[2].x === p2.x ? 0 : 1;
      multSignY = points[2].y < p2.y ? -1 : points[2].y === p2.y ? 0 : 1;
    }
    for (i = 1; i < len; i++) {
      path.push(
        "M ",
        mid.x - multSignX * width,
        " ",
        mid.y - multSignY * width,
        " ",
      );
      if (!p1.eq(p2)) {
        mid = p1.midPointFrom(p2);
        path.push("Q ", p1.x, " ", p1.y, " ", mid.x, " ", mid.y, " ");
      }
      p1 = points[i];
      if (i + 1 < points.length) {
        p2 = points[i + 1];
      }
    }
    if (manyPoints) {
      multSignX =
        p1.x > points[i - 2].x ? 1 : p1.x === points[i - 2].x ? 0 : -1;
      multSignY =
        p1.y > points[i - 2].y ? 1 : p1.y === points[i - 2].y ? 0 : -1;
    }
    path.push("L ", p1.x + multSignX * width, " ", p1.y + multSignY * width);
    return path;
  }

  createPSStroke(points) {
    var path = new PSStroke(points, {
      fill: null,
      stroke: this.color,
      strokeWidth: this.width,
      strokeLineCap: this.strokeLineCap,
      strokeMiterLimit: this.strokeMiterLimit,
      strokeLineJoin: this.strokeLineJoin,
      strokeDashArray: this.strokeDashArray,
    });

    var position = new Point(
      path.left + path.width / 2,
      path.top + path.height / 2,
    );
    position = path.translateToGivenOrigin(
      position,
      "center",
      "center",
      path.originX,
      path.originY,
    );
    path.top = position.y;
    path.left = position.x;
    if (this.shadow) {
      this.shadow.affectStroke = true;
      path.shadow = new Shadow(this.shadow);
    }

    return path;
  }

  _finalizeAndAddPath() {
    var ctx = this.canvas.contextTop;
    ctx.closePath();

    if (this.drawStraightLine && this._points.length >= 2) {
      const p1 = this._points[0];
      const p2 = this._points[this._points.length - 1];
      const avgPressure = (p1.pressure + p2.pressure) / 2;
      this._points = [
        new PSPoint(p1.x, p1.y, avgPressure),
        new PSPoint(p2.x, p2.y, avgPressure),
      ];
    }

    if (this.decimate) {
      this._points = this.decimatePoints(this._points, this.decimate);
    }

    if (this.simplifyTolerance > 0 && !this.drawStraightLine) {
      this.simplify.pressureCoeff = this.pressureCoeff;
      this.simplify.tolerance = this.simplifyTolerance;
      this._points = this.simplify.do(
        this._points,
        this.simplifyHighestQuality,
      );
    }

    var pathData = this.convertPointsToSVGPath(this._points).join("");
    if (pathData === "M 0 0 Q 0 0 0 0 L 0 0") {
      this.canvas.requestRenderAll();
      return;
    }

    const path = this.createPSStroke(this._points);
    path.opacity = this.opacity;
    path.stroke = this.color;
    path.strokeWidth = this.width;
    path["startTime"] = this.currentStartTime;
    path["endTime"] = Date.now();
    this.canvas.clearContext(this.canvas.contextTop);
    this.canvas.add(path);
    path.setCoords();
    this._resetShadow();

    this.canvas.fire("path:created", { path });
  }
}

export { PSBrush, PSPoint, PSStroke, PressureManager, Simplify, getPressure, isPSPoint, isPSStroke };
//# sourceMappingURL=index.mjs.map
