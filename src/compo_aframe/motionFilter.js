import AFRAME from 'aframe';
const THREE = window.AFRAME.THREE;
import { MovingAverageMotionFilter, emphasizeMovementFilter, emphasizeRotationFilter, suppressMovementFilter, suppressRotationFilter, scaleQuaternion } from "../components/filter.js"

AFRAME.registerComponent('motion-dynamic-filter', {
    schema: {
        enabled: { type: 'boolean', default: true }
    },

    init: function () {
        this.noizeFilter = new MovingAverageMotionFilter();
    },

    remove: function () {
        if (this.noizeFilter) {
            this.noizeFilter.reset();
            this.noizeFilter = null;
        }
    },
    applyFilters: function (evt) {
        if (!this.data.enabled || !evt.detail) {
            return {
                position: evt.detail?.position?.clone() || new THREE.Vector3(),
                quaternion: evt.detail?.quaternion?.clone() || new THREE.Quaternion()
            }
        }

        const deltaPosition = evt.detail.position
        const deltaQuaternion = evt.detail.quaternion
        const deltatime = evt.detail.deltatime

        const linearVelocity = deltaPosition.clone().divideScalar(deltatime * 2);
        const angularVelocity = scaleQuaternion(deltaQuaternion.clone(), 1 / deltatime / 4)

        const smoothedPose = this.noizeFilter.applyFilter(linearVelocity, angularVelocity)

        const emphasizedPosition = emphasizeMovementFilter(smoothedPose.position)
        const emphasizedQuaternion = emphasizeRotationFilter(smoothedPose.quaternion)
        const suppressedPosition = suppressMovementFilter(emphasizedPosition, emphasizedQuaternion)
        const suppressedQuaternion = suppressRotationFilter(emphasizedPosition, emphasizedQuaternion)

        return {
            position: suppressedPosition.clone().multiplyScalar(deltatime),
            quaternion: scaleQuaternion(suppressedQuaternion.clone(), deltatime)
            // quaternion: scaleQuaternion(deltaQuaternion.clone(), 1/2)
        }
    }
});