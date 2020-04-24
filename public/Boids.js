export {Boids};
import {Vector2, VectorMath} from "./VectorLib.js";
import {Utils} from "./utils.js";

const VISION_RADIUS = 1000;
const AVOID_RADIUS = 40;
const MAX_AVOID_SPEED = 0.3;
const FOV = 20;
const CENTER_INFLUENCE = 50;

class Boid{
    constructor(posVector = new Vector2(0, 0), dirVector = new Vector2(0, 0)){
        this.position = posVector;
        this.direction = dirVector.GetNormalized();
    }

    update(selfIdx, otherBoids){
        let centerPoint = new Vector2(0, 0);
        let visibleBoids = 0;
        let nearestBoid = (selfIdx > 0) ? otherBoids[0] : otherBoids[1];
        let nearestBoidDist = VectorMath.GetDistance(this.position, nearestBoid.position);
        let centerDirection;
        let avoidFac = (AVOID_RADIUS - nearestBoidDist) / AVOID_RADIUS;

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
            centerPoint.Scale(1 / visibleBoids);
            centerDirection = VectorMath.Subtract(centerPoint, this.position);
            centerDirection.Scale(CENTER_INFLUENCE * (AVOID_RADIUS - nearestBoidDist));
            this.direction.Add(centerDirection);
        }

        if (nearestBoidDist < AVOID_RADIUS){
            let nearestDir = VectorMath.Subtract(this.position, nearestBoid.position);
            let enemyAngle = nearestDir.GetAngle();
            let thisAngle = this.direction.GetAngle();

            if (enemyAngle > thisAngle){
                thisAngle += Math.PI * avoidFac;
            }
            else{
                thisAngle -= Math.PI * avoidFac;
            }

            this.direction.SetVector(VectorMath.AngleToDirection(thisAngle));
        }

        this.direction.SetNormalized();
        this.position.Add(this.direction);
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

    getBoid(i){
        return this.boids[i];
    }

    update(){
        for (let i = 0; i < this.boids.length; i++){
            this.boids[i].update(i, this.boids);
        }
    }
}