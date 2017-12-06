Adaptive Linearization
======================

Converts a bezier curve into a series of lines based on an acceptable error value (i.e. it will add more lines where the curve is curvier, and less lines if it's mostly straight ).

There are many areas where this can be useful. From 2D games to the animation of SVG graphics.

Usage
-----

```js
    const al = new AdaptiveLinearization(lineConsumer, {
        threshold: 2
    });
    
    al.linearize(0,50,33,0,66,100,100,50);

``` 

The lineConsumer function is a callback that will be called whenever a line should be drawn.

I

