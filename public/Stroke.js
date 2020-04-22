import {Vector2} from "./VectorLib.js";
export{Stroke};

const STROKE_TYPES = [
    "cloud",
    "dirt",
    "mushroom",
    "flower"
];

class Stroke{
    constructor(type = "", pointArr = []){
        this.type = type;
        this.points = pointArr;
        this.properties = null;
        this.time = 0;
    }

    static get TYPES(){
        return STROKE_TYPES;
    }

    static getRandomType(seed){
        seed = Math.round(seed * 100) + 7879;
        //return STROKE_TYPES[seed % STROKE_TYPES.length];
        return STROKE_TYPES[0];
    }

    advanceTime(){
        this.time += 0.1;
    }

    simplify(){
        return {
            type : this.type,
            points : this.points
        };
    }

    drawStroke(ctx){
        switch (this.type){
            case "cloud":
                this.drawCloud(ctx);
                break;
            case "dirt":
                this.drawCloud(ctx);
                break;
            case "mushroom":
                this.drawCloud(ctx);
                break;
            case "flower":
                this.drawCloud(ctx);
                break;
            default:
                this.drawDefault(ctx);
        }
    }

    drawCloud(ctx){
        const CLOUD_MAX = 100;
        const CLOUD_RADIUS = 10;
        const CLOUD_PER_SEG = 5;
        const MICROPOINT_MAX = 20;
        const MICROPOINT_RAD = 10;

        if (this.properties == null){
            let cloudCount = Math.min((CLOUD_PER_SEG * this.points.length), CLOUD_MAX);
            let sampledSpline = multisample_spline(this.points, cloudCount);

            this.properties = {
                clouds : [],
                raindrops : []
            }

            //Creates a clouds
            for (let i = 0; i < sampledSpline.length; i++){
                let micropoints = [];

                //Create micropoints
                for (let m = 0; m < Math.floor(Math.random() * MICROPOINT_MAX); m++){
                    micropoints.push(
                        new Vector2(
                            sampledSpline[i].x + (pos_neg_rand() * CLOUD_RADIUS),
                            sampledSpline[i].y + pos_neg_rand() * CLOUD_RADIUS
                        )
                    );
                }

                this.properties.clouds.push({
                    position : sampledSpline[i],
                    micropoints : micropoints,
                    sizeFac : 0
                });
            }
        }

        //process clouds
        ctx.fillStyle = "#585858";
        for (let i = 0; i < this.properties.clouds.length; i++){
            let curCloud = this.properties.clouds[i];

            curCloud.sizeFac = Math.min(curCloud.sizeFac + 0.03, 1);

            for (let m = 0; m < curCloud.micropoints.length; m++){
                let xWave = Math.sin(curCloud.micropoints[m].x + this.time + 2574);
                let yWave = Math.sin(curCloud.micropoints[m].y + this.time + 2589);

                draw_circle(ctx,
                    curCloud.micropoints[m].x + xWave,
                    curCloud.micropoints[m].y + yWave,
                    MICROPOINT_RAD * ease_back(curCloud.sizeFac, 1.8)
                );
            }
        }
    }

    drawDirt(ctx){
        //
    }

    drawMushRoom(ctx){
        //
    }

    drawFlower(ctx){
        //
    }

    drawDefault(ctx){
        //
    }
}

function draw_circle(ctx, x, y, r){
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2, false); //draws arc (x, y, radius, start arc, end arc, reverse start/end)
    ctx.fill();
}

function ease_back(x, overshoot){
    return 1 + (overshoot + 1) * Math.pow(x-1, 3) + overshoot * Math.pow(x-1, 2);
}

function pos_neg_rand(){
    return (Math.random() * 2) - 1;
}

function lerp(a, b, f){
    return a + f * (b - a);
}

function multisample_spline(spline, samples){
    let newSpline = [];

    for (let i = 0; i < samples; i++){
        let splineFac = i / samples;
        let splinePos = splineFac * spline.length;
        let splinePoint = Math.min(Math.floor(splinePos), spline.length - 2);
        let subPos = splinePos % 1;
        newSpline.push(new Vector2(
            lerp(spline[splinePoint].x, spline[splinePoint + 1].x, subPos),
            lerp(spline[splinePoint].y, spline[splinePoint + 1].y, subPos)
        ));
    }

    return newSpline;
}