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
    }

    static get TYPES(){
        return STROKE_TYPES;
    }

    static getRandomType(seed){
        seed = Math.round(seed * 100) + 7879;
        //return STROKE_TYPES[seed % STROKE_TYPES.length];
        return STROKE_TYPES[0];
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
        const MICROPOINT_MAX = 20;
        const MICROPOINT_RAD = 10;

        let cloudCount = Math.min((3 * this.points.length), CLOUD_MAX);

        if (this.properties == null){
            this.properties = {
                clouds : [],
                raindrops : []
            }

            //Creates a clouds
            for (let i = 0; i < cloudCount; i++){
                let splineFac = i / cloudCount;
                let splinePos = splineFac * this.points.length;
                let splinePoint = Math.min(Math.floor(splinePos), this.points.length - 2);
                let subPos = splinePos % 1;
                let curPos = new Vector2(
                    lerp(this.points[splinePoint].x, this.points[splinePoint + 1].x, subPos),
                    lerp(this.points[splinePoint].y, this.points[splinePoint + 1].y, subPos)
                );
                let micropoints = [];

                for (let m = 0; m < MICROPOINT_MAX; m++){
                    micropoints.push(
                        new Vector2(
                            curPos.x + (pos_neg_rand() * CLOUD_RADIUS),
                            curPos.y + pos_neg_rand() * CLOUD_RADIUS
                        )
                    );
                }

                this.properties.clouds.push({
                    position : curPos,
                    micropoints : micropoints,
                    sizeFac : 0
                });
            }
        }

        //process clouds
        ctx.fillStyle = "black";
        for (let i = 0; i < this.properties.clouds.length; i++){
            let curCloud = this.properties.clouds[i];

            curCloud.sizeFac = Math.min(curCloud.sizeFac + 0.03, 1);

            for (let m = 0; m < curCloud.micropoints.length; m++){
                draw_circle(ctx, curCloud.micropoints[m].x, curCloud.micropoints[m].y, MICROPOINT_RAD * ease_back(curCloud.sizeFac, 1.8));
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