import { setCookie } from '../lib/cookie_id.js';
const THREE = window.AFRAME.THREE;

AFRAME.registerComponent('robot-pose-adjuster', {
  schema: { type: 'string', default: '0 0 0:0 0 0' },

  init: function () {
    this.triggerValue = 0;
    this.gripperValue = 0;
    this.stickPressed = false;
    this.stickX = 0;
    this.stickY = 0;
    this.changed = false;

    this.position = new THREE.Vector3();
    this.quaternion = new THREE.Quaternion();
    this._parseSchema(this.data);

    const cookieText = document.createElement('a-entity');
    this.el.appendChild(cookieText);
    this.cookieText = cookieText;
    cookieText.object3D.visible = false;
    const textBack = document.createElement('a-plane');
    textBack.setAttribute('width', 0.8);
    textBack.setAttribute('height', 0.3);
    cookieText.appendChild(textBack);

    this.el.addEventListener('triggerchanged', (e) => { this.triggerValue = e.detail.value; });

    this.el.addEventListener('gripchanged', (e) => { this.gripperValue = e.detail.value; });

    this.el.addEventListener('abuttondown', () => { this._saveToCookie(); });
    this.el.addEventListener('bbuttondown', () => { this._clearCookie(); });

    this.el.addEventListener('thumbstickmoved', (evt) => {
      this.stickX = evt.detail.x;
      this.stickY = evt.detail.y;
    });
    this.el.addEventListener('thumbstickdown', () => {
      this.stickPressed = true;
      const delta = new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(0, 0, 1),
        THREE.MathUtils.degToRad(90)
      );
      this.quaternion.multiply(delta);
      this.changed = true;
    });
    this.el.addEventListener('thumbstickup', () => {
      this.stickX = 0;
      this.stickY = 0;
      this.stickPressed = false;
    });
  },

  update: function (oldData) {
    if (oldData !== undefined) {
      this._parseSchema(this.data);
    }
  },

  tick: function (time, deltaTime) {
    if (!this.el?.shouldListenEvents) return;

    const dt = deltaTime / 1000;
    const MOVE_SPEED = 0.1;
    const STICK_DEAD = 0.10;

    if (Math.abs(this.stickX) > STICK_DEAD) {
      this.position.x += this.stickX * MOVE_SPEED * dt;
      this.changed = true;
    }
    if (Math.abs(this.stickY) > STICK_DEAD) {
      this.position.z += this.stickY * MOVE_SPEED * dt;
      this.changed = true;
    }

    if (this.triggerValue > 0) {
      this.position.y += this.triggerValue * MOVE_SPEED * dt;
      this.changed = true;
    }
    if (this.gripperValue > 0) {
      this.position.y -= this.gripperValue * MOVE_SPEED * dt;
      this.changed = true;
    }

    if (this.changed) {
      this.changed = false;
      this.el.setAttribute('position', { x: this.position.x, y: this.position.y, z: this.position.z });
      const euler = new THREE.Euler().setFromQuaternion(this.quaternion, 'YXZ');
      this.el.setAttribute('rotation', {
        x: THREE.MathUtils.radToDeg(euler.x),
        y: THREE.MathUtils.radToDeg(euler.y),
        z: THREE.MathUtils.radToDeg(euler.z),
      });
    }
  },

  _parseSchema: function (data) {
    const parts = data.split(':');
    const p = (parts[0] || '0 0 0').trim().split(/\s+/).map(Number);
    const r = (parts[1] || '0 0 0').trim().split(/\s+/).map(Number);

    this.position.set(p[0] ?? 0, p[1] ?? 0, p[2] ?? 0);
    const euler = new THREE.Euler(
      THREE.MathUtils.degToRad(r[0] ?? 0),
      THREE.MathUtils.degToRad(r[1] ?? 0),
      THREE.MathUtils.degToRad(r[2] ?? 0),
      'YXZ'
    );
    this.quaternion.setFromEuler(euler);
  },

  _showMessage: function (msg, durationMs = 3000) {
    if (this._msgTimer) clearTimeout(this._msgTimer);
    this.cookieText.setAttribute('text', {
      value: msg,
      align: 'center',
      width: 1.5,
      color: 'black',
    });
    const parentRotInv = this.quaternion.clone().conjugate();
    const worldRot = new THREE.Quaternion(); // identity = 正面向き
    const textRot = parentRotInv.multiply(worldRot);

    // オフセット位置も親回転の影響を除去
    const offsetInWorld = new THREE.Vector3(0, 0.2, 0.2);
    const localOffset = offsetInWorld.clone().applyQuaternion(parentRotInv);

    this.cookieText.object3D.position.copy(localOffset);
    this.cookieText.object3D.quaternion.copy(textRot);

    this.cookieText.object3D.visible = true;
    this._msgTimer = setTimeout(() => {
      this.cookieText.object3D.visible = false;
    }, durationMs);
  },

  _saveToCookie: function () {
    const euler = new THREE.Euler().setFromQuaternion(this.quaternion, 'YXZ');
    const rotY = THREE.MathUtils.radToDeg(euler.y);
    console.log(`[robot-pose-adjuster] Save: pos=${this.position.x.toFixed(4)} ${this.position.y.toFixed(4)} ${this.position.z.toFixed(4)} angle=${rotY.toFixed(2)}`);
    setCookie('vrModeOffsetX', String(this.position.x));
    setCookie('vrModeOffsetY', String(this.position.y));
    setCookie('vrModeOffsetZ', String(this.position.z));
    setCookie('vrModeAngle', String(rotY));
    this._showMessage(`Saved!\nX:${this.position.x.toFixed(3)} Y:${this.position.y.toFixed(3)} Z:${this.position.z.toFixed(3)}\nAngle:${rotY.toFixed(1)}`);
  },
  _clearCookie: function () {
    setCookie('vrModeOffsetX', '0.35');
    setCookie('vrModeOffsetY', '0.75');
    setCookie('vrModeOffsetZ', '-0.9');
    setCookie('vrModeAngle', '180');
    this._showMessage('Reset to default!');
  },
});