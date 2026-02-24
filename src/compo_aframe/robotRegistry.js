import AFRAME from 'aframe'

AFRAME.registerComponent('robot-registry', {
  init: function () {
    this.el.sceneEl.robotRegistryComp = this;
    this.objects = new Map();
  },
  set: function (id, data) { // data: {el: robotEl, axes: [...axes]}
    this.objects.set(id, { data: data, eventDelivery: false });
  },
  get: function (id) {
    return this.objects.get(id)?.data;
  },
  add: function (id, data) {
    console.warn('registry add id:', id);
    if (this.get(id)) {
      console.warn('registry add already exist id:', id);
      Object.assign(this.get(id), data);
      console.warn('registry add data:', this.get(id));
    } else {
      this.set(id, data);
    }
  },
  getWhole: function (id) {
    return this.objects.get(id);
  },
  enableEventDelivery: function (id) {
    const entry = this.objects.get(id);
    if (entry) {
      entry.eventDelivery = true;
      entry.data.el.shouldListenEvents = true;
    }
  },
  disableEventDelivery: function (id) {
    const entry = this.objects.get(id);
    if (entry) {
      entry.eventDelivery = false;
      entry.data.el.shouldListenEvents = false;
    }
  },
  eventDeliveryEnabled: function (id) {
    const entry = this.objects.get(id);
    return entry ? entry.eventDelivery : false;
  },
  eventDeliveryOneLocation: function (id) {
    const idList = this.list();
    if (!idList.includes(id)) {
      console.error('The specified id does not exist in the registry:', id);
      return;
    }
    idList.forEach((otherId) => {
      this.disableEventDelivery(otherId);
    });
    this.enableEventDelivery(id);
    console.log('eventDeliveryOneLocation: enabled event delivery for id:', id);
  },
  list: function () {
    return Array.from(this.objects.keys());
  },
  remove: function (id) {
    this.objects.delete(id);
  },
});

AFRAME.registerComponent('event-distributor', {
  init: function () {
    const robotRegistryComp = this.el.sceneEl.robotRegistryComp;
    // const robotRegistry = document.getElementById('robot-registry');
    // const robotRegistryComp = robotRegistry?.components['robot-registry'];
    if (!robotRegistryComp) {
      console.error('robot-registry component not found!');
      return;
    }
    ['thumbmenu-select',
      'triggerdown', 'triggerup', 'triggerchanged', 'gripdown', 'gripup', 'gripchanged',
      'abuttondown', 'abuttonup', 'bbuttondown', 'bbuttonup',
      'thumbstickmoved', 'thumbstickdown', 'thumbstickup',
    ].forEach(evtName => {
      this.el.addEventListener(evtName, (evt) => {
        const detail = evt.detail ? evt.detail : {};
        robotRegistryComp.list().forEach(id => {
          // console.log('*** event distributor: ', evtName, ' to ', id, 
          // 	      ' enabled=', robotRegistryComp.eventDeliveryEnabled(id));
          const { data, eventDelivery } = robotRegistryComp.getWhole(id) || {};
          if (eventDelivery && data && data.el) {
            detail.originalTarget = evt.target;
            data.el.emit(evtName, detail, false);
          }
        });
      });
    });
  }
});

AFRAME.registerComponent('target-selector', {
  schema: {
    event: { default: 'thumbmenu-select' }
  },
  init: function () {
    this.el.addEventListener(this.data.event, (evt) => {
      console.log('### target-selector: thumbmenu-select event:',
        evt.detail?.index);
      const robotRegistryComp = this.el.sceneEl.robotRegistryComp;
      const menuText = evt.detail?.texts[evt.detail?.index];
      if (robotRegistryComp && menuText) {
        for (const id of robotRegistryComp.list()) {
          if (menuText === id) {
            robotRegistryComp.eventDeliveryOneLocation(id);
            console.log('### target-selector: enabled event delivery for id:', id);
            break;
          }
        }
      }
    });
  }
});


AFRAME.registerComponent('default-target', {
  schema: {
    event: { default: 'thumbmenu-select' }
  },
  init: function () {
    console.log("Set default-target");
    // ロボットの読み込みが終わったら！
      this.el.addEventListener('ik-worker-start', () => {
        const robotRegistryComp = this.el.sceneEl.robotRegistryComp;
        robotRegistryComp?.eventDeliveryOneLocation(this.el.id); // デフォルトでここだけに！
        console.log('### default-target: enabled event delivery for id:', this.el.id);
      });

  }
});
