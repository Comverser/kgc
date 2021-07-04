# Demo devices
### 1. Smartphone/laptop

### 2. RPI/PC
1. Peripherals needed
    - Video/audio input devices (e.g. webcam)
    - Display/audio output device (e.g. touch display/speaker)
1.  Korean language setting for Raspberry Pi OS
    - sudo apt-get install fonts-unfonts-core
    - sudo apt-get install ibus ibus-hangul
    - reboot

# API settings
### Talk endpoints
- Replace the API endpoints in gnict/public/config.js with your API endpoints

### Kakao OpenAPI for STT/TTS
- Create a .env file at the keti directory and add your API_KEY to it
- https://speech-api.kakao.com/
- https://developers.kakao.com/docs/latest/ko/voice/rest-api
- https://docs.kakaoi.ai/skill/ssml_guide/
- https://ai-creator.tistory.com/70

# WebRTC references

- Python WebRTC basics with aiortc, https://dev.to/whitphx/python-webrtc-basics-with-aiortc-48id
<!-- - Building a WebRTC video broadcast using Javascript, https://gabrieltanner.org/blog/webrtc-video-broadcast
- WebRTC tutorial, https://www.youtube.com/watch?v=QJMM758oCYk&list=PLayYqdnyegt0qX8EfEGExxZF3DxkyA1Dj -->
