import { fabric } from "fabric";

import PSSimplify from "./PSSimplify";
import PressureManager from "./PressureManager";
import PSStroke from "./PSStroke";
import PSPoint from "./PSPoint";
import { createFabricClass } from "./utils";

const createClass =
  fabric.util.createClass ||
  (fabric.util.lang_class && fabric.util.lang_class.createClass) ||
  createFabricClass;

const PSBrushImpl = createClass(fabric.BaseBrush, {
  simplify: null,
  pressureManager: null,
  pressureCoeff: 100,
  simplifyTolerance: 0,
  simplifyHighestQuality: false,
  pressureIgnoranceOnStart: -1,
  opacity: 1,
  disableTouch: false,
  currentStartTime: null,

  initialize: function (canvas) {
    this.simplify = new PSSimplify();
    this.pressureManager = new PressureManager(this);
    this.canvas = canvas;
    this._points = [];
  },

  _drawSegment: function (ctx, p1, p2) {
    var midPoint = p1.midPointFrom(p2);
    ctx.lineWidth = p1.pressure * this.width;
    ctx.quadraticCurveTo(p1.x, p1.y, midPoint.x, midPoint.y);
    return midPoint;
  },

  onMouseDown: function (pointer, ev) {
    const p = ev ? ev.pointer : pointer;
    const e = ev ? ev.e : pointer["e"] || null;
    if (this.disableTouch && e && (e.touches || e.pointerType === "touch")) {
      return;
    }

    this.drawStraightLine = e && e.shiftKey === true;
    this._prepareForDrawing(p, e);
    this._captureDrawingPath(p, e);
    this._render();
  },

  onMouseMove: function (pointer, ev) {
    const p = ev ? ev.pointer : pointer;
    const e = ev ? ev.e : pointer["e"] || null;
    if (this.disableTouch && e && (e.touches || e.pointerType === "touch")) {
      return;
    }

    this.drawStraightLine = e && e.shiftKey === true;
    if (this._captureDrawingPath(p, e) && this._points.length > 1) {
      if (this.needsFullRender || this.drawStraightLine) {
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
  },

  onMouseUp: function (ev) {
    const e = ev && ev.e ? ev.e : null;
    if (this.disableTouch && e && (e.touches || e.pointerType === "touch")) {
      return;
    }

    this.oldEnd = undefined;
    this._finalizeAndAddPath();
    this.pressureManager.onMouseUp();
  },

  _prepareForDrawing: function (pointer, ev) {
    const pressure = this.pressureManager.onMouseDown(ev);
    const p = new PSPoint(pointer.x, pointer.y, pressure);

    this._reset();
    this._addPoint(p);
    this.canvas.contextTop.moveTo(p.x, p.y);

    this.currentStartTime = Date.now();
  },

  _addPoint: function (point) {
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
  },

  _reset: function () {
    const ctx = this.canvas.contextTop;
    this._points.length = 0;
    this._setBrushStyles(ctx);
    var color = new fabric.Color(this.color);
    this.needsFullRender = color.getAlpha() < 1;
    this._setShadow();
  },

  _captureDrawingPath: function (pointer, ev) {
    const pressure = this.pressureManager.onMouseMove(ev, this._points);
    const pointerPoint = new PSPoint(pointer.x, pointer.y, pressure);
    return this._addPoint(pointerPoint);
  },

  _redrawSegments: function (points) {
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
  },

  _render: function () {
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
  },

  convertPointsToSVGPath: function (points) {
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
  },

  createPSStroke: function (points) {
    var path = new PSStroke(points, {
      fill: null,
      stroke: this.color,
      strokeWidth: this.width,
      strokeLineCap: this.strokeLineCap,
      strokeMiterLimit: this.strokeMiterLimit,
      strokeLineJoin: this.strokeLineJoin,
      strokeDashArray: this.strokeDashArray,
    });

    var position = new fabric.Point(
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
      path.shadow = new fabric.Shadow(this.shadow);
    }

    return path;
  },

  _finalizeAndAddPath: function () {
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
  },
});

const PSBrush = PSBrushImpl;

fabric["PSBrush"] = PSBrush;
export default PSBrush;
