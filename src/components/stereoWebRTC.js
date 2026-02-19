import * as React from 'react'
import Head from 'next/head';
import Script from 'next/script';
import 'aframe'
import Sora from "sora-js-sdk";
import { AppMode } from '../app/appmode';
import { userUUID } from '../lib/cookie_id';


import package_info from '../../package.json' // load version
const codeType = package_info.name; // software name
const version = package_info.version; // version number

//const set_RealSense = true; //realsenseを使う場合はtrueにする
const set_Audio = false;     //audioを使う場合はtrueにする

let sora_once = true; // soraの初期化を一度だけ行うためのフラグ

let lastStatTime = 0;
let lastStatBytes = 0;


export default function StereoVideo(props) {
    const { rendered, set_rtcStats, appmode } = props
    const [objectRender, setObjectRender] = React.useState(false)
    const [stereo_visible, set_stereo_visible] = React.useState(false)

    const set_RealSense = (appmode === AppMode.withDualCam || appmode === AppMode.monitor); //realsenseを使う場合はtrueにする


    // statsReport 定期的に更新
    async function setStatsReport(soraConnection) {
        if (soraConnection.pc && soraConnection.pc?.iceConnectionState !== 'closed') {
            const stats = await soraConnection.pc.getStats()
            const statsReport = []
            const localCandidateStats = []
            for (const stat of stats.values()) {
                if (stat.type === "codec") {
                    //                    statsReport.push("codec: "+ stat.mimeType + "   type: " + stat.payloadType)
                } else if (stat.type === "inbound-rtp") {
                    //                    statsReport.push(stat.frameWidth+"x"+stat.frameHeight + "  " + stat.framesPerSecond+ " fps");
                    //                   console.log("trasnport",stat)
                } else if (stat.type === "transport") {
                    const tdiff = stat.timestamp - lastStatTime;
                    const bdiff = stat.bytesReceived - lastStatBytes;
                    statsReport.push(Math.round(bdiff / tdiff * 80) / 10 + " kbps");
                    lastStatTime = stat.timestamp;
                    lastStatBytes = stat.bytesReceived;
                }
                // RTCStatsReport の各統計情報を statsReport に追
                //                statsReport.push(stat)
                //                console.log('stats report', stat)
            }
            // local-candidate の最初に出現する TURN サーバーの URL を取得
            //            console.log('setStatsReport', statsReport)
            set_rtcStats(statsReport)
        }
    }


    //ビデオ登録
    React.useEffect(() => {
        if (sora_once && objectRender) {
            console.log("Using sora-js-sdk version:", Sora.version());
<<<<<<< HEAD
            //const signalingUrl = 'wss://sora.uclab.jp/signaling'; //demo用
            const signalingUrl = 'wss://sora3.uclab.jp/signaling'; // 202508 demo用
            // const signalingUrl = 'wss://sora2.uclab.jp/signaling'; // 202508 demo用
=======
            // const signalingUrl = 'wss://sora.uclab.jp/signaling'; //demo用
            // const signalingUrl = 'wss://sora2.uclab.jp/signaling'; // 202508 demo用
            const signalingUrl = 'wss://sora3.uclab.jp/signaling'; // 202508 demo用
>>>>>>> develop
            const channelId = 'nova2-vr180';
            const channelId1 = 'nova2-hand';
            const audioChannelId = 'nova2-audio'; // 202508 のdemo では、使わない予定
            const sora = Sora.connection(signalingUrl);
            const bundleId = 'vrdemo-sora-bundle';

            const options = {
                role: 'recvonly',
                multistream: true,
                video: {
                    codecType: 'H265',
                    resolution: '4K',
                    bitrate: 4000
                },
                audio: false,
            };
            const metadata = {
                codeType: codeType,
                version: version,
                bundleId: userUUID,
            }

            sora_once = false;

            const recvonly = sora.recvonly(channelId, metadata, options);
            const remoteVideo = document.getElementById('remotevideo');

            recvonly.on('disconnect', (event) => {
                console.log("Disconnected from sora:", event);

            });
            recvonly.on("removetrack", (event) => {
                console.log("Track removed from sora:", event);
                if (event.target instanceof MediaStream) {
                    // ここにトラック削除イベントの処理を書く
                    console.log("MediaStream track removed:", event.target);
                }
            });
            recvonly.on('push', (message, transportType) => {
                console.log("Push event from sora:", message, transportType);

            });
            recvonly.on('notify', (message, transportType) => {
                //                console.log("Notify Event from sora:", message, transportType);

            });
            recvonly.on('timeout', () => {
                //                console.log("Timeout Event from sora:", event);

            });
            recvonly.on('message', (message) => {
                //                console.log("Message Event from sora:", message.label, message.data);

            });
            recvonly.on('datachannel', (event) => {
                //                console.log("Datachannel Event from sora:", event.datachannel.label, event.datachannel.direction);

            });
            recvonly.on('signaling', (event) => {
                //                console.log("Signaling Event from sora:", event);

            });
            recvonly.on('timeline', (event) => {
                //                console.log("Timeline Event from sora:", event);              
            });


            recvonly.on('track', event => {
                if (event.track.kind === 'video') {
                    const mediaStream = new MediaStream();
                    mediaStream.addTrack(event.track);
                    remoteVideo.muted = true; // これで自動再生OKに！
                    remoteVideo.srcObject = mediaStream;
                    remoteVideo.play().then(() => {
                        console.log("Video play!?")
                        //                        const playButton = document.querySelector('#videoPlayButton');
                        //                        playButton.setAttribute('visible', 'false')
                    })

                    console.log('MediaStream assigned to srcObject:', remoteVideo.srcObject);

                    remoteVideo.onloadeddata = () => {
                        console.log('Video data loaded');

                        set_stereo_visible(true)



                        const leftSphere = document.getElementById('leftSphere');
                        const rightSphere = document.getElementById('rightSphere');

                        if (leftSphere && rightSphere) {
                            //                            leftSphere.setAttribute('material', { src: '#remotevideo' });
                            //                            rightSphere.setAttribute('material', { src: '#remotevideo' });

                            remoteVideo.play();

                            console.log('Left sphere material component:', leftSphere.components.material);
                            console.log('Right sphere material component:', rightSphere.components.material);
                        } else {
                            console.error('Left or right sphere not found in the DOM');
                        }


                    };
                }
            });
            recvonly.connect().then(() => {
                //                console.log('Successfully connected to Sora for main stereo');
                // start cheking stats
                setInterval(() => {
                    setStatsReport(recvonly);

                    // もし切断されていたら？というチェックは？
                }, 1000);

            }).catch(err => {
                console.error('Sora connection error for main stereo:', err);
            });




            if (set_RealSense) {// no realsense
                const options = {
                    role: 'recvonly',
                    multistream: true,
                    video: {
                        codecType: 'H265',
                        resolution: 'VGA',
                        bitrate: 1000
                    },
                    audio: false,
                };

                const metadata = {
                    codeType: codeType,
                    version: version,
                    bundleId: userUUID,
                }
                const recvonly1 = sora.recvonly(channelId1, metadata, options);
                const remoteVideo1 = document.getElementById('remotevideo-realsense');
                recvonly1.on('track', event => {
                    if (event.track.kind === 'video') {
                        const mediaStream = new MediaStream();
                        mediaStream.addTrack(event.track);
                        remoteVideo1.muted = true; // これで自動再生OKに！
                        remoteVideo1.srcObject = mediaStream;
                        remoteVideo1.play().then(() => {
                            //                            console.log("play realsense")
                        })

                        console.log('MediaStream assigned to srcObject:', remoteVideo1.srcObject);

                        remoteVideo1.onloadeddata = () => {
                            //                            console.log('Video data loaded');

                            const scene = document.querySelector('a-scene');
                            scene.addEventListener('loaded', () => {
                                //                                console.log('Scene fully loaded');

                                if (set_RealSense) {
                                    const plate = document.getElementById('videoPlate');
                                    plate.setAttribute('material', { src: '#remotevideo-realsense' });
                                }

                            });
                        };
                    }
                });
                recvonly1.connect().then(() => {
                    //                    console.log('Successfully connected to Sora');
                }).catch(err => {
                    console.error('Sora connection error:', err);
                });
            }

            if (set_Audio) {
                const audioOptions = {
                    role: 'sendrecv',
                    multistream: true,
                    //bundleId: bundleId,
                    video: false,
                    audio: true,
                    enabledMetadata: true
                };

                let localStream

                navigator.mediaDevices.getUserMedia({ audio: true, video: false })
                    .then(stream => {

                        localStream = stream;
                        const audioTracks = stream.getAudioTracks();
                        console.log('Local audio tracks:', audioTracks);
                        audioTracks.forEach(track => {
                            console.log('Audio track settings:', track.getSettings());
                            console.log('Audio track enabled:', track.enabled);
                            console.log('Audio track muted:', track.muted);
                        });
                        const audioSendRecv = sora.sendrecv(audioChannelId, null, audioOptions);

                        audioSendRecv.on('log', (msg) => {
                            console.log('Sora log:', msg);
                        });

                        // Peerイベントの監視
                        audioSendRecv.on('peerLeave', (peerId) => {
                            console.log('Peer left:', peerId);
                        });

                        audioSendRecv.on('peerJoin', (peerId) => {
                            console.log('Peer joined:', peerId);
                        });

                        audioSendRecv.on('track', event => {
                            console.log('Track event received:', event);
                            console.log('Track type:', event.track.kind);
                            console.log('Track ID:', event.track.id);
                            console.log('Track enabled:', event.track.enabled);
                            console.log('Track readyState:', event.track.readyState);
                            if (event.track.kind === 'audio') {

                                console.log('Audio track enabled:', event.track.enabled);
                                console.log('Audio track readyState:', event.track.readyState);

                                const audioStream = new MediaStream();
                                audioStream.addTrack(event.track);

                                const audioElement = document.createElement('audio');
                                audioElement.srcObject = audioStream;
                                audioElement.autoplay = true;
                                audioElement.style.display = "none"; // 表示を非表示に
                                document.body.appendChild(audioElement); // AudioエレメントをDOMに追加

                                // Audioの再生
                                audioElement.play().then(() => {
                                    console.log('Audio started playing');
                                }).catch(error => {
                                    console.error('Error playing audio:', error);
                                });
                            }
                        });

                        audioSendRecv.on('notify', message => {
                            console.log('Notify received:', message);
                        });

                        return audioSendRecv.connect(localStream).then(() => {
                            console.log('Successfully connected to Sora for audio send channel');
                        }).catch(err => {
                            console.error('Sora connection error for audio send channel:', err);
                        });

                    })
                    .catch(error => {
                        console.error('Error accessing media devices:', error);
                    });
            }

        }

    }, [objectRender]);

    //ビデオ，オブジェクトの追加
    React.useEffect(() => {
        const scene = document.querySelector('a-scene');
        const UIBack = document.querySelector('#UIBack');
        if (scene && rendered) {
            console.log("Add Stereo Assets", rendered)
            //assetの追加
            const assets = document.createElement('a-assets');
            assets.setAttribute('id', 'videoAssets')

            const remoteVideo = document.createElement('video');
            remoteVideo.setAttribute('id', 'remotevideo');
            remoteVideo.setAttribute('autoPlay', '');
            remoteVideo.setAttribute('playsInline', '');
            remoteVideo.setAttribute('crossOrigin', 'anonymous');
            assets.appendChild(remoteVideo);

            const leftCanvas = document.createElement('canvas');


            //const leftCanvas  = document.createElement('canvas');


            const remoteVideoRealSense = document.createElement('video');
            remoteVideoRealSense.setAttribute('id', 'remotevideo-realsense');
            remoteVideoRealSense.setAttribute('autoPlay', '');
            remoteVideoRealSense.setAttribute('playsInline', '');
            remoteVideoRealSense.setAttribute('crossOrigin', 'anonymous');
            assets.appendChild(remoteVideoRealSense);

            scene.appendChild(assets);

            /*leftCanvas.setAttribute('id', 'stereo-left');
            assets.appendChild(leftCanvas);
            const rightCanvas = document.createElement('canvas');
            rightCanvas.setAttribute('id', 'stereo-right');
            assets.appendChild(rightCanvas);*/

            //objectの追加
            const leftSphere = document.createElement('a-entity');
            leftSphere.setAttribute('id', 'leftSphere');
            leftSphere.setAttribute('scale', '1 1 1');
            leftSphere.setAttribute('position', '0 1.7 0');
            leftSphere.setAttribute('geometry', 'primitive:sphere; radius:100; segmentsWidth: 60; segmentsHeight:40; thetaLength:180'); //r=100
            leftSphere.setAttribute('material', 'shader:fisheye-stereo; src:#remotevideo; side:back; fov:160; radius:0.55; cx:0.50; cy:0.50');
            //leftSphere.setAttribute('material', 'shader:flat; src:#stereo-left; side:back');
            leftSphere.setAttribute('stereo', 'eye:left; mode: half;');

            const rightSphere = document.createElement('a-entity');
            rightSphere.setAttribute('id', 'rightSphere');
            rightSphere.setAttribute('scale', '1 1 1');
            rightSphere.setAttribute('position', '0 1.7 0');
            rightSphere.setAttribute('geometry', 'primitive:sphere; radius:100; segmentsWidth: 60; segmentsHeight:40; thetaLength:180'); //r=100
            rightSphere.setAttribute('material', 'shader:fisheye-stereo; src:#remotevideo; side:back; fov:160; radius:0.55; cx:0.50; cy:0.50');
            //rightSphere.setAttribute('material', 'shader:flat; src:#stereo-right; side:back');
            rightSphere.setAttribute('stereo', 'eye:right; mode: half;');
            rightSphere.setAttribute('visible', true);


            if (set_RealSense) {
                const videoPlane = document.createElement('a-plane');
                videoPlane.setAttribute('id', 'videoPlate');
                videoPlane.setAttribute('position', '-0.25 .1 -0.8');
                videoPlane.setAttribute('scale', '0.25 0.25 1');
                videoPlane.setAttribute('width', '1.6');
                videoPlane.setAttribute('height', '1.2');
                videoPlane.setAttribute('material', 'src: #remotevideo-realsense;');
                videoPlane.setAttribute('current-ui', '');
                videoPlane.setAttribute('visible', true); //ワイプの手先カメラ表示
                UIBack.appendChild(videoPlane);
            }

            // 新しい <a-entity> を <a-scene> に追加
            scene.appendChild(leftSphere);
            scene.appendChild(rightSphere);
            console.log("Stereo Video component initialized start objectRender");
            setObjectRender(true)

        }
    }, [rendered])

    React.useEffect(() => {
        if (rendered) {
            //            console.log("Set Stereo video assets to scene!")
            //            const assets = document.querySelector('#videoAssets');
            //            const scene = document.querySelector('a-scene');
            //            scene.appendChild(assets);

            const leftSphere = document.querySelector('#leftSphere');
            const rightSphere = document.querySelector('#rightSphere');
            //        const backStereoUI = document.querySelector('#backStereoUI');
            console.log("set stereo visible:", stereo_visible)
            leftSphere.setAttribute('visible', `${stereo_visible}`)
            rightSphere.setAttribute('visible', `${stereo_visible}`)
            //        backStereoUI.setAttribute('visible', `${!stereo_visible}`)
        }

    }, [stereo_visible])

    return (
        <>
        </>
    )
}


if (!('stereo' in AFRAME.components)) {
    console.log('Registering stereo component into A-Frame');
    // Define the stereo component and stereocam component

    const stereoComponent = {
        schema: {
            eye: { type: 'string', default: 'left' },
            mode: { type: 'string', default: 'full' },
            split: { type: 'string', default: 'horizontal' },
            playOnClick: { type: 'boolean', default: true },
        },
        init() {
            this.video_click_event_added = false;
            this.material_is_a_video = true;

            if (this.el.getAttribute('material') !== null &&
                'src' in this.el.getAttribute('material') &&
                this.el.getAttribute('material').src !== '') {
                const src = this.el.getAttribute('material').src;
                if (typeof src === 'object' && ('tagName' in src && src.tagName === 'VIDEO')) {
                    this.material_is_a_video = true;
                }
            }

            const applyGeometryAndUV = () => {
                const object3D = this.el.getObject3D('mesh');
                if (!object3D || !object3D.geometry) return false;

                const validGeometries = [THREE.SphereGeometry, THREE.SphereBufferGeometry, THREE.BufferGeometry];
                const isValidGeometry = validGeometries.some(geometry => object3D.geometry instanceof geometry);
                if (!isValidGeometry || !this.material_is_a_video) return false;

                let geometry;
                const geo_def = this.el.getAttribute('geometry') || {};
                if (this.data.mode === 'half') {
                    geometry = new THREE.SphereGeometry(
                        geo_def.radius || 100,
                        geo_def.segmentsWidth || 64,
                        geo_def.segmentsHeight || 64,
                        10 * Math.PI / 18,
                        16 * Math.PI / 18,
                        0.2,
                        Math.PI - 0.4
                    );
                } else {
                    geometry = new THREE.SphereGeometry(
                        geo_def.radius || 100,
                        geo_def.segmentsWidth || 64,
                        geo_def.segmentsHeight || 64
                    );
                }

                object3D.rotation.y = Math.PI / 2;
                //object3D.position.x = 0.032 * (this.data.eye === 'left' ? -1 : 1);
                //object3D.position.y = 1.7;

                const axis = this.data.split === 'horizontal' ? 'y' : 'x';
                const offset = this.data.eye === 'left'
                    ? (axis === 'y' ? { x: 0, y: 0 } : { x: 0, y: 0.5 })
                    : (axis === 'y' ? { x: 0.5, y: 0 } : { x: 0, y: 0 });
                const repeat = axis === 'y' ? { x: 0.5, y: 1 } : { x: 1, y: 0.5 };

                const uvAttribute = geometry.attributes.uv;
                for (let i = 0; i < uvAttribute.count; i++) {
                    const u = uvAttribute.getX(i) * repeat.x + offset.x;
                    const v = uvAttribute.getY(i) * repeat.y + offset.y;
                    uvAttribute.setXY(i, u, v);
                }
                uvAttribute.needsUpdate = true;

                object3D.geometry = geometry;

                this.videoEl = document.getElementById('remotevideo');
                this.videoEl.muted = true;
                this.videoEl.play();

                return true;
            };

            // ★ まず今すぐ適用を試み、未準備なら mesh が載った瞬間に一度だけ適用
            if (!applyGeometryAndUV()) {
                const once = (e) => {
                    if (e.detail.type !== 'mesh') return;
                    if (applyGeometryAndUV()) this.el.removeEventListener('object3dset', once);
                };
                this.el.addEventListener('object3dset', once);
            } else {
                // 既に適用できた
            }
        },
        update(oldData) {
            const object3D = this.el.object3D.children[0];
            const data = this.data;
            if (data.eye === 'both') {
                object3D.layers.set(0);
            } else {
                object3D.layers.set(data.eye === 'left' ? 1 : 2);
            }
        },
    };


    const stereocamComponent = {
        schema: {
            eye: { type: 'string', default: 'left' },
        },
        init() {
            this.layer_changed = false;
        },
        tick() {
            const originalData = this.data;
            if (!this.layer_changed) {
                const childrenTypes = this.el.object3D.children.map(item => item.type);
                const rootIndex = childrenTypes.indexOf('PerspectiveCamera');
                const rootCam = this.el.object3D.children[rootIndex];
                if (originalData.eye === 'both') {
                    rootCam.layers.enable(1);
                    rootCam.layers.enable(2);
                } else {
                    // if enter vr.. then omit ..
                    const scene = document.querySelector('a-scene');
                    if (!scene?.is('vr-mode')) {
                        rootCam.layers.enable(originalData.eye === 'left' ? 1 : 2);
                    } else {
                        rootCam.layers.set(0)
                    }
                }
            }
        },
    };

    if (!('stereo' in AFRAME.components)) {
        AFRAME.registerComponent('stereo', stereoComponent);
    }
    if (!('stereocam' in AFRAME.components)) {
        AFRAME.registerComponent('stereocam', stereocamComponent);
    }
}

const fisheyeStereoShader = {
    schema: {
        src: { type: 'map' },                 // #remotevideo (SBSの片側ずつが並ぶ1枚)
        side: { type: 'string', default: 'back' },

        // ▼魚眼→球面のパラメータ（必要に応じて調整）
        fov: { type: 'number', default: 160.0 }, // 魚眼の視野角[deg]
        radius: { type: 'number', default: 1.12 }, // 半径スケール（半分画像の半径/半分画像の幅/2）
        cx: { type: 'number', default: 0.5 }, // 片側（半分）の中心x (0..1)
        cy: { type: 'number', default: 0.5 }, // 片側（半分）の中心y (0..1)
    },

    vertexShader: `
      varying vec3 vDir;
      varying vec2 vUv;
      void main() {
        vUv = uv;
        // 球面上のローカル法線方向を使う
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,

    fragmentShader: `
      precision highp float;
        uniform sampler2D src;
        uniform float fov;
        uniform float radius;
        uniform float cx;
        uniform float cy;

        varying vec3 vDir;
        varying vec2 vUv;

        const float PI = 3.14159265359;

        void main() {
        float eyeOffset = (vUv.x > 0.5) ? 0.5 : 0.0;
        vec3 dir = normalize(vDir);

        // ★ 固定ヨー回転（右へずらす角度をここで決め打ち）
        // 例: +15度（右へ）。逆に行くなら -15.0 に変えてください。
        const float YAW_DEG = 90.0;
        float yaw = radians(YAW_DEG);
        float cY = cos(yaw), sY = sin(yaw);
        // 右手系・前方 = -Z
        vec3 d = vec3(
            cY * dir.x + sY * dir.z,   // X'
            dir.y,                     // Y'
        -sY * dir.x + cY * dir.z    // Z'
        );

        // ▼以降は回転後の d を使って極座標 → 魚眼マッピング
        float fovRad = radians(fov);
        float theta  = acos(clamp(-d.z, -1.0, 1.0)); // 光軸(-Z)からの角度
        float alpha  = atan(d.y, d.x);               // X–Y 平面の方位角

        // （必要なら一時的に無効化してデバッグ）
        if (theta > 0.5 * fovRad) {
            gl_FragColor = vec4(0.0,0.0,0.0,1.0);
            return;
        }

        float rNorm = (theta / (0.5 * fovRad)) * radius;
        float x = cx + rNorm * cos(alpha);
        float y = cy + rNorm * sin(alpha);

        if (x < 0.0 || x > 1.0 || y < 0.0 || y > 1.0) {
            gl_FragColor = vec4(0.0,0.0,0.0,1.0);
            return;
        }

        vec2 uvSrc = vec2(eyeOffset + x * 0.5, 1.0 - y);
        gl_FragColor = texture2D(src, uvSrc);
        }
    `,

    _asVideoTexture(el) {
        if (!el) return null;
        if (el.isTexture) return el;             // 既に Texture
        if (el.tagName === 'VIDEO') {
            const tex = new THREE.VideoTexture(el);
            tex.minFilter = THREE.LinearFilter;
            tex.magFilter = THREE.LinearFilter;
            tex.generateMipmaps = false;
            tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
            tex.colorSpace = THREE.SRGBColorSpace ?? undefined;
            tex.flipY = false;                      // 球の内側貼りで重要
            return tex;
        }
        return el; // 画像や既存Textureも通す
    },

    init: function (data) {
        this.material = new THREE.ShaderMaterial({
            uniforms: {
                src: { value: this._asVideoTexture(data.src) },
                fov: { value: data.fov },
                radius: { value: data.radius },
                cx: { value: data.cx },
                cy: { value: data.cy },
            },
            vertexShader: this.vertexShader,
            fragmentShader: this.fragmentShader,
            side: (data.side === 'back') ? THREE.BackSide : THREE.FrontSide
        });
    },

    update: function (data) {
        const next = this._asVideoTexture(data.src);
        if (this.material.uniforms.src.value !== next) {
            this.material.uniforms.src.value = next;
        }
        this.material.side = (data.side === 'back') ? THREE.BackSide : THREE.FrontSide;
        this.material.uniforms.fov.value = data.fov;
        this.material.uniforms.radius.value = data.radius;
        this.material.uniforms.cx.value = data.cx;
        this.material.uniforms.cy.value = data.cy;
        this.material.needsUpdate = true;
    }
}

if (typeof AFRAME !== 'undefined' && !AFRAME.shaders['fisheye-stereo']) {
    AFRAME.registerShader('fisheye-stereo', fisheyeStereoShader);
}

