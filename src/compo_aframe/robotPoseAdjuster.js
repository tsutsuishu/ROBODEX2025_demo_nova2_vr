import { setCookie } from '../lib/cookie_id.js';

/**
 * robot-pose-adjuster
 *
 * schema: "x y z:rx ry rz"  (base_position + ":" + base_rotation)
 *
 * VRコントローラーで以下を操作:
 *   スティック左右 → ロボットX位置
 *   スティック上下 → ロボットZ位置
 *   トリガー押し   → ロボットY位置 上昇
 *   グリップ押し   → ロボットY位置 下降
 *   Aボタン        → 現在のposition / rotationをCookieに保存
 *
 * ※ event-distributor が転送するイベントのみ使用:
 *   triggerdown/up, gripdown/up, abuttondown/up, bbuttondown/up,
 *   thumbstickmoved, thumbstickdown/up
 */
AFRAME.registerComponent('robot-pose-adjuster', {
  schema: { type: 'string', default: '0 0 0:0 0 0' },

  init: function () {
    // --- 入力状態 (down/upでフラグ管理) ---
    this.triggerPressed = false;
    this.gripPressed    = false;
    this.stickX         = 0;
    this.stickY         = 0;

    // --- schemaから初期値をパース ---
    this._parseSchema(this.data);

    // --- トリガー ---
    this.el.addEventListener('triggerdown', () => { this.triggerPressed = true;  });
    this.el.addEventListener('triggerup',   () => { this.triggerPressed = false; });

    // --- グリップ ---
    this.el.addEventListener('gripdown', () => { this.gripPressed = true;});
    this.el.addEventListener('gripup',   () => { this.gripPressed = false; });

    // --- Aボタン: Cookie保存 ---
    this.el.addEventListener('abuttondown', () => {
      this._saveToCookie();
    });

    this.el.addEventListener('bbuttondown', () => {
      this._clearCookie();
    });

    // --- スティック ---
    this.el.addEventListener('thumbstickmoved', (evt) => {
      this.stickX = evt.detail.x; // -1.0〜1.0
      this.stickY = evt.detail.y; // -1.0〜1.0
    });
    this.el.addEventListener('thumbstickup', () => {
      this.stickX = 0;
      this.stickY = 0;
    });
  },

  update: function (oldData) {
    if (oldData !== undefined) {
      this._parseSchema(this.data);
    }
  },

  tick: function (time, deltaTime) {
    if (!this.el?.shouldListenEvents) return;
    

    const dt         = deltaTime / 1000 / 1000; // msec → sec
    const MOVE_SPEED = 0.3;  // m/s
    const STICK_DEAD = 0.15; // デッドゾーン

    let changed = false;

    // --- X / Z : スティック ---
    if (Math.abs(this.stickX) > STICK_DEAD) {
      this.posX += this.stickX * MOVE_SPEED * dt;
      changed = true;
    }
    if (Math.abs(this.stickY) > STICK_DEAD) {
      this.posZ += this.stichsckY * MOVE_SPEED * dt;
      changed = true;
    }

    // --- Y : トリガー(上) / グリップ(下) ---
    if (this.triggerPressed) {
      this.posY += MOVE_SPEED * dt;
      changed = true;
    }
    if (this.gripPressed) {
      this.posY -= MOVE_SPEED * dt;
      changed = true;
    }

    // --- entityに反映 ---
    if (changed) {
      this.el.setAttribute('position', { x: this.posX, y: this.posY, z: this.posZ });
      this.el.setAttribute('rotation', { x: this.rotX, y: this.rotY, z: this.rotZ });
      console.log(`[pose-adjuster] pos: ${this.posX.toFixed(3)} ${this.posY.toFixed(3)} ${this.posZ.toFixed(3)}`);
    }
  },

  // ---- private ----

  _parseSchema: function (data) {
    const parts = data.split(':');
    const pos   = (parts[0] || '0 0 0').trim().split(/\s+/).map(Number);
    const rot   = (parts[1] || '0 0 0').trim().split(/\s+/).map(Number);

    this.posX = pos[0] ?? 0;
    this.posY = pos[1] ?? 0;
    this.posZ = pos[2] ?? 0;
    this.rotX = rot[0] ?? 0;
    this.rotY = rot[1] ?? 0; // vrModeAngle に対応
    this.rotZ = rot[2] ?? 0;
  },

  _saveToCookie: function () {
    console.log(`[robot-pose-adjuster] Save: pos=${this.posX.toFixed(4)} ${this.posY.toFixed(4)} ${this.posZ.toFixed(4)} angle=${this.rotY.toFixed(2)}`);
    setCookie('vrModeOffsetX', String(this.posX));
    setCookie('vrModeOffsetY', String(this.posY));
    setCookie('vrModeOffsetZ', String(this.posZ));
    setCookie('vrModeAngle',   String(this.rotY));
  },
  _clearCookie: function () {
    console.log(`[robot-pose-adjuster] Save: pos=${this.posX.toFixed(4)} ${this.posY.toFixed(4)} ${this.posZ.toFixed(4)} angle=${this.rotY.toFixed(2)}`);
    setCookie('vrModeOffsetX', "0.55");
    setCookie('vrModeOffsetY', "0.75");
    setCookie('vrModeOffsetZ', "-0.8");
    setCookie('vrModeAngle',   "180");
  },
});