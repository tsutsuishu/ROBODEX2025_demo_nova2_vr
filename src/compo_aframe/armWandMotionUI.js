// armMoitionUIを参考に仮想wand操作を作りたい． →他の操作手法も検討すべき(ここでregisterする)
import AFRAME from 'aframe';
const THREE = window.AFRAME.THREE;
import { isoInvert, isoMultiply } from '../lib/isometry3.js';

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

AFRAME.registerComponent('arm-wand-motion-ui', {
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

      // 違う操作方法でも差分ごとに変化を入れるのほうが制御しやすいはず
      // 可変制御をした仮想のVRコントローラの位置(this.vrCtrlLastFilteredPose)を保持し続ける方法は使いそう
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
      // 今まではスタート位置からの姿勢差分から次の位置を決めていたが，今のコントローラ位置から目標姿勢が一意に決まるはず．
      // 今のコントローラ位置から一意に定まる姿勢のスタートからの差分を入力するでもいい？

      //debug
      this.virtualController.object3D.position.copy(this.vrCtrlLastFilteredPose[0]);
      const wandTipPose = isoMultiply(this.vrCtrlLastFilteredPose, this.controlerToWandTip)
      this.wandTip.object3D.position.copy(wandTipPose[0]);


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
      // const newObjPose = isoMultiply(isoMultiply(this.objStartingPose,
      //   isoMultiply(ObjToVrCtrl,
      //     vrControllerDelta)),
      //   vrCtrlToObj);

      let newObjPose = isoMultiply(isoMultiply(this.objStartingPose,
        isoMultiply(ObjToVrCtrl,
          vrControllerDelta)),
        vrCtrlToObj);
      newObjPose[0] = wandTipPose[0]
      newObjPose[1] = wandTipPose[1]
      // debug
      this.robotTip.object3D.position.copy(newObjPose[0]);
      
      
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
    if(this.isAutoMoving){
      if(!this.autoDiffTickInitialized){
        const vrControllerPose = isoMultiply(this.baseToWorld,
          [ctrlEl.object3D.position,
        ctrlEl.object3D.quaternion]);
        
        if(!this.lastPoseInitialized){
          this.vrCtrlLastFilteredPose = isoMultiply(this.baseToWorld, [ctrlEl.object3D.position, ctrlEl.object3D.quaternion]);
          this.vrCtrlLastPose = vrControllerPose
          this.lastPoseInitialized = true
          // triggerを離してから1tick目と2tick目の差分を参照しているが，常にlastPoseを保存しておけば1tick目からautoで動くようにはできる→強調フィルタとの兼ね合いがあると分離できない，el越しに参照できるように
          return
        }

        const vrCtrlLastPoseInv = isoInvert(this.vrCtrlLastPose)
        this.autoDiffTick = isoMultiply(vrCtrlLastPoseInv, vrControllerPose)

        if(this.autoDiffTick[0].length() / deltatime > this.autoVelocityThreshold){
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

      // 連続的にコントローラ姿勢変化を追わないから，開始姿勢とのズレも小さく，本来は不要なはず
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


