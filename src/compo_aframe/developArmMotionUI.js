// armMoitionUIを参考に仮想wand操作を作りたい． →他の操作手法も検討すべき(ここでregisterする)
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

AFRAME.registerComponent('connect-line', {
  schema: {
    start: { type: 'vec3', default: { x: 0, y: 0, z: 0 } },
    end: { type: 'vec3', default: { x: 1, y: 1, z: 1 } },
    color: { type: 'color', default: '#ff0000' }
  },

  init: function () {
    const data = this.data;
    const geometry = new THREE.BufferGeometry();
    const points = [
      new THREE.Vector3(data.start.x, data.start.y, data.start.z),
      new THREE.Vector3(data.end.x, data.end.y, data.end.z)
    ];
    geometry.setFromPoints(points);

    const material = new THREE.LineBasicMaterial({ color: data.color });
    const line = new THREE.Line(geometry, material);

    this.el.setObject3D('mesh', line);
    this.geometry = geometry;  // ジオメトリを保存
  },

  update: function (oldData) {
    const data = this.data;

    // 開始点と終了点が変わった場合
    if (oldData.start !== data.start || oldData.end !== data.end) {
      // 頂点データを更新
      const positions = this.geometry.attributes.position.array;
      positions[0] = data.start.x;
      positions[1] = data.start.y;
      positions[2] = data.start.z;
      positions[3] = data.end.x;
      positions[4] = data.end.y;
      positions[5] = data.end.z;

      // 更新フラグを立てる
      this.geometry.attributes.position.needsUpdate = true;
    }
  }
});

AFRAME.registerComponent('arm-wand-motion-ui', {
  schema:
    { type: 'string', default: "0 0 0:0 0 0" }
  ,
  init: function () {
    // target 表示用
    const myColor = this.el.getAttribute('material').color;
    const frameMarker = document.createElement('a-entity');
    console.log("Arm motion ui initializing!!")
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
    this.baseToWorld = isoInvert(this.worldToBase);

    this.vrCtrlLastPose = [new THREE.Vector3(0, 0, 0), new THREE.Quaternion(0, 0, 0, 1)];
    this.vrCtrlLastFilteredPose = [new THREE.Vector3(0, 0, 0), new THREE.Quaternion(0, 0, 0, 1)];


    // debug
    const virtualController = document.createElement('a-box');
    virtualController.setAttribute('scale', "0.125 0.125 0.125");
    virtualController.setAttribute('color', "yellow")
    this.el.appendChild(virtualController);
    this.virtualController = virtualController;
    virtualController.object3D.visible = false;
    virtualController.object3D.position.copy(new THREE.Vector3(0, 1, 0));

    const wandTip = document.createElement('a-box');
    wandTip.setAttribute('scale', "0.06 0.06 0.06");
    wandTip.setAttribute('color', "yellow")
    this.el.appendChild(wandTip);
    this.wandTip = wandTip;
    wandTip.object3D.visible = false;
    wandTip.object3D.position.copy(new THREE.Vector3(0, 1, 0));

    const robotTip = document.createElement('a-box');
    robotTip.setAttribute('scale', "0.125 0.125 0.125");
    robotTip.setAttribute('color', "red")
    this.el.appendChild(robotTip);
    this.robotTip = robotTip;
    robotTip.object3D.visible = false;
    robotTip.object3D.position.copy(new THREE.Vector3(0, 1, 0));

    const startRobotTip = document.createElement('a-box');
    startRobotTip.setAttribute('scale', "0.06 0.06 0.06");
    startRobotTip.setAttribute('color', "red")
    this.el.appendChild(startRobotTip);
    this.startRobotTip = startRobotTip;
    startRobotTip.object3D.visible = false;
    startRobotTip.object3D.position.copy(new THREE.Vector3(0, 1, 0));
    //　ここまでdebug

    // ray
    this.el.setAttribute('connect-line', {
      start: '0 0 0',
      end: '0 0 0',
      color: '#ff0000'
    });
    this.startWandLength = 1
    this.angleRation = 1


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

          //debug
          this.startRobotTip.object3D.position.copy(iso3[0]);
          this.controlerToWandTip = isoMultiply(this.vrCtrlStartingPoseInv, this.objStartingPose)
          // console.log(this.controlerToWandTip[0])
          // this.startWandLength = this.controlerToWandTip[0].length()
          // console.log(this.startWandLength)
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
  },

  // ********
  tick: function (time, deltatime) {
    if (!this.el?.shouldListenEvents) return;
    const ctrlEl = this?.vrControllerEl;
    if (!ctrlEl || !this.el.workerData || !this.el.workerRef) {
      // console.warn('workerData, workerRef or controller not ready yet.');
      return;
    }
    if (this.triggerdownState && ~ctrlEl.laserVisible) {
      const vrControllerPose = isoMultiply(this.baseToWorld,
        [ctrlEl.object3D.position,
        ctrlEl.object3D.quaternion]);
      const vrCtrlLastPoseInv = isoInvert(this.vrCtrlLastPose)
      const vrCtrlDiffTick = isoMultiply(vrCtrlLastPoseInv, vrControllerPose)
      let vrCtrlDiffTickFiltered = [vrCtrlDiffTick[0], vrCtrlDiffTick[1]]

      // const motionFiltering = this.el.components['motion-dynamic-filter'];
      // if (motionFiltering) {
      //   const filtered = motionFiltering.applyFilters({
      //     detail: {
      //       position: vrCtrlDiffTick[0],
      //       quaternion: vrCtrlDiffTick[1],
      //       deltatime: deltatime
      //     }
      //   });
      //   vrCtrlDiffTickFiltered = [filtered.position, filtered.quaternion];
      // }
      vrCtrlDiffTickFiltered[0] = vrCtrlDiffTickFiltered[0].multiplyScalar(0.5);
      vrCtrlDiffTickFiltered[1] = scaleQuaternion(vrCtrlDiffTickFiltered[1], 0.5)

      this.vrCtrlLastFilteredPose = isoMultiply(this.vrCtrlLastFilteredPose, vrCtrlDiffTickFiltered)
      const wandTipPose = isoMultiply(this.vrCtrlLastFilteredPose, this.controlerToWandTip)

      //debug
      // this.virtualController.object3D.position.copy(this.vrCtrlLastFilteredPose[0]);
      // this.wandTip.object3D.position.copy(wandTipPose[0]);

      // ray
      this.el.setAttribute('connect-line', 'start', vrControllerPose[0]);
      this.el.setAttribute('connect-line', 'end', wandTipPose[0]);
      // const wandLength = vrControllerPose[0].clone().sub(wandTipPose[0]).length()
      // this.angleRation = 0.5 / wandLength

      // debug
      console.log(2 * Math.acos(Math.min(1, Math.abs(vrCtrlDiffTickFiltered[1].w))))
      const text = document.querySelector('#debug');
      text.setAttribute('value', `${(2 * Math.acos(Math.min(1, Math.abs(vrCtrlDiffTickFiltered[1].w)))).toFixed(3)}`)


      const vrControllerDelta = isoMultiply(this.vrCtrlStartingPoseInv, this.vrCtrlLastFilteredPose)
      this.vrCtrlLastPose = vrControllerPose

      const filteredVrCtrlStartingPoseInv = [
        new THREE.Vector3(0, 0, 0),
        vrControllerDelta[1].clone().multiply(vrControllerPose[1].clone().conjugate())
      ];
      const vrCtrlToObj = [
        new THREE.Vector3(0, 0, 0),
        filteredVrCtrlStartingPoseInv[1].clone().multiply(this.objStartingPose[1])
      ];
      const ObjToVrCtrl = [
        new THREE.Vector3(0, 0, 0),
        vrCtrlToObj[1].clone().conjugate()
      ];
      // const newObjPose = isoMultiply(isoMultiply(this.objStartingPose,
      //   isoMultiply(ObjToVrCtrl,
      //     vrControllerDelta)),
      //   vrCtrlToObj);

      const newObjPose = wandTipPose
      // newObjPose[0] = wandTipPose[0]
      // newObjPose[1] = wandTipPose[1]
      // debug
      // this.robotTip.object3D.position.copy(newObjPose[0]);

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

AFRAME.registerComponent('arm-motion-inertia', {
  schema:
    { type: 'string', default: "0 0 0:0 0 0" }
  ,
  init: function () {
    // target 表示用
    const myColor = this.el.getAttribute('material').color;
    const frameMarker = document.createElement('a-entity');
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
    this.vrControllerEl = null;
    this.objStartingPose = [new THREE.Vector3(0, 0, 0), new THREE.Quaternion(0, 0, 0, 1)];
    this.vrCtrlStartingPoseInv = [new THREE.Vector3(0, 0, 0), new THREE.Quaternion(0, 0, 0, 1)];
    this.worldToBase = [this.el.object3D.position, this.el.object3D.quaternion];
    this.baseToWorld = isoInvert(this.worldToBase);

    this.vrCtrlLastPose = [new THREE.Vector3(0, 0, 0), new THREE.Quaternion(0, 0, 0, 1)];
    this.vrCtrlLastFilteredPose = [new THREE.Vector3(0, 0, 0), new THREE.Quaternion(0, 0, 0, 1)];

    // swing関連
    this.isAutoMoving = false
    this.autoDiffTick = [new THREE.Vector3(0, 0, 0), new THREE.Quaternion(0, 0, 0, 1)];
    this.lastPoseInitialized = false
    this.autoDiffTickInitialized = false
    this.autoVelocityThreshold = 0.0003

    this.el.addEventListener('triggerdown', (evt) => {
      const ctrlEl = evt.detail?.originalTarget;
      this.vrControllerEl = ctrlEl;
      if (!this.vrControllerEl.laserVisible) {
        if (this?.returnTimerId) clearTimeout(this.returnTimerId);
        this.isAutoMoving = false
        this.frameMarker.object3D.visible = false
      }
    });
    this.el.addEventListener('triggerup', (evt) => {
      const ctrlEl = evt.detail?.originalTarget;
      this.vrControllerEl = ctrlEl;
      const iso3 = workerPose(this.el);
      if (iso3) {
        const frameMarkerResetFunc = () => {
          this.frameMarker.object3D.position.copy(iso3[0]);
          this.frameMarker.object3D.quaternion.copy(iso3[1]);
        }
        this.returnTimerId = setTimeout(frameMarkerResetFunc, 2000);
        this.objStartingPose = iso3;
        this.vrCtrlStartingPoseInv = isoMultiply(isoInvert([ctrlEl.object3D.position,
        ctrlEl.object3D.quaternion]),
          this.worldToBase);

        this.isAutoMoving = true
        this.autoDiffTickInitialized = false
        this.lastPoseInitialized = false
      }
    });
  },
  tick: function (time, deltatime) {
    if (!this.el?.shouldListenEvents) return;
    const ctrlEl = this?.vrControllerEl;
    if (!ctrlEl || !this.el.workerData || !this.el.workerRef) {
      // console.warn('workerData, workerRef or controller not ready yet.');
      return;
    }
    if (this.isAutoMoving) {
      if (!this.autoDiffTickInitialized) {
        const vrControllerPose = isoMultiply(this.baseToWorld,
          [ctrlEl.object3D.position,
          ctrlEl.object3D.quaternion]);

        if (!this.lastPoseInitialized) {
          this.vrCtrlLastFilteredPose = isoMultiply(this.baseToWorld, [ctrlEl.object3D.position, ctrlEl.object3D.quaternion]);
          this.vrCtrlLastPose = vrControllerPose
          this.lastPoseInitialized = true
          // triggerを離してから1tick目と2tick目の差分を参照しているが，常にlastPoseを保存しておけば1tick目からautoで動くようにはできる→強調フィルタとの兼ね合いがあると分離できない，el越しに参照できるように
          return
        }

        const vrCtrlLastPoseInv = isoInvert(this.vrCtrlLastPose)
        this.autoDiffTick = isoMultiply(vrCtrlLastPoseInv, vrControllerPose)

        if (this.autoDiffTick[0].length() / deltatime > this.autoVelocityThreshold) {
          this.autoDiffTickInitialized = true
          this.frameMarker.object3D.visible = true
          // 動作強調フィルタ系を使うならここで this.autoDiffTick に適用すべき
        } else {
          this.isAutoMoving = false
          return
        }
      }

      this.vrCtrlLastFilteredPose = isoMultiply(this.vrCtrlLastFilteredPose, [this.autoDiffTick[0], new THREE.Quaternion(0, 0, 0, 1)])
      const vrControllerDelta = isoMultiply(this.vrCtrlStartingPoseInv, this.vrCtrlLastFilteredPose)

      const filteredVrCtrlStartingPoseInv = [
        new THREE.Vector3(0, 0, 0),
        vrControllerDelta[1].clone().multiply(this.vrCtrlLastPose[1].clone().conjugate())
      ];
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
      const m4 = new THREE.Matrix4();
      m4.compose(newObjPose[0], newObjPose[1], new THREE.Vector3(1, 1, 1));
      this.el.workerRef?.current?.postMessage({
        type: 'destination',
        endLinkPose: m4.elements
      });
      this.frameMarker.object3D.position.copy(newObjPose[0]);
      this.frameMarker.object3D.quaternion.copy(newObjPose[1]);
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

AFRAME.registerComponent('arm-displacement-motion-ui', {
  schema:
    { type: 'string', default: "0 0 0:0 0 0" }
  ,
  init: function () {
    const myColor = this.el.getAttribute('material').color;
    const frameMarker = document.createElement('a-entity');
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
    this.baseToWorld = isoInvert(this.worldToBase);

    this.vrCtrlLastPose = [new THREE.Vector3(0, 0, 0), new THREE.Quaternion(0, 0, 0, 1)];
    this.vrCtrlLastFilteredPose = [new THREE.Vector3(0, 0, 0), new THREE.Quaternion(0, 0, 0, 1)];

    // startingPose
    const startFrameMarker = document.createElement('a-entity');
    startFrameMarker.setAttribute('a-xy-axes-frame', { // 上下逆にしています。
      length: 0.1,
      radius: 0.004,
      sphere: 0.016,
      opacity: 0.7,
      color: myColor ? myColor : 'blue',
    });
    this.el.appendChild(startFrameMarker);
    this.startFrameMarker = startFrameMarker;
    startFrameMarker.object3D.visible = true;
    startFrameMarker.object3D.position.copy(new THREE.Vector3(0, 1, 0));

    // 変位制御追加分
    this.deadRadius = 0.2
    const deadzone = document.createElement('a-sphere');
    this.el.appendChild(deadzone);
    this.deadzone = deadzone;
    deadzone.object3D.visible = false;
    deadzone.setAttribute('geometry', `radius:${this.deadRadius}`);
    deadzone.setAttribute('material', 'opacity: 0.25');
    deadzone.addEventListener('loaded', () => {
      deadzone.getObject3D('mesh').material.depthWrite = false; //透過オブジェクト越しにgltfを見るために必要
    });

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

          this.lastObjPose = this.objStartingPose
          this.startPose = this.vrCtrlLastPose // deadzoneで使用
          this.startFrameMarker.object3D.position.copy(this.vrCtrlLastPose[0])
          this.startFrameMarker.object3D.quaternion.copy(this.vrCtrlLastPose[1])
        }
      }
    });
    this.el.addEventListener('triggerup', (evt) => {
      console.log('### trigger up event');
      this.vrControllerEl = evt.detail?.originalTarget;
      this.triggerdownState = false;
      // 状態提示のsphere
      this.deadzone.object3D.visible = false;

      const iso3 = workerPose(this.el);
      if (iso3) {
        const frameMarkerResetFunc = () => {
          this.frameMarker.object3D.position.copy(iso3[0]);
          this.frameMarker.object3D.quaternion.copy(iso3[1]);
        }
        this.returnTimerId = setTimeout(frameMarkerResetFunc, 2000);
      }
    });
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
      // const motionFiltering = this.el.components['motion-dynamic-filter'];
      // if (motionFiltering) {
      //   const filtered = motionFiltering.applyFilters({
      //     detail: {
      //       position: vrCtrlDiffTick[0],
      //       quaternion: vrCtrlDiffTick[1],
      //       deltatime: deltatime
      //     }
      //   });
      //   vrCtrlDiffTickFiltered = [filtered.position, filtered.quaternion];
      // }
      this.vrCtrlLastFilteredPose = isoMultiply(this.vrCtrlLastFilteredPose, vrCtrlDiffTickFiltered)
      const vrControllerDelta = isoMultiply(this.vrCtrlStartingPoseInv, this.vrCtrlLastFilteredPose)
      this.vrCtrlLastPose = vrControllerPose

      const deltaLength = vrControllerDelta[0].length()
      if (this.deadRadius > deltaLength) return

      this.deadzone.object3D.visible = true;
      this.deadzone.object3D.position.copy(this.startPose[0])

      // コントローラ座標系合わせ
      const filteredVrCtrlStartingPoseInv = [
        new THREE.Vector3(0, 0, 0),
        vrControllerDelta[1].clone().multiply(vrControllerPose[1].clone().conjugate())
      ];
      const vrCtrlToObj = [
        new THREE.Vector3(0, 0, 0),
        filteredVrCtrlStartingPoseInv[1].clone().multiply(this.objStartingPose[1])
      ];
      const ObjToVrCtrl = [
        new THREE.Vector3(0, 0, 0),
        vrCtrlToObj[1].clone().conjugate()
      ];

      // deadzoneを超えたvectorのみを参照
      const deadDeltaVector = vrControllerDelta[0].clone().multiplyScalar(this.deadRadius / deltaLength)
      vrControllerDelta[0].sub(deadDeltaVector).multiplyScalar(0.05);
      vrControllerDelta[1] = scaleQuaternion(vrControllerDelta[1], 0.001)

      // vrControllerDelta[0] = vrControllerDelta[0].multiplyScalar(0.05);
      // vrControllerDelta[1] = scaleQuaternion(vrControllerDelta[1], 0.001)

      this.lastObjPose = isoMultiply(isoMultiply(this.lastObjPose,
        isoMultiply(ObjToVrCtrl,
          vrControllerDelta)),
        vrCtrlToObj);

      const newObjPose = this.lastObjPose

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

AFRAME.registerComponent('arm-mimic-displacement-motion-ui', {
  schema:
    { type: 'string', default: "0 0 0:0 0 0" }
  ,
  init: function () {
    const myColor = this.el.getAttribute('material').color;
    const frameMarker = document.createElement('a-entity');
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
    this.baseToWorld = isoInvert(this.worldToBase);

    this.vrCtrlLastPose = [new THREE.Vector3(0, 0, 0), new THREE.Quaternion(0, 0, 0, 1)];
    this.vrCtrlLastFilteredPose = [new THREE.Vector3(0, 0, 0), new THREE.Quaternion(0, 0, 0, 1)];

    // startingPose
    const startFrameMarker = document.createElement('a-entity');
    startFrameMarker.setAttribute('a-xy-axes-frame', { // 上下逆にしています。
      length: 0.1,
      radius: 0.004,
      sphere: 0.016,
      opacity: 0.7,
      color: myColor ? myColor : 'blue',
    });
    this.el.appendChild(startFrameMarker);
    this.startFrameMarker = startFrameMarker;
    startFrameMarker.object3D.visible = true;
    startFrameMarker.object3D.position.copy(new THREE.Vector3(0, 1, 0));

    this.ControlMode = {
      mimic:"mimic",
      displacement:"displacement"
    }
    this.controlMode = this.ControlMode.mimic
    this.control
    // 変位制御追加分
    this.deadRadius = 0.2
    this.deadzonePose = [new THREE.Vector3, new THREE.Quaternion]
    // robotTipBubble
    const deadzone = document.createElement('a-sphere');
    this.el.appendChild(deadzone);
    this.deadzone = deadzone;
    deadzone.object3D.visible = false;
    // deadzone.setAttribute('geometry', `radius:${this.deadRadius}`);
    deadzone.setAttribute('geometry', `radius:0.1`);
    deadzone.setAttribute('material', 'opacity: 0.5');
    deadzone.addEventListener('loaded', () => {
      deadzone.getObject3D('mesh').material.depthWrite = false; //透過オブジェクト越しにgltfを見るために必要
    });

    // handBubble
    const handDeadzone = document.createElement('a-sphere');
    this.el.appendChild(handDeadzone);
    this.handDeadzone = handDeadzone;
    handDeadzone.object3D.visible = false;
    handDeadzone.setAttribute('geometry', `radius:${this.deadRadius}`);
    handDeadzone.setAttribute('material', 'opacity: 0.25');
    handDeadzone.setAttribute('material', 'opacity: 1');
    handDeadzone.addEventListener('loaded', () => {
      handDeadzone.getObject3D('mesh').material.depthWrite = false; //透過オブジェクト越しにgltfを見るために必要
    });
    

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

          // VRcontroller周りのバブルの基準用(triggerを押してからは離すまで更新なし．)
          this.bubbleCenterPoseInv
            = isoMultiply(isoInvert([ctrlEl.object3D.position,
            ctrlEl.object3D.quaternion]),
              this.worldToBase);
          

          this.vrCtrlLastPose = isoMultiply(this.baseToWorld, [ctrlEl.object3D.position, ctrlEl.object3D.quaternion]);
          this.vrCtrlLastFilteredPose = isoMultiply(this.baseToWorld, [ctrlEl.object3D.position, ctrlEl.object3D.quaternion]);

          this.lastObjPose = this.objStartingPose

          //手先のバブルモデル用
          this.deadzonePose = iso3
          this.deadzone.object3D.position.copy(this.deadzonePose[0]) // displacement
          this.deadzone.object3D.visible = true; //透明度変化，vibeとか？

          this.handDeadzone.object3D.position.copy(this.vrCtrlLastPose[0] ) // displacement

          this.startFrameMarker.object3D.position.copy(this.vrCtrlLastPose[0])
          this.startFrameMarker.object3D.quaternion.copy(this.vrCtrlLastPose[1])
        }
      }
    });
    this.el.addEventListener('triggerup', (evt) => {
      console.log('### trigger up event');
      this.vrControllerEl = evt.detail?.originalTarget;
      this.triggerdownState = false;
      // 状態提示のsphere
      // this.deadzone.object3D.visible = false;

      const iso3 = workerPose(this.el);
      if (iso3) {
        const frameMarkerResetFunc = () => {
          this.frameMarker.object3D.position.copy(iso3[0]);
          this.frameMarker.object3D.quaternion.copy(iso3[1]);
        }
        this.returnTimerId = setTimeout(frameMarkerResetFunc, 2000);
      }
    });
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
  
      const vrCtrlStartToLast = isoMultiply(this.bubbleCenterPoseInv, vrControllerPose) //スケーリングしていないコントローラ差分(腕の可動域)でデッドゾーンは決める
      const deltaLength = vrCtrlStartToLast[0].length()
      
      const newMode = this.deadRadius > deltaLength ? this.ControlMode.mimic : this.ControlMode.displacement;
      if (this.controlMode !== newMode) {
        this.controlMode = newMode;
        // 初期化
        this.objStartingPose = this.lastObjPose;
        this.vrCtrlStartingPoseInv = isoMultiply(isoInvert([ctrlEl.object3D.position,ctrlEl.object3D.quaternion]), this.worldToBase); 
        this.vrCtrlLastPose = vrControllerPose
        this.vrCtrlLastFilteredPose = vrControllerPose
        this.lastObjPose = this.objStartingPose
        return
      }

      const vrCtrlLastPoseInv = isoInvert(this.vrCtrlLastPose)
      this.vrCtrlLastPose = vrControllerPose
      const vrCtrlDiffTick = isoMultiply(vrCtrlLastPoseInv, vrControllerPose)
      let vrCtrlDiffTickFiltered = [vrCtrlDiffTick[0], vrCtrlDiffTick[1]]
      // 可変スケールはできるけどしない
      // const motionFiltering = this.el.components['motion-dynamic-filter'];
      // if (motionFiltering) {
      //   const filtered = motionFiltering.applyFilters({
      //     detail: {
      //       position: vrCtrlDiffTick[0],
      //       quaternion: vrCtrlDiffTick[1],
      //       deltatime: deltatime
      //     }
      //   });
      //   vrCtrlDiffTickFiltered = [filtered.position, filtered.quaternion];
      // }

      vrCtrlDiffTickFiltered[0].multiplyScalar(0.5);
      vrCtrlDiffTickFiltered[1] = scaleQuaternion(vrCtrlDiffTickFiltered[1], 0.5)
      this.vrCtrlLastFilteredPose = isoMultiply(this.vrCtrlLastFilteredPose, vrCtrlDiffTickFiltered)

      let newObjPose = [new THREE.Vector3, new THREE.Quaternion]
      if (this.controlMode == "mimic") {
        // mimic操作
        // 手先姿勢座標系での差分表現
        const filteredVrCtrlStartingPoseInv = [
          new THREE.Vector3(0, 0, 0),
          vrCtrlStartToLast[1].clone().multiply(this.vrCtrlLastFilteredPose[1].clone().conjugate())
        ];
        const vrCtrlToObj = [
          new THREE.Vector3(0, 0, 0),
          filteredVrCtrlStartingPoseInv[1].clone().multiply(this.objStartingPose[1])
        ];
        const ObjToVrCtrl = [
          new THREE.Vector3(0, 0, 0),
          vrCtrlToObj[1].clone().conjugate()
        ];

        // GUI関連実装予定

        // 目標姿勢
        this.lastObjPose = isoMultiply(isoMultiply(this.lastObjPose,
          isoMultiply(ObjToVrCtrl,
            vrCtrlDiffTickFiltered)),
          vrCtrlToObj);
        this.lastObjPose[1].normalize();
        newObjPose = this.lastObjPose

        // bubble表示位置
        vrCtrlDiffTickFiltered[0] = new THREE.Vector3(0,0,0)
        this.deadzonePose = isoMultiply(isoMultiply(this.deadzonePose,
          isoMultiply(ObjToVrCtrl,
            vrCtrlDiffTickFiltered)),
          vrCtrlToObj);
        this.deadzonePose[1].normalize();
      } else {
        // displacement操作
        const filteredVrCtrlStartingPoseInv = [
          new THREE.Vector3(0, 0, 0),
          vrCtrlStartToLast[1].clone().multiply(vrControllerPose[1].clone().conjugate())
        ];
        const vrCtrlToObj = [
          new THREE.Vector3(0, 0, 0),
          filteredVrCtrlStartingPoseInv[1].clone().multiply(this.objStartingPose[1])
        ];
        const ObjToVrCtrl = [
          new THREE.Vector3(0, 0, 0),
          vrCtrlToObj[1].clone().conjugate()
        ];

        // deadzoneを超えたvectorのみを参照
        const deadDeltaVector = vrCtrlStartToLast[0].clone().multiplyScalar(this.deadRadius / deltaLength)
        vrCtrlStartToLast[0].sub(deadDeltaVector).multiplyScalar(0.05);
        vrCtrlStartToLast[1] = scaleQuaternion(vrCtrlStartToLast[1], 0.001)

        this.lastObjPose = isoMultiply(isoMultiply(this.lastObjPose,
          isoMultiply(ObjToVrCtrl,
            vrCtrlStartToLast)),
          vrCtrlToObj);
        this.lastObjPose[1].normalize();
        newObjPose = this.lastObjPose

        this.deadzonePose = isoMultiply(isoMultiply(this.deadzonePose,
          isoMultiply(ObjToVrCtrl,
            vrCtrlStartToLast)),
          vrCtrlToObj);
        this.deadzonePose[1].normalize();
        this.deadzone.object3D.position.copy(this.deadzonePose[0])
        this.deadzone.object3D.quaternion.copy(this.deadzonePose[1])
      

        // let StartToLast = isoMultiply(this.vrCtrlStartingPoseInv, vrControllerPose) //スケーリングしていないコントローラ差分(腕の可動域)でデッドゾーンは決める
        // StartToLast[0].multiplyScalar(0.05);
        // StartToLast[1] = scaleQuaternion(StartToLast[1], 0.001)
        
        // this.lastObjPose = isoMultiply(isoMultiply(this.lastObjPose,
        //   isoMultiply(ObjToVrCtrl,
        //     StartToLast)),
        //   vrCtrlToObj);
        // this.lastObjPose[1].normalize();
        // newObjPose = this.lastObjPose

        // this.deadzonePose = isoMultiply(isoMultiply(this.deadzonePose,
        //   isoMultiply(ObjToVrCtrl,
        //     StartToLast)),
        //   vrCtrlToObj);
        // this.deadzonePose[1].normalize();
        // this.deadzone.object3D.position.copy(this.deadzonePose[0])
        // this.deadzone.object3D.quaternion.copy(this.deadzonePose[1])

      }

      this.frameMarker.object3D.position.copy(newObjPose[0]);
      this.frameMarker.object3D.quaternion.copy(newObjPose[1]);
      console.log(`target x:${newObjPose[0].x} y:${newObjPose[0].y} z:${newObjPose[0].z} \n x:${newObjPose[1].x} y:${newObjPose[1].y} z:${newObjPose[1].z} w:${newObjPose[1].w}`)
      console.log(`target ${newObjPose[1]}`)

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

