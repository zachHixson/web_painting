import {Vector2, VectorMath} from "./VectorLib.js";
export{Stroke};

const STROKE_TYPES = [
    "cloud",
    "dirt",
    "wind"
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
        return STROKE_TYPES[seed % STROKE_TYPES.length];
        return STROKE_TYPES[1];
    }

    advanceTime(){
        this.time += 1;
    }

    simplify(){
        return {
            type : this.type,
            points : this.points
        };
    }

    drawStroke(ctx, cameraPos){
        switch (this.type){
            case "cloud":
                this.drawCloud(ctx, cameraPos);
                break;
            case "dirt":
                this.drawDirt(ctx, cameraPos);
                break;
            case "wind":
                this.drawWind(ctx, cameraPos);
                break;
            default:
                this.drawDefault(ctx, cameraPos);
        }
    }

    drawCloud(ctx, cameraPos){
        const CLOUD_MAX = 100;
        const CLOUD_RADIUS = 10;
        const CLOUD_PER_SEG = 5;
        const MICROPOINT_MAX = 20;
        const MICROPOINT_RAD = 10;
        const WIGGLE_SPEED = 0.05;
        const RAIN_PER_FRAME = 1;
        const MAX_RAIN = 100;
        const RAIN_DIRECTION = new Vector2(-0.1, 1);
        const RAIN_LENGTH = 20;

        let normalRainDir = RAIN_DIRECTION.GetNormalized();

        //initialize stroke
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

        //process rain
        ctx.strokeStyle = "#4acdff";
        ctx.lineWidth = 2;
        for (let i = 0; i < RAIN_PER_FRAME; i++){
            this.properties.raindrops.push(
                sample_spline(this.points, Math.random())
            );
        }

        if (this.properties.raindrops.length > MAX_RAIN){
            this.properties.raindrops.splice(0, RAIN_PER_FRAME);
        }

        for (let i = 0; i < this.properties.raindrops.length; i++){
            let curDrop = this.properties.raindrops[i];
            let viewTransformPos = VectorMath.Add(curDrop, cameraPos);

            curDrop.Add(RAIN_DIRECTION);

            ctx.beginPath();
            ctx.moveTo(viewTransformPos.x, viewTransformPos.y);
            ctx.lineTo(
                viewTransformPos.x + (normalRainDir.x * RAIN_LENGTH),
                viewTransformPos.y + (normalRainDir.y * RAIN_LENGTH)
            );
            ctx.stroke();
        }

        //process clouds
        ctx.fillStyle = "#585858";
        for (let i = 0; i < this.properties.clouds.length; i++){
            let curCloud = this.properties.clouds[i];

            curCloud.sizeFac = Math.min(curCloud.sizeFac + 0.03, 1);

            for (let m = 0; m < curCloud.micropoints.length; m++){
                let xWave = Math.sin(curCloud.micropoints[m].x + (this.time * WIGGLE_SPEED) + 2574);
                let yWave = Math.sin(curCloud.micropoints[m].y + (this.time * WIGGLE_SPEED) + 2589);
                let viewTransformPos = VectorMath.Add(curCloud.micropoints[m], cameraPos);

                draw_circle(ctx,
                    viewTransformPos.x + xWave,
                    viewTransformPos.y + yWave,
                    MICROPOINT_RAD * ease_back(curCloud.sizeFac, 1.8)
                );
            }
        }
    }

    drawDirt(ctx, cameraPos){
        const DIRT_MAX = 50;
        const DIRT_PER_SEG = 4;
        const DIRT_RADIUS = 20;

        if (this.properties == null){
            let sampleCount = Math.min(DIRT_PER_SEG * this.points.length, DIRT_MAX);
            let sampledSpline = multisample_spline(this.points, sampleCount);

            this.properties = {
                dirtpoints : sampledSpline,
                lifePoints : []
            };
        }

        //draw dirt
        ctx.fillStyle = "#8a4200";
        for (let i = 0; i < this.properties.dirtpoints.length; i++){
            let curDirt = this.properties.dirtpoints[i];
            draw_circle(ctx, curDirt.x, curDirt.y, DIRT_RADIUS);
        }
    }

    drawWind(ctx, cameraPos){
        //
    }

    drawDefault(ctx, cameraPos){
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

function sample_spline(spline, fac){
    let splinePos = fac * spline.length;
    let splinePoint = Math.min(Math.floor(splinePos), spline.length - 2);
    let subPos = splinePos % 1;
    return new Vector2(
            lerp(spline[splinePoint].x, spline[splinePoint + 1].x, subPos),
            lerp(spline[splinePoint].y, spline[splinePoint + 1].y, subPos)
    );
}

function multisample_spline(spline, samples){
    let newSpline = [];

    for (let i = 0; i < samples - 1; i++){
        let splineFac = i / samples;
        newSpline.push(sample_spline(spline, splineFac));
    }

    return newSpline;
}