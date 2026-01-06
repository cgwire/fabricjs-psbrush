import { fabric } from "fabric";
import PSPoint from "./PSPoint";
import { createFabricClass } from "./utils";

const util = fabric.util;
const extend = util.object.extend;

const createClass =
  fabric.util.createClass ||
  (fabric.util.lang_class && fabric.util.lang_class.createClass) ||
  createFabricClass;

const PSStrokeImpl = createClass(fabric.Object, {
  type: "PSStroke",
  strokePoints: null,
  startTime: null,
  endTime: null,

  cacheProperties: fabric.Object.prototype.cacheProperties.concat(
    "strokePoints",
    "startTime",
    "endTime",
    "fillRule",
  ),

  stateProperties: fabric.Object.prototype.stateProperties.concat(
    "strokePoints",
    "startTime",
    "endTime",
  ),

  initialize: function (strokePoints, options) {
    options = options || {};
    this.callSuper("initialize", options);

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
  },

  _setPositionDimensions: function (options) {
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
  },

  _renderStroke: function (ctx) {
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
  },

  _render: function (ctx) {
    this._renderStroke(ctx);
    this._renderPaintInOrder(ctx);
  },

  toString: function () {
    return (
      "#<Stroke (" +
      this.complexity() +
      '): { "top": ' +
      this.top +
      ', "left": ' +
      this.left +
      " }>"
    );
  },

  toObject: function (propertiesToInclude) {
    var o = extend(this.callSuper("toObject", propertiesToInclude), {
      strokePoints: this.strokePoints.map((i) => i.clone()),
      startTime: this.startTime,
      endTime: this.endTime,
      top: this.top,
      left: this.left,
    });
    return o;
  },

  _toSVG: function () {
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
  },

  toClipPathSVG: function (reviver) {
    return (
      "\t" +
      this._createBaseClipPathSVGMarkup(this._toSVG(), {
        reviver: reviver,
      })
    );
  },

  toSVG: function (reviver) {
    return this._createBaseSVGMarkup(this._toSVG(), {
      reviver: reviver,
    });
  },

  complexity: function () {
    return this.strokePoints.length;
  },

  _parseDimensions: function () {
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
  },
});

const PSStroke = PSStrokeImpl;

PSStroke.fromObject = function (object, callback) {
  if (!callback) {
    console.warn("PSStroke.fromObject: callback is required");
    return;
  }

  function enlivenStrokePoints(strokePoints, cb) {
    if (!strokePoints || strokePoints.length === 0) {
      cb([]);
      return;
    }

    const filteredPoints = strokePoints.filter((p) => p != null);

    if (filteredPoints.length === 0) {
      cb([]);
      return;
    }

    const results = [];
    let processed = 0;
    const total = filteredPoints.length;

    filteredPoints.forEach((obj, index) => {
      if (!obj) {
        results[index] = obj;
        processed++;
        if (processed === total) {
          return cb(results);
        }
      } else if (obj.type === "PSPoint" && PSPoint.fromObject) {
        PSPoint.fromObject(obj, (point) => {
          results[index] = point;
          processed++;
          if (processed === total) {
            return cb(results);
          }
        });
      } else {
        results[index] = obj;
        processed++;
        if (processed === total) {
          return cb(results);
        }
      }
    });
  }

  function processPatterns(cb) {
    const originalStroke = object.stroke;
    const originalFill = object.fill;

    if (util.enlivenPatterns) {
      util.enlivenPatterns([object.fill, object.stroke], function (patterns) {
        if (patterns) {
          object.fill = patterns[0] !== undefined ? patterns[0] : originalFill;
          object.stroke =
            patterns[1] !== undefined ? patterns[1] : originalStroke;
        } else {
          object.fill = originalFill;
          object.stroke = originalStroke;
        }
        cb();
      });
    } else {
      cb();
    }
  }

  function processClipPath(cb) {
    if (!object.clipPath) {
      cb(null);
      return;
    }

    if (util.enlivenObjects) {
      util.enlivenObjects(
        [object.clipPath],
        function (enlived) {
          cb(enlived && enlived.length > 0 ? enlived[0] : null);
        },
        null,
        null,
      );
    } else {
      cb(object.clipPath);
    }
  }

  processPatterns(function () {
    processClipPath(function (clipPath) {
      object.clipPath = clipPath;
      enlivenStrokePoints(
        object["strokePoints"] || [],
        function (strokePoints) {
          const instance = new PSStroke(strokePoints, object);
          if (!instance.stroke && object.stroke) {
            instance.stroke = object.stroke;
          }
          callback(instance);
        },
      );
    });
  });
};

fabric["PSStroke"] = PSStroke;
export default PSStroke;
