var AdaptiveLinearization = require("./index");

var s = "";

var lineConsumer = function(x1,y1,x2,y2){
    s+=" L" + x1 + "," + y1+ "  " + x2 + "," + y2;
};

const al = new AdaptiveLinearization(lineConsumer, {
    threshold: 2
});

al.linearize(0,50,33,0,66,100,100,50);

console.log("PATH: ", s);
