//This File Defines the Vector classes (Vector2, maybe Vector3 in future), as well as a VectorMath classes

export {VectorMath, Vector2};

class VectorMath{
      constructor(){
            //
      }

      static Add(_v1, _v2){
            return new Vector2(
                  _v1.x + _v2.x,
                  _v1.y + _v2.y
            );
      }

      static AddScalar(_vector, _scalar){
          return new Vector2(
              _vector.x + _scalar,
              _vector.y + _scalar
          )
      }

      static Subtract(_v1, _v2){
            return new Vector2(
                  _v1.x - _v2.x,
                  _v1.y - _v2.y
            );
      }

      static SubtractScalar(_vector, _scalar){
          return new Vector2(
              _vector.x - _scalar,
              _vector.y - _scalar
          );
      }

      static Scale(_vector, _scalar){
            return new Vector2(
                  _vector.x *= _scalar,
                  _vector.y *= _scalar,
            );
      }

      static GetMagnitude(_vector){
            var xSqrd = Math.pow(_vector.x, 2);
            var ySqrd = Math.pow(_vector.y, 2);
            var magnitude = Math.sqrt(xSqrd + ySqrd);
            return magnitude;
      }

      static GetDistanceNoSqrt(_v1, _v2){
            var xDiff = _v1.x - _v2.x;
            var yDiff = _v1.y - _v2.y;
            var sqrdSum = Math.pow(xDiff, 2) + Math.pow(yDiff, 2);
            return sqrdSum;
      }

      static GetDistance(_v1, _v2){
            var distNoSqrt = this.GetDistanceNoSqrt(_v1, _v2);
            var distSqrt = Math.sqrt(distNoSqrt);
            return distSqrt;
      }

      static GetMidpoint(_v1, _v2){
            var midX = (_v1.x + _v2.x) / 2;
            var midY = (_v1.y + _v2.y) / 2;
            return new Vector2(midX, midY);
      }

      static GetDotProduct(_v1, _v2){
            return ((_v1.x * _v2.x) + (_v1.y * _v2.y));
      }

      static GetNormalized(_vector){
            var magnitude = this.GetMagnitude(_vector);
            return new Vector2(
                  _vector.x /= magnitude,
                  _vector.y /= magnitude
            );
      }

      static GetAngle(_v1, _v2){
          var unitX = _v1.x - _v2.x;
          var unitY = _v1.y - _v2.y;
          var theta = Math.atan(unitY / unitX);
          return theta;
      }

      static EqualTo(_v1, _v2){
            if (_v1.x == _v2.x && _v1.y == _v2.y){
                  return true;
            }
            else{
                  return false;
            }
      }
}

class Vector2{
      constructor(_x, _y, _vector){
            switch(arguments.length){
                  case 0: //No arguments
                        this.x = 0;
                        this.y = 0;
                        break;
                  case 1: //Vector
                        this.x = arguments[0].x;
                        this.y = arguments[0].y;
                        break;
                  case 2: //(X, Y)
                        this.x = arguments[0];
                        this.y = arguments[1];
                        break;
            }
      }

      Add(_newVector){
            this.SetVector(
                  VectorMath.Add(this, _newVector)
            );
      }

      AddScalar(_scalar){
          this.SetVector(
              VectorMath.AddScalar(_scalar)
          );
      }

      Subtract(_newVector){
            this.SetVector(
                  VectorMath.Subtract(this, _newVector)
            )
      }

      SubtractScalar(_scalar){
          this.SetVector(
              VectorMath.SubtractScalar(_scalar)
          );
      }

      Scale(_scalar){
          this.SetVector(
              VectorMath.Scale(this, _scalar)
          );
      }

      GetMagnitude(){
            return VectorMath.GetMagnitude(this);
      }

      GetDistanceNoSqrt(_newVector){
            var xDiff = this.x - _newVector.x;
            var yDiff = this.y - _newVector.y;
            var sqrdSum = Math.pow(xDiff, 2) + Math.pow(yDiff, 2);
            return sqrdSum;
      }

      GetDistance(_newVector){
            var distNoSqrt = this.GetDistanceNoSqrt(_newVector);
            var distSqrt = Math.sqrt(distNoSqrt);
            return distSqrt;
      }

      SetMidpoint(_newVector){
            this.SetVector(
                  VectorMath.GetMidpoint(_newVector)
            );
      }

      GetNormalized(){
            return VectorMath.GetNormalized(this);
      }

      SetNormalized(){
            this.SetVector(
                  VectorMath.GetNormalized(this)
            );
      }

      SetVector(_newVector){
            this.x = _newVector.x;
            this.y = _newVector.y;
      }

      ToString(){
            return this.x + "," + this.y;
      }

      EqualTo(_newVector){
            return VectorMath.EqualTo(this, _newVector);
      }
}
