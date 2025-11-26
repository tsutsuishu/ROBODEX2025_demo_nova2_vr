"use client";
import 'aframe';
import * as React from 'react'
const THREE = window.AFRAME.THREE; // これで　AFRAME と　THREEを同時に使える

import { AppMode } from './appmode.js';

import '../compo_aframe/robotRegistry.js';
import '../compo_aframe/robotLoader.js';
import VrControllerComponents from '../components/VrControllerComponents.jsx';
import '../compo_aframe/ikWorker.js';
import '../compo_aframe/reflectWorkerJoints.js';
import '../compo_aframe/armMotionUI.js';
import '../compo_aframe/gripControl.js';
import '../compo_aframe/default_event_target.js';
import '../compo_aframe/motionFilter.js'
import '../compo_aframe/model_opacity.js'

import { getCookie } from '../lib/cookie_id.js';
import { setupMQTT } from '../lib/MQTT_jobs.js';

import StereoVideo from '../components/stereoWebRTC.js';



// 角度、横方向のオフセットを Cookie から取得して初期化
const getCookiesForInitalize = (appmode, setVrModeAngle, setVrModeOffsetX) => {
  // Cookie, Offsetの取得
  if (!(appmode === AppMode.viewer)) {
    const wk_vrModeAngle = getCookie('vrModeAngle')
    setVrModeAngle(wk_vrModeAngle ? parseFloat(wk_vrModeAngle) : 180);  // change default to 90
    const wk_vrModeOffsetX = getCookie('vrModeOffsetX')
    setVrModeOffsetX(wk_vrModeOffsetX ? parseFloat(wk_vrModeOffsetX) : 0.55); // デフォルト X 方向オフセット
    // console.log("Cookie read vrModeAngle, OffsetX:", vrModeAngle_ref.current, vrModeOffsetX_ref.current);
  }
}


export default function Home(props) {
  const robotIDRef = React.useRef("robot_id_reference"); // ロボットUUID 保持用

  const [vrModeAngle, setVrModeAngle] = React.useState(90);       // ロボット回転角度
  const [vrModeOffsetX, setVrModeOffsetX] = React.useState(0.35);   // X offset
  const [base_rotation, setBaseRotation] = React.useState(`-90 90 0`);     // ベース角度
  const [base_position, setBasePosition] = React.useState(`0.35 0.75 -0.8`);   // ベース位置

  const [draw_ready, set_draw_ready] = React.useState(false)

  const [debug_message, set_debug_message] = React.useState("")
  const add_debug_message = (message) => {
    set_debug_message((prev) => (prev + " " + message))
  }

  const [rtcStats, set_rtcStats] = React.useState([])

  const nova2_ref = React.useRef(null);

  const deg30 = Math.PI / 6.0;
  const deg90 = Math.PI / 2;
  const deg45 = Math.PI / 4;
  const deg22 = Math.PI / 8;

  // モードに応じて初期ポーズを変更
  let initial_pose = `${-deg90}, ${-deg90}, ${-deg90}, 0, ${deg90}, 0`;
  if (props.appmode === AppMode.simRobot) {
    initial_pose = `${deg45}, ${-deg90}, ${deg45}, 0, ${-deg90}, 0`;
  }

  // MQTT 対応
  React.useEffect(() => {
    setupMQTT(props, robotIDRef, nova2_ref, set_draw_ready); // useEffect で1回だけ実行される。


  }, []);

  // Cookie から初期値取得
  React.useEffect(() => {
    getCookiesForInitalize(props.appmode, setVrModeAngle, setVrModeOffsetX);
  }, []);
  // base_position, base_rotation 更新
  React.useEffect(() => {
    setBasePosition(`${vrModeOffsetX} 0.75 -0.8`);
    setBaseRotation(`-90 ${vrModeAngle} 0`);
    console.log("Home base_pos, rotation:", base_position, base_rotation);
  }, [vrModeAngle, vrModeOffsetX]);
  
  
  React.useEffect(() => {
    console.log("Draw Ready!");
  }, [draw_ready]);

    return (
      <>
        <a-scene xr-mode-ui={`enabled: ${!(props.appmode === AppMode.viewer) ? 'true' : 'false'}; XRMode: xr`} >
          <a-entity id="robot-registry"
            robot-registry
            event-distributor>
            <VrControllerComponents appmode={props.appmode} />
          </a-entity>
          <a-entity camera position="0 1.7 1"
            look-controls
            wasd-controls="acceleration: 200"
          ></a-entity>

          <a-camera id="camera" stereocam ></a-camera>


          {  // ステレオカメラ使うか extra-camera={props.appmode}>
            (props.appmode === AppMode.withCam || props.appmode === AppMode.withDualCam || props.appmode === AppMode.monitor) ?
              <StereoVideo rendered={draw_ready} set_rtcStats={set_rtcStats} 
                appmode={props.appmode}
              /> : <></>
          }



          <a-plane id="nova2-plane"
            ref={nova2_ref}
            position={base_position} rotation={base_rotation}

            width="0.5" height="0.5" color="#7BC8A4"
            material="opacity: 0.3; transparent: true; side: double;"
            robot-loader="model: nova2_robot"
            ik-worker={initial_pose}
            reflect-worker-joints={`appmode: ${props.appmode}`}
            arm-motion-ui={base_position+":"+base_rotation}
            grip-control
            default-event-target
            motion-dynamic-filter={`enabled: ${props.appmode === AppMode.filter}`}
          />
          {/* motion-dynamic-filter */}
          {/* <a-sky color="#ECECEC"></a-sky> 
                   ik-worker={`${deg90}, ${-deg90}, ${deg90}, 0, ${-deg90}, 0`}

        */}
        </a-scene>
      </>
    );


}
