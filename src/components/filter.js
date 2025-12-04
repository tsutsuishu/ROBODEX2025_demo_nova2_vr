import AFRAME from 'aframe';
const THREE = window.AFRAME.THREE;

export class MovingAverageMotionFilter {
  constructor(
    windowSize = 5,
    moveThreshold = 0.00001 / 35,
    rotateThreshold = 0.0001 / 35
  ) {
    this.windowSize = windowSize;
    this.moveThreshold = moveThreshold;
    this.rotateThreshold = rotateThreshold;

    this.positionBuffer = [];
    this.quaternionBuffer = [];

    this.smoothedPosition = new THREE.Vector3(0, 0, 0);
    this.smoothedQuaternion = new THREE.Quaternion(0, 0, 0, 1);
  }

  applyFilter(position, quaternion) {
    const filteredPosition = this.smoothPosition(position);
    const filteredQuaternion = this.smoothQuaternion(quaternion);

    return {
      position: filteredPosition,
      quaternion: filteredQuaternion
    };
  }

  smoothPosition(position) {
    this.positionBuffer.push(position.clone());
    if (this.positionBuffer.length > this.windowSize) {
      this.positionBuffer.shift();
    }

    const sum = new THREE.Vector3(0, 0, 0);
    this.positionBuffer.forEach(p => {
      sum.add(p);
    });

    this.smoothedPosition = sum.divideScalar(this.positionBuffer.length);

    this.smoothedPosition.x = Math.abs(this.smoothedPosition.x) < this.moveThreshold ? 0 : this.smoothedPosition.x;
    this.smoothedPosition.y = Math.abs(this.smoothedPosition.y) < this.moveThreshold ? 0 : this.smoothedPosition.y;
    this.smoothedPosition.z = Math.abs(this.smoothedPosition.z) < this.moveThreshold ? 0 : this.smoothedPosition.z;

    return this.smoothedPosition.clone();
  }

  smoothQuaternion(quaternion) {
    this.quaternionBuffer.push(quaternion.clone());
    if (this.quaternionBuffer.length > this.windowSize) {
      this.quaternionBuffer.shift();
    }

    if (this.quaternionBuffer.length === 1) {
      this.smoothedQuaternion = this.quaternionBuffer[0].clone();
    } else {
      this.smoothedQuaternion = this.slerpAverage(this.quaternionBuffer);
    }

    const identity = new THREE.Quaternion(0, 0, 0, 1);
    const rotationAngle = this.smoothedQuaternion.angleTo(identity);

    if (Math.abs(rotationAngle) < this.rotateThreshold) {
      return new THREE.Quaternion(0, 0, 0, 1); // 単位クォータニオン
    }

    return this.smoothedQuaternion.clone();
  }

  slerpAverage(quaternions) {
    if (quaternions.length === 0) {
      return new THREE.Quaternion(0, 0, 0, 1);
    }
    if (quaternions.length === 1) {
      return quaternions[0].clone();
    }

    let result = quaternions[0].clone();

    for (let i = 1; i < quaternions.length; i++) {
      const t = 1.0 / (i + 1);
      result.slerp(quaternions[i], t);
    }

    return result.normalize();
  }

  reset() {
    this.positionBuffer = [];
    this.quaternionBuffer = [];
    this.smoothedPosition = new THREE.Vector3(0, 0, 0);
    this.smoothedQuaternion = new THREE.Quaternion(0, 0, 0, 1);
  }
}

const MOVEMENT_EMPHASIZE_DEFAULTS = {
  threshold: 0.0000125,
  a: 2666,
  b: 0.467,
  maxAcceleration: 1,
  mode: 'position'
};

const ROTATION_EMPHASIZE_DEFAULTS = {
  // threshold: 0.001,
  // accelerationFactor: 8000,
  // maxAcceleration: 4,
  // mode: 'quaternion'

  threshold: 0.003,
  a: 200,
  b: -0.35,
  maxAcceleration: 1,
  mode: 'quaternion'
};

const MOVEMENT_SUPPRESS_DEFAULTS = {
  threshold: 0.0015,
  suppressionExponent: 1.5,
  suppressionFactor: 500 * Math.pow(35, 1.5),
  minSuppression: 0.001,
};

const ROTATION_SUPPRESS_DEFAULTS = {
  threshold: 0.01 / 35,
  suppressionExponent: 1.5,
  suppressionFactor: 10 * Math.pow(35, 1.5),
  minSuppression: 0.0001,
};

export const emphasizeMovementFilter = (position, params = MOVEMENT_EMPHASIZE_DEFAULTS) => {
  const movementDistance = position.length();
  const emphasizedScale = calculateEmphasizeScale(movementDistance, params);
  return position.clone().multiplyScalar(emphasizedScale);
}

export const emphasizeRotationFilter = (quaternion, params = ROTATION_EMPHASIZE_DEFAULTS) => {
  const q = quaternion.clone().normalize();
  const rotationRadian = 2 * Math.acos(Math.abs(q.w));
  const emphasizedScale = calculateEmphasizeScale(rotationRadian, params);
  return scaleQuaternion(quaternion, emphasizedScale);
}

export const suppressMovementFilter = (position, quaternion, params = MOVEMENT_SUPPRESS_DEFAULTS) => {
  const q = quaternion.clone().normalize();
  const rotationRadian = 2 * Math.acos(Math.abs(q.w));
  const suppressedScale = calculateSuppressScale(rotationRadian, params);
  return position.clone().multiplyScalar(suppressedScale);
}

export const suppressRotationFilter = (position, quaternion, params = ROTATION_SUPPRESS_DEFAULTS) => {
  const movementDistance = position.length();
  const suppressedScale = calculateSuppressScale(movementDistance, params);
  return scaleQuaternion(quaternion, suppressedScale);
}

const calculateEmphasizeScale = (motionDifference, params) => {
  let acceleration = 1
  // 以前まではposition, quaternionの両方で同じ関数を用いていたがとりあえずの実装では違う．position側に統一予定
  // if (params.mode == "position") {
  //   // position
  //   if (motionDifference > params.threshold) {
  //     acceleration = params.a * motionDifference + params.b
  //   }else{
  //     acceleration = 0.25
  //   }
  // } else {
  //   // quaternon
  //   if (motionDifference < params.threshold) return 1.0;
  //   const normalizedInput = motionDifference - params.threshold;
  //   acceleration = 1.0 + (params.maxAcceleration - 1) / (1 + Math.exp(-params.accelerationFactor * normalizedInput))
  // }
  
    // position
    if (motionDifference > params.threshold) {
      acceleration = params.a * motionDifference + params.b
    }else{
      if (params.mode == "position") {
        acceleration = 0.5
      } else {
        acceleration = 0.25
      }
    }
  

  return Math.min(acceleration, params.maxAcceleration);
}

const calculateSuppressScale = (motionDifference, params) => {
  if (motionDifference < params.threshold) return 1.0;
  const normalizedInput = Math.min((motionDifference - params.threshold), 1.0);
  const curvedInput = Math.pow(normalizedInput, params.suppressionExponent);

  return Math.max(1.0 - (curvedInput * params.suppressionFactor), params.minSuppression);
}

export const scaleQuaternion = (quaternion, factor) => {
  const identity = new THREE.Quaternion()
  const scaledQuaternion = new THREE.Quaternion()
  scaledQuaternion.slerpQuaternions(identity, quaternion, factor)
  return scaledQuaternion
}

// 旧垂直固定用．tipCameraに水平ガイドを表示するなら不要？固定方法も他の方法の方が良さげ
// const extractTwist = (quaternion, axis) => {
//   const normAxis = axis.clone().normalize();
//   const quaternionVector = new THREE.Vector3(quaternion.x, quaternion.y, quaternion.z);  
//   const dotProduct = quaternionVector.dot(normAxis);  
//   // 軸周りの回転成分のみを抽出（ツイストクォータニオン）
//   const twistQuaternion = new THREE.Quaternion(
//       normAxis.x * dotProduct,
//       normAxis.y * dotProduct,
//       normAxis.z * dotProduct,
//       quaternion.w
//   ).normalize();
//   return twistQuaternion;
// }