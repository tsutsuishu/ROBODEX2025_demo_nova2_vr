import AFRAME from 'aframe';

// 最初にイベントを受け取る　plane を決めるコンポーネント
// ik-worker-start イベントが来たら、その要素の id を使う

// robot-dom-ready(robotLoader.js) -> ik-worker-start(ikWorker.js) -> default-event-target(ここ)

AFRAME.registerComponent('default-event-target', {
  init: function () {
    console.log("Set default-event-target");
    // ロボットの読み込みが終わったら！
      this.el.addEventListener('ik-worker-start', () => {
        const robotRegistryComp = this.el.sceneEl.robotRegistryComp;
        //robotRegistryComp?.eventDeliveryOneLocation(this.el.id); // デフォルトでここだけに！
        robotRegistryComp?.enableEventDelivery(this.el.id);
        console.log('### default-target: enabled event delivery for id:', this.el.id);
      });
  }
});