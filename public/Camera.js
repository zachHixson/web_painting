export {Camera};
import {Vector2, VectorMath} from "./VectorLib.js";

class Camera{
    constructor(){
        this.position = new Vector2(0, 0);
        this.bounds = new Vector2(10, 10);
    }
}