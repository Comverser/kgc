<h1 align="center">
  <img src="icon.png" width='320'><br/>
  <a href='https://gnlabs.iptime.org:20443'>kgc</a>  
</h1>

# Requirements

- Chromium-based browser

- Peripherals

  - Video/audio input devices (e.g. webcam)
  - Display/audio output device (e.g. touch display/speaker)

- Raspberry Pi OS settings

  - Set up WIFI with on-screen keyboard
  - Go to the main menu and open the Raspberry Pi Configuration tool. Select the Interfaces tab and ensure that the camera is enabled. Reboot your Raspberry Pi.
  - Adjust audio volume
  - Screen resolution of 800 x 480 pixels
  - Auto-hide taskbar
  - Right-click on the taskbar and select "Panel Settings". Click on the "Advanced" tab, and check "Minimize panel when not in use".
  - Install Korean language

  ```bash
  sudo apt-get install fonts-unfonts-core
  sudo apt-get install ibus ibus-hangul
  sudo reboot
  ```

  - How to start Chromium on Raspberry boot?

  ```bash
  sudo nano /etc/xdg/lxsession/LXDE-pi/autostart
  ```

  - Add this to what is already there:

  ```bash
  @chromium-browser --start-fullscreen --kiosk https://YourServerURL.com
  ```

  - Next press CTRL+X and type Y for saving the file

  - How to disable SSH password warning?

  ```bash
  sudo rm /etc/xdg/lxsession/LXDE-pi/sshpwd.sh
  ```

  - Optional settings
  - Enable VNC/SSH
  - https://blog.r0b.io/post/minimal-rpi-kiosk/

# WebRTC references

- Python WebRTC basics with aiortc, https://dev.to/whitphx/python-webrtc-basics-with-aiortc-48id
<!-- - Building a WebRTC video broadcast using Javascript, https://gabrieltanner.org/blog/webrtc-video-broadcast
- WebRTC tutorial, https://www.youtube.com/watch?v=QJMM758oCYk&list=PLayYqdnyegt0qX8EfEGExxZF3DxkyA1Dj -->
