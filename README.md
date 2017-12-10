# Adaptive Linearization

Converts a bezier curve into a series of lines based on an acceptable error value (i.e. it will add more lines where the curve is curvier, and less lines if it's mostly straight ).

There are many areas where this can be useful. From 2D games to the animation of SVG graphics.

##Playground

[Playground on gh-pages](https://fforw.github.io/al-playground/)


Basic Usage
-----------

```js
    const al = new AdaptiveLinearization(lineConsumer, {
        threshold: 2
    });
    
    al.linearize(0,50,33,0,66,100,100,50, { id: 12 });

``` 

The lineConsumer function is a callback that will be called whenever a line should be drawn.

Line consumer
-------------

Each line consumer can take 5 parameters

 * x1 - x-coordinate of the start point
 * y1 - y-coordinate of the start point
 * x2 - y-coordinate of the end point
 * y2 - y-coordinate of the end point
 * data - passed through from the last argument to `linearize`.


```js
    function lineConsumer(x1,y1,x2,y2,data)
    {
        // ...
    }
```





Usage with svgpath
------------------

AdaptiveLinearization has a second method `svgPathIterator` that is a convenient way to linearize complete SVG paths 
with the "svgpath" library.


```js
    const SVGPath = require("svgpath");
    const path = SVGPath("M0,50 C33,0 66,100 100,50").unarc().abs();

    const al = new AdaptiveLinearization(lineConsumer, {
        threshold: 2
    });

    path.iterate(al.svgPathIterator);
    
    
```


This does the same linearization as the basic example above. It can handle the following SVG path commands:
    
    * M
    * H
    * V
    * L
    * C
    * Q 
    

The `svgPathIterator` function passes the segment index from svgpath's iterate as `data` argument so it is available
in the line consumer.
    

Most of the work in reducing all svg paths to that is done with the `.unarc().abs()` which get rids of arc sections by
converting them to curves and converts everything to absolute coordinates.

### SVG transforms

What this does *not* solve is the issue of transform directives in the SVG translating the paths. To be able to reproduce
the exact same paths, we need to handle the transforms. There are two strategies.

First you can get rid of all transform attributes manually by editing the SVG or by using something like the Inkscape extension
[Apply transforms](https://github.com/Klowner/inkscape-applytransforms) automatically.

You can also load the complete SVG document in either a browser or with something like [jsdom](https://github.com/tmpvar/jsdom) and
then apply all the transforms around each path with svgpath's `transform` method.
  
Based on [Antigrain:Adaptive Subdivision of Bezier Curves](http://antigrain.com/research/adaptive_bezier/)
