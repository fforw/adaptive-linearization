var assign = require("object-assign");

var Math__abs = Math.abs;
var Math__atan2 = Math.atan2;
var Math__sqrt = Math.sqrt;

var PI = Math.PI;
var TAU = PI*2;

/**
 * Higher level helper function to linearize full svg-paths. Supposed to be called by the iterate function
 * of the svgpath library. (NPM "svgpath").
 *
 * @param segment   segment array
 * @param index     index
 * @param curX      current x-coordinate
 * @param curY      current y-coordinate
 */
function svgPathIterator(segment, index, curX, curY)
{
    var command = segment[0];
    var drawLine = this.consumer;

    var i, x, y, x2, y2, x3, y3, x4, y4, short = false;

    //console.log("svgPathIterator: segment =",segment, "index =", index, "cur =", curX, curY);

    //noinspection FallThroughInSwitchStatementJS
    switch (command)
    {
        case "M":
            curX = segment[1];
            curY = segment[2];

            for (i = 3; i < segment.length; i += 2)
            {
                x = segment[i];
                y = segment[i + 1];

                drawLine(curX, curY, x, y, index);

                curX = x;
                curY = y;
            }
            break;
        case "L":
            for (i = 1; i < segment.length; i += 2)
            {
                x = segment[i];
                y = segment[i + 1];

                drawLine(curX, curY, x, y, index);

                curX = x;
                curY = y;
            }
            break;
        case "H":

            x = segment[1];
            y = curY;

            drawLine(curX, curY, x, y, index);

            curX = x;
            break;
        case "V":

            x = curX;
            y = segment[1];

            drawLine(curX, curY, x, y, index);

            curY = y;
            break;
        case "Z":
            break;
        case "Q":
            short = true;
        // intentional fallthrough
        case "C":
            //console.log("C segment", segment);
            var step = short ? 4 : 6;

            for (i = 1; i < segment.length; i += step)
            {
                x = curX;
                y = curY;
                x2 = segment[i];
                y2 = segment[i + 1];
                x3 = short ? x2 : segment[i + 2];
                y3 = short ? y2 : segment[i + 3];
                x4 = short ? segment[i + 2] : segment[i + 4];
                y4 = short ? segment[i + 3] : segment[i + 5];

                this.linearize(
                    x,y,
                    x2,y2,
                    x3,y3,
                    x4,y4,
                    index
                );

                curX = x;
                curY = y;
            }
            break;
        default:
            throw new Error("path command '" + command + "' not supported yet");

    }
}

var DEFAULT_OPTS = {
    /**
     * Approximation scale: Higher is better quality
     */
    approximationScale: 1,
    /**
     * Limit to disregard the curve distance at
     */
    curve_distance_epsilon: 1e-30,
    /**
     * Limit to disregard colinearity at
     */
    curveColinearityEpsilon: 1e-30,
    /**
     * Limit disregard angle tolerance
     */
    curveAngleToleranceEpsilon:  0.01,

    /**
     * Angle tolerance, higher is better quality
     */
    angleTolerance: 0.4,
    /**
     * Hard recursion subdivision limit
     */
    recursionLimit: 32,

    /**
     * Limit for curve cusps: 0 = off (range: 0 to pi)
     */
    cuspLimit: 0
};

/**
 * Creates a new AdaptiveLinearization instance
 *
 * @param consumer      {function} line consumer function
 * @param [opts]        options
 * @constructor
 */
function AdaptiveLinearization(consumer, opts)
{
    if (typeof consumer !== "function")
    {
        throw new Error("Need a consumer callback function");
    }

    opts = assign({}, DEFAULT_OPTS, opts);

    if (opts.maxLine <= 0)
    {
        throw new Error("maxLine option must be larger than 0");
    }

    var al = this;
    
    this.opts = opts;
    this.svgPathIterator = svgPathIterator.bind(this);
    this.prevX = false;
    this.prevY = false;

    this.consumer = function(x1,y1,x2,y2, data)
    {
        consumer(x1,y1,x2,y2, data);

        al.prevX = x2;
        al.prevY = y2;
    };

    //console.log("OPTS", opts);
}

function distanceTo(x1, y1, x2, y2)
{
    var x = x2 - x1;
    var y = y2 - y1;

    return Math__sqrt(x*x+y*y);
}


function linearizeRecursive(al, x1, y1, x2, y2, x3, y3, x4, y4, data, level)
{
    var consumer = al.consumer;
    var opts = al.opts;


    var cuspLimit = opts.cuspLimit;
    var curveColinearityEpsilon = opts.curveColinearityEpsilon;
    var curveAngleToleranceEpsilon = opts.curveAngleToleranceEpsilon;
    var angleTolerance = opts.angleTolerance;


    var distanceToleranceSquared = 0.5 / opts.approximationScale;
    distanceToleranceSquared *= distanceToleranceSquared;

    ///////////////////////////////
    // Calculate all the mid-points of the line segments
    //----------------------
    var x12   = (x1 + x2) / 2;
    var y12   = (y1 + y2) / 2;
    var x23   = (x2 + x3) / 2;
    var y23   = (y2 + y3) / 2;
    var x34   = (x3 + x4) / 2;
    var y34   = (y3 + y4) / 2;
    var x123  = (x12 + x23) / 2;
    var y123  = (y12 + y23) / 2;
    var x234  = (x23 + x34) / 2;
    var y234  = (y23 + y34) / 2;
    var x1234 = (x123 + x234) / 2;
    var y1234 = (y123 + y234) / 2;


    // Try to approximate the full cubic curve by a single straight line
    //------------------
    var dx = x4 - x1;
    var dy = y4 - y1;

    var d2 = Math__abs(((x2 - x4) * dy - (y2 - y4) * dx));
    var d3 = Math__abs(((x3 - x4) * dy - (y3 - y4) * dx));
    var da1, da2, k;

    switch(
    (d2 > curveColinearityEpsilon ? 2 : 0) +
    (d3 > curveColinearityEpsilon? 1 : 0)
        )
    {
        case 0:
            // All collinear OR p1==p4
            //----------------------
            k = dx*dx + dy*dy;
            if(k === 0)
            {
                d2 = distanceTo(x1, y1, x2, y2);
                d3 = distanceTo(x4, y4, x3, y3);
            }
            else
            {
                k   = 1 / k;
                da1 = x2 - x1;
                da2 = y2 - y1;
                d2  = k * (da1*dx + da2*dy);
                da1 = x3 - x1;
                da2 = y3 - y1;
                d3  = k * (da1*dx + da2*dy);
                if(d2 > 0 && d2 < 1 && d3 > 0 && d3 < 1)
                {
                    // Simple collinear case, 1---2---3---4
                    // We can leave just two endpoints
                    consumer(x1,y1,x4,y4, data);
                    return;
                }
                if(d2 <= 0) d2 = distanceTo(x2, y2, x1, y1);
                else if(d2 >= 1) d2 = distanceTo(x2, y2, x4, y4);
                else             d2 = distanceTo(x2, y2, x1 + d2*dx, y1 + d2*dy);

                if(d3 <= 0) d3 = distanceTo(x3, y3, x1, y1);
                else if(d3 >= 1) d3 = distanceTo(x3, y3, x4, y4);
                else             d3 = distanceTo(x3, y3, x1 + d3*dx, y1 + d3*dy);
            }
            if(d2 > d3)
            {
                if(d2 < distanceToleranceSquared)
                {
                    consumer(x1,y1,x2,y2, data);
                    return;
                }
            }
            else
            {
                if(d3 < distanceToleranceSquared)
                {
                    consumer(x1,y1, x3, y3, data);
                    return;
                }
            }
            break;

        case 1:
            // p1,p2,p4 are collinear, p3 is significant
            //----------------------
            if(d3 * d3 <= distanceToleranceSquared * (dx*dx + dy*dy))
            {
                if(angleTolerance < curveAngleToleranceEpsilon)
                {
                    consumer(x1,y1,x23,y23, data);
                    return;
                }

                // Angle Condition
                //----------------------
                da1 = Math__abs(Math__atan2(y4 - y3, x4 - x3) - Math__atan2(y3 - y2, x3 - x2));
                if(da1 >= PI) da1 = TAU - da1;

                if(da1 < angleTolerance)
                {
                    consumer(x1,y1,x2,y2, data);
                    consumer(x2,y2,x3,y3, data);
                    return;
                }

                if(cuspLimit !== 0.0)
                {
                    if(da1 > PI - cuspLimit)
                    {
                        consumer(x1,y1,x3,y3, data);
                        return;
                    }
                }
            }
            break;

        case 2:
            // p1,p3,p4 are collinear, p2 is significant
            //----------------------
            if(d2 * d2 <= distanceToleranceSquared * (dx*dx + dy*dy))
            {
                if(angleTolerance < curveAngleToleranceEpsilon)
                {
                    consumer(x1,y1,x23,y23, data);
                    return;
                }

                // Angle Condition
                //----------------------
                da1 = Math__abs(Math__atan2(y3 - y2, x3 - x2) - Math__atan2(y2 - y1, x2 - x1));
                if(da1 >= PI) da1 = TAU - da1;

                if(da1 < angleTolerance)
                {
                    consumer(x1,y1,x2,y2, data);
                    consumer(x2,y2,x3,y3, data);
                    return;
                }

                if(cuspLimit !== 0.0)
                {
                    if(da1 > PI - cuspLimit)
                    {
                        consumer(x1,y1,x2,y2, data);
                        return;
                    }
                }
            }
            break;

        case 3:
            // Regular case
            //-----------------
            if((d2 + d3)*(d2 + d3) <= distanceToleranceSquared * (dx*dx + dy*dy))
            {
                // If the curvature doesn't exceed the distance_tolerance value
                // we tend to finish subdivisions.
                //----------------------
                if(angleTolerance < curveAngleToleranceEpsilon)
                {
                    consumer(x1,y1,x23,y23, data);
                    return;
                }

                // Angle & Cusp Condition
                //----------------------
                k   = Math__atan2(y3 - y2, x3 - x2);
                da1 = Math__abs(k - Math__atan2(y2 - y1, x2 - x1));
                da2 = Math__abs(Math__atan2(y4 - y3, x4 - x3) - k);
                if(da1 >= PI) da1 = TAU - da1;
                if(da2 >= PI) da2 = TAU - da2;

                if(da1 + da2 < angleTolerance)
                {
                    consumer(x1,y1,x23,y23, data);
                    return;
                }

                if(cuspLimit !== 0.0)
                {
                    if(da1 > PI - cuspLimit)
                    {
                        consumer(x1,y1,x2,y2, data);
                        return;
                    }

                    if(da2 > PI - cuspLimit)
                    {
                        consumer(x1,y1,x3,y3, data);
                        return;
                    }
                }
            }
            break;
    }

    var nextLevel = level ? level + 1 : 1;

    if (nextLevel >= opts.recursionLimit)
    {
        consumer(x1, y1, x4, y4, data);
        return;
    }

    // Continue subdivision
    //----------------------
    linearizeRecursive(al, x1, y1, x12, y12, x123, y123, x1234, y1234, data, nextLevel);
    linearizeRecursive(al, x1234, y1234, x234, y234, x34, y34, x4, y4, data, nextLevel);
}

/**
 * Core linearization function linearizes the given bezier curve. Calls the line consumer function registered for
 * the current instance once for every line segment of the linearized curve.
 *
 * @param x1        {number} x-coordinate of the start point
 * @param y1        {number} y-coordinate of the start point
 * @param x2        {number} x-coordinate of the first control point
 * @param y2        {number} y-coordinate of the first control point
 * @param x3        {number} x-coordinate of the second control point
 * @param y3        {number} y-coordinate of the second control point
 * @param x4        {number} x-coordinate of the end point
 * @param y4        {number} y-coordinate of the start point
 * @param [data]    {*} user data passed on to the comsumer function
 */
AdaptiveLinearization.prototype.linearize = function(x1, y1, x2, y2, x3, y3, x4, y4, data)
{
    linearizeRecursive(this, x1, y1, x2, y2, x3, y3, x4, y4, data, 0);

    const prevX = this.prevX;
    const prevY = this.prevY;

    if (prevX !== x4 || prevY !== y4)
    {
        this.consumer(prevX, prevY, x4, y4, data);
    }
};

AdaptiveLinearization.DEFAULT_OPTS = DEFAULT_OPTS;

module.exports = AdaptiveLinearization;
