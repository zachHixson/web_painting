import {Vector2, VectorMath} from "./VectorLib.js";
export{Stroke};

const STROKE_TYPES = [
    "cloud",
    "dirt",
    "wind",
    "birds"
];

class Stroke{
    constructor(type = "", pointArr = []){
        this.type = type;
        this.points = [];
        this.properties = null;
        this.time = 0;
        this.environment = null;
        this.isAlive = true;
        this.creationTime = new Date().getTime();
        this.lifeTime = null;

        for (let i = 0; i < pointArr.length; i++){
            this.points.push(new Vector2(pointArr[i]));
        }
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
        this.time += 1;
    }

    simplify(){
        return {
            type : this.type,
            points : this.points,
            creationTime : this.creationTime,
            lifeTime : this.lifeTime
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
        const CLOUD_LIFETIME = 5000;
        const MICROPOINT_MAX = 20;
        const MICROPOINT_RAD = 10;
        const WIGGLE_SPEED = 0.05;
        const RAIN_PER_FRAME = 1;
        const MAX_RAIN = 100;
        const RAIN_DIRECTION = new Vector2(-0.1, 1);
        const RAIN_LENGTH = 20;

        let normalRainDir = RAIN_DIRECTION.GetNormalized();
        this.lifeTime = CLOUD_LIFETIME;

        //initialize stroke
        if (this.properties == null){
            let cloudCount = Math.min((CLOUD_PER_SEG * this.points.length), CLOUD_MAX);
            let sampledSpline = multisample_spline(this.points, cloudCount);

            this.properties = {
                clouds : [],
                raindrops : [],
                sizeFac : 0,
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
                });
            }
        }

        if (this.isAlive){
            let curTime = new Date().getTime();
            let age = curTime - this.creationTime;

            if (age < CLOUD_LIFETIME){
                this.properties.sizeFac = Math.min(this.properties.sizeFac + 0.03, 1);
            }
            else{
                this.properties.sizeFac = this.properties.sizeFac - 0.003, 1;

                if (this.properties.sizeFac <= 0){
                    this.isAlive = false;
                    return
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

                for (let m = 0; m < curCloud.micropoints.length; m++){
                    let xWave = Math.sin(curCloud.micropoints[m].x + (this.time * WIGGLE_SPEED) + 2574);
                    let yWave = Math.sin(curCloud.micropoints[m].y + (this.time * WIGGLE_SPEED) + 2589);
                    let viewTransformPos = VectorMath.Add(curCloud.micropoints[m], cameraPos);

                    draw_circle(ctx,
                        viewTransformPos.x + xWave,
                        viewTransformPos.y + yWave,
                        MICROPOINT_RAD * ease_back(this.properties.sizeFac, 1.8)
                    );
                }
            }
        }
    }

    drawDirt(ctx, cameraPos){
        const DIRT_MAX = 50;
        const DIRT_PER_SEG = 4;
        const DIRT_RADIUS = 20;
        const DRY_COLOR = [214, 125, 0];
        const WET_COLOR = [140, 82, 0];
        const RAIN_HEIGHT = 150;
        const GRASS_PER_SEG = 20;
        const GRASS_MAX = 400;
        const GRASS_OFFSET = 0.5;
        const GRASS_POS_RAND = 5;
        const GRASS_HEIGHT_RAND = 5;
        const GRASS_HEIGHT = 30;
        const GRASS_WIGGLE_SPEED = 0.02;

        if (this.properties == null){
            let sampleCount = Math.min(DIRT_PER_SEG * this.points.length, DIRT_MAX);
            let grassCount = Math.min(GRASS_PER_SEG * this.points.length, GRASS_MAX);
            let sampledSpline = multisample_spline(this.points, sampleCount);
            let grassSamples = multisample_spline(this.points, grassCount);

            this.properties = {
                dirtpoints : sampledSpline,
                wetness_values : [],
                grasspoints : [],
                sizeFac : 0
            };

            for (let i = 0; i < sampledSpline.length; i++){
                this.properties.wetness_values.push(0);
            }

            for (let i = 0; i < grassSamples.length; i++){
                this.properties.grasspoints.push(
                    {
                        root : new Vector2(
                            grassSamples[i].x + (pos_neg_rand() * GRASS_POS_RAND),
                            grassSamples[i].y - (DIRT_RADIUS * GRASS_OFFSET),
                        ),
                        tip : new Vector2(
                            (pos_neg_rand() * GRASS_POS_RAND),
                            (GRASS_HEIGHT + (pos_neg_rand() * GRASS_HEIGHT_RAND)) - (DIRT_RADIUS * GRASS_OFFSET),
                        )
                    }
                )
            }
        }

        this.properties.sizeFac = Math.min(this.properties.sizeFac + 0.05, 1);

        //process dirt
        for (let i = 0; i < this.properties.dirtpoints.length; i++){
            let curDirt = this.properties.dirtpoints[i];
            let cloudPoints = [];
            let nearestCloudDist;

            //Get all cloud points
            for (let s = 0; s < this.environment.length; s++){
                if (this.environment[s].type == "cloud"){
                    for (let p = 0; p < this.environment[s].points.length; p++){
                        cloudPoints.push(this.environment[s].points[p]);
                    }
                }
            }

            //get nearest cloud point distance
            for (let p = 0; p < cloudPoints.length; p++){
                let distance = VectorMath.GetDistance(curDirt, cloudPoints[p]);

                if (
                        nearestCloudDist == null ||
                        (
                            distance < nearestCloudDist &&
                            cloudPoints[p].y < curDirt.y
                        )
                ){
                    nearestCloudDist = distance;
                }
            }

            if (nearestCloudDist < RAIN_HEIGHT){
                this.properties.wetness_values[i] = Math.min(this.properties.wetness_values[i] + 0.001, 1)
            }


            //draw dirt
            ctx.fillStyle = format_rgb(
                lerp(DRY_COLOR[0], WET_COLOR[0], this.properties.wetness_values[i]),
                lerp(DRY_COLOR[1], WET_COLOR[1], this.properties.wetness_values[i]),
                lerp(DRY_COLOR[2], WET_COLOR[2], this.properties.wetness_values[i])
            );

            draw_circle(
                ctx,
                curDirt.x + cameraPos.x,
                curDirt.y + cameraPos.y,
                DIRT_RADIUS * ease_back(this.properties.sizeFac, 1.5)
            );
        }

        //Process grass
        ctx.strokeStyle = "green";
        ctx.lineWidth = 2;
        for (let i = 0; i < this.properties.grasspoints.length; i++){
            let curGrass = this.properties.grasspoints[i];
            let grassFac = i / this.properties.grasspoints.length;
            let dirtIdx = Math.floor(grassFac * (this.properties.dirtpoints.length - 1));
            let wetFac = this.properties.wetness_values[dirtIdx];
            let viewTransformRoot = VectorMath.Add(curGrass.root, cameraPos);
            let viewTransformTip = VectorMath.Add(curGrass.tip, cameraPos);

            ctx.beginPath();
            ctx.moveTo(viewTransformRoot.x, viewTransformRoot.y);
            ctx.lineTo(
                viewTransformRoot.x + (Math.sin(viewTransformTip.x + (this.time * GRASS_WIGGLE_SPEED)) * wetFac),
                viewTransformRoot.y - (viewTransformTip.y * wetFac)
            )
            ctx.stroke();
        }
    }

    drawWind(ctx, cameraPos){
        //
    }

    drawBirds(ctx, cameraPos){
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

function format_rgb(r, g, b){
    return "rgb(" + r + "," + g + "," + b + ")";
}