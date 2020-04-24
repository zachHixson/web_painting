export {Boids};
import {Vector2, VectorMath} from "./VectorLib.js";
import {Utils} from "./utils.js";

const VISION_RADIUS = 1000;
const AVOID_RADIUS = 20;
const AVOID_SPEED = 0.01;
const TRAVEL_SPEED = 1.5;
const FOV = 50;
const CENTER_INFLUENCE = 0.01;

class Boid{
    constructor(posVector = new Vector2(0, 0), dirVector = new Vector2(0, 0)){
        this.position = posVector;
        this.direction = dirVector.GetNormalized();
    }

    update(selfIdx, otherBoids){
        if (otherBoids.length > 1){
            let centerPoint = new Vector2(0, 0);
            let visibleBoids = 0;
            let nearestBoid = (selfIdx > 0) ? otherBoids[0] : otherBoids[1];
            if (nearestBoid == undefined){debugger};
            let nearestBoidDist = VectorMath.GetDistance(this.position, nearestBoid.position);
            let centerDirection;
            let avoidFac = (AVOID_RADIUS - nearestBoidDist) / AVOID_RADIUS;
            let curAngle = this.direction.GetAngle();

            for (let i = 0; i < otherBoids.length; i++){
                //Check if boid is in vision
                if (
                    i != selfIdx &&
                    this.isInFOV(otherBoids[i].position) &&
                    VectorMath.GetDistance(this.position, otherBoids[i].position) < VISION_RADIUS
                ){
                    let distance = VectorMath.GetDistance(this.position, otherBoids[i].position);

                    if (distance < nearestBoidDist){
                        nearestBoid = otherBoids[i];
                        nearestBoidDist = distance;
                    }

                    centerPoint.Add(otherBoids[i].position);
                    visibleBoids++;
                }
            }

            if (visibleBoids > 0){
                let centerDir = VectorMath.Subtract(centerPoint, this.position);
                let centerAngle = centerDir.GetAngle();

                curAngle += centerAngle * CENTER_INFLUENCE;
            }

            if (nearestBoidDist < AVOID_RADIUS){
                let nearestDir = VectorMath.Subtract(nearestBoid.position, this.position);
                let enemyAngle = nearestDir.GetAngle();

                curAngle -= enemyAngle * avoidFac * AVOID_SPEED;
            }

            this.direction.SetVector(VectorMath.AngleToDirection(curAngle));
            this.direction.SetNormalized();
            this.direction.Scale(TRAVEL_SPEED)
            this.position.Add(this.direction);
        }
    }

    isInFOV(point){
        let thisPoint = new Vector2(this.direction);
        let otherPoint = VectorMath.Subtract(point, this.position).GetNormalized();
        let dotProd = VectorMath.GetDotProduct(thisPoint, otherPoint);
        let degreeDifference = Utils.dot_product_to_angle(dotProd);

        if (degreeDifference < (FOV / 2)){
            return true;
        }
        else{
            return false;
        }
    }
}

class Boids{
    constructor(){
        this.boids = [];
        this.length = 0;
    }

    addBoid(posVector = new Vector2(0, 0), dirVector = new Vector2(1, 0)){
        this.boids.push(new Boid(posVector, dirVector));
        this.length++;
    }

    popBoid(){
        this.boids.pop();
    }

    getBoid(i){
        return this.boids[i];
    }

    getLength(){
        return this.boids.length;
    }

    update(){
        for (let i = 0; i < this.boids.length; i++){
            this.boids[i].update(i, this.boids);
        }
    }
}