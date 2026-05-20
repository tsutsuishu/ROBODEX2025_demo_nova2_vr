//
// アプリケーションモードを定義
// appmode モジュール

export const AppMode = {
  normal: 'normal',        // 通常のロボット遠隔操作：カメラ無
  withCam: 'withCam',      // 通常のロボット遠隔操作 + カメラ表示
  withDualCam: 'withDualCam',  // 通常のロボット遠隔操作 + 2カメラ表示
  viewer: 'viewer',        // ビューワ（ロボットの状態を表示するだけ）:カメラ無
  simRobot: 'simRobot',    // 仮想ロボット（実ロボットのシミュレータ）
  practice: 'practice',    // 練習モード (荷物を運ぶタイプ：VRのみ)
  monitor: 'monitor',    // 監視モード (ロボットの状態を監視する)
  filter: 'filter',    // 
  develop: 'develop',    //実験機能 + カメラ
  adjust: 'adjust'      //カメラ＋アーム姿勢の位置合わせ用
};


export function isControlMode(appmode) {
  return (appmode === AppMode.normal ||
          appmode === AppMode.withCam ||
          appmode === AppMode.withDualCam ||
          appmode === AppMode.filter ||
          appmode === AppMode.develop ||
          appmode === AppMode.adjust ||
          appmode === AppMode.practice);
}

export function isCameraMode(appmode) {
  return (
          appmode === AppMode.withCam ||
          appmode === AppMode.withDualCam ||
          appmode === AppMode.develop ||
          appmode === AppMode.adjust);
}

export function isNonControlMode(appmode) {
  return (
          appmode === AppMode.viewer ||
          appmode === AppMode.simRobot ||
          appmode === AppMode.monitor);
}