import {Stroke} from "./Stroke.js";
import {Vector2, VectorMath} from "./VectorLib.js";

/*
How it works:
    - Current strokes are sent on load
    - When drawing the new stroke is added to mousebuffer as preview
    - On mouse up:
        - mousebuffer is emitted
        - mousebuffer is added to strokes stored on server
        - mousebuffer is broadcast to other clients to be added
*/

const WORLD_DIMENSIONS = new Vector2(5000, 5000);

let camera = new Vector2(0, 0);
let randomSeed;
let compCanvas;
let bgBufferCanvas;
let drawBufferCanvas;
let mouseDown = false;
let strokes = [];
let mouseBuffer = {
    points : []
}

window.onload = function(){
    socket.on('receiveStrokes', receiveStrokes);
    socket.on("newStroke", newStroke);
    socket.emit("getStrokes")

    compCanvas = document.getElementById("compositeCanvas");
    bgBufferCanvas = document.getElementById("backgroundBuffer");
    drawBufferCanvas = document.getElementById("drawBuffer");

    compCanvas.addEventListener("mousemove", updateDrawBuffer);
    compCanvas.addEventListener("mousedown", function(event){
        mouseDown = true;
        mouseBuffer.points.push(new Vector2(event.offsetX, event.offsetY));
    });
    window.addEventListener("mouseup", function(event){
        mouseDown = false
        commitBuffer();
    });

    randomSeed = Math.random();
    console.log(Stroke.getRandomType(randomSeed));

    main()
    window.requestAnimationFrame(function(){main()})
}

function main(){
    //get contexts
    let compCtx = compCanvas.getContext("2d");
    let bgCtx = bgBufferCanvas.getContext("2d");

    //draw bg
    bgCtx.fillStyle = "#dfdfdf";
    bgCtx.fillRect(0, 0, compCanvas.width, compCanvas.height);

    updateBGBuffer();

    //comp canvases
    compCtx.drawImage(bgBufferCanvas, 0, 0, bgBufferCanvas.width, bgBufferCanvas.height);
    compCtx.drawImage(drawBufferCanvas, 0, 0, drawBufferCanvas.width, drawBufferCanvas.height);

    window.requestAnimationFrame(function(){main()})
}

function updateBGBuffer(){
    let bgCtx = bgBufferCanvas.getContext("2d");

    for (let i = 0; i < strokes.length; i++){
        strokes[i].environment = strokes;
        strokes[i].advanceTime();
        strokes[i].drawStroke(bgCtx, camera);

        if (!strokes[i].isAlive){
            strokes.splice(i, 1);
        }
    }
}

function updateDrawBuffer(event){
    let drawBuff = drawBufferCanvas.getContext('2d');

    drawBuff.clearRect(0, 0, drawBufferCanvas.width, drawBufferCanvas.height);

    if (mouseDown){
        let curPos = new Vector2(event.offsetX, event.offsetY);
        let lastPos = mouseBuffer.points[mouseBuffer.points.length - 1];

        //get mouse position and log to buffer
        if (curPos.GetDistance(lastPos) > 50){
            mouseBuffer.points.push(curPos);
        }

        //draw mouse buffer to buffer canvas
        drawBuff.fillStyle = "red";
        drawBuff.strokeStyle = "red";
        drawBuff.lineWidth = 2;
        for (let i = 0; i < mouseBuffer.points.length; i++){
            let curPoint = mouseBuffer.points[i];
            let lastPoint;

            if (i > 0){
                lastPoint = mouseBuffer.points[i - 1];
            }
            else{
                lastPoint = curPoint;
            }

            drawBuff.beginPath();
            drawBuff.moveTo(curPoint.x, curPoint.y);
            drawBuff.lineTo(lastPoint.x, lastPoint.y);
            drawBuff.stroke();
            draw_circle(drawBuff, curPoint.x, curPoint.y, 5);
        }
    }
}

function receiveStrokes(strokeArr){
    strokes = [];

    for (let i = 0; i < strokeArr.length; i++){
        strokes.push(new Stroke(
            strokeArr[i].type,
            strokeArr[i].points
        ));
    }
}

function commitBuffer(){
    let drawCtx = drawBufferCanvas.getContext("2d");
    let bgCtx = bgBufferCanvas.getContext("2d");
    let viewCorrectedPoints = [];

    for (let i = 0; i < mouseBuffer.points.length; i++){
        viewCorrectedPoints.push(VectorMath.Subtract(mouseBuffer.points[i], camera));
    }

    if (mouseBuffer.points.length > 0) {
        let newStroke = new Stroke(Stroke.getRandomType(randomSeed), viewCorrectedPoints);
        newStroke.environment = strokes;
        newStroke.drawStroke(bgCtx, camera);
        strokes.push(newStroke);
        socket.emit('commitBuffer', newStroke.simplify());
    }

    mouseBuffer.points = [];
    drawCtx.clearRect(0, 0, drawBufferCanvas.width, drawBufferCanvas.height);
}

function newStroke(stroke){
    strokes.push( new Stroke(
        stroke.type,
        stroke.points
    ));
    console.log(strokes)
}

function draw_circle(ctx, x, y, r){
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2, false); //draws arc (x, y, radius, start arc, end arc, reverse start/end)
    ctx.fill();
}