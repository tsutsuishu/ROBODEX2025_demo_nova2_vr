import AFRAME from 'aframe';
const THREE = window.AFRAME.THREE;
import { isoInvert, isoMultiply } from '../lib/isometry3.js';
import { scaleQuaternion } from "../components/filter.js"

function workerPose(el) {
  const pose = el?.workerData?.current?.pose;
  if (pose) {
    const ppw = pose?.position;
    const qqw = pose?.quaternion;
    if (ppw && qqw) {
      const ppt = new THREE.Vector3(ppw[0], ppw[1], ppw[2]);
      const qqt = new THREE.Quaternion(qqw[1], qqw[2], qqw[3], qqw[0]);
      return [ppt, qqt];
    }
  }
  return null;
}

AFRAME.registerComponent('arm-motion-ui', {
  schema:
    { type: 'string', default: "0 0 0:0 0 0" }
  ,
  init: function () {
    const myColor = this.el.getAttribute('material').color;
    const frameMarker = document.createElement('a-entity');
    console.log("Arm motion ui initializing!!")
    // target 表示用
    frameMarker.setAttribute('a-xy-axes-frame', { // 上下逆にしています。
      length: 0.05,
      radius: 0.002,
      sphere: 0.008,
      opacity: 0.7,
      color: myColor ? myColor : 'blue',
    });
    this.el.appendChild(frameMarker);
    this.frameMarker = frameMarker;
    frameMarker.object3D.visible = true;
    frameMarker.object3D.position.copy(new THREE.Vector3(0, 1, 0));
    //
    //
    this.triggerdownState = false;
    this.vrControllerEl = null;
    this.objStartingPose = [new THREE.Vector3(0, 0, 0), new THREE.Quaternion(0, 0, 0, 1)];
    this.vrCtrlStartingPoseInv = [new THREE.Vector3(0, 0, 0), new THREE.Quaternion(0, 0, 0, 1)];
    this.worldToBase = [this.el.object3D.position, this.el.object3D.quaternion];
    // これの位置がかわるので問題になる！
    this.baseToWorld = isoInvert(this.worldToBase);

    this.vrCtrlLastPose = [new THREE.Vector3(0, 0, 0), new THREE.Quaternion(0, 0, 0, 1)];
    this.vrCtrlLastFilteredPose = [new THREE.Vector3(0, 0, 0), new THREE.Quaternion(0, 0, 0, 1)];

    this.el.addEventListener('triggerdown', (evt) => {
      console.log('### trigger down event. laserVisible: ',
        evt.detail?.originalTarget.laserVisible);
      const ctrlEl = evt.detail?.originalTarget;
      this.vrControllerEl = ctrlEl;
      if (!this.vrControllerEl.laserVisible) {
        if (this?.returnTimerId) clearTimeout(this.returnTimerId);
        this.triggerdownState = true;
        const iso3 = workerPose(this.el);
        if (iso3 && ctrlEl) {
          this.objStartingPose = iso3;
          this.vrCtrlStartingPoseInv
            = isoMultiply(isoInvert([ctrlEl.object3D.position,
            ctrlEl.object3D.quaternion]),
              this.worldToBase);
          this.vrCtrlLastPose = isoMultiply(this.baseToWorld, [ctrlEl.object3D.position, ctrlEl.object3D.quaternion]);
          this.vrCtrlLastFilteredPose = isoMultiply(this.baseToWorld, [ctrlEl.object3D.position, ctrlEl.object3D.quaternion]);
        }
      }
    });
    this.el.addEventListener('triggerup', (evt) => {
      console.log('### trigger up event');
      this.vrControllerEl = evt.detail?.originalTarget;
      this.triggerdownState = false;

      const iso3 = workerPose(this.el);
      if (iso3) {
        const frameMarkerResetFunc = () => {
          this.frameMarker.object3D.position.copy(iso3[0]);
          this.frameMarker.object3D.quaternion.copy(iso3[1]);
        }
        this.returnTimerId = setTimeout(frameMarkerResetFunc, 2000);
      }
    });
    this.pptPrev = new THREE.Vector3();
    this.qqtPrev = new THREE.Quaternion();
  },

  // ********
  tick: function (time, deltatime) {
    if (!this.el?.shouldListenEvents) return;
    const ctrlEl = this?.vrControllerEl;
    if (!ctrlEl || !this.el.workerData || !this.el.workerRef) {
      //      console.warn('workerData, workerRef or controller not ready yet.');
      return;
    }
    if (this.triggerdownState && ~ctrlEl.laserVisible) {
      const vrControllerPose = isoMultiply(this.baseToWorld,
        [ctrlEl.object3D.position,
        ctrlEl.object3D.quaternion]);

      const vrCtrlLastPoseInv = isoInvert(this.vrCtrlLastPose)
      const vrCtrlDiffTick = isoMultiply(vrCtrlLastPoseInv, vrControllerPose)
      let vrCtrlDiffTickFiltered = [vrCtrlDiffTick[0], vrCtrlDiffTick[1]]
      const motionFiltering = this.el.components['motion-dynamic-filter'];
      if (motionFiltering) {
        const filtered = motionFiltering.applyFilters({
          detail: {
            position: vrCtrlDiffTick[0],
            quaternion: vrCtrlDiffTick[1],
            deltatime: deltatime
          }
        });
        vrCtrlDiffTickFiltered = [filtered.position, filtered.quaternion];
      }
      this.vrCtrlLastFilteredPose = isoMultiply(this.vrCtrlLastFilteredPose, vrCtrlDiffTickFiltered)
      const vrControllerDelta = isoMultiply(this.vrCtrlStartingPoseInv, this.vrCtrlLastFilteredPose)
      this.vrCtrlLastPose = vrControllerPose

      vrControllerDelta[0] = vrControllerDelta[0].multiplyScalar(1.0);
      vrControllerDelta[1].normalize();
      const filteredVrCtrlStartingPoseInv = [
        new THREE.Vector3(0, 0, 0),
        vrControllerDelta[1].clone().multiply(vrControllerPose[1].clone().conjugate())
      ]; //可変的な回転反映に対応したコントローラ座標系での開始位置を改めて，現在位置と差分から計算
      const vrCtrlToObj = [
        new THREE.Vector3(0, 0, 0),
        filteredVrCtrlStartingPoseInv[1].clone().multiply(this.objStartingPose[1])
      ];
      const ObjToVrCtrl = [
        new THREE.Vector3(0, 0, 0),
        vrCtrlToObj[1].clone().conjugate()
      ];
      const newObjPose = isoMultiply(isoMultiply(this.objStartingPose,
        isoMultiply(ObjToVrCtrl,
          vrControllerDelta)),
        vrCtrlToObj);
      this.frameMarker.object3D.position.copy(newObjPose[0]);
      this.frameMarker.object3D.quaternion.copy(newObjPose[1]);
      const m4 = new THREE.Matrix4();
      m4.compose(newObjPose[0], newObjPose[1], new THREE.Vector3(1, 1, 1));
      this.el.workerRef?.current?.postMessage({
        type: 'destination',
        endLinkPose: m4.elements
      });
    }
  },
  update: function (oldData) {
    console.log("Update armUI", oldData)
    if (oldData != undefined) {// 初回のupdate以外
      this.worldToBase = [this.el.object3D.position, this.el.object3D.quaternion];
      this.baseToWorld = isoInvert(this.worldToBase);
    }
  }
});
