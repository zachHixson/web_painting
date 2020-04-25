import {Stroke} from "./Stroke.js";
import {Vector2, VectorMath} from "./VectorLib.js";
import {Camera} from "./Camera.js";
import {Utils} from "./utils.js"

/*
How it works:
    - Current strokes are sent on load
    - When drawing the new stroke is added to mousebuffer as preview
    - On mouse up:
        - mousebuffer is emitted
        - mousebuffer is added to strokes stored on server
        - mousebuffer is broadcast to other clients to be added
*/

const WORLD_DIMENSIONS = new Vector2(2000, 2000);
const GRID_SIZE = 40;
const TIME_FAC = 1;
const MAX_STROKES = {
    CLOUDS : 10,
    DIRT : 10,
    WIND : 20,
    BIRDS : 15
};

let camera;
let randomSeed;
let compCanvas;
let bgBufferCanvas;
let drawBufferCanvas;
let mouse = {
    mouseDown : false,
    x : 0,
    y : 0
};
let time = 0;
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

    //set canvas width and height
    setScreenDimensions();

    camera = new Camera();
    camera.bounds.x = compCanvas.width;
    camera.bounds.y = compCanvas.height;
    mouse.x = compCanvas.width / 2;
    mouse.y = compCanvas.height / 2;

    bindEvents();

    randomSeed = Math.random();
    console.log(Stroke.getRandomType(randomSeed));

    main()
    window.requestAnimationFrame(function(){main()})
}

function setScreenDimensions(){
    const SCALE_FAC = 0.98;

    compCanvas.width = window.innerWidth * SCALE_FAC;
    bgBufferCanvas.width = window.innerWidth * SCALE_FAC;
    drawBufferCanvas.width = window.innerWidth * SCALE_FAC;
    compCanvas.height = window.innerHeight * SCALE_FAC;
    bgBufferCanvas.height = window.innerHeight * SCALE_FAC;
    drawBufferCanvas.height = window.innerHeight * SCALE_FAC;
}

function bindEvents(){
    //desktop events
    compCanvas.addEventListener("mousemove", onMouseMove);
    compCanvas.addEventListener("mousedown", function(event){
        mouse.mouseDown = true;
        mouseBuffer.points.push(new Vector2(event.offsetX, event.offsetY));
    });
    window.addEventListener("mouseup", function(event){
        mouse.mouseDown = false
        commitBuffer();
    });

    //mobile events
    compCanvas.addEventListener('touchstart', function(event){
        event.preventDefault()
        updateDrawBuffer(event);
    });
    compCanvas.addEventListener("touchmove", function(event){
        event.preventDefault()
        mouse.mouseDown = true;
        mouseBuffer.points.push(new Vector2(event.touches[0].clientX, event.touches[0].clientY));
    });
    window.addEventListener("touchend", function(event){
        event.preventDefault()
        mouseDown = false
        commitBuffer();
    });

    window.onresize = function(){setScreenDimensions()}
}

function onMouseMove(event){
    mouse.x = event.offsetX;
    mouse.y = event.offsetY;
    updateCamera();
    updateDrawBuffer(event);
}

function main(){
    if (time % TIME_FAC == 0){
        //get contexts
        let compCtx = compCanvas.getContext("2d");
        let bgCtx = bgBufferCanvas.getContext("2d");

        updateCamera();
        updateBGBuffer();

        //comp canvases
        compCtx.drawImage(bgBufferCanvas, 0, 0, bgBufferCanvas.width, bgBufferCanvas.height);
        compCtx.drawImage(drawBufferCanvas, 0, 0, drawBufferCanvas.width, drawBufferCanvas.height);
    }
    time++;
    window.requestAnimationFrame(function(){main()})
}

function updateBGBuffer(){
    let bgCtx = bgBufferCanvas.getContext("2d");

    //draw bg
    bgCtx.fillStyle = "#dfdfdf";
    bgCtx.fillRect(0, 0, compCanvas.width, compCanvas.height);

    //draw grid
    bgCtx.strokeStyle = "#aca8ff";
    bgCtx.lineWidth = 1;
    for (let x = 0; x < (bgBufferCanvas.width / GRID_SIZE); x++){
        let modValue = (bgBufferCanvas.width + (GRID_SIZE / 2));
        let adjustedCameraX = camera.position.x % modValue;
        let xPos;

        if (camera.position.x < 0){
            adjustedCameraX += modValue;
        }

        xPos = ((x * GRID_SIZE) + adjustedCameraX) % modValue;

        bgCtx.beginPath();
        bgCtx.moveTo(xPos, 0);
        bgCtx.lineTo(xPos, bgBufferCanvas.height);
        bgCtx.stroke();
    }
    for (let y = 0; y < (bgBufferCanvas.height / GRID_SIZE); y++){
        let modValue = (bgBufferCanvas.height + (GRID_SIZE / 2))
        let adjustedCameraY = camera.position.y % modValue;
        let yPos;

        if (camera.position.y < 0){
            adjustedCameraY += modValue;
        }

        yPos = ((y * GRID_SIZE) + adjustedCameraY) % modValue;

        bgCtx.beginPath();
        bgCtx.moveTo(0, yPos);
        bgCtx.lineTo(bgBufferCanvas.width, yPos);
        bgCtx.stroke();
    }

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

    if (mouse.mouseDown){
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

function updateCamera(){
    const CONTROL_WIDTH = 50;
    const CAMERA_SPEED = 2;

    let ctx = drawBufferCanvas.getContext("2d");
    
    ctx.fillStyle = "rgba(128, 128, 128, 0.5)";

    if (!mouse.mouseDown){
        ctx.clearRect(0, 0, drawBufferCanvas.width, drawBufferCanvas.height);

        if (mouse.x < CONTROL_WIDTH){
            ctx.fillRect(0, 0, CONTROL_WIDTH, drawBufferCanvas.height);
            camera.position.x += CAMERA_SPEED;
        }

        if (mouse.y < CONTROL_WIDTH){
            ctx.fillRect(0, 0, drawBufferCanvas.width, CONTROL_WIDTH);
            camera.position.y += CAMERA_SPEED;
        }

        if (mouse.x > drawBufferCanvas.width - CONTROL_WIDTH){
            ctx.fillRect(
                drawBufferCanvas.width - CONTROL_WIDTH, 0,
                CONTROL_WIDTH, drawBufferCanvas.height
            );
            camera.position.x -= CAMERA_SPEED;
        }

        if (mouse.y > drawBufferCanvas.height - CONTROL_WIDTH){
            ctx.fillRect(
                0, drawBufferCanvas.height - CONTROL_WIDTH,
                drawBufferCanvas.width, drawBufferCanvas.height
            );
            camera.position.y -= CAMERA_SPEED;
        }
    }

    camera.position.x = Utils.clamp(camera.position.x, -WORLD_DIMENSIONS.x / 2, WORLD_DIMENSIONS.x / 2);
    camera.position.y = Utils.clamp(camera.position.y, -WORLD_DIMENSIONS.y / 2, WORLD_DIMENSIONS.y / 2)
}

function receiveStrokes(strokeArr){
    strokes = [];

    for (let i = 0; i < strokeArr.length; i++){
        strokes.push(new Stroke(
            strokeArr[i].type,
            strokeArr[i].points
        ));
    }

    cullStrokes();
}

function commitBuffer(){
    let drawCtx = drawBufferCanvas.getContext("2d");
    let bgCtx = bgBufferCanvas.getContext("2d");
    let viewCorrectedPoints = [];

    for (let i = 0; i < mouseBuffer.points.length; i++){
        viewCorrectedPoints.push(VectorMath.Subtract(mouseBuffer.points[i], camera.position));
    }

    if (mouseBuffer.points.length > 1) {
        let newStroke = new Stroke(Stroke.getRandomType(randomSeed), viewCorrectedPoints);
        newStroke.environment = strokes;
        newStroke.drawStroke(bgCtx, camera);
        strokes.push(newStroke);
        socket.emit('commitBuffer', newStroke.simplify());
    }

    mouseBuffer.points = [];
    drawCtx.clearRect(0, 0, drawBufferCanvas.width, drawBufferCanvas.height);
    cullStrokes();
    
    document.getElementById("bgm").play();
}

function newStroke(stroke){
    strokes.push( new Stroke(
        stroke.type,
        stroke.points
    ));
    cullStrokes();
}

function cullStrokes(){
    let cloudIdxs = [];
    let dirtIdxs = [];
    let windIdxs = [];
    let birdIdxs = [];

    for (let i = 0; i < strokes.length; i++){
        switch(strokes[i].type){
            case "cloud":
                cloudIdxs.push(i);

                if (cloudIdxs.length > MAX_STROKES.CLOUDS){
                    strokes[cloudIdxs[0]].isAlive = false;
                    cloudIdxs.shift();
                }
                break;
            case "dirt":
                dirtIdxs.push(i)

                if (dirtIdxs.length > MAX_STROKES.DIRT){
                    strokes[dirtIdxs[0]].isAlive = false;
                    dirtIdxs.shift();
                }
                break;
            case "wind":
                windIdxs.push(i);

                if (windIdxs.length > MAX_STROKES.WIND){
                    strokes[windIdxs[0]].isAlive = false;
                    windIdxs.shift();
                }
                break;
            case "birds":
                birdIdxs.push(i);

                if (birdIdxs.length > MAX_STROKES.BIRDS){
                    strokes[birdIdxs[0]].isAlive = false;
                    birdIdxs.shift();
                }
                break;
        }
    }
}

function draw_circle(ctx, x, y, r){
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2, false); //draws arc (x, y, radius, start arc, end arc, reverse start/end)
    ctx.fill();
}