var assign = require("object-assign");

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
            for (i = 1; i < segment.length; i += 2)
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
     * Maximum error value we allow until we give up and call it a line.
     */
    threshold: 0.25,
    /**
     * Maximum line length in SVG units. (Default is Infinity). Straight lines above that length
     * will be chopped down to shorter lines.
     *
     * This is useful if you deform the shapes so that formerly straight lines are not straight anymore and would
     * bend weird if not chopped up into shorter pieces.
     */
    maxLine: Infinity
};

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



    this.consumer = consumer;
    this.opts = opts;
    this.svgPathIterator  = svgPathIterator.bind(this);

    //console.log("OPTS", opts);
}

/**
 * Core linearization function linearizes the given bezier curve. Calls the line consumer function registered for
 * the current instance once for every line segment of the linearized curve.
 *
 * @param x1        x-coordinate of the start point
 * @param y1        y-coordinate of the start point
 * @param x2        x-coordinate of the first control point
 * @param y2        y-coordinate of the first control point
 * @param x3        x-coordinate of the second control point
 * @param y3        y-coordinate of the second control point
 * @param x4        x-coordinate of the end point
 * @param y4        y-coordinate of the start point
 * @param data      user data passed on to the comsumer function
 */
AdaptiveLinearization.prototype.linearize = function(x1, y1, x2, y2, x3, y3, x4, y4, data)
{

    var threshold = this.opts.threshold;
    var maxLine = this.opts.maxLine;
    var consumer = this.consumer;
    
    if(
        Math.abs(x1 + x3 - x2 - x2) +
        Math.abs(y1 + y3 - y2 - y2) +
        Math.abs(x2 + x4 - x3 - x3) +
        Math.abs(y2 + y4 - y3 - y3) <= threshold
    )
    {

        var x = x4 - x1;
        var y = y4 - y1;

        if (maxLine < Infinity || Math.sqrt(x*x+y*y) <= maxLine)
        {
            // Draw and stop
            //----------------------
            consumer(x1, y1, x4, y4, data);
            return;
        }
    }

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

    // Continue subdivision
    //----------------------
    this.linearize(x1, y1, x12, y12, x123, y123, x1234, y1234, data);
    this.linearize(x1234, y1234, x234, y234, x34, y34, x4, y4, data);
};


module.exports = AdaptiveLinearization;
