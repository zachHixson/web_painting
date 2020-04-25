import {Vector2, VectorMath} from "./VectorLib.js";
import { Boids } from "./Boids.js";
import {Utils} from "./utils.js";
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
        return STROKE_TYPES[3];
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

    drawStroke(ctx, camera){
        switch (this.type){
            case "cloud":
                this.drawCloud(ctx, camera);
                break;
            case "dirt":
                this.drawDirt(ctx, camera);
                break;
            case "wind":
                this.drawWind(ctx, camera);
                break;
            case "birds":
                this.drawBirds(ctx, camera);
                break;
            default:
                this.drawDefault(ctx, camera);
        }
    }

    drawCloud(ctx, camera){
        const CLOUD_MAX = 100;
        const CLOUD_RADIUS = 10;
        const CLOUD_PER_SEG = 5;
        const CLOUD_LIFETIME = 10000;
        const MICROPOINT_MAX = 20;
        const MICROPOINT_RAD = 10;
        const WIGGLE_SPEED = 0.05;
        const RAIN_PER_FRAME = 1;
        const MAX_RAIN = 100;
        const RAIN_DIRECTION = new Vector2(-0.1, 1);
        const RAIN_LENGTH = 20;
        const WIND_EFFECT_DISTANCE = 50;
        const WIND_EFFECT_SPEED = 0.02;
        const WIND_EFFECT_ON_CLOUD = 3;

        let normalRainDir = RAIN_DIRECTION.GetNormalized();
        this.lifeTime = CLOUD_LIFETIME;

        //initialize stroke
        if (this.properties == null){
            let cloudCount = Math.min((CLOUD_PER_SEG * this.points.length), CLOUD_MAX);
            let sampledSpline = Utils.multisample_spline(this.points, cloudCount);

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
                            sampledSpline[i].x + (Utils.pos_neg_rand() * CLOUD_RADIUS),
                            sampledSpline[i].y + (Utils.pos_neg_rand() * CLOUD_RADIUS)
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
            let windVectors = [];

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

            //get all wind vectors
            for (let s = 0; s < this.environment.length; s++){
                if (this.environment[s].type == "wind"){
                    for (let p = 0; p < this.environment[s].points.length - 1; p++){
                        let direction = VectorMath.Subtract(this.environment[s].points[p], this.environment[s].points[p + 1]);
                        windVectors.push({
                            point : this.environment[s].points[p],
                            direction : VectorMath.GetNormalized(direction)
                        });
                    }
                }
            }

            //process rain
            ctx.strokeStyle = "#4acdff";
            ctx.lineWidth = 2;
            for (let i = 0; i < RAIN_PER_FRAME; i++){
                this.properties.raindrops.push(
                    Utils.sample_spline(this.points, Math.random())
                );
            }

            if (this.properties.raindrops.length > MAX_RAIN){
                this.properties.raindrops.splice(0, RAIN_PER_FRAME);
            }

            for (let i = 0; i < this.properties.raindrops.length; i++){
                let curDrop = this.properties.raindrops[i];
                let viewTransformPos = VectorMath.Add(curDrop, camera.position);
                let velocity = RAIN_DIRECTION;

                if (this.checkBounds(viewTransformPos, camera.bounds)){
                    //factor in wind
                    for (let w = 0; w < windVectors.length; w++){
                        if (VectorMath.GetDistance(windVectors[w].point, curDrop) < WIND_EFFECT_DISTANCE){
                            velocity.Subtract(VectorMath.Scale(windVectors[w].direction, WIND_EFFECT_SPEED));
                        }
                    }

                    curDrop.Add(velocity);

                    ctx.beginPath();
                    ctx.moveTo(viewTransformPos.x, viewTransformPos.y);
                    ctx.lineTo(
                        viewTransformPos.x + (normalRainDir.x * RAIN_LENGTH),
                        viewTransformPos.y + (normalRainDir.y * RAIN_LENGTH)
                    );
                    ctx.stroke();
                }
            }

            //process clouds
            ctx.fillStyle = "#585858";
            for (let i = 0; i < this.properties.clouds.length; i++){
                let curCloud = this.properties.clouds[i];
                let windVelocity = new Vector2(0, 0);
                let cloudViewTransformPos = VectorMath.Add(curCloud.position, camera.position);

                if (this.checkBounds(cloudViewTransformPos, camera.bounds)){
                    //factor in wind
                    for (let w = 0; w < windVectors.length; w++){
                        if (VectorMath.GetDistance(windVectors[w].point, curCloud.position) < WIND_EFFECT_DISTANCE){
                            windVelocity.Add(windVectors[w].direction);
                        }
                    }

                    windVelocity.GetNormalized();
                    windVelocity.Scale(WIND_EFFECT_SPEED * WIND_EFFECT_ON_CLOUD);

                    for (let m = 0; m < curCloud.micropoints.length; m++){
                        let xWave = Math.sin(curCloud.micropoints[m].x + (this.time * WIGGLE_SPEED) + 2574);
                        let yWave = Math.sin(curCloud.micropoints[m].y + (this.time * WIGGLE_SPEED) + 2589);
                        let viewTransformPos;

                        curCloud.micropoints[m].Subtract(windVelocity);
                        viewTransformPos = VectorMath.Add(curCloud.micropoints[m], camera.position);

                        if (this.checkBounds(viewTransformPos, camera.bounds)){
                            Utils.draw_circle(ctx,
                                viewTransformPos.x + xWave,
                                viewTransformPos.y + yWave,
                                MICROPOINT_RAD * Utils.ease_back(this.properties.sizeFac, 1.8)
                            );
                        }
                    }
                }
            }
        }
    }

    drawDirt(ctx, camera){
        const DIRT_POP_SPEED = 0.05;
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
        const LIFETIME = 60000;

        let time = new Date().getTime();
        let age = time - this.creationTime;

        if (this.properties == null){
            let sampleCount = Math.min(DIRT_PER_SEG * this.points.length, DIRT_MAX);
            let grassCount = Math.min(GRASS_PER_SEG * this.points.length, GRASS_MAX);
            let sampledSpline = Utils.multisample_spline(this.points, sampleCount);
            let grassSamples = Utils.multisample_spline(this.points, grassCount);

            this.lifeTime = LIFETIME;

            this.properties = {
                dirtpoints : sampledSpline,
                wetness_values : [],
                grasspoints : [],
                sizeFac : 0
            };

            for (let i = 0; i < sampledSpline.length; i++){
                this.properties.wetness_values.push(1);
            }

            for (let i = 0; i < grassSamples.length; i++){
                this.properties.grasspoints.push(
                    {
                        root : new Vector2(
                            grassSamples[i].x + (Utils.pos_neg_rand() * GRASS_POS_RAND),
                            grassSamples[i].y - (DIRT_RADIUS * GRASS_OFFSET),
                        ),
                        tip : new Vector2(
                            (Utils.pos_neg_rand() * GRASS_POS_RAND),
                            (GRASS_HEIGHT + (Utils.pos_neg_rand() * GRASS_HEIGHT_RAND)) - (DIRT_RADIUS * GRASS_OFFSET),
                        )
                    }
                )
            }
        }

        if (age > LIFETIME){
            if (this.properties.sizeFac > 0){
                this.properties.sizeFac = Math.max(this.properties.sizeFac - DIRT_POP_SPEED, 0);
            }
            else{
                this.isAlive = false;
            }
        }
        else{
            this.properties.sizeFac = Math.min(this.properties.sizeFac + DIRT_POP_SPEED, 1);
        }

        if (this.isAlive){
            //process dirt
            for (let i = 0; i < this.properties.dirtpoints.length; i++){
                let curDirt = this.properties.dirtpoints[i];
                let cloudPoints = [];
                let nearestCloudDist;
                let viewTransformPos = VectorMath.Add(curDirt, camera.position);

                if (this.checkBounds(viewTransformPos, camera.bounds)){
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
                    ctx.fillStyle = Utils.format_rgb(
                        Utils.lerp(DRY_COLOR[0], WET_COLOR[0], this.properties.wetness_values[i]),
                        Utils.lerp(DRY_COLOR[1], WET_COLOR[1], this.properties.wetness_values[i]),
                        Utils.lerp(DRY_COLOR[2], WET_COLOR[2], this.properties.wetness_values[i])
                    );

                    Utils.draw_circle(
                        ctx,
                        viewTransformPos.x,
                        viewTransformPos.y,
                        DIRT_RADIUS * Utils.ease_back(this.properties.sizeFac, 1.5)
                    );
                }
            }

            //Process grass
            ctx.strokeStyle = "green";
            ctx.lineWidth = 2;
            for (let i = 0; i < this.properties.grasspoints.length; i++){
                let curGrass = this.properties.grasspoints[i];
                let grassFac = i / this.properties.grasspoints.length;
                let dirtIdx = Math.floor(grassFac * (this.properties.dirtpoints.length - 1));
                let wetFac = this.properties.wetness_values[dirtIdx];
                let viewTransformRoot = VectorMath.Add(curGrass.root, camera.position);
                let viewTransformTip = VectorMath.Add(curGrass.tip, camera.position);

                if (this.checkBounds(viewTransformRoot, camera.bounds)){
                    ctx.beginPath();
                    ctx.moveTo(viewTransformRoot.x, viewTransformRoot.y);
                    ctx.lineTo(
                        viewTransformRoot.x + (Math.sin(curGrass.tip.x + (this.time * GRASS_WIGGLE_SPEED)) * wetFac),
                        viewTransformRoot.y - (curGrass.tip.y * wetFac)
                    )
                    ctx.stroke();
                }
            }
        }
    }

    drawWind(ctx, camera){
        const RAND_PARTICLE_OFFSET = 20;
        const MAX_PARTICLES = 20;
        const FRAME_BETWEEN_PARTICLES = 1;
        const WIND_SPEED = 0.1;
        const WIND_LENGTH = 0.4;
        const WIND_LIFETIME = 5000;

        let nearestPoint = this.points[0];
        let curTime = new Date().getTime();
        let age = curTime - this.creationTime;

        if (this.properties == null){
            this.properties = {
                particle_timer : 0,
                particles : []
            }

            this.lifeTime = WIND_LIFETIME;
        }

        if (age > this.lifeTime){
            if (this.properties.particles.length <= 0){
                this.isAlive = false;
            }
            else{
                this.properties.particles.pop();
            }
        }

        //Spawn particles
        if (this.properties.particle_timer > FRAME_BETWEEN_PARTICLES){
            if (this.points == undefined){debugger}
            let splinePoint = Utils.sample_spline(this.points, Math.random());
            splinePoint.AddScalar(Utils.pos_neg_rand() * RAND_PARTICLE_OFFSET);
            this.properties.particles.push({
                point : splinePoint,
                direction : new Vector2(0, 0)
            });

            if (this.properties.particles.length > MAX_PARTICLES){
                this.properties.particles.shift();
            }

            this.properties.particle_timer = 0;
        }
        else{
            this.properties.particle_timer += 1;
        }

        //Draw particles
        ctx.strokeStyle = "green";
        ctx.lineWidth = 1;
        for (let i = 0; i < this.properties.particles.length; i++){
            let curParticle = this.properties.particles[i];
            let closestPointIdx = 0;
            let closestDistance = VectorMath.GetDistance(curParticle.point, this.points[0]);
            let viewTransformPos = VectorMath.Add(curParticle.point, camera.position);

            if (this.checkBounds(viewTransformPos, camera.bounds)){
                //get nearest spline point (excluding last point)
                for (let p = 1; p < this.points.length - 1; p++){
                    let checkDist = VectorMath.GetDistance(curParticle.point, this.points[p])
                    if (checkDist < closestDistance){
                        closestPointIdx = p;
                        closestDistance = checkDist;
                    }
                }

                if (closestDistance < 20){
                    curParticle.direction = VectorMath.Subtract(this.points[closestPointIdx], this.points[closestPointIdx + 1]);
                    curParticle.direction.GetNormalized();
                }

                curParticle.point.Subtract(VectorMath.Scale(curParticle.direction, WIND_SPEED));

                ctx.beginPath();
                ctx.moveTo(viewTransformPos.x, viewTransformPos.y);
                ctx.lineTo(
                    viewTransformPos.x - (curParticle.direction.x * WIND_LENGTH),
                    viewTransformPos.y - (curParticle.direction.y * WIND_LENGTH)
                );
                ctx.stroke();
            }
        }
    }

    drawBirds(ctx, camera){
        const BIRD_MAX = 50;
        const BIRD_PER_SEG = 500;
        const LIFETIME = 15000;

        let time = new Date().getTime();
        let age = time - this.creationTime;
        let birdCount = Math.min(BIRD_PER_SEG * this.points.length, BIRD_MAX);

        if (this.properties == null){
            let spawnPoints = Utils.multisample_spline(this.points, birdCount);
            let directions = Utils.get_directions_from_spline(spawnPoints);

            this.lifeTime = LIFETIME;

            this.properties = {
                birds : new Boids()
            }

            for (let i = 0; i < spawnPoints.length; i++){
                this.properties.birds.addBoid(spawnPoints[i], directions[i]);
            }
        }

        if (age > LIFETIME){
            if (this.properties.birds.getLength() > 0){
                this.properties.birds.popBoid();
            }
            else{
                this.isAlive = false;
            }
        }

        if (this.isAlive){
            this.properties.birds.update();

            //draw birds
            ctx.strokeStyle = "black";
            ctx.lineWidth = 2;
            for (let i = 0; i < this.properties.birds.getLength(); i++){
                let curBird = this.properties.birds.getBoid(i);
                let viewTransformPos = VectorMath.Add(curBird.position, camera.position)

                if (this.checkBounds(viewTransformPos, camera.bounds)){
                    ctx.translate(curBird.position.x + camera.position.x, curBird.position.y + camera.position.y);
                    ctx.rotate(VectorMath.DirectionToAngle(curBird.direction) - (Math.PI / 2));
                    ctx.beginPath();
                    ctx.moveTo(-3, -3);
                    ctx.lineTo(0, 3);
                    ctx.lineTo(3, -3);
                    ctx.stroke();
                    ctx.resetTransform();
                }
            }
        }
    }

    drawDefault(ctx, camera){
        //
    }

    checkBounds(position, boundsVec){
        if (
            position.x >= 0 && position.x < boundsVec.x &&
            position.y >= 0 && position.y < boundsVec.y
        ){
            return true;
        }

        return false;
    }
}