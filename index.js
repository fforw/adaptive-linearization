var assign = require("object-assign");

var DEFAULT_OPTS = {

    /**
     * Maximum error value we allow until we give up and call it a line.
     */
    threshold: 0.25,
    /**
     * Maximum line length in SVG units. If set to a value higher than 0, straight lines above that length
     * will be chopped down to shorter lines.
     *
     * This is useful if you deform the shapes so that formerly straight lines are not straight anymore and would
     * bend weird if not chopped up into shorter pieces.
     */
    maxLine: 0
};

function AdaptiveLinearization(consumer, opts)
{
    if (typeof consumer !== "function")
    {
        throw new Error("Need a consumer callback function");
    }

    this.consumer = consumer;
    this.opts = assign({}, DEFAULT_OPTS, opts);
}


AdaptiveLinearization.prototype.linearize = function(x1, y1, x2, y2, x3, y3, x4, y4)
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

        if (maxLine === 0 || Math.sqrt(x*x+y*y) <= maxLine)
        {
            // Draw and stop
            //----------------------
            consumer(x1, y1, x4, y4);
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
    this.linearize(x1, y1, x12, y12, x123, y123, x1234, y1234);
    this.linearize(x1234, y1234, x234, y234, x34, y34, x4, y4);
};

AdaptiveLinearization.prototype.svgPathIterator = function (segment, index, curX, curY)
{
    var command = segment[0];
    var drawLine = this.consumer;

    var i, x, y, x2, y2, x3, y3, x4, y4, short;


    //noinspection FallThroughInSwitchStatementJS
    switch (command)
    {
        case "M":
            for (i = 3; i < segment.length; i += 2)
            {
                x = segment[i];
                y = segment[i + 1];

                drawLine(curX, curY, x, y);

                curX = x;
                curY = y;
            }
            break;
        case "L":
            for (i = 3; i < segment.length; i += 2)
            {
                x = segment[i];
                y = segment[i + 1];

                drawLine(curX, curY, x, y);

                curX = x;
                curY = y;
            }
            break;
        case "H":

            x = segment[1];
            y = curY;

            drawLine(curX, curY, x, y);

            curX = x;
            break;
        case "V":

            x = curX;
            y = segment[1];

            drawLine(curX, curY, x, y);

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
                    x4,y4
                );

                curX = x;
                curY = y;
            }
            break;
        default:
            throw new Error("path command '" + command + "' not supported yet");

    }
};

module.exports = AdaptiveLinearization;
