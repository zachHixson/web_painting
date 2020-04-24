export {Utils}
import {Vector2, VectorMath} from "./VectorLib.js";

class Utils{
     static draw_circle(ctx, x, y, r){
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2, false); //draws arc (x, y, radius, start arc, end arc, reverse start/end)
        ctx.fill();
    }

    static ease_back(x, overshoot){
        return 1 + (overshoot + 1) * Math.pow(x-1, 3) + overshoot * Math.pow(x-1, 2);
    }

    static pos_neg_rand(){
        return (Math.random() * 2) - 1;
    }

    static lerp(a, b, f){
        return a + f * (b - a);
    }

    static sample_spline(spline, fac){
        let splinePos = fac * spline.length;
        let splinePoint = Math.min(Math.floor(splinePos), spline.length - 2);
        let subPos = splinePos % 1;
        return new Vector2(
                Utils.lerp(spline[splinePoint].x, spline[splinePoint + 1].x, subPos),
                Utils.lerp(spline[splinePoint].y, spline[splinePoint + 1].y, subPos)
        );
    }

    static multisample_spline(spline, samples){
        let newSpline = [];
        let sampleOffset = samples - 1;

        for (let i = 0; i < sampleOffset; i++){
            let splineFac = i / sampleOffset;
            newSpline.push(this.sample_spline(spline, splineFac));
        }

        return newSpline;
    }

    static get_directions_from_spline(spline){
        let directionList = [];

        for (let i = 0; i < spline.length - 1; i++){
            let sub = VectorMath.Subtract(spline[i + 1], spline[i]);
            let norm = sub.GetNormalized();
            directionList.push(
                norm
            );
        }

        directionList.push(directionList[directionList.length - 1]);

        return directionList;
    }

    static dot_product_to_angle(dot){
        let fac = (dot + 1) / 2;
        return (fac * 180) - 180;
    }

    static format_rgb(r, g, b){
        return "rgb(" + r + "," + g + "," + b + ")";
    }

    static clamp(val, min, max){
        return Math.max(Math.min(val, max), min);
    }
}