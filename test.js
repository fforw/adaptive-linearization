const assert = require("assert");
const AdaptiveLinearization = require("./index");

var calls;

const DATA = {};

function clear()
{
    calls = [];
}

function collect(x1,y1,x2,y2,data)
{

    calls.push({
        x1: x1,
        y1: y1,
        x2: x2,
        y2: y2,
        data: data
    });
}

describe("Adaptive Linearization", function () {

    beforeEach(clear);

    it("linearizes lines", function () {

        const al = new AdaptiveLinearization(collect);

        al.linearize(100,100,200,100,100,100,100,100, DATA);

        console.log(calls);


    })
});
