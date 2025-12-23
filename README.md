# ROBOXDEX2025_demo_nova2

ROBODEX2025 におけるデモ用 VR ゴーグルアプリ

DOBOT Nova2を想定

pnpm install 
pnpm run dev-https
でローカルで実行可能

.env　に必要な設定がファイルできるようにする予定


/simRobot はロボットのシミュレーション（MQTT経由）
/setCookie で環境毎の設定が可能

/practice は練習モード

（練習モードの遅延付きも作りたい）



├── certificates
│   ├── localhost-key.pem
│   └── localhost.pem
├── eslint.config.mjs
├── LICENSE
├── next-env.d.ts
├── next.config.ts
├── node_modules
│   ├── @eslint
│   │   └── eslintrc -> ../.pnpm/@eslint+eslintrc@3.3.1/node_modules/@eslint/eslintrc
│   ├── @types
│   │   ├── node -> ../.pnpm/@types+node@20.19.21/node_modules/@types/node
│   │   ├── react -> ../.pnpm/@types+react@19.2.2/node_modules/@types/react
│   │   └── react-dom -> ../.pnpm/@types+react-dom@19.2.2_@types+react@19.2.2/node_modules/@types/react-dom
│   ├── @ucl-nuee
│   │   └── ik-cd-worker -> ../.pnpm/@ucl-nuee+ik-cd-worker@https+++github.com+TSUSAKA-ucl+ik-cd-worker+releases+download+ve_e5b8fc79f8481302ad93ffe7d25e395b/node_modules/@ucl-nuee/ik-cd-worker
│   ├── aframe -> .pnpm/aframe@1.7.1/node_modules/aframe
│   ├── bootstrap -> .pnpm/bootstrap@5.3.8_@popperjs+core@2.11.8/node_modules/bootstrap
│   ├── eslint -> .pnpm/eslint@9.37.0/node_modules/eslint
│   ├── eslint-config-next -> .pnpm/eslint-config-next@15.5.5_eslint@9.37.0_typescript@5.9.3/node_modules/eslint-config-next
│   ├── mqtt -> .pnpm/mqtt@5.14.1/node_modules/mqtt
│   ├── next -> .pnpm/next@15.5.5_react-dom@19.1.0_react@19.1.0__react@19.1.0/node_modules/next
│   ├── react -> .pnpm/react@19.1.0/node_modules/react
│   ├── react-dom -> .pnpm/react-dom@19.1.0_react@19.1.0/node_modules/react-dom
│   ├── sora-js-sdk -> .pnpm/sora-js-sdk@2025.1.0/node_modules/sora-js-sdk
│   └── typescript -> .pnpm/typescript@5.9.3/node_modules/typescript
├── package.json
├── pnpm-lock.yaml
├── public
│   ├── ik_cd_worker.js
│   ├── nova2_robot
│   │   ├── CONVUM_SGE-M5-N.bin
│   │   ├── CONVUM_SGE-M5-N.gltf
│   │   ├── linkmap.json
│   │   ├── NOVA2_BASE_ASM.bin
│   │   ├── NOVA2_BASE_ASM.gltf
│   │   ├── NOVA2_J1_ASM.bin
│   │   ├── NOVA2_J1_ASM.gltf
│   │   ├── NOVA2_J2_ASM.bin
│   │   ├── NOVA2_J2_ASM.gltf
│   │   ├── NOVA2_J3_ASM.bin
│   │   ├── NOVA2_J3_ASM.gltf
│   │   ├── NOVA2_J4_ASM.bin
│   │   ├── NOVA2_J4_ASM.gltf
│   │   ├── NOVA2_J5_ASM.bin
│   │   ├── NOVA2_J5_ASM.gltf
│   │   ├── NOVA2_J6_ASM.bin
│   │   ├── NOVA2_J6_ASM.gltf
│   │   ├── nova2_robot.urdf
│   │   ├── shapes.json
│   │   ├── update.json
│   │   └── urdf.json
│   └── wasm
│       ├── cd_module.js
│       ├── cd_module.wasm
│       ├── slrm_module.js
│       └── slrm_module.wasm
├── README.md
├── src
│   ├── app
│   │   ├── appmode.js
│   │   ├── error
│   │   │   ├── error.css
│   │   │   └── page.tsx
│   │   ├── favicon.ico
│   │   ├── globals.css
│   │   ├── home.js
│   │   ├── layout.js
│   │   ├── nova2_filter
│   │   │   └── page.js
│   │   ├── nova2_monitor
│   │   │   └── page.js
│   │   ├── nova2_normal
│   │   │   └── page.js
│   │   ├── nova2_simRobot
│   │   │   └── page.js
│   │   ├── nova2_withCam
│   │   │   └── page.js
│   │   ├── page.module.css
│   │   ├── page.tsx
│   │   ├── practice
│   │   │   └── page.js
│   │   └── setCookie
│   │       ├── home.tsx
│   │       └── page.tsx
│   ├── compo_aframe
│   │   ├── armMotionUI.js
│   │   ├── armWandMotionUI.js
│   │   ├── axesFrame.js
│   │   ├── default_event_target.js
│   │   ├── gripControl.js
│   │   ├── ikWorker.js
│   │   ├── IkWorkerManager.js
│   │   ├── model_opacity.js
│   │   ├── motionFilter.js
│   │   ├── reflectWorkerJoints.js
│   │   ├── robotLoader.js
│   │   ├── robotRegistry.js
│   │   └── vrControllerThumbMenu.js
│   ├── components
│   │   ├── filter.js
│   │   ├── hsvToRgb.js
│   │   ├── stereoWebRTC.js
│   │   └── VrControllerComponents.jsx
│   └── lib
│       ├── cookie_id.js
│       ├── isometry3.js
│       ├── MetaworkMQTT.js
│       └── MQTT_jobs.js
└── tsconfig.json

37 directories, 74 files
tsutsui@UCLabmactsutsui-275 ROBODEX2025_demo_nova2_fork % 
