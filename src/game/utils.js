import _ from 'underscore'

export var DEG2RAD = Math.PI / 180;
export var RAD2DEG = 180 / Math.PI;

export var Point = function(x, y) {
    this.x = x;
    this.y = y;
};
    Object.defineProperty(Point.prototype, 'x', {
        set: function(val) { this._x = val; },
        get: function() { return this._x; }
    });
    Object.defineProperty(Point.prototype, 'y', {
        set: function(val) { this._y = val; },
        get: function() { return this._y; }
    });

export var Rect = function(x, y, w, h) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
};
    Object.defineProperty(Rect.prototype, 'x', {
        set: function(val) { this._x = val; },
        get: function() { return this._x; }
    });
    Object.defineProperty(Rect.prototype, 'y', {
        set: function(val) { this._y = val; },
        get: function() { return this._y; }
    });
    Object.defineProperty(Rect.prototype, 'w', {
        set: function(val) { this._w = val; },
        get: function() { return this._w; }
    });
    Object.defineProperty(Rect.prototype, 'h', {
        set: function(val) { this._h = val; },
        get: function() { return this._h; }
    });
    Object.defineProperty(Rect.prototype, 'x2', {
        set: function(val) { this.w = val - this.x; },
        get: function() { return this.x + this.w; }
    });
    Object.defineProperty(Rect.prototype, 'y2', {
        set: function(val) { this.h = val - this.y; },
        get: function() { return this.y + this.h; }
    });

export function randomRange(min, max) {
    return Math.random() * (max - min) + min;
}

export function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function capitalize(str) {
    return str[0].toUpperCase() + str.slice(1);
}

export function applyDecimal(number, n, func) {
    var inflate = Math.pow(10, n);
    var deflate = Math.pow(10, -n);
    return func(number * inflate) * deflate;
}

export function roundN(number, n) {
    return applyDecimal(number, n, Math.round);
}

// Returns a clone of the object.
export function cloneObject(obj) {
    return JSON.parse(JSON.stringify(obj));
}

// Error Handling

export function error(message, trace) {
    if (trace)
        console.trace();
    throw new Error('BPM2 -- Error > ' + message);
}

//function typeError

export function warn(trace, message) {
    // wrapper for console.warn
    // can use to track bugs during alpha, beta, into prod
    console.warn.apply(console, _BPMSetupLogMessage('Warning', trace, message, arguments));
    if (trace === true)
        console.trace();
}

export function log(trace, message) {
    console.log.apply(console, _BPMSetupLogMessage('Message', trace, message, arguments));
    if (trace === true)
        console.trace();
}

export function _BPMSetupLogMessage(type, trace, message, args) {
    var finalMessage = message;
    var i = (trace === true) ? 1 : 0;

    var arr = ['BPM '+type+' >>', _.tail(args, i)];

    return _.flatten(arr, true);
}
